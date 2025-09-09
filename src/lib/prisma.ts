import { PrismaClient } from '@prisma/client';

/**
 * グローバルスコープでPrismaClientのインスタンスを保持するための型定義
 * Next.jsのホットリロード時に複数のPrismaClientインスタンスが作成されることを防ぐ
 */
const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * アプリケーション全体で共有するPrismaClientのシングルトンインスタンス
 * 既存のインスタンスがあればそれを再利用し、なければ新しく作成する
 *
 * log: ['query'] - SQLクエリをコンソールに出力するログ設定
 * これによりデバッグ時にデータベースクエリを追跡することができる
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

/**
 * 開発環境（非本番環境）では、作成したPrismaClientインスタンスをグローバル変数に保存する
 * これにより開発時のホットリロードでも同じインスタンスを再利用できる
 * 本番環境では毎回新しいインスタンスが作成されるため、この処理は不要
 */
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;