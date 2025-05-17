// クライアントコンポーネントのインポート
import ClientPage from '../../components/Pages/clientHeatmap';

// hooks
import { usePrefectureDataPreparation } from '@/hooks/usePrefectureDataPreparation';
import { PlotData } from 'plotly.js'; // Plotlyの型をインポート

// ScatterDataのプロパティを持つことを期待する型を定義
// PlotDataはx, yを持つ基本的なトレースの型の一つ
interface ScatterTrace extends PlotData {
  x: string[];
  y: number[];
  name: string;
}

export default async function HeatmapPage({ params }: { params: { wave: string } }) {
  const { preparePrefectureData } = usePrefectureDataPreparation();
  const wave = params.wave;
  // usePrefectureDataPreparationフックを使ってデータを取得・整形
  const { prefectures, prefectureData, dataCount, isEmpty } = await preparePrefectureData(wave);

  // データが空の場合はエラーメッセージを表示
  if (isEmpty) {
    return (
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統のヒートマップ</h1>
        <div className="w-full aspect-[16/9] min-h-[600px] border border-gray-300 rounded-lg bg-white p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 font-bold mb-2">データを取得できませんでした</p>
            <p className="text-gray-600">系統データの形式に問題がある可能性があります。</p>
          </div>
        </div>
      </div>
    );
  }

  // 全ての週のリストを取得 (ヒートマップのX軸用)
  // prefectureData内の各plotDataのx軸から一意な日付を取得しソート
  const allWeeks = [...new Set(
    prefectureData.flatMap(pd => 
      pd.plotData.flatMap((plot) => {
        // plotがScatterTrace型であり、xプロパティを持つことを確認
        const scatterPlot = plot as ScatterTrace;
        return scatterPlot.x || []; 
      })
    )
  )].sort((a, b) => {
    const [yearA, weekNoA] = a.replace('週', '').split('/').map(Number);
    const [yearB, weekNoB] = b.replace('週', '').split('/').map(Number);
    if (yearA !== yearB) return yearA - yearB;
    return weekNoA - weekNoB;
  });

  // 全ての系統のリストを取得 (デバッグ用、または必要に応じてY軸のベースとして使用)
  const allLineagesFromHook = [...new Set(
    prefectureData.flatMap(pd => 
      pd.plotData.map((plot) => (plot as ScatterTrace).name || '不明な系統')
    )
  )];

  // 各都道府県ごとにヒートマップデータを作成
  const heatmapDataByPrefecture = prefectures.map(prefectureName => {
    // 対象の都道府県のデータを取得
    const currentPrefectureData = prefectureData.find(pd => pd.prefecture === prefectureName);
    const currentPlotData = currentPrefectureData?.plotData as ScatterTrace[] | undefined;

    const lineagesForPrefecture = currentPlotData 
      ? currentPlotData.map(plot => plot.name) 
      : ['データなし'];

    // z配列は2次元配列（ヒートマップの値を格納）
    // 縦軸（y）は系統、横軸（x）は日付
    const z = lineagesForPrefecture.map(lineage => {
      // 現在の系統に対応するplotDataを探す
      const plotForLineage = currentPlotData?.find(plot => plot.name === lineage);
      
      // 全ての週に対して、この系統の割合をマッピング
      return allWeeks.map(week => {
        if (!plotForLineage || !plotForLineage.x || !plotForLineage.y) {
          return 0; // データがない場合は0
        }
        // plotForLineage.x は string[] 型、plotForLineage.y は number[] 型と想定
        const xData = plotForLineage.x; // 型アサーションにより直接アクセス可能に
        const yData = plotForLineage.y; // 型アサーションにより直接アクセス可能に
        const weekIndex = xData.indexOf(week);
        // 割合は既に正規化されているので、100を掛けてパーセントにする
        return weekIndex !== -1 ? yData[weekIndex] * 100 : 0; 
      });
    });

    return {
      prefecture: prefectureName,
      lineages: lineagesForPrefecture,
      heatmapData: {
        z,
        x: allWeeks, // X軸は全ての週
        y: lineagesForPrefecture, // Y軸は現在の都道府県の系統
        type: 'heatmap',
        colorscale: 'Viridis',
        name: prefectureName,
        showscale: true,
        colorbar: {
          title: {
            text: '割合 (%)'
          }
        }
      }
    };
  });

  return (
    <ClientPage
      wave={wave}
      prefectures={prefectures}
      heatmapDataByPrefecture={heatmapDataByPrefecture}
      dataCount={dataCount}
      dates={allWeeks} // 全ての週のリストを渡す
      lineages={allLineagesFromHook} // 全ての系統のリストを渡す
    />
  );
}