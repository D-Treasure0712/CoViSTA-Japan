// prismaクライアントのインポート（DB操作用）
import { prisma } from "@/lib/prisma";
// Next.jsのリダイレクト関数
import { redirect } from "next/navigation";
// 可視化用コンポーネントのインポート
import MajorLineageComponent from '../components/MajorLineageComponent';

// 都道府県の型定義
interface Prefecture {
  id: number;
  name: string;
}

// 系統（ウイルス系統）の型定義
interface Lineage {
  id: number;
  name: string;
}

// COVID-19データの型定義（リレーション含む）
interface CovidDataWithRelations {
  id: number;
  date: string; // 年/週形式の文字列
  count: number;
  ratio: number;
  prefectureId: number;
  lineageId: number;
  wave: number;
  prefecture: Prefecture;
  lineage: Lineage;
}

// 指定した波のデータをDBから取得する関数
async function getData(wave: string) {
  try {
    // "6-8"の場合は6,7,8波をまとめて取得、それ以外は単一波
    const waveNumber = wave === '6-8' ? [6, 7, 8] : [parseInt(wave)];
    
    // データベースから該当データを取得
    const data = await prisma.covidData.findMany({
      where: {
        wave: {
          in: waveNumber
        }
      },
      include: {
        prefecture: true, // 都道府県情報も取得
        lineage: true     // 系統情報も取得
      },
      orderBy: [
        { date: 'asc' } // 日付順にソート
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

// 都道府県ごと・週ごとの主要系統データを生成する関数
async function prepareMajorLineageSummaryData(wave: string) {
  const data = await getData(wave);
  
  if (data.length === 0) {
    console.error('データが見つかりません');
    return { prefectures: [], weeks: [], lineages: [], summaryData: [] };
  }
  
  // 都道府県名リスト（重複なし・ソート済み）
  const prefectures = Array.from(new Set(data.map(d => d.prefecture.name))).sort();
  
  // 年/週形式のデータを付与
  const weekData = data.map(d => {
    // date列から年/週形式を取得
    const yearWeek = getYearWeek(d.date);
    return {
      ...d,
      yearWeek 
    };
  });
  
  // 週リスト（重複なし・年→週順にソート）
  const weeks = Array.from(new Set(weekData.map(d => d.yearWeek)))
    .sort((a, b) => {
      const [yearA, weekA] = a.split('/').map(Number);
      const [yearB, weekB] = b.split('/').map(Number);
      return yearA !== yearB ? yearA - yearB : weekA - weekB;
    });
  
  // 系統名リスト（重複なし・ソート済み）
  const allLineages = Array.from(new Set(data.map(d => d.lineage.name))).sort();
  
  // 都道府県ごとに週ごとの主要系統を集計
  const summaryData = [];
  
  for (const prefecture of prefectures) {
    // その都道府県のデータのみ抽出
    const prefectureData = weekData.filter(d => d.prefecture.name === prefecture);
    const weeklyDominantLineages = [];
    
    for (const week of weeks) {
      // その週のデータのみ抽出
      const weekFilteredData = prefectureData.filter(d => d.yearWeek === week);
      
      if (weekFilteredData.length === 0) {
        // データがなければ空データ
        weeklyDominantLineages.push({ week, lineage: null, ratio: 0 });
        continue;
      }
      
      // 系統ごとの比率を合計
      const lineageTotals: Record<string, number> = {};
      // その週の全データを走査し、系統ごとにratio（比率）を合計する
      for (const item of weekFilteredData) {
        const lineageName = item.lineage.name;
        lineageTotals[lineageName] = (lineageTotals[lineageName] || 0) + item.ratio;
      }
      
      // 最も比率の高い系統（dominant lineage）を決定
      let dominantLineage = null; // 主要系統名
      let highestRatio = 0;       // その比率
      // 合計比率が最大の系統を探索
      for (const [lineage, ratio] of Object.entries(lineageTotals)) {
        if (ratio > highestRatio) {
          dominantLineage = lineage;
          highestRatio = ratio;
        }
      }
      // 週ごとの主要系統情報を配列に追加
      weeklyDominantLineages.push({
        week,
        lineage: dominantLineage,
        ratio: highestRatio
      });
    }
    // 都道府県ごとの主要系統推移データを集約
    summaryData.push({
      prefecture,
      dominantLineages: weeklyDominantLineages
    });
  }
  // 主要系統推移データ・都道府県・週・系統リストを返す
  return {
    prefectures,
    weeks,
    lineages: allLineages,
    summaryData
  };
}

// ページコンポーネント（Next.jsのルート）
export default async function MajorLineagePage({
  params
}: {
  params: { wave: string }
}) {
  const { wave } = params;
  
  // 有効な波番号かチェック（不正なら6-8波にリダイレクト）
  const validWaves = ['6', '7', '8', '6-8'];
  if (!validWaves.includes(wave)) {
    redirect('/visualization/major-lineage/6-8');
  }
  
  // データを取得・整形
  const data = await prepareMajorLineageSummaryData(wave);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        第{wave}波：都道府県別の主要流行系統推移
      </h1>
      
      {/* 可視化コンポーネントにデータを渡す */}
      <MajorLineageComponent 
        prefectures={data.prefectures}
        weeks={data.weeks}
        lineages={data.lineages}
        summaryData={data.summaryData}
      />
    </div>
  );
}