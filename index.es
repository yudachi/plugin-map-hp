/* eslint-disable no-underscore-dangle */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { join } from 'path-extra'
import { connect } from 'react-redux'
import { map, get, memoize, size } from 'lodash'
import { ProgressBar, Checkbox } from 'react-bootstrap'
import { createSelector } from 'reselect'

import { getHpStyle } from 'views/utils/game-utils'

const { i18n, config } = window

const mapRanks = {
  1: i18n.others.__('丁'),
  2: i18n.others.__('丙'),
  3: i18n.others.__('乙'),
  4: i18n.others.__('甲'),
}

const __ = i18n['poi-plugin-map-hp'].__.bind(i18n['poi-plugin-map-hp'])

const getMapType = id => {
  if (id > 200) {
    return 'Event'
  }
  if (id % 10 > 4) {
    return 'Extra'
  }
  return 'Normal'
}

const constMapsSelector = state => get(state, ['const', '$maps'], {})
const mapsSelector = state => get(state, ['info', 'maps'], {})

const mapInfoSelectorFactory = memoize(id =>
  createSelector([constMapsSelector, mapsSelector], (constMaps, maps) => ({
    ...(constMaps[id] || {}),
    ...(maps[id] || {}),
  })),
)

const MapItem = connect((state, { id }) => ({
  map: mapInfoSelectorFactory(id)(state),
  clearedVisible: get(state.config, 'plugin.maphp.clearedVisible', false),
}))(({ id, map: m, clearedVisible }) => {
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

  if (m.api_cleared && !clearedVisible && mapType !== 'Event') {
    return false
  }

  let now = 0
  let max = 1

  if (eventMap) {
    now = eventMap.api_now_maphp
    max = eventMap.api_max_maphp
  } else {
    now = m.api_cleared ? 0 : m.api_required_defeat_count - m.api_defeat_count
    max = m.api_required_defeat_count
  }

  return (
    <div>
      <div>
        <span>
          [{mapType}] {mapId} {m.api_name || '???'}{' '}
          {eventMap && mapRanks[eventMap.api_selected_rank]}
        </span>
      </div>
      <div>
        <div className="hp-progress">
          <ProgressBar
            bsStyle={getHpStyle((now / max) * 100)}
            now={(now / max) * 100}
            label={<div style={{ position: 'absolute', width: '100%' }}>{`${now} / ${max}`}</div>}
          />
        </div>
      </div>
    </div>
  )
})

export const reactClass = connect(state => ({
  maps: state.info.maps,
  clearedVisible: get(state.config, 'plugin.maphp.clearedVisible', false),
}))(
  class PoiPluginMapHp extends Component {
    static propTypes = {
      maps: PropTypes.objectOf(PropTypes.object).isRequired,
      clearedVisible: PropTypes.bool.isRequired,
    }

    constructor(props) {
      super(props)
      this.state = {
        clearedVisible: false,
      }
    }

    handleSetClickValue = () => {
      const { clearedVisible } = this.props
      config.set('plugin.maphp.clearedVisible', !clearedVisible)
    }

    render() {
      const { maps, clearedVisible } = this.props
      return (
        <div id="map-hp" className="map-hp">
          <link rel="stylesheet" href={join(__dirname, 'assets', 'map-hp.css')} />
          {size(maps) === 0 ? (
            <div>{__('Click Sortie to get infromation')}</div>
          ) : (
            <div>
              <div>
                <Checkbox
                  type="checkbox"
                  checked={clearedVisible}
                  onClick={this.handleSetClickValue}
                >
                  {__('Show cleared EO map')}
                </Checkbox>
              </div>
              <div>
                {map(maps, m => (
                  <MapItem key={m.api_id} id={m.api_id} />
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }
  },
)

const handleResponse = e => {
  if (
    e.detail.path === '/kcsapi/api_port/port' &&
    get(e.detail.body, 'api_event_object.api_m_flag2') === 1
  ) {
    const { toast, success } = window
    const msg = __('Debuff mechanism has taken effect!')
    success(msg)
    toast(msg, { type: 'success', title: __('Map debuff') })
  }
}

export const pluginDidLoad = () => {
  window.addEventListener('game.response', handleResponse)
}

export const pluginWillUnload = () => {
  window.removeEventListener('game.response', handleResponse)
}
