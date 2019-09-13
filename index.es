/* eslint-disable no-underscore-dangle */

import React, { Component, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { map, get, memoize, size, each, keyBy, startsWith, endsWith } from 'lodash'
import {
  Switch,
  Tag,
  Button,
  Intent,
  Popover,
  NumericInput,
  Position,
  Classes,
  FormGroup,
} from '@blueprintjs/core'
import { createSelector } from 'reselect'
import { translate } from 'react-i18next'
import { compose } from 'redux'
import cls from 'classnames'
import styled from 'styled-components'
import FA from 'react-fontawesome'

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

const AreaLabel = styled(Tag)`
  && {
    background-color: ${props => props.theme.BLUE5};
    color: white;
  }
`

const MapTitle = styled.div`
  display: flex;
  align-items: center;
`

const MapName = styled.div`
  flex: 1;
`

const SettingsContainer = styled.div`
  padding: 8px;
`

const SettingsControl = styled.div`
  text-align: right;

  button {
    width: 3em;
  }

  button + button {
    margin-left: 1em;
  }
`

const HP = styled.div`
  display: flex;
  margin: 1ex 0 2ex 0;
  align-items: center;
`

const HPValue = styled.div`
  width: 8em;
`

const HPBarContainer = styled.div`
  position: relative;
  width: 100%;
  height: 16px;
`

const HPBarBase = styled.div`
  background-color: rgba(255, 255, 255, 0.1);
  width: 100%;
  height: 100%;
  transform: skewX(-15deg);
  position: static;
  position: absolute;
`

const HPBar = styled(HPBarBase)`
  clip-path: ${props => `polygon(0 0, ${props.percent}% 0, ${props.percent}%  100%, 0 100%)`};
  background-color: ${props => `var(--poi-${getHpStyle(props.percent)})`};
`

const HPIndicator = styled.div`
  width: 2px;
  height: 20px;
  position: absolute;
  background-color: rgba(0, 0, 0, 0.75);
  transform: skewX(-15deg);

  left: ${props => props.percent}%;
  top: -2px;
`

const MapItem = compose(
  translate(['others', 'poi-plugin-map-hp']),
  connect((state, { id }) => ({
    map: mapInfoSelectorFactory(id)(state),
    clearedVisible: get(state.config, 'plugin.maphp.clearedVisible', false),
    limit: get(state.config, ['plugin', 'maphp', 'limits', id], 0),
  })),
)(({ id, map: m, clearedVisible, limit, t }) => {
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

  const [mapLimit, setMapLimit] = useState(limit)

  const handleSave = useCallback(() => {
    config.set(`plugin.maphp.limits.${id}`, mapLimit)
  }, [id, mapLimit])

  const handleRemove = useCallback(() => {
    config.set(`plugin.maphp.limits.${id}`, 0)
    setMapLimit(0)
  }, [id, setMapLimit])

  const limitPercent = Math.floor((limit / max) * 100)

  return (
    <div>
      <MapTitle>
        <MapName>
          <AreaLabel className="area-label">{mapType}</AreaLabel> {mapId} {m.api_name || '???'}{' '}
          {eventMap && t(mapRanks[eventMap.api_selected_rank])}
        </MapName>
        {id > 100 && (
          <Popover position={Position.TOP}>
            <Button minimal intent={limit > 0 ? Intent.SUCCESS : Intent.NONE}>
              <FA name="gear" />
            </Button>
            <SettingsContainer>
              <FormGroup inline label={t('Threshold')}>
                <NumericInput value={mapLimit} onValueChange={value => setMapLimit(value)} />
              </FormGroup>
              <SettingsControl>
                <Button
                  intent={Intent.SUCCESS}
                  className={Classes.POPOVER_DISMISS}
                  onClick={handleSave}
                >
                  <FA name="check" />
                </Button>
                <Button
                  intent={Intent.DANGER}
                  className={Classes.POPOVER_DISMISS}
                  onClick={handleRemove}
                >
                  <FA name="times" />
                </Button>
              </SettingsControl>
            </SettingsContainer>
          </Popover>
        )}
      </MapTitle>
      <HP className="hp">
        <HPValue className="hp-value">{`${now} / ${max}`}</HPValue>
        <HPBarContainer className="hp-bar-container">
          <HPBarBase className="hp-bar-base" />
          <HPBar
            percent={percent}
            className={cls('hp-bar-current', `progress-bar-${getHpStyle(percent)}`)}
          />
          {limit > 0 && <HPIndicator percent={limitPercent} />}
        </HPBarContainer>
      </HP>
    </div>
  )
})

const PluginWrapper = styled.div`
  margin: 0 2em;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  height: 3em;

  .bp3-control {
    margin: 0;
  }
`

const Timestamp = styled.div`
  flex: 1;
  color: gray;
  text-align: right;
`

/*
  Check network response to see if a debuff flag is contained in it.

  Returns a string for each scenario of triggering sound effect.
  - 'port': triggers in port scene.
  - 'battleresult': triggers in battle result scene.
  - 'airdefense': triggers after an air defense event.
  - null: nothing detected.

 */
const checkDebuffFlag = evDetail => {
  if (
    evDetail.path === '/kcsapi/api_port/port' &&
    get(evDetail.body, 'api_event_object.api_m_flag2') === 1
  ) {
    return 'port'
  }

  if (
    startsWith(evDetail.path, '/kcsapi') &&
    endsWith(evDetail.path, '/battleresult') &&
    get(evDetail.body, 'api_m2') === 1
  ) {
    return 'battleresult'
  }

  if (
    (evDetail.path === '/kcsapi/api_req_map/next' ||
      evDetail.path === '/kcsapi/api_req_map/start') &&
    get(evDetail.body, 'api_destruction_battle.api_m2') === 1
  ) {
    return 'airdefense'
  }

  return null
}

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

    const debuffFlag = checkDebuffFlag(e.detail)
    if (debuffFlag !== null) {
      const { toast, success } = window
      const msg = t('debuffMessage', { context: debuffFlag })
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

    if (['/kcsapi/api_get_member/mapinfo'].includes(e.detail.path)) {
      const limits = config.get('plugin.maphp.limits')
      const maps = keyBy(e.detail.body.api_map_info, 'api_id')
      const { toast } = window
      each(limits, (limit, id) => {
        // eslint-disable-next-line camelcase
        if (limit >= maps[id]?.api_eventmap?.api_now_maphp) {
          toast(
            t('Map HP for {{map}} below threshold, please pay attention', {
              map: `${Math.floor(id / 10)}-${id % 10}`,
            }),
            {
              type: 'warning',
              title: t('Last dance'),
            },
          )
        }
      })
    }
  }

  handleChangeHiding = () => {
    const { clearedVisible } = this.props
    config.set('plugin.maphp.clearedVisible', !clearedVisible)
  }

  render() {
    const { maps, clearedVisible, t } = this.props
    const { time } = this.state
    return (
      <PluginWrapper id="map-hp" className="map-hp">
        {size(maps) === 0 && <div>{t('Click Sortie to get infromation')}</div>}
        <Header className="header">
          <div>
            <Switch type="checkbox" checked={clearedVisible} onChange={this.handleChangeHiding}>
              {t('Show cleared EO map')}
            </Switch>
          </div>
          <Timestamp className="timestamp">
            {time > 0 && (
              <>
                {t('Last update')}{' '}
                <time>
                  {timeZone ? new Date(time).toLocaleString() : new Date(time).toString()}
                </time>
              </>
            )}
          </Timestamp>
        </Header>
        <hr />
        <div>
          <div>
            {map(maps, m => (
              <MapItem key={m.api_id} id={m.api_id} />
            ))}
          </div>
        </div>
      </PluginWrapper>
    )
  }
}

export const reactClass = PoiPluginMapHp

export const NAME = 'poi-plugin-map-hp'
