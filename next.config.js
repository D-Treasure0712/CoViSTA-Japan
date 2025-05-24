/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Docker環境でのホットリロードを改善するための設定
  webpack: (config) => {
    // ファイル変更の検知にポーリングを使用
    config.watchOptions = {
      poll: 1000, // 1秒ごとにポーリング
      aggregateTimeout: 300,
      ignored: ['**/node_modules', '**/.git'],
    };
    return config;
  },
}

export default nextConfig