/**
 * @file src/lib/data.ts
 * @description
 * データベースからCOVID-19関連データを取得し、
 * 各グラフで表示するためのデータ整形を行う関数を定義します。
 */

import { CovidDataWithRelations } from "@/types/dataType";
import { prisma } from "@/lib/prisma";
import { Data } from 'plotly.js';

type PlotlyTrace = Data & {
  x?: (string | number | Date)[];
  y?: (string | number | Date | null)[];
  z?: (string | number | Date | null)[][] | (string | number | Date | null)[];
  name?: string;
};

export async function getRatioAndHeatmapData(wave: string, prefectureName: string) {
  try {
    const waveNumber = wave === '6-8' ? [0] : [parseInt(wave)];
    
    // ### 根本的な修正点1: `data`変数に明確な型を定義します ###
    // これにより、以降の`.map`や`.find`で引数の型が自動で正しく推論されます。
    const data: CovidDataWithRelations[] = await prisma.covidData.findMany({
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

    const dates = [...new Set(data.map((d) => d.date))].sort();
    const lineages = [...new Set(data.map((d) => d.lineage.name))].sort();

    const ratioPlotData: PlotlyTrace[] = lineages.map((lineage) => ({
      x: dates,
      y: dates.map((date) => {
        const record = data.find(
          (d) => d.date === date && d.lineage.name === lineage
        );
        return record ? record.ratio * 100 : 0;
      }),
      name: lineage,
      type: 'scatter',
      mode: 'lines',
      stackgroup: 'one',
    }));

    const z = lineages.map((lineage) => {
        return dates.map((week) => {
            const record = data.find((d) => d.date === week && d.lineage.name === lineage);
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
    } as Data;

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



export async function getRankData(wave: string, prefectureName: string) {
  try {
    const waveNumber = wave === '6-8' ? [6, 7, 8] : [parseInt(wave)];
    
    // ### 根本的な修正点2: こちらの関数でも`data`変数に型を定義します ###
    const data: CovidDataWithRelations[] = await prisma.covidData.findMany({
      where: {
        wave: { in: waveNumber },
        prefecture: { name: prefectureName },
      },
      include: {
	     prefecture: true,
	     lineage: true
      },
      orderBy: { date: 'asc' },
    });

    if (data.length === 0) {
      throw new Error("指定された条件のデータが見つかりませんでした。");
    }

    const dates = [...new Set(data.map((d) => d.date))].sort();
    const allLineages = [...new Set(data.map((d) => d.lineage.name))];

    const rankPlotData: PlotlyTrace[] = allLineages.map((lineage) => {
      const yValues = dates.map((date) => {
        const record = data.find((d) => d.date === date && d.lineage.name === lineage);
        return record && record.rank ? record.rank : 21;
      });

      return {
        x: dates,
        y: yValues,
        name: lineage,
        type: 'scatter',
        mode: 'lines+markers',
        connectgaps: true,
      };
    });

    return { rankData: rankPlotData, error: null };

  } catch (error) {
    console.error("順位データ取得エラー:", error);
    return { rankData: null, error: (error as Error).message };
  }
}
