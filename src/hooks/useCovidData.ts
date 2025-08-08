import { prisma } from "@/lib/prisma";
import { CovidDataWithRelations } from "@/types/dataType";

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

	return {
		fetchWaveData
	};
}