/**
 * COVID-19の系統データを都道府県ごとに処理をし，可視化用に成形するhooks
 */

import { CovidDataWithRelations, LineageGroups } from "@/types/dataType";
import { useCovidData } from "./useCovidData";
import { Data } from 'plotly.js';


// サーバーサイドでデータを処理する関数
export function usePrefectureDataPreparation() {
  const { fetchWaveData } = useCovidData()
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
        const weekKey = item.date;
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
      
      
      console.log(`${prefecture} 上位系統: ${topLineages.join(', ')}`);

      // 各週での系統の割合を計算
      const lineageGroups: LineageGroups = {};
      
      
      // 週ごとにデータを整理
      Object.entries(dateGroups).forEach(([week, items]) => {
        
        // 選択された上位系統だけをフィルタリング
        (items as CovidDataWithRelations[])
          .filter((item: CovidDataWithRelations) => topLineages.includes(item.lineage.name))
          .forEach((item: CovidDataWithRelations) => {
            const lineageName = item.lineage.name;

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
            lineageGroups[lineageName].y.push(item.ratio);
          });
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