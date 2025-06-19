/**
 * COVID-19の系統データを都道府県ごとに処理をし，可視化用に成形するサーバーサイド関数
 * Next.js 13 App Routerのサーバーコンポーネント用
 */

import { prisma } from "@/lib/prisma";
import { CovidDataWithRelations, LineageGroups } from "@/types/dataType";
import { Data } from 'plotly.js';

/**
 * 指定された感染波のCOVID-19データを取得する
 * @param wave - 感染波の番号（文字列）。'6-8'の場合は第6波から第8波までを表す
 * @returns 指定した感染波のCOVID-19データの配列
 */
async function fetchWaveData(wave: string): Promise<CovidDataWithRelations[]> {
  try {
    // '6-8'の場合は波6,7,8を取得、それ以外は指定された単一の波を取得
    const waveNumber = wave === '6-8' ? [6, 7, 8] : [parseInt(wave)];
    
    // Prismaを使用してデータベースからデータを取得
    const data = await prisma.covidData.findMany({
      where: {
        wave: {
          in: waveNumber
        }
      },
      include: {
        prefecture: true, // 都道府県データを含める
        lineage: true     // 系統データを含める
      },
      orderBy: [
        { date: 'asc' }   // 日付の昇順でソート
      ]
    });

    console.log(`Wave ${wave} - データ取得数: ${data.length}`);
    return data;
  } catch (error) {
    // エラーが発生した場合はログに出力して空配列を返す
    console.error('Error fetching data:', error);
    return [];
  }
}

function formatWeek(date: Date) {
  const d = new Date(date);
  
  // ISO 8601形式の週番号を計算
  // 1月1日を含む週を第1週とする
  const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  
  return `${d.getFullYear()}/${weekNumber}週`;
}

/**
 * 指定された波（期間）のデータを取得し，都道府県ごとに処理する関数
 * @param {string} wave - 対象となる波の識別子
 * @returns {Object} - 処理されたデータと関連情報を含むオブジェクト
 */
export async function preparePrefectureData(wave: string) {
  // 指定された波のデータをデータベースから取得
  const data = await fetchWaveData(wave);
  
  // データが空の場合
  if (data.length === 0) {
    return { 
      prefectures: [],
      prefectureData: [],
      dataCount: 0,
      isEmpty: true
    };
  }
  
  // 都道府県の一覧をデータから抽出（重複なし・ソート済み）
  const allPrefectures = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.prefecture.name))].sort();
  const prefectures = allPrefectures; // 全都道府県を使用
  
  // 都道府県ごとのデータを作成
  const prefectureData = prefectures.map(prefecture => {
    // 対象都道府県のデータのみをフィルタリング
    const filteredData = data.filter((d: CovidDataWithRelations) => d.prefecture.name === prefecture);
    
    /**
     * データを週ごとにグループ化
     * 形式: { "2022/10週": [データ配列], "2022/11週": [データ配列], ... }
     */
    const dateGroups = filteredData.reduce((acc: { [key: string]: CovidDataWithRelations[] }, item: CovidDataWithRelations) => {
      const weekKey = formatWeek(item.date);
      if (!acc[weekKey]) {
        acc[weekKey] = [];
      }
      acc[weekKey].push(item);
      return acc;
    }, {});

    /**
     * 系統ごとの出現回数を集計
     * 形式: { "BA.1": 10, "BA.2": 15, ... }
     */
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