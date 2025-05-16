import { prisma } from '@/lib/prisma';
import { Layout, Data } from 'plotly.js';
import PlotComponent from '../../components/PlotComponent';
import { CovidDataWithRelations } from '@/types/dataType';
import { useCovidData } from '@/hooks/useCovidData';

const { fetchWaveData } = useCovidData();

export default async function HeatmapPage({ params }: { params: { wave: string } }) {
  const wave = await Promise.resolve(params.wave);
  const data = await fetchWaveData(wave);
  
  // データが空の場合はエラーメッセージを表示
  if (data.length === 0) {
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
  
  // データを整形（表示対象を制限）
  const prefectures = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.prefecture.name))];
  const dates = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.date.toISOString().split('T')[0]))].sort();
  let lineages = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.lineage.name))] as string[];
  
  // データが日付形式になっている可能性があることをログに出力
  const possibleDateLineages = lineages.filter(name => /^\d{4}\/\d{1,2}$/.test(name));
  if (possibleDateLineages.length > 0) {
    console.log(`警告: ${possibleDateLineages.length}個の系統名が日付形式です`);
  }
  
  // 出現頻度が高い系統のみを表示（パフォーマンス向上のため）
  if (lineages.length > 10) {
    // 各系統の出現回数をカウント
    const lineageCounts = lineages.map(lineage => {
      const count = data.filter(d => d.lineage.name === lineage).length;
      return { lineage, count };
    });
    
    // 出現回数で降順ソートして上位5のみを選択
    lineageCounts.sort((a, b) => b.count - a.count);
    lineages = lineageCounts.slice(0, 10).map(item => item.lineage);
    console.log(`表示する系統を${lineages.length}個に制限しました`);
  }

  // 系統が見つからない場合はダミーデータを作成
  if (lineages.length === 0) {
    return (
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統のヒートマップ</h1>
        <p className="mb-4 text-amber-700">注意: CSVファイルのインポート方法に問題があり、系統名が正しく表示されていない可能性があります。</p>
        <div className="w-full aspect-[16/9] min-h-[600px] border border-gray-300 rounded-lg bg-white p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">有効な系統データが見つかりませんでした</p>
            <p className="text-gray-400 text-sm mt-2">系統のフィルタリング条件を確認してください</p>
          </div>
        </div>
      </div>
    );
  }



  // 各系統（lineage）ごとにヒートマップデータを作成
  // lineages配列内の各系統に対して処理を実行
  const heatmapData = prefectures.map(prefecture => {
    // z配列は2次元配列（ヒートマップの値を格納）
    // 縦軸（y）は系統、横軸（x）は日付
    const z = lineages.map(lineage => {
      // 各都道府県に対して、すべての日付でのデータポイントを生成
      return dates.map(date => {
        // 系統、都道府県、日付の組み合わせに一致するデータを検索
        const entry = data.find((d: CovidDataWithRelations) => 
          d.prefecture.name === prefecture && 
          d.lineage.name === lineage && 
          d.date.toISOString().split('T')[0] === date
        );
        // データが存在する場合はその比率をパーセント表示に変換して返す、存在しない場合は0を返す
        return entry ? entry.ratio * 100 : 0;
      });
    });

    // Plotly.jsに渡すヒートマップ設定オブジェクトを返す
    return {
      z, // 上で生成した2次元配列をセット
      x: dates.map(d => {
        // 日付データを「年/週番号週」の形式に変換
        const date = new Date(d as string);
        // 月初からの経過日数と月初の曜日から週番号を計算
        const weekNumber = Math.ceil((date.getDate() - 1 + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
        return `${date.getFullYear()}/${weekNumber}週`;
      }),
      y: lineages, // y軸には都道府県名を設定
      type: 'heatmap' as const, // グラフタイプはヒートマップ
      colorscale: 'Viridis', // カラースケールはViridis（青紫〜黄緑のグラデーション）
      name: prefectures, // 系統名を名前として設定
      visible: false, // 初期状態では非表示（後で最初の要素のみ表示に変更）
      showscale: true, // カラースケールを表示する
      colorbar: {
        title: {
          text: '割合 (%)' // カラーバーのタイトルを設定
        }
      }
    };
  });

  // 最初の系統のみを表示
  if (heatmapData.length > 0) {
    heatmapData[0].visible = true;
  }

  // ボタンの設定
  const updatemenus = [{
    buttons: prefectures.map((prefecture, index) => ({
      method: 'update' as const,
      args: [
        {'visible': heatmapData.map((_, i) => i === index)},
        {'title.text': `第${wave}波における${prefecture}の系統別割合`}
      ],
      label: prefecture
    })),
    direction: 'down' as const,
    showactive: true,
    x: 0.1,
    xanchor: 'left' as const,
    y: 1.2,
    yanchor: 'top' as const
  }];

  const layout: Partial<Layout> = {
    title: {
      text: `第${wave}波における${lineages[0] || ''}の割合`,
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
    updatemenus,
    height: 800,
    width: 1000,
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
      <div className="w-full aspect-[16/9] min-h-[600px] border border-gray-300 rounded-lg bg-white p-4">
        <PlotComponent
          data={heatmapData as unknown as Data[]}
          layout={layout}
        />
        {/* デバッグ: Prismaからデータが取得できているか表示 */}
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          取得データ数: {data.length} | 日付数: {dates.length} | 系統数: {lineages.length} | 都道府県数: {prefectures.length}
        </div>
      </div>
    </div>
  );
}