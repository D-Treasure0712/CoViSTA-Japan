import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">新型コロナウイルス流行系統推移可視化ツール</h1>
      
      <div className="grid gap-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">第6～8波の情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/visualization/ratio/6-8" className="p-4 bg-blue-100 rounded-lg hover:bg-blue-200 text-black">
              流行系統毎の割合のグラフ
            </Link>
            <Link href="/visualization/heatmap/6-8" className="p-4 bg-green-100 rounded-lg hover:bg-green-200 text-black">
              系統ごとのヒートマップ
            </Link>
            <Link href="/visualization/rank/6-8" className="p-4 bg-purple-100 rounded-lg hover:bg-purple-200 text-black">
              流行系統毎の順位のグラフ
            </Link>
          </div>
        </section>

        {[6, 7, 8].map((wave) => (
          <section key={wave}>
            <h2 className="text-2xl font-semibold mb-4">第{wave}波の情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href={`/visualization/ratio/${wave}`} className="p-4 bg-blue-100 rounded-lg hover:bg-blue-200 text-black">
                流行系統毎の割合のグラフ
              </Link>
              <Link href={`/visualization/heatmap/${wave}`} className="p-4 bg-green-100 rounded-lg hover:bg-green-200 text-black">
                系統ごとのヒートマップ
              </Link>
              <Link href={`/visualization/rank/${wave}`} className="p-4 bg-purple-100 rounded-lg hover:bg-purple-200 text-black">
                流行系統毎の順位のグラフ
              </Link>
            </div>
          </section>
        ))}

        <section>
          <h2 className="text-2xl font-semibold mb-4">都道府県別系統推移</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/visualization/prefecture-summary/6-8" className="p-4 bg-yellow-100 rounded-lg hover:bg-yellow-200 text-black">
              第6～8波：都道府県別の主要系統推移
            </Link>
            <Link href="/visualization/prefecture-summary/6" className="p-4 bg-yellow-100 rounded-lg hover:bg-yellow-200 text-black">
              第6波：都道府県別の主要系統推移
            </Link>
            <Link href="/visualization/prefecture-summary/7" className="p-4 bg-yellow-100 rounded-lg hover:bg-yellow-200 text-black">
              第7波：都道府県別の主要系統推移
            </Link>
            <Link href="/visualization/prefecture-summary/8" className="p-4 bg-yellow-100 rounded-lg hover:bg-yellow-200 text-black">
              第8波：都道府県別の主要系統推移
            </Link>
          </div>
        </section>
        </div>
    </div>
  );
}
