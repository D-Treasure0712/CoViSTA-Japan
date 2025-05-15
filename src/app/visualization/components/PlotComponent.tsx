'use client';

import { useEffect, useState, useMemo } from 'react';
import { Layout, Data } from 'plotly.js';

interface PlotComponentProps {
  data: Data[];
  layout: Partial<Layout>;
}

export default function PlotComponent({ data, layout }: PlotComponentProps) {
  const [mounted, setMounted] = useState(false);
  const [Plot, setPlot] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // データの処理
  const enhancedData = useMemo(() => {
    try {
      // データが空の場合は空配列を返す
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }

      // 散布図（線グラフ）の場合
      if (data.some((d: any) => d.type === 'scatter')) {
        return data.map((trace: any) => {
          // X軸とY軸のデータがあるか確認
          const hasX = Array.isArray(trace.x) && trace.x.length > 0;
          const hasY = Array.isArray(trace.y) && trace.y.length > 0;
          
          if (!hasX || !hasY) {
            console.warn('散布図データにx/y配列がありません', trace);
          }
          
          // 全ての系統名に対して同じスタイルを適用する
          const colorForTrace = trace.line?.color || trace.marker?.color || undefined;
          const lineWidth = 2;
          const markerSize = 6;
          
          return {
            ...trace,
            visible: true,
            showlegend: true,
            opacity: 1,
            line: {
              ...(trace.line || {}),
              width: lineWidth,
              color: colorForTrace
            },
            marker: {
              ...(trace.marker || {}),
              size: markerSize,
              opacity: 1,
              color: colorForTrace
            },
            mode: trace.mode || 'lines+markers'
          };
        });
      }
      
      // ヒートマップの場合
      if (data.some((d: any) => d.type === 'heatmap')) {
        return data.map((trace: any) => {
          // z値（ヒートマップのデータ）があるか確認
          const hasZ = Array.isArray(trace.z) && trace.z.length > 0;
          
          if (!hasZ) {
            console.warn('ヒートマップデータにz配列がありません', trace);
          }
          
          return {
            ...trace,
            visible: true,
            showscale: true,
            colorscale: trace.colorscale || 'Viridis'
          };
        });
      }
      
      // その他の場合（もしくは特定できない場合）
      return data.map((trace: any) => ({
        ...trace,
        visible: true,
        showlegend: true
      }));
    } catch (error) {
      console.error('データ処理エラー:', error);
      return [];
    }
  }, [data]);

  // エラー処理
  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) {
      setDataError(null);
      return;
    }
    
    // データのバリデーション
    try {
      const hasScatter = data.some((d: any) => d.type === 'scatter');
      const hasHeatmap = data.some((d: any) => d.type === 'heatmap');
      
      if (hasScatter) {
        const invalidData = data.some((trace: any) => 
          !Array.isArray(trace.x) || !Array.isArray(trace.y) || 
          trace.x.length === 0 || trace.y.length === 0
        );
        
        if (invalidData) {
          setDataError('散布図データにx/y値が不足しています');
          return;
        }
      }
      
      if (hasHeatmap) {
        const invalidData = data.some((trace: any) => 
          !Array.isArray(trace.z) || trace.z.length === 0
        );
        
        if (invalidData) {
          setDataError('ヒートマップデータにz値が不足しています');
          return;
        }
      }
      
      setDataError(null);
    } catch (error) {
      console.error('データ検証エラー:', error);
      setDataError('データの検証中にエラーが発生しました');
    }
  }, [data]);

  useEffect(() => {
    console.log('===== PLOTLY DEBUG INFO =====');
    console.log('Original Data:', JSON.stringify(data, null, 2));
    console.log('Enhanced Data:', JSON.stringify(enhancedData, null, 2));
    console.log('Layout:', JSON.stringify(layout, null, 2));
    console.log('===== END DEBUG INFO =====');

    // クライアントサイドでのみPlotlyを読み込む
    import('react-plotly.js').then((module) => {
      setPlot(() => module.default);
      setMounted(true);
    });
  }, [data, enhancedData, layout]);

  if (!mounted || !Plot) {
    return (
      <div style={{
        width: '100%',
        height: '600px',
        background: '#fff',
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <p style={{ color: '#000000', fontWeight: '500' }}>グラフを読み込んでいます...</p>
      </div>
    );
  }

  // デフォルトのレイアウト設定とプロップスから渡されたレイアウトをマージ
  const enhancedLayout = {
    ...layout,
    title: {
      ...(layout.title || {}),
      text: (layout.title as any)?.text || 'グラフ表示'
    },
    autosize: true,
    width: 900, // 明示的な幅を設定
    height: 500, // 明示的な高さを設定
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    showlegend: true,
    font: {
      ...layout.font,
      color: '#000000',
    },
    legend: {
      ...layout.legend,
      font: {
        ...(layout.legend?.font || {}),
        color: '#000000',
        size: 14
      },
      bgcolor: '#ffffff',
      bordercolor: '#cccccc',
      borderwidth: 1
    },
    modebar: {
      bgcolor: '#ffffff',
      color: '#000000',
      activecolor: '#000000',
    },
    // データの範囲を強制的に拡大して見やすくする
    xaxis: {
      ...layout.xaxis,
      autorange: true,
      showgrid: true,
      gridcolor: '#e0e0e0',
      zeroline: true,
      zerolinecolor: '#000000',
      zerolinewidth: 1,
      tickfont: {
        ...(layout.xaxis?.tickfont || {}),
        color: '#000000',
        size: 12
      },
      title: {
        ...(layout.xaxis?.title || {}),
        font: {
          ...(layout.xaxis?.title?.font || {}),
          color: '#000000',
          size: 14
        }
      }
    },
    yaxis: {
      ...layout.yaxis,
      autorange: true,
      showgrid: true,
      gridcolor: '#e0e0e0',
      zeroline: true,
      zerolinecolor: '#000000',
      zerolinewidth: 1,
      tickfont: {
        ...(layout.yaxis?.tickfont || {}),
        color: '#000000',
        size: 12
      },
      title: {
        ...(layout.yaxis?.title || {}),
        font: {
          ...(layout.yaxis?.title?.font || {}),
          color: '#000000',
          size: 14
        }
      }
    },
    annotations: layout.annotations?.map((annotation: any) => ({
      ...annotation,
      font: {
        ...(annotation.font || {}),
        color: '#000000'
      }
    })) || [],
  };

  const isDataEmpty = !Array.isArray(enhancedData) || enhancedData.length === 0;

  return (
    <div style={{
      width: '100%',
      height: '600px',
      background: '#fff',
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      position: 'relative',
      overflow: 'visible'
    }}>
      {isDataEmpty ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <p style={{ color: '#000000', fontWeight: 'bold' }}>データがありません</p>
        </div>
      ) : (
        <Plot
          data={enhancedData as any}
          layout={enhancedLayout as any}
          style={{
            width: '100%',
            height: '100%'
          }}
          config={{
            displayModeBar: true,
            displaylogo: false,
            responsive: true,
            scrollZoom: true,
          }}
        />
      )}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
      }}>
        <button 
          onClick={() => setShowDebug(!showDebug)}
          style={{
            padding: '5px 10px',
            background: '#f0f0f0',
            border: '1px solid #000',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#000000',
            fontWeight: '500'
          }}
        >
          {showDebug ? 'デバッグ情報を隠す' : 'デバッグ情報を表示'}
        </button>
      </div>
      
      {dataError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,0,0,0.1)',
          border: '1px solid #f00',
          borderRadius: '4px',
          padding: '10px',
          color: '#f00'
        }}>
          {dataError}
        </div>
      )}
      
      {showDebug && (
        <div style={{
          position: 'absolute',
          bottom: '50px',
          right: '10px',
          width: '300px',
          maxHeight: '400px',
          overflow: 'auto',
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid #000',
          padding: '10px',
          fontSize: '10px',
          whiteSpace: 'pre-wrap',
          zIndex: 1000,
          color: '#000000'
        }}>
          <h4 style={{ color: '#000000', fontWeight: 'bold', marginBottom: '8px' }}>データ情報:</h4>
          <p style={{ color: '#000000', margin: '4px 0' }}>データセット数: {enhancedData.length}</p>
          {!isDataEmpty && (
            <>
              <p style={{ color: '#000000', margin: '4px 0' }}>データタイプ: {(enhancedData[0] as any)?.type || '不明'}</p>
              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={() => console.log('Debug Data:', enhancedData)}
                  style={{
                    padding: '3px 6px',
                    fontSize: '9px',
                    background: '#f5f5f5',
                    border: '1px solid #000',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    color: '#000000',
                    fontWeight: '500'
                  }}
                >
                  データをコンソールに出力
                </button>
              </div>
              
              {enhancedData.map((trace: any, i) => (
                <div key={i}>
                  <p style={{ color: '#000000', fontWeight: 'bold', marginTop: '8px' }}>データセット {i+1}: {trace.name || '名前なし'}</p>
                  <p style={{ color: '#000000' }}>タイプ: {trace.type || '不明'}</p>
                  {trace.x && <p style={{ color: '#000000' }}>x値サンプル: {Array.isArray(trace.x) ? trace.x.slice(0, 3).join(', ') + '...' : 'なし'}</p>}
                  {trace.y && <p style={{ color: '#000000' }}>y値サンプル: {Array.isArray(trace.y) ? trace.y.slice(0, 3).join(', ') + '...' : 'なし'}</p>}
                  {trace.z && <p style={{ color: '#000000' }}>z値（ヒートマップ）: あり</p>}
                  <hr style={{ border: '0.5px solid #ccc', margin: '8px 0' }} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}