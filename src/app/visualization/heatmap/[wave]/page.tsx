import { prisma } from '@/lib/prisma';
import { Layout, Data } from 'plotly.js';
import PlotComponent from '../../components/PlotComponent';

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
      { prefecture: { name: 'asc' } },
      { date: 'asc' }
    ]
  });

  return data;
}

export default async function HeatmapPage({ params }: { params: { wave: string } }) {
  const wave = await Promise.resolve(params.wave);
  const data = await getData(wave);
  
  // データを整形
  const prefectures = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.prefecture.name))];
  const dates = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.date.toISOString().split('T')[0]))].sort();
  const lineages = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.lineage.name))] as string[];

  // 各系統ごとのヒートマップデータを作成
  const heatmapData = lineages.map(lineage => {
    const z = prefectures.map(prefecture => {
      return dates.map(date => {
        const entry = data.find((d: CovidDataWithRelations) => 
          d.prefecture.name === prefecture && 
          d.lineage.name === lineage && 
          d.date.toISOString().split('T')[0] === date
        );
        return entry ? entry.ratio * 100 : 0;
      });
    });

    return {
      z,
      x: dates.map(d => {
        const date = new Date(d as string);
        return `${date.getFullYear()}/${Math.floor(date.getDate() / 7) + 1}週`;
      }),
      y: prefectures,
      type: 'heatmap' as const,
      colorscale: 'Viridis',
      name: lineage,
      visible: false,
      showscale: true,
      colorbar: {
        title: {
          text: '割合 (%)'
        }
      }
    };
  });

  // 最初の系統のみを表示
  if (heatmapData.length > 0) {
    heatmapData[0].visible = true;
  }

  const layout: Partial<Layout> = {
    title: {
      text: `第${wave}波における系統ごとのヒートマップ`,
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
      side: 'bottom',
      tickfont: {
        color: '#171717',
        size: 12
      },
      linecolor: '#171717',
      showgrid: true
    },
    yaxis: {
      title: {
        text: '都道府県',
        font: {
          color: '#171717',
          size: 16
        }
      },
      autorange: 'reversed',
      tickfont: {
        color: '#171717',
        size: 12
      },
      linecolor: '#171717',
      showgrid: false
    },
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff',
    updatemenus: [{
      buttons: (lineages as string[]).map((lineage: string) => ({
        method: 'update' as const,
        args: [
          { 'visible': heatmapData.map((_, i) => i === heatmapData.findIndex(d => d.name === lineage)) }
        ],
        label: lineage
      })),
      direction: 'down' as const,
      showactive: true,
      x: 0.1,
      y: 1.15,
      xanchor: 'left' as const,
      yanchor: 'top' as const,
      bgcolor: '#ffffff',
      bordercolor: '#171717',
      font: {
        color: '#171717',
        size: 12
      }
    }],
    height: 800,
    margin: {
      t: 100,
      r: 20,
      b: 50,
      l: 150
    },
    font: {
      color: '#171717',
      size: 12
    }
  };

  return (
    <div className="p-8 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">系統ごとのヒートマップ</h1>
      <div className="w-full border border-gray-300 rounded-lg bg-white p-4">
        <PlotComponent
          data={heatmapData as unknown as Data[]}
          layout={layout}
        />
      </div>
    </div>
  );
} 