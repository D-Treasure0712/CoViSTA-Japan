import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import csv from 'csv-parser';

interface CsvRow {
  date: string;
  week: string;
  [key: string]: string;
}

const prisma = new PrismaClient();

// 都道府県名の変換マップ
const prefectureMap: { [key: string]: string } = {
  'Hokkaido': '北海道',
  'Aomori': '青森県',
  'Iwate': '岩手県',
  'Miyagi': '宮城県',
  'Akita': '秋田県',
  'Yamagata': '山形県',
  'Fukushima': '福島県',
  'Ibaraki': '茨城県',
  'Tochigi': '栃木県',
  'Gunma': '群馬県',
  'Saitama': '埼玉県',
  'Chiba': '千葉県',
  'Tokyo': '東京都',
  'Kanagawa': '神奈川県',
  'Niigata': '新潟県',
  'Toyama': '富山県',
  'Ishikawa': '石川県',
  'Fukui': '福井県',
  'Yamanashi': '山梨県',
  'Nagano': '長野県',
  'Gifu': '岐阜県',
  'Shizuoka': '静岡県',
  'Aichi': '愛知県',
  'Mie': '三重県',
  'Shiga': '滋賀県',
  'Kyoto': '京都府',
  'Osaka': '大阪府',
  'Hyogo': '兵庫県',
  'Nara': '奈良県',
  'Wakayama': '和歌山県',
  'Tottori': '鳥取県',
  'Shimane': '島根県',
  'Okayama': '岡山県',
  'Hiroshima': '広島県',
  'Yamaguchi': '山口県',
  'Tokushima': '徳島県',
  'Kagawa': '香川県',
  'Ehime': '愛媛県',
  'Kochi': '高知県',
  'Fukuoka': '福岡県',
  'Saga': '佐賀県',
  'Nagasaki': '長崎県',
  'Kumamoto': '熊本県',
  'Oita': '大分県',
  'Miyazaki': '宮崎県',
  'Kagoshima': '鹿児島県',
  'Okinawa': '沖縄県'
};

function parseDate(yearWeek: string): Date {
  const [year, week] = yearWeek.split('/').map(Number);
  const date = new Date(year, 0, 1);
  date.setDate(date.getDate() + (week - 1) * 7);
  return date;
}

async function importData() {
  try {
    // データディレクトリのパス
    const dataDir = join(process.cwd(), 'nakano_src', 'visualize_tool');
    
    // 都道府県データの読み込みと登録
    const prefectures = new Map<string, number>();
    const prefectureFiles = (await readdir(dataDir))
      .filter(file => file.endsWith('.csv'))
      .map(file => file.replace('.csv', ''));

    for (const prefecture of prefectureFiles) {
      const createdPrefecture = await prisma.prefecture.create({
        data: { name: prefecture },
      });
      prefectures.set(prefecture, createdPrefecture.id);
    }

    // 系統データの読み込みと登録
    const lineages = new Map<string, number>();
    const processedLineages = new Set<string>();

    // すべてのCSVファイルを処理して系統を収集
    for (const prefecture of prefectureFiles) {
      const filePath = join(dataDir, `${prefecture}.csv`);
      const rows: CsvRow[] = [];
      
      await new Promise((resolve) => {
        createReadStream(filePath)
          .pipe(csv())
          .on('data', (row: CsvRow) => {
            rows.push(row);
            Object.keys(row).forEach(key => {
              if (key !== 'date' && key !== 'week' && !processedLineages.has(key)) {
                processedLineages.add(key);
              }
            });
          })
          .on('end', resolve);
      });
    }

    // 系統を登録
    for (const lineage of processedLineages) {
      const createdLineage = await prisma.lineage.create({
        data: { name: lineage },
      });
      lineages.set(lineage, createdLineage.id);
    }

    // データの読み込みと登録
    for (const prefecture of prefectureFiles) {
      const filePath = join(dataDir, `${prefecture}.csv`);
      const rows: CsvRow[] = [];
      
      await new Promise((resolve) => {
        createReadStream(filePath)
          .pipe(csv())
          .on('data', (row: CsvRow) => rows.push(row))
          .on('end', resolve);
      });

      for (const row of rows) {
        const date = new Date(row.date);
        const week = parseInt(row.week);
        const prefectureId = prefectures.get(prefecture)!;

        // 各系統のデータを処理
        for (const [lineageName, lineageId] of lineages) {
          if (lineageName !== 'date' && lineageName !== 'week') {
            const count = parseInt(row[lineageName]) || 0;
            const ratio = parseFloat(row[lineageName]) / 100 || 0;

            await prisma.covidData.create({
              data: {
                date,
                count,
                ratio,
                prefectureId,
                lineageId,
                wave: week >= 6 && week <= 8 ? week : 0,
              },
            });
          }
        }
      }
    }

    console.log('Data import completed successfully');
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importData(); 