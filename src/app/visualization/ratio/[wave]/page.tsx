import { prisma } from '@/lib/prisma';
import { Layout, Data } from 'plotly.js';
import PlotComponent from '../../components/PlotComponent';
// クライアントコンポーネントのインポート
import ClientPage from './client';

interface Prefecture {
  id: number;
  name: string;
}

interface Lineage {
  id: number;
  name: string;
}

interface CovidDataWithRelations {
  id: number;
  date: Date;
  count: number;
  ratio: number;
  prefectureId: number;
  lineageId: number;
  wave: number;
  prefecture: Prefecture;
  lineage: Lineage;
}

interface LineageGroups {
  [key: string]: {
    x: string[];
    y: number[];
    name: string;
    type: 'scatter';
    stackgroup: string;
    hovertemplate: string;
  };
}

interface PrefectureDataItem {
  prefecture: string;
  plotData: Data[];
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
      ]
    });

    console.log(`Wave ${wave} - データ取得数: ${data.length}`);
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}

// 日付をYYYY/W形式に変換する関数
function formatWeek(date: Date) {
  const d = new Date(date);
  
  // ISO 8601形式の週番号を計算
  // 1月1日を含む週を第1週とする
  const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  
  return `${d.getFullYear()}/${weekNumber}週`;
}

// サーバーサイドでデータを処理する関数
async function preparePrefectureData(wave: string) {
  const data = await getData(wave);
  
  if (data.length === 0) {
    return { 
      prefectures: [],
      prefectureData: [],
      dataCount: 0,
      isEmpty: true
    };
  }
  
  // 都道府県の一覧を取得（制限を解除）
  const allPrefectures = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.prefecture.name))].sort();
  const prefectures = allPrefectures; // 制限を削除
  
  // 都道府県ごとのデータを作成
  const prefectureData = prefectures.map(prefecture => {
    const filteredData = data.filter((d: CovidDataWithRelations) => d.prefecture.name === prefecture);
    
    // 日付でグループ化
    const dateGroups = filteredData.reduce((acc: { [key: string]: CovidDataWithRelations[] }, item: CovidDataWithRelations) => {
      const weekKey = formatWeek(item.date);
      if (!acc[weekKey]) {
        acc[weekKey] = [];
      }
      acc[weekKey].push(item);
      return acc;
    }, {});

    // 系統名として日付形式を含める
    const lineageCounts = Object.values(dateGroups).flat().reduce((acc: {[key: string]: number}, item) => {
      const lineageName = item.lineage.name;
      acc[lineageName] = (acc[lineageName] || 0) + 1;
      return acc;
    }, {});
    
    // 上位系統の制限を解除
    const topLineages = Object.entries(lineageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    
    // 系統がない場合はダミーデータを作成
    if (topLineages.length === 0) {
      return {
        prefecture,
        plotData: [
          {
            x: ['2022/1週', '2022/2週', '2022/3週'],
            y: [0, 0, 0],
            name: 'データなし',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#cccccc' }
          } as Data
        ]
      };
    }
    
    console.log(`${prefecture} 上位系統: ${topLineages.join(', ')}`);

    // 各週での系統の割合を計算
    const lineageGroups: LineageGroups = {};
    
    // まず各週ごとに系統データを集める
    const weekData: { [week: string]: { [lineage: string]: number } } = {};
    
    // 週ごとにデータを整理
    Object.entries(dateGroups).forEach(([week, items]) => {
      if (!weekData[week]) {
        weekData[week] = {};
      }
      
      // 選択された上位系統だけをフィルタリング
      (items as CovidDataWithRelations[])
        .filter((item: CovidDataWithRelations) => topLineages.includes(item.lineage.name))
        .forEach((item: CovidDataWithRelations) => {
          weekData[week][item.lineage.name] = item.ratio;
        });
    });
    
    // 週ごとに合計を計算して正規化
    Object.entries(weekData).forEach(([week, lineages]) => {
      // 週の合計を計算
      const weekTotal = Object.values(lineages).reduce((sum, ratio) => sum + ratio, 0);
      
      // 各系統の正規化された比率を計算
      if (weekTotal > 0) {
        Object.entries(lineages).forEach(([lineageName, ratio]) => {
          // 正規化された比率
          const normalizedRatio = ratio / weekTotal;
          
          // 系統ごとのデータに追加
          if (!lineageGroups[lineageName]) {
            lineageGroups[lineageName] = {
              x: [],
              y: [],
              name: lineageName,
              type: 'scatter',
              stackgroup: 'one',
              hovertemplate: '%{y:.1%}<br>%{x}<extra></extra>'
            };
          }
          
          lineageGroups[lineageName].x.push(week);
          lineageGroups[lineageName].y.push(normalizedRatio);
        });
      }
    });
    
    // 各週のデータを合計が1.0(100%)になるか確認
    const weeks = Object.keys(weekData);
    weeks.forEach(week => {
      let weekSum = 0;
      Object.values(lineageGroups).forEach(lg => {
        const idx = lg.x.indexOf(week);
        if (idx !== -1) {
          weekSum += lg.y[idx];
        }
      });
      console.log(`Week ${week} - 合計比率: ${(weekSum * 100).toFixed(2)}%`);
    });

    return {
      prefecture,
      plotData: Object.values(lineageGroups).length > 0 ? (Object.values(lineageGroups) as Data[]) : [
        {
          x: ['2022/1週', '2022/2週', '2022/3週'],
          y: [0, 0, 0],
          name: 'データなし',
          type: 'scatter',
          mode: 'lines',
          line: { color: '#cccccc' }
        } as Data
      ]
    };
  });

  return {
    prefectures,
    prefectureData,
    dataCount: data.length,
    isEmpty: false
  };
}

export default async function Page({ params }: { params: { wave: string } }) {
  const wave = params.wave;
  const { prefectures, prefectureData, dataCount, isEmpty } = await preparePrefectureData(wave);
  
  if (isEmpty) {
    return (
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統の比率グラフ</h1>
        <div className="w-full aspect-[16/9] min-h-[600px] border border-gray-300 rounded-lg bg-white p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 font-bold mb-2">データを取得できませんでした</p>
            <p className="text-gray-600">系統データの形式に問題がある可能性があります。</p>
          </div>
        </div>
      </div>
    );
  }
  
  // クライアントコンポーネントに必要なデータを渡す
  return (
    <ClientPage 
      wave={wave} 
      prefectures={prefectures} 
      prefectureData={prefectureData} 
      dataCount={dataCount} 
    />
  );
} 