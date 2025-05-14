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

function parseDate(dateStr: string): Date {
  try {
    // YYYY/WW形式の日付を解析
    if (dateStr.includes('/')) {
      const [year, week] = dateStr.split('/').map(Number);
      const date = new Date(year, 0, 1);
      date.setDate(date.getDate() + (week - 1) * 7);
      return date;
    }
    // 標準的な日付形式
    return new Date(dateStr);
  } catch (error) {
    console.error(`日付の解析に失敗しました: ${dateStr}`, error);
    return new Date();
  }
}

async function importData() {
  try {
    console.log('データのインポートを開始します...');

    // データベースをリセット
    await prisma.covidData.deleteMany();
    await prisma.prefecture.deleteMany();
    
    // データディレクトリのパス
    const baseDir = join(process.cwd(), 'nakano_src', 'visualize_tool');
    const waveDirs = ['6wave', '7wave', '8wave', '6-8wave'];
    
    // 都道府県データの登録
    const prefectures = new Map<string, number>();
    const prefectureSet = new Set<string>();
    
    console.log('CSVファイルを探索中...');
    
    // 各波のディレクトリからCSVファイルを収集
    for (const waveDir of waveDirs) {
      const wavePath = join(baseDir, waveDir);
      
      if (!fs.existsSync(wavePath)) {
        console.log(`ディレクトリが存在しません: ${wavePath}`);
        continue;
      }
      
      const files = await readdir(wavePath);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      console.log(`${waveDir}ディレクトリ内のCSVファイル数: ${csvFiles.length}`);
      
      // 都道府県名の抽出
      for (const file of csvFiles) {
        const match = file.match(/Rank_lineage_([^_]+)_\d+wave\.csv/);
        if (match && match[1]) {
          const prefecture = match[1];
          if (prefecture !== 'all' && prefecture !== 'easy' && prefecture !== 'major') {
            prefectureSet.add(prefecture);
          }
        }
      }
    }
    
    console.log(`検出された都道府県数: ${prefectureSet.size}`);
    
    // 都道府県の登録
    for (const prefecture of prefectureSet) {
      const createdPrefecture = await prisma.prefecture.create({
        data: { name: prefecture },
      });
      prefectures.set(prefecture, createdPrefecture.id);
      console.log(`都道府県を登録: ${prefecture} (ID: ${createdPrefecture.id})`);
    }
    
    // すでに系統データはfix-lineage-data.tsで作成済みなので、
    // ここでは既存の系統データを取得するだけ
    const lineages = new Map<string, number>();
    const existingLineages = await prisma.lineage.findMany();
    
    for (const lineage of existingLineages) {
      lineages.set(lineage.name, lineage.id);
    }
    
    console.log(`データベースから取得した系統数: ${lineages.size}`);
    
    // 各波のデータを処理
    for (const waveDir of waveDirs) {
      const wavePath = join(baseDir, waveDir);
      const waveNum = waveDir === '6-8wave' ? 0 : parseInt(waveDir.replace('wave', ''));
      
      if (!fs.existsSync(wavePath)) {
        continue;
      }
      
      const files = await readdir(wavePath);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      for (const file of csvFiles) {
        const match = file.match(/Rank_lineage_([^_]+)_\d+wave\.csv/);
        if (!match || !match[1]) continue;
        
        const prefecture = match[1];
        if (prefecture === 'all' || prefecture === 'easy' || prefecture === 'major') continue;
        
        const prefectureId = prefectures.get(prefecture);
        if (!prefectureId) {
          console.log(`都道府県IDが見つかりません: ${prefecture}`);
          continue;
        }
        
        const filePath = join(wavePath, file);
        
        // ファイルを直接読み込み
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split('\n');
        
        // ヘッダー行を解析して日付を取得
        const header = lines[0].trim();
        const dateKeys = header.split(',').slice(1); // 最初の列（空）をスキップ
        
        // データ行を処理
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // 空行はスキップ
          
          const values = line.split(',');
          if (values.length <= 1) continue; // データが不足している行はスキップ
          
          // 最初の値が系統名
          const lineageName = values[0];
          if (!lineageName) continue;
          
          const lineageId = lineages.get(lineageName);
          if (!lineageId) {
            console.log(`系統IDが見つかりません: ${lineageName}`);
            continue;
          }
          
          // 残りの値は各日付のデータ
          for (let j = 1; j < values.length && j - 1 < dateKeys.length; j++) {
            const dateKey = dateKeys[j - 1];
            const value = values[j];
            
            if (!dateKey || !value) continue;
            
            const date = parseDate(dateKey);
            const count = parseInt(value) || 0;
            const ratio = count / 100; // 割合に変換（%から小数へ）
            
            try {
              await prisma.covidData.create({
                data: {
                  date,
                  count,
                  ratio,
                  prefectureId,
                  lineageId,
                  wave: waveNum,
                },
              });
            } catch (error) {
              console.error(`データの登録に失敗しました: ${prefecture}, ${lineageName}, ${dateKey}`, error);
            }
          }
        }
        
        console.log(`ファイルを処理しました: ${file}`);
      }
    }

    const dataCount = await prisma.covidData.count();
    console.log(`データのインポートが完了しました。登録データ数: ${dataCount}`);
  } catch (error) {
    console.error('データのインポート中にエラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importData(); 