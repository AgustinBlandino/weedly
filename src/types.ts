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
  /** Luminarias usadas en el ciclo. Opcional: los ciclos guardados antes no lo tienen. */
  lights?: CycleLight[];
}

export type LightType = 'led' | 'hps' | 'mh' | 'cfl' | 'otro';

export const LIGHT_TYPE_LABEL: Record<LightType, string> = {
  led: 'LED',
  hps: 'Sodio (HPS)',
  mh: 'Halogenuro (MH)',
  cfl: 'Bajo consumo (CFL)',
  otro: 'Otro',
};

export interface Light {
  id: string;
  type: LightType;
  brand: string;
  model: string;
  watts: number; // potencia real, no equivalente
  dimmable?: boolean;
  ppf?: number; // µmol/s
  spectrum?: string; // texto libre
  notes: string;
}

/** Copia de la luminaria en el ciclo: el historial sobrevive si se borra del catálogo. */
export interface CycleLight {
  lightId?: string; // se limpia si la luminaria se borra
  label: string; // "Marca Modelo", o solo la marca
  watts: number;
  /** Opcional: las copias guardadas antes no lo tienen. */
  type?: LightType;
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
  floweringDays?: number; // se carga en semanas, se guarda en días
  thc?: string;
  cbd?: string;
  effects: string[];
  flavors: string[];
  notes: string;
}

export interface Fertilizer {
  id: string;
  brand: string;
  name: string;
  /** Dato viejo (tipo libre). Ya no se muestra ni se edita; se conserva en los guardados. */
  kind?: string;
  /** Unidad de la dosis. Opcional: si falta es ml (los guardados antes no la tienen). */
  unit?: DoseUnit;
  /** Fase del cultivo para la que es el producto. */
  stage?: FertilizerStage;
  /** "N-P-K" según la etiqueta, si se conoce. */
  npk?: string;
  /** Id del producto en src/data/fertilizerCatalog.ts si se sumó desde el catálogo. */
  catalogId?: string;
}

export type DoseUnit = 'ml' | 'g';
export type FertilizerStage = 'enraizamiento' | 'vege' | 'flora' | 'todo';

/** Recetas: ya no se usan en la UI, pero los datos guardados se conservan. */
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
  /** Dosis por litro en la unidad de `unit` (ml/L o g/L). Conserva el nombre por compatibilidad con lo guardado. */
  mlPerL: number;
  /** Opcional: si falta es ml. */
  unit?: DoseUnit;
}

export interface Watering {
  id: string;
  date: string; // ISO con hora
  plantIds: string[];
  litersPerPlant: number;
  /** Solo en riegos viejos, cargados con receta. Los riegos nuevos no los setean. */
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
