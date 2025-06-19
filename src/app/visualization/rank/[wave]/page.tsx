import { prisma } from '@/lib/prisma';
import { RankDataWithRelations } from '@/types/dataType';
import ClientRank from '../../components/Pages/clientRank';

async function getRankData(wave: string) {
  try {
    const waveNumber = wave === '6-8' ? [6, 7, 8] : [parseInt(wave)];
    
    const data = await prisma.rankData.findMany({
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
        { prefectureId: 'asc' },
        { lineageId: 'asc' }
      ]
    });

    console.log(`Wave ${wave} - rank data retrieved: ${data.length} records`);
    return data;
  } catch (error) {
    console.error('Error fetching rank data:', error);
    return [];
  }
}

export default async function RankPage({ params }: { params: { wave: string } }) {
  const wave = await Promise.resolve(params.wave);
  const data = await getRankData(wave);
  
  if (data.length === 0) {
    return (
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統毎の順位のグラフ</h1>
        <div className="w-full aspect-[16/9] min-h-[600px] border border-gray-300 rounded-lg bg-white p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 font-bold mb-2">ランクデータを取得できませんでした</p>
            <p className="text-gray-600 mb-2">以下の手順でデータをインポートしてください:</p>
            <div className="bg-gray-100 p-4 rounded text-left">
              <p className="font-mono text-sm">1. npm run prisma:push</p>
              <p className="font-mono text-sm">2. npm run prisma:generate</p>
              <p className="font-mono text-sm">3. npm run import-rank-data</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // 都道府県リストを作成
  const prefectures = [...new Set<string>(data.map((d: RankDataWithRelations) => d.prefecture.name))].sort();
  
  console.log(`Rank data loaded: ${data.length} records, ${prefectures.length} prefectures`);


  return (
    <ClientRank
      wave={wave}
      prefectures={prefectures}
      rankData={data}
    />
  );
} 