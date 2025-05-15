// クライアントコンポーネントのインポート
import ClientPage from './client';

//hooks
import { usePrefectureDataPreparation } from '@/hooks/usePrefectureDataPreparation';

export default async function Page({ params }: { params: { wave: string } }) {
  const { preparePrefectureData } = usePrefectureDataPreparation()
  const wave = params.wave;
  const { prefectures, prefectureData, dataCount, isEmpty } = await preparePrefectureData(wave);
  
  if (isEmpty) {
    return (
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">流行系統の比率グラフ</h1>
        <div className="w-full aspect-[16/9] min-h-[600px] border border-gray-300 rounded-lg bg-white p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 font-bold mb-2">データを取得できませんでした</p>
            <p className="text-gray-600">系統データの形式に問題がある可能性があります。</p>
          </div>
        </div>
      </div>
    );
  }
  
  // クライアントコンポーネントに必要なデータを渡す
  return (
    <ClientPage 
      wave={wave} 
      prefectures={prefectures} 
      prefectureData={prefectureData} 
      dataCount={dataCount} 
    />
  );
} 