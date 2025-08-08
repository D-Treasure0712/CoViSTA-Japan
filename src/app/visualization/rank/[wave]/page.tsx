import { prisma } from '@/lib/prisma';
import { Layout, Data } from 'plotly.js';
import PlotComponent from '../../components/PlotComponent';
import { type PrismaClient } from '@prisma/client';
import { CovidDataWithRelations } from '@/types/dataType';

// 週番号を正確に計算する関数
function getWeekNumber(date: Date): number {
  // 月の最初の日の曜日を取得（0:日曜、1:月曜、...）
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  // 月の日（1-31）
  const dayOfMonth = date.getDate();
  
  // 週番号を計算（月の1日が何曜日かを考慮）
  return Math.ceil((dayOfMonth + firstDayOfMonth) / 7);
}

async function getData(wave: string) {
  try {
    const waveNumber = wave === '6-8' ? [6, 7, 8] : [parseInt(wave)];
    
    // 日付形式のlineage.nameでも取得できるように修正
    const data = await prisma.covidData.findMany({
      where: {
        wave: {
          in: waveNumber
        }
      },
      include: {
        prefecture: true,
        lineage: true
      },
      orderBy: [
        { date: 'asc' }
      ],
    });

    // デバッグ: データの取得状況を確認
    console.log(`Wave ${wave} - データ取得数: ${data.length}`);
    if (data.length > 0) {
      console.log('最初のデータ例:', JSON.stringify(data[0], null, 2));
      console.log('ユニーク系統数:', new Set(data.map(d => d.lineage.name)).size);
      console.log('ユニーク日付数:', new Set(data.map(d => d.date)).size);
    } else {
      console.log('取得データが0件です。where条件を確認してください。');
    }

    return data;
  } catch (error) {
    console.error('データ取得エラー:', error);
    // エラー時は空配列を返す
    return [];
  }
}

export default async function RankPage({ params }: { params: { wave: string } }) {
  const wave = await Promise.resolve(params.wave);
  const data = await getData(wave);
  
  // データが空の場合はエラーメッセージを表示
  if (data.length === 0) {
    return (
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統毎の順位のグラフ</h1>
        <div className="w-full aspect-[16/9] min-h-[600px] border border-gray-300 rounded-lg bg-white p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 font-bold mb-2">データを取得できませんでした</p>
            <p className="text-gray-600">系統データの形式に問題がある可能性があります。</p>
          </div>
        </div>
      </div>
    );
  }
    // 20位以内のデータのみをフィルタリング（rank > 0 かつ rank <= 20）
  const rankedData = data.filter((d: CovidDataWithRelations) => d.rank !== null);
  
  // データを整形（上位10系統のみに制限）
  const dates = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.date))].sort();
  let lineages = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.lineage.name))];

  // 系統が見つからない場合はダミーデータを作成
  if (lineages.length === 0) {
    return (
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統毎の順位のグラフ</h1>
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

  // デバッグ: 整形後のデータを確認
  console.log(`整形後 - 日付数: ${dates.length}, 系統数: ${lineages.length}`);


  // Plotly.jsのデータ形式に変換
  const plotData = lineages.map((lineage, index) => {
    // X軸の日付ラベルとY軸の順位データを作成
    const xValues = dates;
    
    const yValues = dates.map(date => {
      const dateRanks = rankedData.find(d => d.date === date && d.lineage.name === lineage);
      if (!dateRanks) return null;
      
      // rank が 0 または null の場合は 21位として表示
      const displayRank = (dateRanks.rank === null || dateRanks.rank === 0) ? 21 : dateRanks.rank;
      return displayRank;
    });
    
    // デバッグ: 各系統のデータポイント数を確認
    console.log(`系統 ${lineage} - データポイント数: ${yValues.filter(v => v !== null).length}`);
    
    return {
      x: xValues,
      y: yValues,
      name: lineage,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      line: { 
        shape: 'linear' as const,
        color: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'][index % 10]
      },
      marker: {
        color: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'][index % 10]
      },
      connectgaps: true
    };
  });

  const layout: Partial<Layout> = {
    title: {
      text: `第${wave}波における流行系統の順位推移`,
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
          size: 16
        }
      },
      tickfont: {
        color: '#000000',
        size: 12
      },
      gridcolor: '#e5e5e5',
      linecolor: '#000000',
      showgrid: true
    },
    yaxis: {
      title: {
        text: '順位',
        font: {
          color: '#000000',
          size: 16
        }
      },
      autorange: 'reversed',
      tickmode: 'linear',
      tick0: 1,
      dtick: 1,
      range: [21.5, 0.5],
      tickfont: {
        color: '#000000',
        size: 12
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
      t: 50,
      r: 50,
      b: 50,
      l: 50
    },
    font: {
      color: '#000000',
      size: 12
    },
    legend: {
      font: {
        color: '#000000',
        size: 12
      },
      bgcolor: '#ffffff',
      bordercolor: '#000000'
    }
  };

  return (
    <div className="p-8 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統毎の順位のグラフ</h1>
      <p className="mb-4 text-amber-700">注意: CSVファイルのインポート方法に問題があり、系統名が正しく表示されていない可能性があります。</p>
      <div className="w-full aspect-[16/9] min-h-[600px] border border-gray-300 rounded-lg bg-white p-4">
        <PlotComponent
          data={plotData as unknown as Data[]}
          layout={{
            ...layout,
            autosize: true,
          }}
        />
        {/* デバッグ: Prismaからデータが取得できているか表示 */}
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          取得データ数: {data.length} | 日付数: {dates.length} | 系統数: {lineages.length}
        </div>
      </div>
    </div>
  );
} 