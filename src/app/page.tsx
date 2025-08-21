/**
 * @file src/app/page.tsx
 * @description
 * このファイルは、アプリケーションのトップページ（ランディングページ）を定義します。
 * [修正点]
 * - `prefectureMapping.ts` から都道府県名の対応表をインポートします。
 * - 「グラフを表示」ボタンがクリックされると、選択された日本語の都道府県名を英語名に変換し、
 * /visualization/[wave]/[englishPrefectureName] の形式のURLを生成してページ遷移します。
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { prefectureMap } from '@/lib/prefectureMapping'; // 対応表をインポート

// 都道府県リスト (prefectureMapのキーから生成)
const prefectures = Object.keys(prefectureMap);

// 波の選択肢
const waves = [
  { value: '6', label: '第6波' },
  { value: '7', label: '第7波' },
  { value: '8', label: '第8波' },
  { value: '6-8', label: '第6-8波' },
];

export default function Home() {
  const router = useRouter();
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>("東京都"); // 初期値を東京都に設定
  const [selectedWave, setSelectedWave] = useState<string>(waves[3].value); // 初期値を第6-8波に設定
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPrefecture && selectedWave) {
      setIsLoading(true);
      // [修正点] 日本語名を英語名に変換
      const englishPrefecture = prefectureMap[selectedPrefecture];
      if (englishPrefecture) {
        router.push(`/visualization/${selectedWave}/${englishPrefecture}`);
      } else {
        // 万が一、対応する英語名が見つからない場合
        alert("選択された都道府県の英語名が見つかりません。");
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 font-sans">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            新型コロナウイルス
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700">
            流行系統推移可視化ツール
          </h2>
          <p className="mt-2 text-gray-500">
            都道府県と流行の波を選択してください
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="prefecture" className="block text-sm font-medium text-gray-700 mb-1">
              都道府県
            </label>
            <select
              id="prefecture"
              value={selectedPrefecture}
              onChange={(e) => setSelectedPrefecture(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {prefectures.map((pref) => (
                <option key={pref} value={pref}>
                  {pref}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="wave" className="block text-sm font-medium text-gray-700 mb-1">
              流行の波
            </label>
            <select
              id="wave"
              value={selectedWave}
              onChange={(e) => setSelectedWave(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {waves.map((wave) => (
                <option key={wave.value} value={wave.value}>
                  {wave.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-300"
            >
              {isLoading ? '読み込み中...' : 'グラフを表示'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
