import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import MajorLineageComponent from '../components/MajorLineageComponent';

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

// データを取得する関数
async function getData(wave: string) {
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
  // 入力が既に年/週形式の場合はそのまま返す
  if (typeof dateInput === 'string' && /^\d{4}\/\d{1,2}$/.test(dateInput)) {
    return dateInput;
  }
  
  // それ以外の場合は警告を出して不明を返す
  console.warn(`無効な日付入力: ${dateInput}`);
  return '不明/不明';
}

// 都道府県別の週ごとの主要系統データを生成する関数
async function prepareMajorLineageSummaryData(wave: string) {
  const data = await getData(wave);
  
  if (data.length === 0) {
    console.error('データが見つかりません');
    return { prefectures: [], weeks: [], lineages: [], summaryData: [] };
  }
  
  // 都道府県のリストを取得（重複なし）
  const prefectures = Array.from(new Set(data.map(d => d.prefecture.name))).sort();
  
  // データベースのdate列は既に年/週形式のため、そのまま使用
  const weekData = data.map(d => {
    // date列から年/週形式を取得、必要に応じて変換
    const yearWeek = getYearWeek(d.date);
    return {
      ...d,
      yearWeek 
    };
  });
  
  // 週のリストを取得（重複なし、ソート）
  const weeks = Array.from(new Set(weekData.map(d => d.yearWeek)))
    .sort((a, b) => {
      const [yearA, weekA] = a.split('/').map(Number);
      const [yearB, weekB] = b.split('/').map(Number);
      return yearA !== yearB ? yearA - yearB : weekA - weekB;
    });
  
  // すべての系統リスト（重複なし）
  const allLineages = Array.from(new Set(data.map(d => d.lineage.name))).sort();
  
  // 都道府県×週の行列を生成
  const summaryData = [];
  
  for (const prefecture of prefectures) {
    const prefectureData = weekData.filter(d => d.prefecture.name === prefecture);
    const weeklyDominantLineages = [];
    
    for (const week of weeks) {
      // その週のデータだけを取得
      const weekFilteredData = prefectureData.filter(d => d.yearWeek === week);
      
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

export default async function MajorLineagePage({
  params
}: {
  params: { wave: string }
}) {
  const { wave } = params;
  
  // 有効な波番号かチェック
  const validWaves = ['6', '7', '8', '6-8'];
  if (!validWaves.includes(wave)) {
    redirect('/visualization/major-lineage/6-8');
  }
  
  const data = await prepareMajorLineageSummaryData(wave);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        第{wave}波：都道府県別の主要流行系統推移
      </h1>
      
      <MajorLineageComponent 
        prefectures={data.prefectures}
        weeks={data.weeks}
        lineages={data.lineages}
        summaryData={data.summaryData}
      />
    </div>
  );
} 