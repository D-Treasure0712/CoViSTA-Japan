import { Layout } from 'plotly.js';

const layout: Partial<Layout> = {
    height: 600,
    margin: {
      t: 50,
      r: 50,
      b: 100,
      l: 60
    },
    font: {
      family: 'Arial, sans-serif',
      size: 14,
      color: '#000000'
    },
    yaxis: {
      tickformat: ',.0%',
      range: [0, 1],
      title: {
        text: '系統の割合（各週100%で正規化）',
        font: {
          size: 16,
          color: '#000000'
        }
      },
      tickfont: {
        color: '#000000',
        size: 12
      },
      gridcolor: '#e0e0e0',
      fixedrange: true,
      tickmode: 'linear',
      dtick: 0.1,
      autorange: false
    },
    xaxis: {
      title: {
        text: '週数（年/週）',
        font: {
          size: 16,
          color: '#000000'
        }
      },
      tickfont: {
        color: '#000000',
        size: 12
      },
      gridcolor: '#e0e0e0',
      tickangle: -45,
      type: 'category', // カテゴリタイプに設定（年/週の順に表示）
      dtick: 1, // すべての週を表示
      tickmode: 'linear' // 均等間隔で表示
    },
    legend: {
      traceorder: 'normal',
      font: {
        color: '#000000',
        size: 12
      },
      orientation: 'h',
      y: -0.25,
      x: 0.5,
      xanchor: 'center',
      title: {
        text: '系統名',
        font: {
          size: 14,
          color: '#000000'
        }
      }
    },
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff',
    hovermode: 'closest',
    barmode: 'stack',
    showlegend: true
  };

export default layout;