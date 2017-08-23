/* eslint-disable import/prefer-default-export */
/* eslint-disable no-underscore-dangle */

import React, { Component } from 'react'
import { join } from 'path-extra'
import { connect } from 'react-redux'
import { forEach } from 'lodash'
import { ProgressBar, Input } from 'react-bootstrap'

const { i18n } = window

const mapRanks = ['', ` ${i18n.others.__('丙')}`, ` ${i18n.others.__('乙')}`, ` ${i18n.others.__('甲')}`]

const __ = i18n['poi-plugin-map-hp'].__.bind(i18n['poi-plugin-map-hp'])

const getHpStyle = (percent) => {
  if (percent <= 25) {
    return 'danger'
  } else if (percent <= 50) {
    return 'warning'
  } else if (percent <= 75) {
    return 'info'
  }
  return 'success'
}

const getMapType = (id) => {
  if (id > 200) {
    return 'Event'
  } else if (id % 10 > 4) {
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
  const realName = `[${mapType}] ${Math.floor(id / 10)}-${id % 10} ${$map ? $map.api_name : '???'}${rankText}`
  return (
    <div>
      <div>
        <span>
          {realName}
        </span>
      </div>
      <div>
        <div className="hp-progress">
          <ProgressBar
            bsStyle={getHpStyle((res / max) * 100)}
            now={(res / max) * 100}
            label={<div style={{ position: 'absolute', width: '100%' }}>{res} / {max}</div>}
          />
        </div>
      </div>
    </div>
  )
}

// NOTE: the now in maphp object is the reduced hp, not the same meaning as now_hp
// chiba loves you!
// TODO: correct this ambiguous variable during next event

export const reactClass = connect(
  (state, props) => ({
    $maps: state.const.$maps,
    maps: state.info.maps,
  })
)(class PoiPluginMapHp extends Component {
  constructor(props) {
    super(props)
    this.state = {
      clearedVisible: false,
    }
  }
  handleSetClickValue = () => {
    this.setState({ clearedVisible: !this.state.clearedVisible })
  }
  render() {
    const { $maps, maps } = this.props
    const totalMapHp = []
    forEach(maps, (map) => {
      if (map != null) {
        const { api_eventmap, api_id } = map
        const $map = $maps[map.api_id]
        if (map.api_eventmap) {
          // Event Map
          const currentHp = map.api_cleared > 0 ?
            api_eventmap.api_max_maphp :
            api_eventmap.api_max_maphp - api_eventmap.api_now_maphp
          totalMapHp.push({
            id: api_id,
            now: currentHp,
            max: api_eventmap.api_max_maphp,
            rank: api_eventmap.api_selected_rank,
          })
        } else if ($map && $map.api_required_defeat_count != null) {
          const currentHp = typeof map.api_defeat_count !== 'undefined' && map.api_defeat_count !== null ?
            map.api_defeat_count :
            $map.api_required_defeat_count
          totalMapHp.push({
            id: api_id,
            now: currentHp,
            max: $map.api_required_defeat_count,
          })
        }
      }
    })
    const mapHp = totalMapHp.filter(({ id, now, max }) => {
      const res = max - now
      if (res === 0 && (id % 10 < 5 || !this.state.clearedVisible)) {
        return false
      }
      return true
    })
    return (
      <div id="map-hp" className="map-hp">
        <link rel="stylesheet" href={join(__dirname, 'assets', 'map-hp.css')} />
        { totalMapHp.length === 0 ?
          <div>{__('Click Sortie to get infromation')}</div>
          :
          <div>
            <div style={{ display: 'flex', marginLeft: 15, marginRight: 15 }}>
              <Input
                type="checkbox"
                label={__('Show cleared EO map')}
                checked={this.state.clearedVisible}
                onClick={this.handleSetClickValue}
              />
            </div>
            <div>
              {
                mapHp.map(map =>
                  (<MapHpRow
                    key={map.id}
                    map={map}
                    $map={$maps[map.id]}
                  />)
                )
              }
            </div>
          </div>
        }
      </div>
    )
  }
})

