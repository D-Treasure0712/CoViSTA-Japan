import { prisma } from "@/lib/prisma";

/**
 * 都道府県データの型定義
 * id: 都道府県ID
 * name: 都道府県名
 */
interface Prefecture {
	id: number;
	name: string;
}

/**
 * 系統（変異株）データの型定義
 * id: 系統ID
 * name: 系統名（変異株名）
 */
interface Lineage {
	id: number;
	name: string;
}

/**
 * COVID-19データと関連情報を含む型定義
 * id: データID
 * date: 日付
 * count: 検出数
 * ratio: 検出率（百分率）
 * prefectureId: 都道府県ID（外部キー）
 * lineageId: 系統ID（外部キー）
 * wave: 感染波の番号
 * prefecture: 都道府県の関連データ
 * lineage: 系統の関連データ
 */
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

/**
 * COVID-19データ操作のためのカスタムフック
 * データの取得や加工に関する機能を提供
 */
export function useCovidData() {
	/**
	 * 指定された感染波のCOVID-19データを取得する
	 * @param wave - 感染波の番号（文字列）。'6-8'の場合は第6波から第8波までを表す
	 * @returns 指定した感染波のCOVID-19データの配列
	 */
	async function fetchWaveData(wave: string): Promise<CovidDataWithRelations[]> {
		try {
			// '6-8'の場合は波6,7,8を取得、それ以外は指定された単一の波を取得
			const waveNumber = wave === '6-8' ? [6, 7, 8] : [parseInt(wave)];
			
			// Prismaを使用してデータベースからデータを取得
			// 日付形式のlineage.nameでも取得できるように修正
			const data = await prisma.covidData.findMany({
				where: {
					wave: {
						in: waveNumber
					}
				},
				include: {
					prefecture: true, // 都道府県データを含める
					lineage: true     // 系統データを含める
				},
				orderBy: [
					{ date: 'asc' }   // 日付の昇順でソート
				]
			});

			console.log(`Wave ${wave} - データ取得数: ${data.length}`);
			return data;
		} catch (error) {
			// エラーが発生した場合はログに出力して空配列を返す
			console.error('Error fetching data:', error);
			return [];
		}
	}
	function formatWeek(date: Date) {
		const d = new Date(date);
		
		// ISO 8601形式の週番号を計算
		// 1月1日を含む週を第1週とする
		const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
		const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
		const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
		
		return `${d.getFullYear()}/${weekNumber}週`;
	}

	return {
		fetchWaveData,
		formatWeek
	};
}