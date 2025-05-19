'use client';

import { useEffect, useMemo, useState } from 'react';

interface DominantLineage {
  week: string;
  lineage: string | null;
  ratio: number;
}

interface MajorLineageSummary {
  prefecture: string;
  dominantLineages: DominantLineage[];
}

interface MajorLineageComponentProps {
  prefectures: string[];
  weeks: string[];
  lineages: string[];
  summaryData: MajorLineageSummary[];
}

export default function MajorLineageComponent({
  prefectures,
  weeks,
  lineages,
  summaryData
}: MajorLineageComponentProps) {
  const [mounted, setMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [showCompact, setShowCompact] = useState(true);

  useEffect(() => {
    setMounted(true);
    // ウィンドウサイズを取得
    const updateWindowWidth = () => {
      setWindowWidth(window.innerWidth);
      // 常にコンパクト表示を使用
      setShowCompact(true);
    };
    
    updateWindowWidth();
    
    // リサイズイベントのリスナーを追加
    window.addEventListener('resize', updateWindowWidth);
    return () => window.removeEventListener('resize', updateWindowWidth);
  }, [weeks.length]);

  // 系統ごとに一貫した色を割り当てるための関数
  const getLineageColorMap = useMemo(() => {
    // 色のリスト (いくつかの明確に区別できる色)
    const colors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
      '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
      '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5'
    ];
    
    // 系統と色のマッピングを作成
    const colorMap: Record<string, string> = {};
    lineages.forEach((lineage, index) => {
      colorMap[lineage] = colors[index % colors.length];
    });
    
    return colorMap;
  }, [lineages]);

  // 系統ごとの色凡例
  const renderLegend = () => {
    return (
      <div className="mt-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">系統の凡例</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {lineages.map(lineage => (
            <div key={lineage} className="flex items-center">
              <div 
                className="w-4 h-4 mr-2" 
                style={{ backgroundColor: getLineageColorMap[lineage] || '#cccccc' }}
              />
              <span className="text-sm">{lineage}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 表形式でデータを表示（コンパクト版）
  const renderTable = () => {
    return (
      <>
        <div 
          className="overflow-x-auto border rounded-md"
          style={{ maxWidth: '100%' }}
        >
          <table className="w-full bg-white border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-2 py-2 border-b border-r text-left text-black font-medium bg-white" style={{ width: '100px' }}>都道府県</th>
                {weeks.map(week => (
                  <th 
                    key={week} 
                    className="border-b border-r text-center whitespace-nowrap text-black font-medium bg-white" 
                    style={{ 
                      width: '50px',
                      padding: '2px',
                      fontSize: '0.7rem'
                    }}
                  >
                    {week}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaryData.map(({ prefecture, dominantLineages }) => (
                <tr key={prefecture}>
                  <td className="px-2 py-1 border-b border-r font-medium whitespace-nowrap text-black">{prefecture}</td>
                  {weeks.map(week => {
                    const dominantData = dominantLineages.find(d => d.week === week);
                    const lineage = dominantData?.lineage || null;
                    const ratio = dominantData?.ratio || 0;
                    const bgColor = lineage ? getLineageColorMap[lineage] || '#cccccc' : '#f8f9fa';
                    
                    return (
                      <td 
                        key={`${prefecture}-${week}`} 
                        className="border-b border-r text-center"
                        style={{ 
                          backgroundColor: bgColor,
                          color: 'black',
                          padding: '2px',
                          fontSize: '0.65rem'
                        }}
                      >
                        {lineage ? (
                          <div className="font-medium">{lineage}</div>
                        ) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  // 色の明るさを計算する関数（コントラスト調整用）
  function getBrightness(color: string): number {
    // #rrggbb から RGB 値を取り出す
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // 明るさの計算 (YIQ式)
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full">
      {renderLegend()}
      
      <div className="w-full">
        <h2 className="text-xl font-semibold mb-3">都道府県別の主要流行系統推移</h2>
        {renderTable()}
      </div>
    </div>
  );
} 