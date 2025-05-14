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

interface LineageGroup {
  x: string[];
  y: number[];
  name: string;
  type: 'scatter';
  stackgroup: string;
  hovertemplate: string;
}

interface LineageGroups {
  [key: string]: LineageGroup;
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
      { date: 'asc' },
      { prefecture: { name: 'asc' } }
    ]
  });

  return data;
}

export default async function RatioPage({ params }: { params: { wave: string } }) {
  const wave = params.wave;
  const data = await getData(wave);
  
  // 都道府県の一覧を取得
  const prefectures = [...new Set<string>(data.map((d: CovidDataWithRelations) => d.prefecture.name))].sort();
  
  // 日付をYYYY/W形式に変換する関数
  const formatWeek = (date: Date) => {
    const d = new Date(date);
    const weekNumber = Math.ceil((d.getDate() - 1 + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
    return `${d.getFullYear()}/${weekNumber}週`;
  };

  // 都道府県ごとのデータを作成
  const prefectureData = prefectures.map(prefecture => {
    const filteredData = data.filter((d: CovidDataWithRelations) => d.prefecture.name === prefecture);
    
    // 日付でグループ化
    const dateGroups = filteredData.reduce((acc: { [key: string]: CovidDataWithRelations[] }, item: CovidDataWithRelations) => {
      const weekKey = formatWeek(item.date);
      if (!acc[weekKey]) {
        acc[weekKey] = [];
      }
      acc[weekKey].push(item);
      return acc;
    }, {});

    // 各週での系統の割合を計算
    const lineageGroups = Object.entries(dateGroups).reduce<LineageGroups>((acc, [week, items]) => {
      (items as CovidDataWithRelations[]).forEach((item: CovidDataWithRelations) => {
        if (!acc[item.lineage.name]) {
          acc[item.lineage.name] = {
            x: [],
            y: [],
            name: item.lineage.name,
            type: 'scatter',
            stackgroup: 'one',
            hovertemplate: '%{y:.1%}<br>%{x}<extra></extra>'
          };
        }
        acc[item.lineage.name].x.push(week);
        acc[item.lineage.name].y.push(item.ratio);
      });
      return acc;
    }, {});

    return {
      prefecture,
      plotData: Object.values(lineageGroups) as Data[]
    };
  });

  const layout: Partial<Layout> = {
    title: {
      text: `第${wave}波における流行系統の割合推移`,
      font: {
        size: 24
      }
    },
    xaxis: {
      title: {
        text: '週',
        font: {
          size: 16
        }
      },
      tickangle: 45,
      tickfont: {
        size: 12
      }
    },
    yaxis: {
      title: {
        text: '割合',
        font: {
          size: 16
        }
      },
      tickformat: '.0%',
      range: [0, 1],
      tickfont: {
        size: 12
      }
    },
    hovermode: 'x unified',
    showlegend: true,
    legend: {
      font: {
        size: 12
      }
    },
    height: 600,
    updatemenus: [{
      buttons: (prefectures as string[]).map((prefecture: string) => ({
        method: 'update' as const,
        args: [
          { visible: prefectureData.flatMap(pd => 
              pd.plotData.map(() => pd.prefecture === prefecture)
          )}
        ],
        label: prefecture
      })),
      direction: 'down' as const,
      showactive: true,
      x: 0.1,
      y: 1.15,
      xanchor: 'left' as const,
      yanchor: 'top' as const,
      font: {
        size: 12
      }
    }],
    margin: {
      t: 100,
      r: 50,
      b: 100,
      l: 50
    }
  };

  // 最初の都道府県のデータのみを表示
  const initialPlotData = prefectureData.flatMap(pd => 
    pd.plotData.map(data => ({
      ...data,
      visible: pd.prefecture === prefectures[0]
    }))
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">流行系統毎の割合のグラフ</h1>
      <div className="w-full h-[600px] bg-white rounded-lg shadow-lg p-4">
        <PlotComponent
          data={initialPlotData}
          layout={layout}
        />
      </div>
    </div>
  );
} 