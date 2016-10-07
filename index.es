import React, { Component } from 'react'
import { join } from 'path-extra'
import { connect } from 'react-redux'
import { readJsonSync } from 'fs-extra'
import { forEach } from 'lodash'
import { ProgressBar, Input } from 'react-bootstrap'
import shallowCompare from 'react-addons-shallow-compare'
const { i18n, ROOT } = window

const mapRanks = ['', ` ${i18n.others.__('丙')}`, ` ${i18n.others.__('乙')}`, ` ${i18n.others.__('甲')}`]

const __ = i18n["poi-plugin-map-hp"].__.bind(i18n["poi-plugin-map-hp"])

function getHpStyle(percent) {
  if (percent <= 25) {
    return 'danger'
  } else if (percent <= 50) {
    return 'warning'
  } else if (percent <= 75) {
    return 'info'
  } else {
    return 'success'
  }
}

class MapHpRow extends Component {
  render() {
    const {mapInfo: [id, now, max, rank], $maps} = this.props
    const rankText = mapRanks[rank] || ''
    const res = max - now
    const realName = (id > 200 ? '[Event] ' : id % 10 > 4 ? '[Extra] ' : '[Normal] ') +
      `${Math.floor(id / 10)}-${id % 10}` +
      ` ${$maps[id] ? $maps[id].api_name : '???'}${rankText}`
    return (
      <div>
        <div>
          <span>
            {realName}
          </span>
        </div>
        <div>
          <div className="hp-progress">
            <ProgressBar bsStyle={getHpStyle(res / max * 100)}
                         now={res / max * 100}
                         label={<div style={{position: "absolute", width: '100%'}}>{res} / {max}</div>}
            />
          </div>
        </div>
      </div>
    )
  }
}

export const reactClass = connect(
  state => ({
    $maps: state.const.$maps,
    maps: state.info.maps,
  }),
  null, null, { pure: false }
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
    const { $maps } = this.props
    const maps = this.props.maps
    const totalMapHp = []
    forEach(maps, (mapInfo) => {
      if (mapInfo != null) {
        if (mapInfo.api_eventmap) {
          const {api_eventmap} = mapInfo
          // Event Map
          const currentHp = mapInfo.api_cleared > 0 ?
            api_eventmap.api_max_maphp :
            api_eventmap.api_max_maphp - api_eventmap.api_now_maphp
          totalMapHp.push([mapInfo.api_id, currentHp, api_eventmap.api_max_maphp, api_eventmap.api_selected_rank])
        } else {
          if ($maps[mapInfo.api_id] && $maps[mapInfo.api_id].api_required_defeat_count != null) {
            const currentHp = typeof mapInfo.api_defeat_count != "undefined" && mapInfo.api_defeat_count !== null ?
              mapInfo.api_defeat_count :
              $maps[mapInfo.api_id].api_required_defeat_count
            totalMapHp.push([mapInfo.api_id, currentHp, $maps[mapInfo.api_id].api_required_defeat_count])
          }
        }
      }
    })
    const mapHp = totalMapHp.filter((mapInfo) => {
      const [id, now, max] = mapInfo
      const res = max - now
      if ((res == 0 && id % 10 < 5) ||
          (!this.state.clearedVisible && res == 0)) {
        return false
      }
      return true
    })
    return (
      <div id='map-hp' className='map-hp'>
        <link rel="stylesheet" href={join(__dirname, 'assets', 'map-hp.css')} />
        { totalMapHp.length == 0 &&
          <div>{__("Click Sortie to get infromation")}</div> }
        { totalMapHp.length != 0 &&
          <div>
            <div style={{display: 'flex', marginLeft: 15, marginRight: 15}}>
              <Input type='checkbox' ref='clearedVisible' label={__("Show cleared EO map")} checked={this.state.clearedVisible} onClick={this.handleSetClickValue} />
            </div>
            <div>
              { mapHp.length != 0 && mapHp.map((mapInfo) => {
                const id = mapInfo[0]
                return (
                  <MapHpRow key={id} mapInfo={mapInfo} $maps={$maps} />
                )
              })}
            </div>
          </div> }
      </div>
    )
  }
})

export function reducer(state, action) {
  if (!state) {
    return {
      finalHps: readJsonSync(`${__dirname}/assets/finalHP.json`),
    }
  }
  return state
}
