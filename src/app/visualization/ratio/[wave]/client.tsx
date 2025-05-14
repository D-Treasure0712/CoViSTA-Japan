'use client';

import { useState } from 'react';
import { Layout, Data } from 'plotly.js';
import PlotComponent from '../../components/PlotComponent';

interface PrefectureDataItem {
  prefecture: string;
  plotData: Data[];
}

interface ClientPageProps {
  wave: string;
  prefectures: string[];
  prefectureData: PrefectureDataItem[];
  dataCount: number;
}

export default function ClientPage({ wave, prefectures, prefectureData, dataCount }: ClientPageProps) {
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>(prefectures.length > 0 ? prefectures[0] : '');

  // 系統ごとの色マップを定義
  const colors = [
    '#1f77b4', // 青
    '#ff7f0e', // オレンジ
    '#2ca02c', // 緑
    '#d62728', // 赤
    '#9467bd', // 紫
    '#8c564b', // 茶色
    '#e377c2', // ピンク
    '#7f7f7f', // グレー
    '#bcbd22', // 黄緑
    '#17becf', // 水色
    '#aec7e8', // 薄い青
    '#ffbb78', // 薄いオレンジ
    '#98df8a', // 薄い緑
    '#ff9896', // 薄い赤
    '#c5b0d5', // 薄い紫
    '#c49c94', // 薄い茶色
    '#f7b6d2', // 薄いピンク
    '#c7c7c7', // 薄いグレー
    '#dbdb8d', // 薄い黄緑
    '#9edae5'  // 薄い水色
  ];

  const layout: Partial<Layout> = {
    height: 600,
    margin: {
      t: 50,
      r: 50,
      b: 100,
      l: 60
    },
    font: {
      family: 'Arial, sans-serif',
      size: 14,
      color: '#000000'
    },
    yaxis: {
      tickformat: ',.0%',
      range: [0, 1],
      title: {
        text: '系統の割合（各週100%で正規化）',
        font: {
          size: 16,
          color: '#000000'
        }
      },
      tickfont: {
        color: '#000000',
        size: 12
      },
      gridcolor: '#e0e0e0',
      fixedrange: true,
      tickmode: 'linear',
      dtick: 0.1,
      autorange: false
    },
    xaxis: {
      title: {
        text: '週数（年/週）',
        font: {
          size: 16,
          color: '#000000'
        }
      },
      tickfont: {
        color: '#000000',
        size: 12
      },
      gridcolor: '#e0e0e0',
      tickangle: -45,
      type: 'category', // カテゴリタイプに設定（年/週の順に表示）
      dtick: 1, // すべての週を表示
      tickmode: 'linear' // 均等間隔で表示
    },
    legend: {
      traceorder: 'normal',
      font: {
        color: '#000000',
        size: 12
      },
      orientation: 'h',
      y: -0.25,
      x: 0.5,
      xanchor: 'center',
      title: {
        text: '系統名',
        font: {
          size: 14,
          color: '#000000'
        }
      }
    },
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff',
    hovermode: 'closest',
    barmode: 'stack',
    showlegend: true
  };

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