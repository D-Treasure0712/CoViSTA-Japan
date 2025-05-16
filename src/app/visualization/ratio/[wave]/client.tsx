'use client';

import { useState } from 'react';
import { Data } from 'plotly.js';
import PlotComponent from '../../components/PlotComponent';
import colors from '@/theme/rateColor';
import layout from '@/theme/rateLayout';
import { ClientPageProps } from '@/types/dataType';


export default function ClientPage({ wave, prefectures, prefectureData, dataCount }: ClientPageProps) {
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>(prefectures.length > 0 ? prefectures[0] : '');

  // 選択されている県のデータのみを表示
  const selectedPrefectureData = prefectureData.find(d => d.prefecture === selectedPrefecture);

  // プロット用にデータを加工する
  const enhancedPlotData = selectedPrefectureData?.plotData.map((trace, index) => {
    // stackgroupが設定されていることを確認
    if (trace.type === 'scatter') {
      // x軸のデータを確認し、時間形式（年/週数）に整形する
      const formattedX = Array.isArray(trace.x) 
        ? trace.x.map(x => typeof x === 'string' ? x : `${x}`) 
        : trace.x;

      return {
        ...trace,
        x: formattedX,
        stackgroup: 'one', // すべてのトレースを同じスタックグループに
        fill: 'tonexty',   // 積み上げエリアチャート用の設定
        line: {
          width: 0,        // 線の境界線を非表示に
          color: colors[index % colors.length]
        },
        fillcolor: colors[index % colors.length],
        mode: 'none',      // マーカーと線を非表示にして塗りつぶしのみに
        hoverinfo: 'name+y+x+text',
        hovertemplate: '<b>%{fullData.name}</b><br>%{x}<br>占有率: %{y:.1%}<extra></extra>',
        showlegend: true,  // 凡例に表示
        // lineage.nameが設定されていることを確保
        name: trace.name || `系統${index+1}`
      } as Data;
    }
    return trace;
  }) || [];

  return (
    <div className="p-8 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統の比率</h1>
      
      <div className="mb-6">
        <label htmlFor="prefecture-select" className="block text-sm font-medium text-black mb-2">
          表示する都道府県を選択
        </label>
        <select
          id="prefecture-select"
          value={selectedPrefecture}
          onChange={(e) => setSelectedPrefecture(e.target.value)}
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
        >
          {prefectures.map((prefecture) => (
            <option key={prefecture} value={prefecture} className="text-black">
              {prefecture}
            </option>
          ))}
        </select>
      </div>
      
      {selectedPrefectureData && (
        <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-2 text-black">{selectedPrefectureData.prefecture}</h2>
          <div className="w-full h-[600px]">
            <PlotComponent
              data={enhancedPlotData}
              layout={{
                ...layout,
                title: {
                  text: `第${wave}波 ${selectedPrefectureData.prefecture} の流行系統の比率`,
                  font: {
                    size: 18,
                    color: '#000'
                  }
                },
                autosize: true
              }}
            />
          </div>
        </div>
      )}
      
      {/* デバッグ: Prismaからデータが取得できているか表示 */}
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        取得データ数: {dataCount} | 都道府県数: {prefectures.length}
      </div>
    </div>
  );
} 