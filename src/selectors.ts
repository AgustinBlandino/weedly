import type { Store } from './store';
import { PHASE_LABEL } from './types';
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

export function activeTent(s: Store) {
  return s.tents.find((t) => t.id === s.activeTentId);
}

export function activeCycle(s: Store) {
  return s.cycles.find((c) => c.tentId === s.activeTentId && c.status === 'activo');
}

export function activePlants(s: Store) {
  const cycle = activeCycle(s);
  if (!cycle) return [];
  const pots = s.pots.filter((p) => p.cycleId === cycle.id);
  return pots
    .map((pot) => ({ pot, plant: s.plants.find((pl) => pl.potId === pot.id && !pl.endedAt) }))
    .filter((x): x is { pot: typeof x.pot; plant: Plant } => !!x.plant)
    .sort((a, b) => a.pot.row - b.pot.row || a.pot.col - b.pot.col);
}

export function emptyPots(s: Store) {
  const cycle = activeCycle(s);
  if (!cycle) return [];
  return s.pots
    .filter((pot) => pot.cycleId === cycle.id && !s.plants.some((pl) => pl.potId === pot.id && !pl.endedAt))
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

export function tentHeadline(s: Store): string {
  const summaries = activePlants(s).map(({ plant }) => summarize(s, plant));
  const first = summaries[0];
  if (!first) return 'Sin plantas';

  const counts = new Map<Phase, number>();
  summaries.forEach(({ phase }) => counts.set(phase, (counts.get(phase) ?? 0) + 1));
  if (counts.size === 1) return `${PHASE_LABEL[first.phase]} · día ${first.dayInPhase}`;

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([phase, count]) => `${count} en ${PHASE_LABEL[phase].toLowerCase()}`)
    .join(' · ');
}

export interface FirstStep {
  id: 'genetica' | 'plantar' | 'riego' | 'foto';
  label: string;
  done: boolean;
}

export function firstSteps(s: Store): { steps: FirstStep[]; visible: boolean } {
  const steps: FirstStep[] = [
    { id: 'genetica', label: 'Cargar una genética', done: s.genetics.length > 0 },
    { id: 'plantar', label: 'Plantar la primera semilla', done: s.plants.length > 0 },
    { id: 'riego', label: 'Primer riego', done: s.waterings.length > 0 },
    { id: 'foto', label: 'Primera foto', done: s.photos.length > 0 },
  ];
  // 'tent-1' solo existe en la instalación anterior al onboarding, con el cultivo real de Agus, que no debe ver la tarjeta.
  const isOriginalInstall = s.tents.some((t) => t.id === 'tent-1');
  const visible = !s.settings.firstStepsDismissed && !isOriginalInstall && !steps.every((step) => step.done);
  return { steps, visible };
}

export function latestClimate(s: Store) {
  const c = s.climate.find((x) => x.tentId === s.activeTentId);
  return c ? { ...c, vpd: vpd(c.tempC, c.rh) } : undefined;
}
