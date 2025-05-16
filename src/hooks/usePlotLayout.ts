import { Layout } from 'plotly.js';

export function usePlotLayout(layout:Partial<Layout>) {
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

	return {
		enhancedLayout
	}
}