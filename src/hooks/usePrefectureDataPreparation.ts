/**
 * COVID-19の系統データを都道府県ごとに処理をし，可視化用に成形するhooks
 */

import { useCovidData } from "./useCovidData";
import { Data } from 'plotly.js';

/**
 * 都道府県データの構造定義
 */
interface Prefecture {
  id: number; /* 都道府県のID */
  name: string; /* 都道府県名 */
}

/**
 * ウイルス系統の構造定義
 */
interface Lineage {
  id: number; /* 系統のID */
  name: string; /* 系統名 */
}

/**
 * COVID-19データの詳細構造
 */
interface CovidDataWithRelations {
  id: number; //データエントリのID
  date: Date; // 検出日
  count: number; // 検出数
  ratio: number; // 検出比率
  prefectureId: number; // 都道府県のID
  lineageId: number; // 系統のID
  wave: number; // 第何波か
  prefecture: Prefecture; // 紐づく都道府県オブジェクト
  lineage: Lineage; // 紐づく系統オブジェクト
}

/**
 * 系統グループごとのグラフデータ構造
 * Plotly.jsの積み上げグラフとして表示するためのデータ形式
 */
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


// サーバーサイドでデータを処理する関数
export function usePrefectureDataPreparation() {
  const { fetchWaveData, formatWeek } = useCovidData()
  /**
   * 指定された波（期間）のデータを取得し，都道府県ごとに処理する関数
   * param {string} wave - 対象となる波の識別子
   * returns {Object} - 処理されたデータと関連情報を含むオブジェクト
   */
  async function preparePrefectureData(wave: string) {
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

  return {
    preparePrefectureData
  };
}