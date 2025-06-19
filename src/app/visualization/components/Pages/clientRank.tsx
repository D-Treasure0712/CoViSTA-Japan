'use client';

import { useState } from 'react';
import { Layout, Data } from 'plotly.js';
import PlotComponent from '../PlotComponent';
import { PullDownMenu } from '../pullDownMenu';
import { RankDataWithRelations } from '@/types/dataType';

interface ClientRankProps {
  wave: string;
  prefectures: string[];
  rankData: RankDataWithRelations[];
}

export default function ClientRank({ wave, prefectures, rankData }: ClientRankProps) {
  // 全国が利用可能であればそれを、なければ最初の都道府県を選択
  const defaultPrefecture = prefectures.includes('全国') ? '全国' : prefectures[0] || '東京都';
  const [selectedPrefecture, setSelectedPrefecture] = useState(defaultPrefecture);

  // 選択された都道府県のデータをフィルタリング
  const filteredData = rankData.filter(d => d.prefecture.name === selectedPrefecture);

  if (filteredData.length === 0) {
    return (
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統毎の順位のグラフ</h1>
        <PullDownMenu
          prefectures={prefectures}
          selectedPrefecture={selectedPrefecture}
          setSelectedPrefecture={setSelectedPrefecture}
        />
        <div className="w-full aspect-[16/9] min-h-[600px] border border-gray-300 rounded-lg bg-white p-4 flex items-center justify-center mt-4">
          <div className="text-center">
            <p className="text-red-500 font-bold mb-2">選択された都道府県のランクデータが見つかりません</p>
            <p className="text-gray-600">別の都道府県を選択してください</p>
          </div>
        </div>
      </div>
    );
  }

  // データを整形
  const dates = [...new Set(filteredData.map(d => d.date))].sort();
  const lineages = [...new Set(filteredData.map(d => d.lineage.name))];

  // 各系統の出現頻度で上位10系統に制限
  const lineageFrequency = lineages.map(lineage => {
    const count = filteredData.filter(d => d.lineage.name === lineage && d.rank !== null).length;
    return { lineage, count };
  }).sort((a, b) => b.count - a.count);
  
  const topLineages = lineageFrequency.slice(0, 10).map(item => item.lineage);

  // Plotly.jsのデータ形式に変換（欠損値を除外）
  const plotData = topLineages.map((lineage, index) => {
    const lineageData = filteredData.filter(d => d.lineage.name === lineage && d.rank !== null);
    
    const xValues = lineageData.map(d => d.date);
    const yValues = lineageData.map(d => d.rank!);
    
    return {
      x: xValues,
      y: yValues,
      name: lineage,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      line: { 
        shape: 'linear' as const,
        width: 2,
        color: `hsl(${(index * 36) % 360}, 70%, 50%)`
      },
      marker: {
        size: 6,
        color: `hsl(${(index * 36) % 360}, 70%, 50%)`
      },
      connectgaps: false, // 欠損値の箇所で線を切断
      hovertemplate: `<b>${lineage}</b><br>` +
                     `日付: %{x}<br>` +
                     `順位: %{y}<br>` +
                     `<extra></extra>`
    };
  });

  const layout: Partial<Layout> = {
    title: {
      text: `第${wave}波における流行系統の順位推移（${selectedPrefecture}）`,
      font: {
        color: '#000000',
        size: 20
      }
    },
    xaxis: {
      title: {
        text: '年/週',
        font: {
          color: '#000000',
          size: 14
        }
      },
      tickfont: {
        color: '#000000',
        size: 11
      },
      gridcolor: '#e5e5e5',
      linecolor: '#000000',
      showgrid: true,
      tickangle: -45
    },
    yaxis: {
      title: {
        text: '順位',
        font: {
          color: '#000000',
          size: 14
        }
      },
      autorange: 'reversed', // 順位なので1位が上に来るように反転
      tickmode: 'linear',
      tick0: 1,
      dtick: 1,
      tickfont: {
        color: '#000000',
        size: 11
      },
      gridcolor: '#e5e5e5',
      linecolor: '#000000',
      showgrid: true
    },
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff',
    showlegend: true,
    height: 600,
    margin: {
      t: 80,
      r: 20,
      b: 100,
      l: 60
    },
    font: {
      color: '#000000',
      size: 11
    },
    legend: {
      font: {
        color: '#000000',
        size: 10
      },
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#cccccc',
      borderwidth: 1,
      x: 1.02,
      y: 1
    },
    hovermode: 'x unified'
  };

  return (
    <div className="p-8 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統毎の順位のグラフ</h1>
      <p className="mb-4 text-blue-600">注意: 順位が欠損している週は表示されていません。線が途切れている箇所は欠損値を表します。</p>
      
      <PullDownMenu
        prefectures={prefectures}
        selectedPrefecture={selectedPrefecture}
        setSelectedPrefecture={setSelectedPrefecture}
      />
      
      <div className="w-full border border-gray-300 rounded-lg bg-white p-4 mt-4">
        <PlotComponent
          data={plotData as unknown as Data[]}
          layout={{
            ...layout,
            autosize: true,
          }}
        />
        <div className="mt-4 text-sm text-gray-600 border-t pt-2">
          データ統計: 選択都道府県データ数 {filteredData.length} | 日付数 {dates.length} | 表示系統数 {topLineages.length}/{lineages.length}
          <br />
          欠損値を除外して表示しています。線が途切れている部分は該当する週に順位データが存在しないことを示します。
        </div>
      </div>
    </div>
  );
}