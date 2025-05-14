import { prisma } from '@/lib/prisma';
import { Layout, Data } from 'plotly.js';
import PlotComponent from '../../components/PlotComponent';
import { type PrismaClient } from '@prisma/client';

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

async function getData(wave: string) {
  const waveNumber = wave === '6-8' ? [6, 7, 8] : [parseInt(wave)];
  
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

  return data;
}

export default async function RankPage({ params }: { params: { wave: string } }) {
  const wave = await Promise.resolve(params.wave);
  const data = await getData(wave);
  
  // データを整形
  const dates = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.date.toISOString().split('T')[0]))].sort();
  const lineages = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.lineage.name))];

  // 各日付での系統の順位を計算
  const rankData = dates.map(date => {
    const dateData = data.filter((d: CovidDataWithRelations) => d.date.toISOString().split('T')[0] === date);
    
    // 各系統の合計比率を計算
    const lineageRatios = lineages.map(lineage => {
      const lineageData = dateData.filter((d: CovidDataWithRelations) => d.lineage.name === lineage);
      const totalRatio = lineageData.reduce((sum: number, d: CovidDataWithRelations) => sum + d.ratio, 0);
      return { lineage, totalRatio };
    });

    // 比率で降順ソートして順位を付ける
    lineageRatios.sort((a, b) => b.totalRatio - a.totalRatio);
    const ranks = new Map(lineageRatios.map((item, index) => [item.lineage, index + 1]));

    return { date, ranks };
  });

  // Plotly.jsのデータ形式に変換
  const plotData = lineages.map(lineage => ({
    x: dates.map(d => {
      const date = new Date(d as string);
      return `${date.getFullYear()}/${Math.floor(date.getDate() / 7) + 1}週`;
    }),
    y: dates.map(date => {
      const dateRanks = rankData.find(d => d.date === date);
      return dateRanks ? dateRanks.ranks.get(lineage) : null;
    }),
    name: lineage,
    type: 'scatter' as const,
    mode: 'lines+markers' as const,
    line: { shape: 'hv' as const }
  }));

  const layout: Partial<Layout> = {
    title: {
      text: `第${wave}波における流行系統の順位推移`,
      font: {
        color: '#171717',
        size: 24
      }
    },
    xaxis: {
      title: {
        text: '週',
        font: {
          color: '#171717',
          size: 16
        }
      },
      tickfont: {
        color: '#171717',
        size: 12
      },
      gridcolor: '#e5e5e5',
      linecolor: '#171717',
      showgrid: true
    },
    yaxis: {
      title: {
        text: '順位',
        font: {
          color: '#171717',
          size: 16
        }
      },
      autorange: 'reversed',
      tickmode: 'linear',
      tick0: 1,
      dtick: 1,
      tickfont: {
        color: '#171717',
        size: 12
      },
      gridcolor: '#e5e5e5',
      linecolor: '#171717',
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
      color: '#171717',
      size: 12
    },
    legend: {
      font: {
        color: '#171717',
        size: 12
      },
      bgcolor: '#ffffff',
      bordercolor: '#171717'
    }
  };

  return (
    <div className="p-8 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統毎の順位のグラフ</h1>
      <div className="w-full h-[600px] border border-gray-300 rounded-lg bg-white p-4">
        <PlotComponent
          data={plotData as unknown as Data[]}
          layout={layout}
        />
      </div>
    </div>
  );
} 