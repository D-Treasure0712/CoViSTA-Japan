'use client';

import { useEffect, useState, useMemo } from 'react';
import { Layout, Data } from 'plotly.js';
import { usePlotDataProcess } from '@/hooks/usePlotDataprocess';
import { usePlotLayout } from '@/hooks/usePlotLayout';

interface PlotComponentProps {
  data: Data[];
  layout: Partial<Layout>;
}

export default function PlotComponent({ data, layout }: PlotComponentProps) {
  const [mounted, setMounted] = useState(false);
  const [Plot, setPlot] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  const { enhancedData, dataError } = usePlotDataProcess(data);
  const { enhancedLayout } = usePlotLayout(layout)

  

  useEffect(() => {
    console.log('===== PLOTLY DEBUG INFO =====');
    console.log('Original Data:', JSON.stringify(data, null, 2));
    console.log('Enhanced Data:', JSON.stringify(enhancedData, null, 2));
    console.log('Layout:', JSON.stringify(layout, null, 2));
    console.log('===== END DEBUG INFO =====');

    // クライアントサイドでのみPlotlyを読み込む
    import('react-plotly.js').then((module) => {
      setPlot(() => module.default);
      setMounted(true);
    });
  }, [data, enhancedData, layout]);

  if (!mounted || !Plot) {
    return (
      <div className="w-full h-[600px] bg-white p-5 border border-gray-300 rounded-md flex justify-center items-center">
        <p className="text-black font-medium">グラフを読み込んでいます...</p>
      </div>
    );
  }



  const isDataEmpty = !Array.isArray(enhancedData) || enhancedData.length === 0;

  return (
    <div className="w-full h-[600px] bg-white p-5 border border-gray-300 rounded-md relative overflow-visible">
      {isDataEmpty ? (
        <div className="flex justify-center items-center h-full flex-col gap-2.5">
          <p className="text-black font-bold">データがありません</p>
        </div>
      ) : (
        <Plot
          data={enhancedData as any}
          layout={enhancedLayout as any}
          style={{
            width: '100%',
            height: '100%'
          }}
          config={{
            displayModeBar: true,
            displaylogo: false,
            responsive: true,
            scrollZoom: true,
          }}
        />
      )}
      <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="px-2.5 py-1.5 bg-gray-100 border border-black rounded cursor-pointer text-xs text-black font-medium"
        >
          {showDebug ? 'デバッグ情報を隠す' : 'デバッグ情報を表示'}
        </button>
      </div>
      
      {dataError && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-100/10 border border-red-500 rounded p-2.5 text-red-500">
          {dataError}
        </div>
      )}
      
      {showDebug && (
        <div className="absolute bottom-[50px] right-2.5 w-[300px] max-h-[400px] overflow-auto bg-white/90 border border-black p-2.5 text-[10px] whitespace-pre-wrap z-[1000] text-black">
          <h4 className="text-black font-bold mb-2">データ情報:</h4>
          <p className="text-black my-1">データセット数: {enhancedData.length}</p>
          {!isDataEmpty && (
            <>
              <p className="text-black my-1">データタイプ: {(enhancedData[0] as any)?.type || '不明'}</p>
              <div className="mt-2.5">
                <button
                  onClick={() => console.log('Debug Data:', enhancedData)}
                  className="py-0.5 px-1.5 text-[9px] bg-gray-100 border border-black rounded cursor-pointer text-black font-medium"
                >
                  データをコンソールに出力
                </button>
              </div>
              
              {enhancedData.map((trace: any, i) => (
                <div key={i}>
                  <p className="text-black font-bold mt-2">データセット {i+1}: {trace.name || '名前なし'}</p>
                  <p className="text-black">タイプ: {trace.type || '不明'}</p>
                  {trace.x && <p className="text-black">x値サンプル: {Array.isArray(trace.x) ? trace.x.slice(0, 3).join(', ') + '...' : 'なし'}</p>}
                  {trace.y && <p className="text-black">y値サンプル: {Array.isArray(trace.y) ? trace.y.slice(0, 3).join(', ') + '...' : 'なし'}</p>}
                  {trace.z && <p className="text-black">z値（ヒートマップ）: あり</p>}
                  <hr className="border-t border-gray-300 my-2" />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}