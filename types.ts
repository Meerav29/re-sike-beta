
export enum BinType {
  RECYCLING = 'Recycling',
  LANDFILL = 'Landfill',
  COMPOST = 'Compost',
  SPECIAL = 'Special',
  UNKNOWN = 'Unknown',
}

export interface ClassificationResult {
  itemName: string;
  bin: BinType;
  reason: string;
  alternatives: string[];
}

export type AppState = 'idle' | 'requesting' | 'scanning' | 'processing' | 'result' | 'error';
