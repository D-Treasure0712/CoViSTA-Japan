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

async function fixLineageData() {
  try {
    console.log('系統名の修正を開始します...');
    
    // サンプルCSVから正しい系統名を取得
    const sampleCsvPath = join(process.cwd(), 'nakano_src', 'visualize_tool', '6wave', 'Rank_lineage_Tokyo_6wave.csv');
    
    // CSVファイルが存在することを確認
    if (!fs.existsSync(sampleCsvPath)) {
      console.error(`サンプルCSVファイルが見つかりません: ${sampleCsvPath}`);
      return;
    }
    
    // CSVを直接読み込んで処理（csv-parserではなく生のテキストとして）
    const fileContent = fs.readFileSync(sampleCsvPath, 'utf8');
    const lines = fileContent.split('\n');
    
    // 最初の行（ヘッダー）をスキップし、各行の最初の値を取得
    const lineageNames: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const values = line.split(',');
        if (values.length > 0 && values[0]) {
          lineageNames.push(values[0]);
        }
      }
    }
    
    console.log(`CSVから抽出した系統名: ${lineageNames.length}個`);
    console.log(lineageNames);
    
    // 現在のデータベースの状態を確認
    const currentLineages = await prisma.lineage.findMany();
    console.log(`現在のデータベース内の系統数: ${currentLineages.length}個`);
    
    // 既存の系統データを削除
    await prisma.covidData.deleteMany();
    await prisma.lineage.deleteMany();
    
    // 新しい系統データを作成
    for (const name of lineageNames) {
      if (name && name !== '') {
        await prisma.lineage.create({
          data: { name }
        });
        console.log(`系統を追加: ${name}`);
      }
    }
    
    console.log('系統名の修正が完了しました。CSVデータを再インポートしてください。');
  } catch (error) {
    console.error('系統名の修正中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLineageData(); 