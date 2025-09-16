import { prefectureReverseMap } from './prefectureMapping';

export function createPrefectureNotFoundError(englishPrefecture: string) {
  return {
    title: "ページが見つかりません",
    message: `指定された都道府県「${englishPrefecture}」は存在しません。`,
  };
}