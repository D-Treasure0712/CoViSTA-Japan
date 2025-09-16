import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PrefectureSummaryComponent from '../components/PrefectureSummaryComponent';

export const dynamic = 'force-dynamic'

// 都道府県のインターフェース
interface Prefecture {
  id: number;
  name: string;
}

// 系統のインターフェース
interface Lineage {
  id: number;
  name: string;
}

// COVID-19データのインターフェース
interface CovidDataWithRelations {
  id: number;
  date: string; // date列は現在string型として年/週データを保持
  count: number;
  ratio: number;
  prefectureId: number;
  lineageId: number;
  wave: number;
  prefecture: Prefecture;
  lineage: Lineage;
}

interface CovidDataWithYearWeek extends CovidDataWithRelations {
	yearWeek: string;
}

interface PreparedData {
  prefectures: string[];
  weeks: string[];
  lineages: string[];
  summaryData: {
    prefecture: string;
    dominantLineages: {
      week: string;
      lineage: string | null;
      ratio: number;
    }[];
  }[];
}

// データを取得する関数
async function getData(wave: string): Promise<CovidDataWithRelations[]> {
  try {
    const waveNumber = wave === '6-8' ? [6, 7, 8] : [parseInt(wave)];
    
    // データベースからデータを取得
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

// 日付から年/週を取得する関数
function getYearWeek(dateInput: Date | string): string {
  // 入力タイプチェック - 文字列またはDate型
  if (typeof dateInput === 'string') {
    // 年/週形式をチェック (例: 2022/1)
    if (/^\d{4}\/\d{1,2}$/.test(dateInput)) {
      return dateInput; // すでに正しい形式ならそのまま返す
    }
    
    // Unix タイムスタンプかチェック
    if (/^\d+$/.test(dateInput)) {
      // ミリ秒単位のタイムスタンプとして解釈
      const timestamp = parseInt(dateInput, 10);
      dateInput = new Date(timestamp);
    } else {
      // 通常の日付文字列として解釈
      dateInput = new Date(dateInput);
    }
  }
  
  // このポイントで dateInput は Date オブジェクト
  if (!(dateInput instanceof Date) || isNaN(dateInput.getTime())) {
    console.warn(`無効な日付入力: ${dateInput}`);
    return '不明/不明';
  }
  
  const d = dateInput;
  const year = d.getFullYear();
  
  // 日付を文字列として取得 (YYYY-MM-DD)
  const dateString = d.toISOString().substring(0, 10);
  
  // 元のYYYY/WW形式に対応する特定の日付マッピングを定義
  const dateToWeekMap: {[key: string]: string} = {
    // 2021年
    '2021-12-31': '2021/52',
    
    // 2022年第6波
    '2022-01-07': '2022/1',
    '2022-01-14': '2022/2',
    '2022-01-21': '2022/3',
    '2022-01-28': '2022/4',
    '2022-02-04': '2022/5',
    '2022-02-11': '2022/6',
    '2022-02-18': '2022/7',
    '2022-02-25': '2022/8',
    '2022-03-04': '2022/9',
    '2022-03-11': '2022/10',
    '2022-03-18': '2022/11',
    '2022-03-25': '2022/12',
    '2022-04-01': '2022/13',
    '2022-04-08': '2022/14',
    '2022-04-15': '2022/15',
    '2022-04-22': '2022/16',
    '2022-04-29': '2022/17',
    '2022-05-06': '2022/18',
    '2022-05-13': '2022/19',
    '2022-05-20': '2022/20',
    '2022-05-27': '2022/21',
    '2022-06-03': '2022/22',
    '2022-06-10': '2022/23',
    '2022-06-17': '2022/24',
    
    // 2022年第7波
    '2022-06-24': '2022/25',
    '2022-07-01': '2022/26',
    '2022-07-08': '2022/27',
    '2022-07-15': '2022/28',
    '2022-07-22': '2022/29',
    '2022-07-29': '2022/30',
    '2022-08-05': '2022/31',
    '2022-08-12': '2022/32',
    '2022-08-19': '2022/33',
    '2022-08-26': '2022/34',
    '2022-09-02': '2022/35',
    '2022-09-09': '2022/36',
    '2022-09-16': '2022/37',
    '2022-09-23': '2022/38',
    '2022-09-30': '2022/39',
    '2022-10-07': '2022/40',
    
    // 2022年第8波
    '2022-10-14': '2022/41',
    '2022-10-21': '2022/42',
    '2022-10-28': '2022/43',
    '2022-11-04': '2022/44',
    '2022-11-11': '2022/45',
    '2022-11-18': '2022/46',
    '2022-11-25': '2022/47',
    '2022-12-02': '2022/48',
    '2022-12-09': '2022/49',
    '2022-12-16': '2022/50',
    '2022-12-23': '2022/51',
    '2022-12-30': '2022/52',
    '2023-01-06': '2023/1',
    '2023-01-13': '2023/2',
    '2023-01-20': '2023/3',
    '2023-01-27': '2023/4',
    '2023-02-03': '2023/5',
    
    // 2023年の追加週（未知の日付対応）
    '2023-02-10': '2023/6',
    '2023-02-17': '2023/7',
    '2023-02-24': '2023/8',
    '2023-03-03': '2023/9',
    '2023-03-10': '2023/10',
    '2023-03-17': '2023/11',
    '2023-03-24': '2023/12',
    '2023-03-31': '2023/13',
  };
  
  // 日付文字列に対応する年/週を返す
  if (dateToWeekMap[dateString]) {
    return dateToWeekMap[dateString];
  }
  
  // マッピングに存在しない場合（念のため）
  console.warn(`未知の日付: ${dateString}`);
  return `${year}/不明`;
}

// 都道府県別の週ごとの主要系統データを生成する関数
async function preparePrefectureSummaryData(wave: string): Promise<PreparedData> {
  const data = await getData(wave);
  
  if (data.length === 0) {
    console.error('データが見つかりません');
    return { prefectures: [], weeks: [], lineages: [], summaryData: [] };
  }
  
  // 都道府県のリストを取得（重複なし）
  const prefectures: string[] = Array.from(new Set(data.map((d: CovidDataWithRelations) => d.prefecture.name))).sort();
  
  // データベースのdate列は既に年/週形式のため、そのまま使用
  const weekData: CovidDataWithYearWeek[] = data.map((d: CovidDataWithRelations) => {
    // date列から年/週形式を取得、必要に応じて変換
    const yearWeek = getYearWeek(d.date);
    return {
      ...d,
      yearWeek 
    };
  });
  
  // 週のリストを取得（重複なし、ソート）
  const weeks = Array.from(new Set(weekData.map((d: CovidDataWithYearWeek) => d.yearWeek)))
    .sort((a, b) => {
      const [yearA, weekA] = a.split('/').map(Number);
      const [yearB, weekB] = b.split('/').map(Number);
      return yearA !== yearB ? yearA - yearB : weekA - weekB;
    });
  
  // すべての系統リスト（重複なし）
  const allLineages = Array.from(new Set(data.map((d: CovidDataWithRelations) => d.lineage.name))).sort();
  
  // 都道府県×週の行列を生成
  const summaryData = [];
  
  for (const prefecture of prefectures) {
    const prefectureData = weekData.filter((d: CovidDataWithRelations) => d.prefecture.name === prefecture);
    const weeklyDominantLineages = [];
    
    for (const week of weeks) {
      // その週のデータだけを取得
      const weekFilteredData = prefectureData.filter((d: CovidDataWithYearWeek) => d.yearWeek === week);
      
      if (weekFilteredData.length === 0) {
        // データがない場合は空データ
        weeklyDominantLineages.push({ week, lineage: null, ratio: 0 });
        continue;
      }
      
      // 系統ごとの比率を合計
      const lineageTotals: Record<string, number> = {};
      
      for (const item of weekFilteredData) {
        const lineageName = item.lineage.name;
        lineageTotals[lineageName] = (lineageTotals[lineageName] || 0) + item.ratio;
      }
      
      // 最も比率の高い系統を見つける
      let dominantLineage = null;
      let highestRatio = 0;
      
      for (const [lineage, ratio] of Object.entries(lineageTotals)) {
        if (ratio > highestRatio) {
          dominantLineage = lineage;
          highestRatio = ratio;
        }
      }
      
      weeklyDominantLineages.push({
        week,
        lineage: dominantLineage,
        ratio: highestRatio
      });
    }
    
    summaryData.push({
      prefecture,
      dominantLineages: weeklyDominantLineages
    });
  }
  
  return {
    prefectures,
    weeks,
    lineages: allLineages,
    summaryData
  };
}

export default async function PrefectureSummaryPage({
  params
}: {
  params: { wave: string }
}) {
  const { wave } = params;
  
  // 有効な波番号かチェック
  const validWaves = ['6', '7', '8', '6-8'];
  if (!validWaves.includes(wave)) {
    redirect('/visualization/prefecture-summary/6-8');
  }
  
  const data = await preparePrefectureSummaryData(wave);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        第{wave}波：都道府県別の主要流行系統推移
      </h1>
      
      <PrefectureSummaryComponent 
        prefectures={data.prefectures}
        weeks={data.weeks}
        lineages={data.lineages}
        summaryData={data.summaryData}
      />
    </div>
  );
} 
