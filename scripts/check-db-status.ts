import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDbStatus() {
  try {
    // 各テーブルのデータ件数を確認
    const covidDataCount = await prisma.covidData.count();
    const rankDataCount = await prisma.rankData.count();
    const prefectureCount = await prisma.prefecture.count();
    const lineageCount = await prisma.lineage.count();

    console.log('=== データベースの状態 ===');
    console.log(`CovidData: ${covidDataCount} 件`);
    console.log(`RankData: ${rankDataCount} 件`);
    console.log(`Prefecture: ${prefectureCount} 件`);
    console.log(`Lineage: ${lineageCount} 件`);

    // サンプルデータを確認
    if (covidDataCount > 0) {
      const sampleCovidData = await prisma.covidData.findFirst({
        include: {
          prefecture: true,
          lineage: true
        }
      });
      console.log('\n=== CovidDataのサンプル ===');
      console.log(sampleCovidData);
    }

    if (prefectureCount > 0) {
      const prefectures = await prisma.prefecture.findMany();
      console.log('\n=== 都道府県一覧 ===');
      console.log(prefectures.map(p => p.name).join(', '));
    }

  } catch (error) {
    console.error('データベース確認中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDbStatus();