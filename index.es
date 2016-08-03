import React, { Component } from 'react'
import { join } from 'path-extra'
import { connect } from 'react-redux'
import { readJsonSync } from 'fs-extra'
import { ProgressBar, Input } from 'react-bootstrap'
const { i18n, ROOT } = window


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
    let [id, now, max] = this.props.mapInfo
    let res = max - now
    let realName = (id > 200 ? '[Event] ' : id % 10 > 4 ? '[Extra] ' : '[Normal] ') +
      `${Math.floor(id / 10)}-${id % 10}` +
      ` ${$maps[id].api_name}`
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
    maps: state.info.maps
  }),
  null, null, { pure: false }
)(class PoiPluginMapHp extends Component {
  constructor(props) {
    super(props)
    this.state = {
      clearedVisible: false
    }
  }
  handleSetClickValue = () => {
    this.setState({ clearedVisible: !this.state.clearedVisible })
  }
  render() {
    const { $maps, maps } = this.props
    let totalMapHp = []
    for (const mapInfo of maps) {
      if (mapInfo !== null) {
        if (mapInfo.api_eventmap) {
          // Activity Map
          const currentHp = mapInfo.api_cleared > 0 ?
            mapInfo.api_eventmap.api_max_maphp :
            mapInfo.api_eventmap.api_max_maphp - mapInfo.api_eventmap.api_now_maphp
          totalMapHp.push([mapInfo.api_id, currentHp, mapInfo.api_eventmap.api_max_maphp])
        } else {
          if (typeof $maps[mapInfo.api_id].api_required_defeat_count != "undefined" && $maps[mapInfo.api_id].api_required_defeat_count !== null) {
            const currentHp = typeof mapInfo.api_defeat_count != "undefined" && mapInfo.api_defeat_count !== null ?
              mapInfo.api_defeat_count :
              $maps[mapInfo.api_id].api_required_defeat_count
            totalMapHp.push([mapInfo.api_id, currentHp, $maps[mapInfo.api_id].api_required_defeat_count])
          }
        }
      }
    }
    let mapHp = []
    for (const mapInfo of totalMapHp) {
      let [id, now, max] = mapInfo
      let res = max - now
      if ((res == 0 && id % 10 < 5) ||
          (!this.state.clearedVisible && res == 0)) {
        continue
      }
      mapHp.push(mapInfo)
    }
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
              { mapHp.length != 0 && mapHp.map(mapInfo => React.cloneElement(<MapHpRow mapInfo={mapInfo} $maps={this.props.$maps} />)) }
            </div>
          </div> }
      </div>
    )
  }
})
