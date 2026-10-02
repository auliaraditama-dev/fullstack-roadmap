export interface CatalogItem {
  id: string;
  title: string;
  url: string;
  part: string;
  partTitle: string;
  chapter: number;
}

export interface PartSummary {
  id: string;
  title: string;
  start: number;
  end: number;
}

export const catalog: CatalogItem[] = [];
export const parts: PartSummary[] = [];
export const summaries = [];
export const checkpoints: string[] = [];
