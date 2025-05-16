import { Layout, Data } from 'plotly.js';

/**
 * 都道府県データの型定義
 * id: 都道府県ID
 * name: 都道府県名
 */
export interface Prefecture {
	id: number;
	name: string;
}

/**
 * 系統（変異株）データの型定義
 * id: 系統ID
 * name: 系統名（変異株名）
 */
export interface Lineage {
	id: number;
	name: string;
}

/**
 * COVID-19データと関連情報を含む型定義
 * id: データID
 * date: 日付
 * count: 検出数
 * ratio: 検出率（百分率）
 * prefectureId: 都道府県ID（外部キー）
 * lineageId: 系統ID（外部キー）
 * wave: 感染波の番号
 * prefecture: 都道府県の関連データ
 * lineage: 系統の関連データ
 */
export interface CovidDataWithRelations {
    id: number;
    date: Date;
    count: number;
    ratio: number;
    prefectureId: number;
    lineageId: number;
    wave: number;
    prefecture: Prefecture;
    lineage: Lineage;
}

/**
 * 系統グループごとのグラフデータ構造
 * Plotly.jsの積み上げグラフとして表示するためのデータ形式
 */
export interface LineageGroups {
  [key: string]: {
    x: string[];
    y: number[];
    name: string;
    type: 'scatter';
    stackgroup: string;
    hovertemplate: string;
  };
}
export interface PlotComponentProps {
  data: Data[];
  layout: Partial<Layout>;
}

export interface PrefectureDataItem {
  prefecture: string;
  plotData: Data[];
}

export interface ClientPageProps {
  wave: string;
  prefectures: string[];
  prefectureData: PrefectureDataItem[];
  dataCount: number;
}
