'use client';

// Reactのフックをインポート
import { useEffect, useMemo, useState } from 'react';

// 1週ごとの主要系統情報の型定義
type DominantLineage = {
  week: string; // 年/週形式
  lineage: string | null; // 主要系統名（なければnull）
  ratio: number; // その系統の比率
};

// 都道府県ごとの主要系統推移データの型定義
type MajorLineageSummary = {
  prefecture: string; // 都道府県名
  dominantLineages: DominantLineage[]; // 週ごとの主要系統配列
};

// このコンポーネントが受け取るpropsの型定義
interface MajorLineageComponentProps {
  prefectures: string[]; // 都道府県名リスト
  weeks: string[];       // 年/週リスト
  lineages: string[];    // 系統名リスト
  summaryData: MajorLineageSummary[]; // 都道府県ごとの主要系統推移データ
}

// メインの可視化コンポーネント
export default function MajorLineageComponent({
  prefectures,
  weeks,
  lineages,
  summaryData
}: MajorLineageComponentProps) {
  // マウント済み判定（SSR対策）
  const [mounted, setMounted] = useState(false);
  // ウィンドウ幅（レスポンシブ用）
  const [windowWidth, setWindowWidth] = useState(0);
  // 表示モード（現状は常にコンパクト）
  const [showCompact, setShowCompact] = useState(true);

  // マウント時・リサイズ時の処理
  useEffect(() => {
    setMounted(true);
    // ウィンドウサイズ取得＆コンパクト表示固定
    const updateWindowWidth = () => {
      setWindowWidth(window.innerWidth);
      setShowCompact(true); // 今は常にtrue
    };
    updateWindowWidth();
    window.addEventListener('resize', updateWindowWidth);
    return () => window.removeEventListener('resize', updateWindowWidth);
  }, [weeks.length]);

  // 系統ごとに一貫した色を割り当てるマッピングを生成
  const getLineageColorMap = useMemo(() => {
    // 色リスト（最大20系統まで区別しやすい色）
    const colors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
      '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
      '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5'
    ];
    // 系統名→色のマッピングを作成
    const colorMap: Record<string, string> = {};
    lineages.forEach((lineage, index) => {
      colorMap[lineage] = colors[index % colors.length];
    });
    return colorMap;
  }, [lineages]);

  // 系統ごとの色凡例を表示する関数
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

  // 表形式で主要系統推移を表示する（都道府県×週）
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
                {/* 1列目: 都道府県名 */}
                <th className="px-2 py-2 border-b border-r text-left text-black font-medium bg-white" style={{ width: '100px' }}>都道府県</th>
                {/* 2列目以降: 各週 */}
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
              {/* 各都道府県ごとに1行 */}
              {summaryData.map(({ prefecture, dominantLineages }) => (
                <tr key={prefecture}>
                  <td className="px-2 py-1 border-b border-r font-medium whitespace-nowrap text-black">{prefecture}</td>
                  {/* 各週ごとに主要系統セルを表示 */}
                  {weeks.map(week => {
                    const dominantData = dominantLineages.find(d => d.week === week);
                    const lineage = dominantData?.lineage || null;
                    const ratio = dominantData?.ratio || 0;
                    // 系統ごとの色を背景色に
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
                        {/* 系統名を表示。なければ'-' */}
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

  // 色の明るさを計算する関数（コントラスト調整用・現状未使用）
  function getBrightness(color: string): number {
    // #rrggbb からRGB値を取得
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // YIQ式で明るさを算出
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  // SSR時はLoading表示
  if (!mounted) {
    return <div>Loading...</div>;
  }

  // メインの描画部分
  return (
    <div className="w-full">
      {/* 系統色の凡例 */}
      {renderLegend()}
      <div className="w-full">
        <h2 className="text-xl font-semibold mb-3">都道府県別の主要流行系統推移</h2>
        {/* 主要系統推移表 */}
        {renderTable()}
      </div>
    </div>
  );
}