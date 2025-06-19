import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import csv from 'csv-parser';
import fs from 'fs';

interface CsvRow {
  [key: string]: string;
}

const prisma = new PrismaClient();

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

async function importRankData() {
  console.log('Starting rank data import...');

  try {
    // RankDataテーブルのみをクリア（CovidDataは触らない）
    await prisma.rankData.deleteMany({});
    console.log('Cleared existing rank data');

    const baseDir = 'nakano_src/visualize_tool';
    
    // 各波のランクディレクトリを処理
    const rankDirs = ['6wave_Rank', '7wave_Rank', '8wave_Rank', '6-8wave_Rank'];
    
    for (const rankDir of rankDirs) {
      const dirPath = join(baseDir, rankDir);
      
      if (!fs.existsSync(dirPath)) {
        console.log(`Directory ${dirPath} does not exist, skipping...`);
        continue;
      }

      console.log(`Processing directory: ${rankDir}`);
      const wave = rankDir === '6-8wave_Rank' ? [6, 7, 8] : [parseInt(rankDir.charAt(0))];
      
      const files = await readdir(dirPath);
      const csvFiles = files.filter(file => file.endsWith('.csv') && file.includes('Rank_lineage_'));

      for (const csvFile of csvFiles) {
        const filePath = join(dirPath, csvFile);
        
        // ファイル名から都道府県名を抽出
        const prefectureMatch = csvFile.match(/Rank_lineage_([^_]+)_/);
        if (!prefectureMatch) {
          console.log(`Could not extract prefecture from filename: ${csvFile}`);
          continue;
        }

        const prefectureEng = prefectureMatch[1];
        let prefectureJpn = prefectureMap[prefectureEng];
        
        // 特別なファイル名を処理
        if (!prefectureJpn) {
          if (prefectureEng === 'all') {
            prefectureJpn = '全国';
          } else if (prefectureEng === 'easy') {
            prefectureJpn = '簡易';
          } else if (prefectureEng === 'major') {
            prefectureJpn = '主要';
          } else {
            console.log(`Prefecture mapping not found for: ${prefectureEng}`);
            continue;
          }
        }

        console.log(`Processing file: ${csvFile} (${prefectureJpn})`);

        // 都道府県レコードを取得または作成
        let prefecture = await prisma.prefecture.findUnique({
          where: { name: prefectureJpn }
        });

        if (!prefecture) {
          prefecture = await prisma.prefecture.create({
            data: { name: prefectureJpn }
          });
        }

        await processRankCsvFile(filePath, prefecture.id, wave);
      }
    }

    console.log('Rank data import completed successfully!');
  } catch (error) {
    console.error('Error importing rank data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function processRankCsvFile(filePath: string, prefectureId: number, waves: number[]) {
  return new Promise<void>((resolve, reject) => {
    const results: CsvRow[] = [];
    
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: CsvRow) => results.push(data))
      .on('end', async () => {
        try {
          console.log(`Processing ${results.length} lineages from ${filePath}`);
          
          for (const row of results) {
            const lineageName = row[''] || row['lineage'] || Object.keys(row)[0]; // 最初の列が系統名
            
            if (!lineageName || lineageName.trim() === '') {
              continue;
            }

            // 系統レコードを取得または作成
            let lineage = await prisma.lineage.findUnique({
              where: { name: lineageName }
            });

            if (!lineage) {
              lineage = await prisma.lineage.create({
                data: { name: lineageName }
              });
            }

            // 各日付（週）のランクデータを処理
            for (const [dateKey, rankValue] of Object.entries(row)) {
              if (dateKey === '' || dateKey === 'lineage' || !dateKey.includes('/')) {
                continue; // 系統名の列をスキップ
              }

              // 空文字列や無効な値をnullとして扱う
              const rank = rankValue && rankValue.trim() !== '' ? parseInt(rankValue) : null;
              
              // 各波に対してデータを作成
              for (const wave of waves) {
                await prisma.rankData.create({
                  data: {
                    date: dateKey,
                    rank: rank,
                    prefectureId: prefectureId,
                    lineageId: lineage.id,
                    wave: wave
                  }
                });
              }
            }
          }
          
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

// スクリプトを実行
importRankData()
  .then(() => {
    console.log('Import completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });

export { importRankData };