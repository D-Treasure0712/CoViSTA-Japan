/**
 * @file src/lib/prefectureMapping.ts
 * @description
 * 都道府県の日本語名と英語名（ローマ字）を対応させるためのデータを提供します。
 * - `prefectureMap`: 日本語名をキー、英語名を値とするオブジェクト。URL生成時に使用します。
 * - `prefectureReverseMap`: 英語名をキー、日本語名を値とするオブジェクト。
 * URLパラメータから日本語名を取得する際に使用します。
 */

export const prefectureMap: { [key: string]: string } = {
  "北海道": "Hokkaido", "青森県": "Aomori", "岩手県": "Iwate", "宮城県": "Miyagi", "秋田県": "Akita",
  "山形県": "Yamagata", "福島県": "Fukushima", "茨城県": "Ibaraki", "栃木県": "Tochigi", "群馬県": "Gumma",
  "埼玉県": "Saitama", "千葉県": "Chiba", "東京都": "Tokyo", "神奈川県": "Kanagawa", "新潟県": "Niigata",
  "富山県": "Toyama", "石川県": "Ishikawa", "福井県": "Fukui", "山梨県": "Yamanashi", "長野県": "Nagano",
  "岐阜県": "Gifu", "静岡県": "Shizuoka", "愛知県": "Aichi", "三重県": "Mie", "滋賀県": "Shiga",
  "京都府": "Kyoto", "大阪府": "Osaka", "兵庫県": "Hyogo", "奈良県": "Nara", "和歌山県": "Wakayama",
  "鳥取県": "Tottori", "島根県": "Shimane", "岡山県": "Okayama", "広島県": "Hiroshima", "山口県": "Yamaguchi",
  "徳島県": "Tokushima", "香川県": "Kagawa", "愛媛県": "Ehime", "高知県": "Kochi", "福岡県": "Fukuoka",
  "佐賀県": "Saga", "長崎県": "Nagasaki", "熊本県": "Kumamoto", "大分県": "Oita", "宮崎県": "Miyazaki",
  "鹿児島県": "Kagoshima", "沖縄県": "Okinawa"
};

// 英語名から日本語名へ逆引きするためのマップを生成
export const prefectureReverseMap: { [key: string]: string } = Object.fromEntries(
  Object.entries(prefectureMap).map(([jp, en]) => [en, jp])
);
