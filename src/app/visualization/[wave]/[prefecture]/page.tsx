/**
 * @file src/app/visualization/[wave]/[prefecture]/page.tsx
 * @description
 * グラフ表示ページのサーバーコンポーネント
 */

import { getRatioAndHeatmapData, getRankData } from '@/lib/data';
import VisualizationClient from './VisualizationClient';
import Link from 'next/link';
import { prefectureReverseMap } from '@/lib/prefectureMapping';

export default async function VisualizationPage({
  params,
}: {
  params: { wave: string; prefecture: string };
}) {
  const wave = params.wave;
  const englishPrefecture = params.prefecture;

  const japanesePrefecture = prefectureReverseMap[englishPrefecture];

  // 不正なURL（対応する日本語名がない）の場合のエラー処理
  if (!japanesePrefecture) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">ページが見つかりません</h2>
          <p className="text-gray-700">
            指定された都道府県「{englishPrefecture}」は存在しません。
          </p>
          <Link href="/" className="mt-6 inline-block bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700 transition-colors">
            選択画面に戻る
          </Link>
        </div>
      </div>
    );
  }


  const [ratioHeatmapResult, rankResult] = await Promise.all([
    getRatioAndHeatmapData(wave, englishPrefecture),
    getRankData(wave, englishPrefecture),
  ]);

  const { ratioData, heatmapData, error: dataError } = ratioHeatmapResult;
  const { rankData, error: rankError } = rankResult;

  // データ処理がうまくいかなかったときのエラー処理
  if (dataError || rankError || !ratioData || !heatmapData || !rankData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">データ取得エラー</h2>
          <p className="text-gray-700">
            「<span className="font-semibold">{japanesePrefecture}</span>」の
            「<span className="font-semibold">第{wave}波</span>」
            のデータを取得できませんでした。
          </p>
          <pre className="mt-4 text-left text-xs bg-gray-50 p-3 rounded overflow-auto border">
            {dataError || rankError || "不明なエラーが発生しました。"}
          </pre>
          <Link href="/" className="mt-6 inline-block bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700 transition-colors">
            選択画面に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <VisualizationClient
      wave={wave}
      prefecture={japanesePrefecture}
      ratioData={ratioData}
      heatmapData={heatmapData}
      rankData={rankData}
    />
  );
}
