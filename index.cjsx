Promise = require 'bluebird'
async = Promise.coroutine
request = Promise.promisifyAll require('request')
{relative, join} = require 'path-extra'
fs = require 'fs-extra'
{_, $, $$, React, ReactBootstrap, ROOT, resolveTime, layout, toggleModal} = window
{Table, ProgressBar, Grid, Input, Col, Alert} = ReactBootstrap
{APPDATA_PATH, SERVER_HOSTNAME} = window

window.addEventListener 'layout.change', (e) ->
  {layout} = e.detail
getHpStyle = (percent) ->
  if percent <= 25
    'danger'
  else if percent <= 50
    'warning'
  else if percent <= 75
    'info'
  else
    'success'
mapName = [
  ["1-1 鎮守府正面海域", "1-2 南西諸島沖", "1-3 製油所地帯沿岸", "1-4 南西諸島防衛線", "1-5 [Extra] 鎮守府近海", "1-6 [Extra Operation] 鎮守府近海航路"],
  ["2-1 カムラン半島", "2-2 バシー島沖", "2-3 東部オリョール海", "2-4 沖ノ島海域", "2-5 [Extra] 沖ノ島沖"],
  ["3-1 モーレイ海", "3-2 キス島沖", "3-3 アルフォンシーノ方面", "3-4 北方海域全域", "3-5 [Extra] 北方AL海域"],
  ["4-1 ジャム島攻略作戦", "4-2 カレー洋制圧戦", "4-3 リランカ島空襲", "4-4 カスガダマ沖海戦", "4-5 [Extra] カレー洋リランカ島沖"],
  ["5-1 南方海域前面", "5-2 珊瑚諸島沖", "5-3 サブ島沖海域", "5-4 サーモン海域", "5-5 [Extra] サーモン海域北方"],
  ["6-1 中部海域哨戒線", "6-2 MS諸島沖", "6-3 グアノ環礁沖海域"]
]
mapAll = []
mapUncleared = []
module.exports =
  name: 'map-hp'
  priority: 8
  displayName: [<FontAwesome key={0} name='heart' />, ' 海域血量']
  description: '海域血量'
  version: '1.0.0'
  author: 'Chiba'
  link: 'https://github.com/Chibaheit'
  reactClass: React.createClass
    getInitialState: ->
      mapHp: []
      clearedVisible: false
    handleResponse: (e) ->
      {method, path, body, postBody} = e.detail
      flag = false
      switch path
        when '/kcsapi/api_get_member/mapinfo'
          mapAll = []
          mapUncleared = []
          for mapInfo in body
            if mapInfo.api_id % 5 == 0 or (mapInfo.api_id + 4) % 10 == 0 or mapInfo.api_exboss_flag == 1
              mapAll.push [mapInfo.api_id, mapInfo.api_defeat_count]
            if mapInfo.api_exboss_flag == 1
              mapUncleared.push [mapInfo.api_id, mapInfo.api_defeat_count]
          flag = true
      return unless flag
      if @state.clearedVisible
        @setState
          mapHp: mapAll
      else
        @setState
          mapHp: mapUncleared

    handleSetClearedVisible: ->
      if @state.clearedVisible
        @setState
          mapHp: mapUncleared
          clearedVisible: false
      else
        @setState
          mapHp: mapAll
          clearedVisible: true

    componentDidMount: ->
      window.addEventListener 'game.response', @handleResponse

    render: ->
      <div>
        <link rel="stylesheet" href={join(relative(ROOT, __dirname), 'assets', 'map-hp.css')} />
        <div style={display: 'flex', marginLeft: 15, marginRight: 15}>
        <Input type='checkbox' ref='clearedVisible' label='显示已攻略EX图' checked={@state.clearedVisible} onClick={@handleSetClearedVisible} />
        </div>        
        <Table>
          <tbody>
          {
            for tmpMap, i in @state.mapHp
              tmpMax = 4
              if tmpMap[0] == 45
                tmpMax = 5
              tmpRes = tmpMax - tmpMap[1]
              [
                <tr key={i * 2}>
                  <td>{mapName[parseInt(tmpMap[0] / 10) - 1][tmpMap[0] % 10 - 1]}</td>
                </tr>
                <tr key={i * 2 + 1}>
                  <td className="hp-progress">
                    <ProgressBar bsStyle={getHpStyle tmpRes / tmpMax * 100}
                      now={tmpRes / tmpMax * 100}
                      label={"#{tmpRes} / #{tmpMax}"} />
                  </td>
                </tr>
              ]
          }
          </tbody>
        </Table>
      </div>
