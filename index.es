/* eslint-disable import/prefer-default-export */
/* eslint-disable no-underscore-dangle */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { join } from 'path-extra'
import { connect } from 'react-redux'
import { forEach, isNumber, get } from 'lodash'
import { ProgressBar, Checkbox } from 'react-bootstrap'
import { getHpStyle } from 'views/utils/game-utils'

const { i18n } = window

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

// TODO: add fcd to show last sortie line

const MapHpRow = ({ map, $map }) => {
  const { id, now, max, rank } = map
  const rankText = mapRanks[rank] || ''
  const res = max - now
  const mapType = getMapType(id)
  const realName = `[${mapType}] ${Math.floor(id / 10)}-${id % 10} ${
    $map ? $map.api_name : '???'
  }${rankText}`
  return (
    <div>
      <div>
        <span>{realName}</span>
      </div>
      <div>
        <div className="hp-progress">
          <ProgressBar
            bsStyle={getHpStyle((res / max) * 100)}
            now={(res / max) * 100}
            label={<div style={{ position: 'absolute', width: '100%' }}>{`${res} / ${max}`}</div>}
          />
        </div>
      </div>
    </div>
  )
}

MapHpRow.propTypes = {
  map: PropTypes.shape({
    id: PropTypes.number,
    now: PropTypes.number,
    max: PropTypes.number,
    rank: PropTypes.number,
  }).isRequired,
  $map: PropTypes.shape({
    api_name: PropTypes.string,
  }).isRequired,
}

// NOTE: the now in maphp object is the reduced hp, not the same meaning as now_hp
// chiba loves you!
// TODO: correct this ambiguous variable during next event

export const reactClass = connect(state => ({
  $maps: state.const.$maps,
  maps: state.info.maps,
}))(
  class PoiPluginMapHp extends Component {
    static propTypes = {
      maps: PropTypes.objectOf(PropTypes.object).isRequired,
      $maps: PropTypes.objectOf(PropTypes.object).isRequired,
    }

    constructor(props) {
      super(props)
      this.state = {
        clearedVisible: false,
      }
    }

    handleSetClickValue = () => {
      this.setState(prevState => ({ clearedVisible: !prevState.clearedVisible }))
    }

    render() {
      const { $maps, maps } = this.props
      const { clearedVisible } = this.state
      const totalMapHp = []
      forEach(maps, map => {
        if (map != null) {
          const { api_eventmap: eventMap, api_id: id } = map
          const $map = $maps[id]
          if (eventMap) {
            // Event Map
            const currentHp =
              map.api_cleared > 0
                ? eventMap.api_max_maphp
                : eventMap.api_max_maphp - eventMap.api_now_maphp
            totalMapHp.push({
              id,
              now: currentHp,
              max: eventMap.api_max_maphp,
              rank: eventMap.api_selected_rank,
            })
          } else if ($map && $map.api_required_defeat_count != null) {
            const currentHp = isNumber(map.api_defeat_count)
              ? map.api_defeat_count
              : $map.api_required_defeat_count
            totalMapHp.push({
              id,
              now: currentHp,
              max: $map.api_required_defeat_count,
            })
          }
        }
      })
      const mapHp = totalMapHp.filter(({ id, now, max }) => {
        const res = max - now
        if (res === 0 && ((id < 100 && id % 10 < 5) || !clearedVisible)) {
          return false
        }
        return true
      })
      return (
        <div id="map-hp" className="map-hp">
          <link rel="stylesheet" href={join(__dirname, 'assets', 'map-hp.css')} />
          {totalMapHp.length === 0 ? (
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
                {mapHp.map(map => (
                  <MapHpRow key={map.id} map={map} $map={$maps[map.id]} />
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
