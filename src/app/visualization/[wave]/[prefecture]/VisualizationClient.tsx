/**
 * @file src/app/visualization/[wave]/[prefecture]/VisualizationClient.tsx
 * @description
 * このファイルは、グラフ表示ページのクライアントコンポーネントです。
 * [修正点]
 * - 割合グラフのレイアウト設定(`layouts.ratio`)を変更しました。
 * - グラフのタイトルを「積み上げ面グラフ」に更新しました。
 * - 棒グラフ専用のプロパティである `barmode: 'stack'` を削除しました。
 */
'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Data, Layout } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface VisualizationClientProps {
  wave: string;
  prefecture: string;
  ratioData: Data[];
  heatmapData: Data[];
  rankData: Data[];
}

const GRAPHS = [
  { id: 'ratio', title: '割合グラフ' },
  { id: 'heatmap', title: 'ヒートマップ' },
  { id: 'rank', title: '順位グラフ' },
];

export default function VisualizationClient({
  wave,
  prefecture,
  ratioData,
  heatmapData,
  rankData,
}: VisualizationClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    const isFirst = currentIndex === 0;
    setCurrentIndex(isFirst ? GRAPHS.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    const isLast = currentIndex === GRAPHS.length - 1;
    setCurrentIndex(isLast ? 0 : currentIndex + 1);
  };
  
  const layouts = useMemo<Record<string, Partial<Layout>>>(() => ({
    ratio: {
      title: `流行系統の割合 (積み上げ面グラフ)`, // タイトルを更新
      // barmode: 'stack', // 棒グラフ専用のため削除
      xaxis: { title: '週' },
      yaxis: { title: '割合 (%)', range: [0, 100] },
      legend: { orientation: 'h', y: -0.3, yanchor: 'top' },
    },
    heatmap: {
      title: `流行系統の割合 (ヒートマップ)`,
      xaxis: { title: '週' },
      yaxis: { title: '系統', automargin: true },
    },
    rank: {
      title: `流行系統の順位推移 (上位10系統)`,
      xaxis: { title: '週' },
      yaxis: { title: '順位', autorange: 'reversed', dtick: 1, range: [20.5, 0.5] },
      legend: { orientation: 'h', y: -0.3, yanchor: 'top' },
    },
  }), []);

  const currentGraph = GRAPHS[currentIndex];
  const currentData = {
    ratio: ratioData,
    heatmap: heatmapData,
    rank: rankData,
  }[currentGraph.id];
  const currentLayout = layouts[currentGraph.id];

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <header className="p-4 sm:p-6 border-b border-gray-200">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
            {prefecture} - 第{wave}波
          </h1>
          <p className="text-base sm:text-lg text-indigo-600 font-semibold mt-1">
            {currentGraph.title}
          </p>
        </header>

        <main className="relative p-2 sm:p-4">
          <div className="w-full h-[65vh] min-h-[500px] transition-opacity duration-300 ease-in-out">
             <Plot
                data={currentData}
                layout={{
                  ...currentLayout,
                  autosize: true,
                  margin: { l: 70, r: 30, b: 150, t: 80 },
                  font: { family: 'sans-serif' }
                }}
                useResizeHandler={true}
                className="w-full h-full"
                config={{ responsive: true }}
              />
          </div>

          <button
            onClick={goToPrevious}
            className="absolute top-1/2 left-1 sm:left-2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-1 sm:p-2 shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 w-10 h-10 flex items-center justify-center text-xl font-bold text-gray-700"
            aria-label="前のグラフへ"
          >
            &lt;
          </button>
          <button
            onClick={goToNext}
            className="absolute top-1/2 right-1 sm:right-2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-1 sm:p-2 shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 w-10 h-10 flex items-center justify-center text-xl font-bold text-gray-700"
            aria-label="次のグラフへ"
          >
            &gt;
          </button>
        </main>

        <footer className="flex justify-center items-center p-4 space-x-3 border-t border-gray-200">
          {GRAPHS.map((graph, index) => (
            <button
              key={graph.id}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                currentIndex === index ? 'bg-indigo-600' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`${graph.title}を表示`}
            />
          ))}
        </footer>
      </div>
    </div>
  );
}
