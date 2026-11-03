import type { Cycle, Fertilizer, PhaseChange, Plant, Pot, Tent } from './types';

// Ciclo actual: carpa 80x80x160, 6 macetas de 10 L en 2 columnas.
// Germinaron ~30/07 y pasaron a 12/12 a principios de septiembre (~40 días de vege).
// Todo es editable desde la app.

export const seedTent: Tent = {
  id: 'tent-1',
  name: 'Carpa 80 × 80',
  widthCm: 80,
  depthCm: 80,
  heightCm: 160,
  rows: 3,
  cols: 2,
};

export const seedCycle: Cycle = {
  id: 'cycle-1',
  tentId: 'tent-1',
  name: 'Ciclo actual',
  startDate: '2026-07-30',
  status: 'activo',
};

export const seedPots: Pot[] = [0, 1, 2, 3, 4, 5].map((i) => ({
  id: `pot-${i + 1}`,
  cycleId: 'cycle-1',
  row: Math.floor(i / 2),
  col: i % 2,
  liters: 10,
  substrate: 'Tierra',
}));

export const seedPlants: Plant[] = seedPots.map((p, i) => ({
  id: `plant-${i + 1}`,
  potId: p.id,
  name: `P${i + 1}`,
  type: 'foto',
  germinationDate: '2026-07-30',
  description: '',
}));

export const seedPhases: PhaseChange[] = seedPlants.flatMap((pl) => [
  { id: `${pl.id}-vege`, plantId: pl.id, phase: 'vege' as const, date: '2026-07-30' },
  { id: `${pl.id}-flora`, plantId: pl.id, phase: 'flora' as const, date: '2026-09-08' },
]);

export const seedFertilizers: Fertilizer[] = [
  { id: 'fert-oro-negro', brand: 'Namasté', name: 'Oro Negro', kind: 'Orgánico' },
  { id: 'fert-amazonia', brand: 'Namasté', name: 'Amazonia', kind: 'Orgánico' },
  { id: 'fert-flora-booster', brand: 'Namasté', name: 'Flora Booster', kind: 'Orgánico' },
  { id: 'fert-trico', brand: 'Namasté', name: 'Trico+', kind: 'Orgánico' },
  { id: 'fert-shanti', brand: 'Namasté', name: 'Shanti', kind: 'Orgánico' },
];
