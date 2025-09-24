/**
 * @type {import('tailwindcss').Config}
 *
 * このプロジェクトのファイル構成に最適化されたTailwind CSS設定です。
 * CommonJS形式(.cjs)で記述されています。
 */
module.exports = {
  // 'content'には、Tailwindのクラス名が使われている全てのファイルを指定します。
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [],
};