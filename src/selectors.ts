import type { Store } from './store';
import type { Phase, PhaseChange, Photo, Plant, Watering } from './types';
import { daysBetween, today, toYmd, parseDate, vpd } from './utils';

export interface PlantSummary {
  phase: Phase;
  dayInPhase: number;
  dayOfLife: number;
  vegeDays: number;
  floraDays: number;
  floraTarget?: number;
  floraRemaining?: number;
}

export function phasesOf(s: Store, plantId: string): PhaseChange[] {
  return s.phases
    .filter((p) => p.plantId === plantId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function summarize(s: Store, plant: Plant): PlantSummary {
  const t = today();
  const list = phasesOf(s, plant.id).filter((p) => p.date <= t);
  const current = list[list.length - 1];
  const phase: Phase = current ? current.phase : 'germinacion';
  const start = current ? current.date : plant.germinationDate;

  const vege = list.find((p) => p.phase === 'vege');
  const flora = list.find((p) => p.phase === 'flora');
  const afterFlora = list.find((p) => p.phase === 'secado' || p.phase === 'curado');

  const vegeDays = vege ? daysBetween(vege.date, flora ? flora.date : t) : 0;
  const floraDays = flora ? daysBetween(flora.date, afterFlora ? afterFlora.date : t) : 0;

  const genetic = s.genetics.find((g) => g.id === plant.geneticId);
  const floraTarget = genetic?.floweringDays;
  const floraRemaining =
    floraTarget && phase === 'flora' ? Math.max(0, floraTarget - floraDays) : undefined;

  return {
    phase,
    dayInPhase: Math.max(0, daysBetween(start, t)),
    dayOfLife: Math.max(0, daysBetween(plant.germinationDate, t)),
    vegeDays,
    floraDays,
    floraTarget,
    floraRemaining,
  };
}

export function lastWatering(s: Store, plantId: string): Watering | undefined {
  return s.waterings.find((w) => w.plantIds.includes(plantId));
}

export function wateringsOf(s: Store, plantId: string): Watering[] {
  return s.waterings.filter((w) => w.plantIds.includes(plantId));
}

export function needsWater(s: Store, plantId: string): boolean {
  const w = lastWatering(s, plantId);
  if (!w) return false;
  return daysBetween(toYmd(parseDate(w.date)), today()) >= s.settings.wateringEveryDays;
}

export function photosOf(s: Store, plantId: string): Photo[] {
  return s.photos.filter((p) => p.plantId === plantId);
}

export function coverOf(s: Store, plant: Plant): Photo | undefined {
  if (plant.coverPhotoId) {
    const p = s.photos.find((x) => x.id === plant.coverPhotoId);
    if (p) return p;
  }
  return s.photos.find((x) => x.plantId === plant.id);
}

export function activePlants(s: Store) {
  const cycle = s.cycles.find((c) => c.tentId === s.activeTentId && c.status === 'activo');
  if (!cycle) return [];
  const pots = s.pots.filter((p) => p.cycleId === cycle.id);
  return pots
    .map((pot) => ({ pot, plant: s.plants.find((pl) => pl.potId === pot.id) }))
    .filter((x): x is { pot: typeof x.pot; plant: Plant } => !!x.plant)
    .sort((a, b) => a.pot.row - b.pot.row || a.pot.col - b.pot.col);
}

export function latestClimate(s: Store) {
  const c = s.climate.find((x) => x.tentId === s.activeTentId);
  return c ? { ...c, vpd: vpd(c.tempC, c.rh) } : undefined;
}
