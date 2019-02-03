/* eslint-disable no-underscore-dangle */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { join } from 'path-extra'
import { connect } from 'react-redux'
import { map, get, memoize, size } from 'lodash'
import { Checkbox, Label } from 'react-bootstrap'
import { createSelector } from 'reselect'
import { translate } from 'react-i18next'
import { compose } from 'redux'
import cls from 'classnames'

import { getHpStyle } from 'views/utils/game-utils'

const { config } = window

const mapRanks = {
  1: '丁',
  2: '丙',
  3: '乙',
  4: '甲',
}

// for some unknown reason timezone lookup could throw Range Error: poooi/poi#2072
// following code is to ensure fallback
let timeZone = ''
try {
  ;({ timeZone } = Intl.DateTimeFormat().resolvedOptions())
} catch (e) {
  console.error('fail to detect timezone', e)
}

const getMapType = id => {
  if (id > 200) {
    return 'Event'
  }
  if (id % 10 > 4) {
    return 'Extra'
  }
  if ([72].includes(id)) {
    // new monthly renewed normal map
    return 'SP Normal'
  }
  return 'Normal'
}

const constMapsSelector = state => get(state, ['const', '$maps'], {})
const mapsSelector = state => get(state, ['info', 'maps'], {})

const mapInfoSelectorFactory = memoize(id =>
  createSelector(
    [constMapsSelector, mapsSelector],
    (constMaps, maps) => ({
      ...(constMaps[id] || {}),
      ...(maps[id] || {}),
    }),
  ),
)

const MapItem = compose(
  translate(['others']),
  connect((state, { id }) => ({
    map: mapInfoSelectorFactory(id)(state),
    clearedVisible: get(state.config, 'plugin.maphp.clearedVisible', false),
  })),
)(({ id, map: m, clearedVisible, t }) => {
  const mapType = getMapType(id)
  const mapId = `${Math.floor(id / 10)}-${id % 10}`

  const eventMap = m.api_eventmap

  if (!eventMap && !m.api_required_defeat_count) {
    // not a map with hp bar, skip
    return false
  }

  if (m.api_cleared && mapType === 'Normal') {
    return false
  }

  if (m.api_cleared && m.api_defeat_count === undefined && !clearedVisible && mapType !== 'Event') {
    return false
  }

  let now = 0
  let max = 1

  if (eventMap) {
    // in 2019 winter event update, api_now_maphp and api_max_maphp are not availbale for cleared event maps
    // setting default values to $map.api_max_maphp and 0
    now = eventMap.api_now_maphp || 0
    max = eventMap.api_max_maphp || m.api_max_maphp
  } else {
    now = m.api_defeat_count === undefined ? 0 : m.api_required_defeat_count - m.api_defeat_count
    max = m.api_required_defeat_count
  }

  const percent = Math.floor((now / max) * 100)

  return (
    <div>
      <div>
        <span>
          <Label className="area-label">{mapType}</Label> {mapId} {m.api_name || '???'}{' '}
          {eventMap && t(mapRanks[eventMap.api_selected_rank])}
        </span>
      </div>
      <div className="hp">
        <div className="hp-value">{`${now} / ${max}`}</div>
        <div className="hp-bar">
          <div className="hp-bar-background" />
          <div
            className={cls('hp-bar-current', `progress-bar-${getHpStyle(percent)}`)}
            style={{
              clipPath: `polygon(0 0, ${percent}% 0, ${percent}%  100%, 0 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  )
})

@translate(['poi-plugin-map-hp'])
@connect(state => ({
  maps: state.info.maps,
  clearedVisible: get(state.config, 'plugin.maphp.clearedVisible', false),
}))
class PoiPluginMapHp extends Component {
  static propTypes = {
    maps: PropTypes.objectOf(PropTypes.object).isRequired,
    clearedVisible: PropTypes.bool.isRequired,
    t: PropTypes.func.isRequired,
  }

  state = {
    time: 0,
  }

  componentDidMount = () => {
    window.addEventListener('game.response', this.handleResponse)
  }

  componentWillUnmount = () => {
    window.removeEventListener('game.response', this.handleResponse)
  }

  handleResponse = e => {
    const { t } = this.props
    if (
      e.detail.path === '/kcsapi/api_port/port' &&
      get(e.detail.body, 'api_event_object.api_m_flag2') === 1
    ) {
      const { toast, success } = window
      const msg = t('Debuff mechanism has taken effect!')
      success(msg)
      toast(msg, { type: 'success', title: t('Map debuff') })
      return
    }

    if (
      [
        '/kcsapi/api_get_member/mapinfo',
        '/kcsapi/api_req_map/select_eventmap_rank',
        '/kcsapi/api_req_map/start',
      ].includes(e.detail.path)
    ) {
      this.setState({ time: e.detail.time })
    }
  }

  handleSetClickValue = () => {
    const { clearedVisible } = this.props
    config.set('plugin.maphp.clearedVisible', !clearedVisible)
  }

  render() {
    const { maps, clearedVisible, t } = this.props
    const { time } = this.state
    return (
      <div id="map-hp" className="map-hp">
        <link rel="stylesheet" href={join(__dirname, 'assets', 'map-hp.css')} />
        {size(maps) === 0 && <div>{t('Click Sortie to get infromation')}</div>}
        <div className="header">
          <div>
            <Checkbox type="checkbox" checked={clearedVisible} onClick={this.handleSetClickValue}>
              {t('Show cleared EO map')}
            </Checkbox>
          </div>
          <div className="timestamp">
            {time > 0 && (
              <>
                {t('Last update')}{' '}
                {timeZone ? new Date(time).toLocaleString() : new Date(time).toString()}
              </>
            )}
          </div>
        </div>
        <hr />
        <div>
          <div>
            {map(maps, m => (
              <MapItem key={m.api_id} id={m.api_id} />
            ))}
          </div>
        </div>
      </div>
    )
  }
}

export const reactClass = PoiPluginMapHp

export const NAME = 'poi-plugin-map-hp'
