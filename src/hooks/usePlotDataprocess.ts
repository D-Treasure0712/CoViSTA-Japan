/**
 * 散布図やヒートマップを作成するときのデータ処理をするカスタムフック
 */

import { useEffect, useState, useMemo } from 'react';
import { Data } from 'plotly.js';

export function usePlotDataProcess(data:Data[]) {
	const [dataError, setDataError] = useState<string | null>(null);
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
	
	return {
		enhancedData,
		dataError
	}
}