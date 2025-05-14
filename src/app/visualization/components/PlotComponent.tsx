'use client';

import dynamic from 'next/dynamic';
import { Layout, Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PlotComponentProps {
  data: Data[];
  layout: Partial<Layout>;
}

export default function PlotComponent({ data, layout }: PlotComponentProps) {
  return (
    <Plot
      data={data}
      layout={layout}
      useResizeHandler={true}
      style={{ width: '100%', height: '100%' }}
    />
  );
} 