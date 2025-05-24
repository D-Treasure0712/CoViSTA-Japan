'use client';

import { useState, useEffect } from 'react';
import { Data, Layout } from 'plotly.js';
import PlotComponent from '../../components/PlotComponent';
import { PullDownMenu } from '../../components/pullDownMenu';
import { HeatmapClientProps } from '@/types/dataType';

export default function ClientPage({ 
  wave, 
  prefectures, 
  heatmapDataByPrefecture, 
  dataCount,
  dates,
  lineages
}: HeatmapClientProps) {
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>(
    prefectures.length > 0 ? prefectures[0] : ''
  );

  // 選択された都道府県のデータを取得
  const selectedData = heatmapDataByPrefecture.find(
    item => item.prefecture === selectedPrefecture
  );
  
  // 選択された都道府県の系統リスト
  const selectedLineages = selectedData?.lineages || [];

  // 基本レイアウト
  const layout: Partial<Layout> = {
    title: {
      text: `第${wave}波における${selectedPrefecture}の系統別割合`,
      font: {
        color: '#000000',
        size: 24
      }
    },
    xaxis: {
      title: {
        text: '週',
        font: {
          color: '#000000',
          size: 14
        }
      },
      tickfont: {
        color: '#000000',
        size: 12
      }
    },
    yaxis: {
      title: {
        text: '系統',
        font: {
          color: '#000000',
          size: 14
        }
      },
      tickfont: {
        color: '#000000',
        size: 12
      }
    },
    height: 800,
    autosize: true,
    margin: {
      t: 100,
      r: 20,
      b: 100,
      l: 100
    },
    font: {
      color: '#000000',
      family: 'Arial, sans-serif',
      size: 12
    }
  };

  return (
    <div className="p-8 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統のヒートマップ</h1>
      <p className="mb-4 text-amber-700">注意: CSVファイルのインポート方法に問題があり、系統名が正しく表示されていない可能性があります。</p>
      
      <PullDownMenu 
        prefectures={prefectures} 
        selectedPrefecture={selectedPrefecture} 
        setSelectedPrefecture={setSelectedPrefecture}
      />
      
      <div className="w-full aspect-[16/9] min-h-[600px] border border-gray-300 rounded-lg bg-white p-4">
        {selectedData ? (
          <PlotComponent
            data={[selectedData.heatmapData] as unknown as Data[]}
            layout={layout}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">データがありません</p>
          </div>
        )}
        
        {/* デバッグ: Prismaからデータが取得できているか表示 */}
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          取得データ数: {dataCount} | 日付数: {dates.length} | 系統数: {lineages.length} | 都道府県数: {prefectures.length}
        </div>
        
        {/* この都道府県の系統数を表示 */}
        <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
          {selectedPrefecture}の系統数: {selectedLineages.length}
        </div>
      </div>
    </div>
  );
}