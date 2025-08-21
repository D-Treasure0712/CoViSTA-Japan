/**
 * @file src/lib/data.ts
 * @description
 * このファイルは、データベースからCOVID-19関連データを取得し、
 * 各グラフで表示するためのデータ整形を行う関数を定義します。
 * [修正点]
 * - `getRatioAndHeatmapData`関数内の割合グラフ用データ整形ロジックを変更。
 * `type: 'bar'` から `type: 'scatter'` と `mode: 'lines'` に変更し、
 * 積み上げ棒グラフではなく、積み上げ面グラフのデータを生成するようにしました。
 */

import { prisma } from "@/lib/prisma";
import { Data } from 'plotly.js';

type PlotlyTrace = Data & {
  x?: (string | number | Date)[];
  y?: (string | number | Date | null)[];
  z?: (string | number | Date | null)[][] | (string | number | Date | null)[];
  name?: string;
};

/**
 * 割合グラフとヒートマップ用のデータを取得・整形します。
 * @param wave 流行の波 ('6', '7', '8', '6-8')
 * @param prefectureName 都道府県名 (英語)
 * @returns 整形されたグラフデータまたはエラー情報
 */
export async function getRatioAndHeatmapData(wave: string, prefectureName: string) {
  try {
    const waveNumber = wave === '6-8' ? [6, 7, 8] : [parseInt(wave)];
    const data = await prisma.covidData.findMany({
      where: {
        wave: { in: waveNumber },
        prefecture: { name: prefectureName },
      },
      include: { prefecture: true, lineage: true },
      orderBy: { date: 'asc' },
    });

    if (data.length === 0) {
      throw new Error("指定された条件のデータが見つかりませんでした。");
    }

    const dates = [...new Set(data.map(d => d.date))].sort();
    const lineages = [...new Set(data.map(d => d.lineage.name))].sort();

    // --- 割合グラフ用データ整形 (積み上げ面グラフに変更) ---
    const ratioPlotData: PlotlyTrace[] = lineages.map(lineage => ({
      x: dates,
      y: dates.map(date => {
        const record = data.find(d => d.date === date && d.lineage.name === lineage);
        return record ? record.ratio * 100 : 0;
      }),
      name: lineage,
      type: 'scatter',   // 'bar'から変更
      mode: 'lines',     // 線で描画
      stackgroup: 'one', // これにより積み上げグラフになる
    }));

    // --- ヒートマップ用データ整形 ---
    const z = lineages.map(lineage => {
        return dates.map(week => {
            const record = data.find(d => d.date === week && d.lineage.name === lineage);
            return record ? record.ratio * 100 : 0;
        });
    });

    const heatmapPlotData = {
        z,
        x: dates,
        y: lineages,
        type: 'heatmap',
        colorscale: 'Viridis',
        colorbar: { title: { text: '割合 (%)' } }
    };

    return {
      ratioData: ratioPlotData,
      heatmapData: [heatmapPlotData],
      error: null
    };

  } catch (error) {
    console.error("割合/ヒートマップデータ取得エラー:", error);
    return { ratioData: null, heatmapData: null, error: (error as Error).message };
  }
}

/**
 * 順位グラフ用のデータを取得・整形します。
 * @param wave 流行の波 ('6', '7', '8', '6-8')
 * @param prefectureName 都道府県名 (英語)
 * @returns 整形されたグラフデータまたはエラー情報
 */
export async function getRankData(wave: string, prefectureName: string) {
  try {
    const waveNumber = wave === '6-8' ? [6, 7, 8] : [parseInt(wave)];
    const data = await prisma.covidData.findMany({
      where: {
        wave: { in: waveNumber },
        prefecture: { name: prefectureName },
      },
      include: { lineage: true },
      orderBy: { date: 'asc' },
    });

    if (data.length === 0) {
      throw new Error("指定された条件のデータが見つかりませんでした。");
    }

    const dataByDate: { [date: string]: typeof data } = data.reduce((acc, record) => {
      acc[record.date] = acc[record.date] || [];
      acc[record.date].push(record);
      return acc;
    }, {} as { [date: string]: typeof data });
    
    const rankedData: (typeof data[0] & { rank: number })[] = [];
    Object.values(dataByDate).forEach(weeklyData => {
      weeklyData
        .sort((a, b) => b.ratio - a.ratio)
        .forEach((record, index) => {
          rankedData.push({ ...record, rank: index + 1 });
        });
    });

    const dates = [...new Set(rankedData.map(d => d.date))].sort();
    const lineages = [...new Set(rankedData.map(d => d.lineage.name))];

    const lineageAvgRank = lineages.map(lineage => {
        const ranks = rankedData.filter(d => d.lineage.name === lineage).map(d => d.rank);
        const avg = ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length;
        return { lineage, avg };
    }).sort((a, b) => a.avg - b.avg);

    const top10Lineages = lineageAvgRank.slice(0, 10).map(l => l.lineage);

    const rankPlotData: PlotlyTrace[] = top10Lineages.map(lineage => {
      const yValues = dates.map(date => {
        const record = rankedData.find(d => d.date === date && d.lineage.name === lineage);
        return record && record.rank <= 20 ? record.rank : null;
      });
      return {
        x: dates,
        y: yValues,
        name: lineage,
        type: 'scatter',
        mode: 'lines+markers',
        connectgaps: false,
      };
    });

    return { rankData: rankPlotData, error: null };

  } catch (error) {
    console.error("順位データ取得エラー:", error);
    return { rankData: null, error: (error as Error).message };
  }
}
