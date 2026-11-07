export type Phase = 'germinacion' | 'vege' | 'flora' | 'secado' | 'curado';

export const PHASE_LABEL: Record<Phase, string> = {
  germinacion: 'Germinación',
  vege: 'Vege',
  flora: 'Flora',
  secado: 'Secado',
  curado: 'Curado',
};

export interface Tent {
  id: string;
  name: string;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  rows: number;
  cols: number;
}

export interface Cycle {
  id: string;
  tentId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  status: 'activo' | 'archivado';
}

export interface Pot {
  id: string;
  cycleId: string;
  row: number;
  col: number;
  liters: number;
  substrate: string;
}

export interface Plant {
  id: string;
  potId: string;
  name: string;
  geneticId?: string;
  type: 'foto' | 'auto';
  germinationDate: string;
  description: string;
  coverPhotoId?: string;
  endedAt?: string; // YYYY-MM-DD; presente = descartada
}

export interface PhaseChange {
  id: string;
  plantId: string;
  phase: Phase;
  date: string;
}

export interface Genetic {
  id: string;
  name: string;
  breeder: string;
  type: string; // ej: "Fem · Foto"
  floweringDays?: number;
  thc?: string;
  cbd?: string;
  effects: string[];
  flavors: string[];
  notes: string;
  seedsAvailable?: number;
}

export interface Fertilizer {
  id: string;
  brand: string;
  name: string;
  kind: string;
}

export interface RecipeItem {
  fertilizerId: string;
  mlPerL: number;
}

export interface Recipe {
  id: string;
  name: string;
  items: RecipeItem[];
}

export interface WateringItem {
  fertilizerId: string;
  name: string;
  mlPerL: number;
}

export interface Watering {
  id: string;
  date: string; // ISO con hora
  plantIds: string[];
  litersPerPlant: number;
  recipeId?: string;
  recipeName?: string;
  items: WateringItem[];
  ph?: number;
  ec?: number;
  runoffPh?: number;
  runoffEc?: number;
  notes: string;
}

export interface ClimateReading {
  id: string;
  tentId: string;
  date: string; // ISO con hora
  tempC: number;
  rh: number;
  source: 'manual' | 'sensor';
}

export interface Photo {
  id: string;
  plantId: string;
  uri: string;
  date: string; // ISO con hora
  description: string;
  tags: string[];
}

export interface Tasting {
  plantId: string;
  flavor: string;
  aroma: string;
  effect: string;
  score: number;
  notes: string;
}

export interface Settings {
  wateringEveryDays: number;
  firstStepsDismissed?: boolean;
}
