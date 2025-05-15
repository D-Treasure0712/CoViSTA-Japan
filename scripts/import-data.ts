import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import csv from 'csv-parser';
import fs from 'fs';

/**
 * CSVファイルの1行を表すインターフェース
 * 任意の列名をキーとして持つことができる
 */
interface CsvRow {
  [key: string]: string;
}

// Prismaクライアントのインスタンスを作成
const prisma = new PrismaClient();

/**
 * 都道府県名の英語表記から日本語表記への変換マッピング
 * 例: 'Tokyo' -> '東京都'
 */
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

/**
 * 日付文字列をDate型に変換する関数
 * 
 * @param dateStr - 解析する日付文字列 (YYYY/WW形式または標準日付形式)
 * @returns 変換されたDateオブジェクト
 */
function parseDate(dateStr: string): Date {
  try {
    // YYYY/WW形式（年/週）の日付を解析
    if (dateStr.includes('/')) {
      const [year, week] = dateStr.split('/').map(Number);
      const date = new Date(year, 0, 1); // その年の1月1日
      date.setDate(date.getDate() + (week - 1) * 7); // 週数に応じて日を加算
      return date;
    }
    // 標準的な日付形式（ISO 8601など）として解析
    return new Date(dateStr);
  } catch (error) {
    console.error(`日付の解析に失敗しました: ${dateStr}`, error);
    return new Date(); // エラーが発生した場合は現在の日付を返す
  }
}

/**
 * データをインポートする主要な関数
 * CSVファイルから新型コロナウイルスの系統データを読み込みデータベースに格納する
 */
async function importData() {
  try {
    console.log('データのインポートを開始します...');

    // データベースをクリーンな状態にするため既存データを削除
    await prisma.covidData.deleteMany();
    await prisma.prefecture.deleteMany();
    
    // データファイルがあるディレクトリのパスを設定
    const baseDir = join(process.cwd(), 'nakano_src', 'visualize_tool');
    // 処理する各波（第6波、第7波、第8波、第6-8波の統合データ）のディレクトリ
    const waveDirs = ['6wave', '7wave', '8wave', '6-8wave'];
    
    // 都道府県データを格納するためのマップを初期化
    const prefectures = new Map<string, number>();
    const prefectureSet = new Set<string>(); // 重複を避けるためにSetを使用
    
    console.log('CSVファイルを探索中...');
    
    // 各波のディレクトリからCSVファイルを収集し処理
    for (const waveDir of waveDirs) {
      const wavePath = join(baseDir, waveDir);
      
      // ディレクトリが存在しない場合はスキップ
      if (!fs.existsSync(wavePath)) {
        console.log(`ディレクトリが存在しません: ${wavePath}`);
        continue;
      }
      
      // ディレクトリ内のファイル一覧を取得し、CSVファイルのみをフィルタリング
      const files = await readdir(wavePath);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      console.log(`${waveDir}ディレクトリ内のCSVファイル数: ${csvFiles.length}`);
      
      // ファイル名から都道府県名を抽出
      for (const file of csvFiles) {
        // 「Rank_lineage_都道府県名_Nwave.csv」という命名規則からマッチング
        const match = file.match(/Rank_lineage_([^_]+)_\d+wave\.csv/);
        if (match && match[1]) {
          const prefecture = match[1];
          // 特殊なファイル（all, easy, major）は都道府県ではないのでスキップ
          if (prefecture !== 'all' && prefecture !== 'easy' && prefecture !== 'major') {
            prefectureSet.add(prefecture);
          }
        }
      }
    }
    
    console.log(`検出された都道府県数: ${prefectureSet.size}`);
    
    // 検出された都道府県をデータベースに登録
    for (const prefecture of prefectureSet) {
      const createdPrefecture = await prisma.prefecture.create({
        data: { name: prefecture },
      });
      // 後で使用するために都道府県名とIDのマッピングを保存
      prefectures.set(prefecture, createdPrefecture.id);
      console.log(`都道府県を登録: ${prefecture} (ID: ${createdPrefecture.id})`);
    }
    
    // 系統データはすでにfix-lineage-data.tsで作成されているため、
    // 既存の系統データをデータベースから取得して使用
    const lineages = new Map<string, number>();
    const existingLineages = await prisma.lineage.findMany();
    
    // 系統名とIDのマッピングを作成
    for (const lineage of existingLineages) {
      lineages.set(lineage.name, lineage.id);
    }
    
    console.log(`データベースから取得した系統数: ${lineages.size}`);
    
    // 各波のデータを処理
    for (const waveDir of waveDirs) {
      const wavePath = join(baseDir, waveDir);
      // 波番号を取得（6-8waveの場合は特殊ケースとして0を設定）
      const waveNum = waveDir === '6-8wave' ? 0 : parseInt(waveDir.replace('wave', ''));
      
      if (!fs.existsSync(wavePath)) {
        continue;
      }
      
      const files = await readdir(wavePath);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      for (const file of csvFiles) {
        // 都道府県名をファイル名から抽出
        const match = file.match(/Rank_lineage_([^_]+)_\d+wave\.csv/);
        if (!match || !match[1]) continue;
        
        const prefecture = match[1];
        // 特殊なファイルはスキップ
        if (prefecture === 'all' || prefecture === 'easy' || prefecture === 'major') continue;
        
        const prefectureId = prefectures.get(prefecture);
        if (!prefectureId) {
          console.log(`都道府県IDが見つかりません: ${prefecture}`);
          continue;
        }
        
        const filePath = join(wavePath, file);
        
        // CSVファイルを直接読み込み
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split('\n');
        
        // ヘッダー行から日付の列を取得
        const header = lines[0].trim();
        const dateKeys = header.split(',').slice(1); // 最初の列（系統名）をスキップ
        
        // データ行を1行ずつ処理
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // 空行はスキップ
          
          const values = line.split(',');
          if (values.length <= 1) continue; // データが不足している行はスキップ
          
          // 最初の列は系統名
          const lineageName = values[0];
          if (!lineageName) continue;
          
          // 系統IDを取得
          const lineageId = lineages.get(lineageName);
          if (!lineageId) {
            console.log(`系統IDが見つかりません: ${lineageName}`);
            continue;
          }
          
          // 各日付のデータを処理（2列目以降）
          for (let j = 1; j < values.length && j - 1 < dateKeys.length; j++) {
            const dateKey = dateKeys[j - 1];
            const value = values[j];
            
            if (!dateKey || !value) continue;
            
            // 日付文字列をDate型に変換
            const date = parseDate(dateKey);
            // 検出数を整数に変換（値が不正な場合は0）
            const count = parseInt(value) || 0;
            // パーセントから小数の割合に変換（例: 75% → 0.75）
            const ratio = count / 100;
            
            try {
              // 変換したデータをデータベースに保存
              await prisma.covidData.create({
                data: {
                  date,       // 検出日
                  count,      // カウント値（パーセント）
                  ratio,      // 割合（0-1の小数）
                  prefectureId, // 都道府県のID
                  lineageId,    // 系統のID
                  wave: waveNum, // 波番号
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

    // インポート完了後の統計情報を表示
    const dataCount = await prisma.covidData.count();
    console.log(`データのインポートが完了しました。登録データ数: ${dataCount}`);
  } catch (error) {
    console.error('データのインポート中にエラーが発生しました:', error);
    throw error;
  } finally {
    // データベース接続を適切にクローズ
    await prisma.$disconnect();
  }
}

// インポート処理を実行
importData();