import { prisma } from "@/lib/prisma";

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

export function useCovidData() {
	async function fetchWaveData(wave: string): Promise<CovidDataWithRelations[]> {
		try {
			const waveNumber = wave === '6-8' ? [6, 7, 8] : [parseInt(wave)];
				// 日付形式のlineage.nameでも取得できるように修正
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

				console.log(`Wave ${wave} - データ取得数: ${data.length}`);
				return data;
			} catch (error) {
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