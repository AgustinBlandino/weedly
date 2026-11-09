import type { Store } from './store';
import { colors, geneticPalette } from './theme';
import { PHASE_LABEL } from './types';
import type { Cycle, Phase, PhaseChange, Photo, Plant, Pot, Watering } from './types';
import { daysBetween, fmt, fmtDate, today, toYmd, parseDate, vpd } from './utils';

export interface PlantSummary {
  phase: Phase;
  dayInPhase: number;
  dayOfLife: number;
  vegeDays: number;
  floraDays: number;
  floraTarget?: number;
  floraRemaining?: number;
  /** Descartada o de un ciclo cerrado: sus días ya no avanzan. */
  ended: boolean;
}

export function phasesOf(s: Store, plantId: string): PhaseChange[] {
  return s.phases
    .filter((p) => p.plantId === plantId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function plantCycle(s: Store, plant: Plant): Cycle | undefined {
  const pot = s.pots.find((p) => p.id === plant.potId);
  return pot ? s.cycles.find((c) => c.id === pot.cycleId) : undefined;
}

/** Sigue creciendo: ni descartada ni en un ciclo cerrado. */
export function isPlantActive(s: Store, plant: Plant): boolean {
  return !plant.endedAt && plantCycle(s, plant)?.status !== 'archivado';
}

export function summarize(s: Store, plant: Plant): PlantSummary {
  const cycle = plantCycle(s, plant);
  const ended = !isPlantActive(s, plant);
  // Fecha de corte: nada de lo posterior cuenta en una planta terminada.
  const t = plant.endedAt ?? (cycle?.status === 'archivado' ? cycle.endDate : undefined) ?? today();
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
    !ended && floraTarget && phase === 'flora' ? Math.max(0, floraTarget - floraDays) : undefined;

  return {
    phase,
    dayInPhase: Math.max(0, daysBetween(start, t)),
    dayOfLife: Math.max(0, daysBetween(plant.germinationDate, t)),
    vegeDays,
    floraDays,
    floraTarget,
    floraRemaining,
    ended,
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

/** Color estable de una genética: depende de su posición en la biblioteca, no del nombre de la planta. */
export function geneticColor(s: Store, geneticId: string | undefined): string {
  const i = geneticId ? s.genetics.findIndex((g) => g.id === geneticId) : -1;
  return i < 0 ? colors.muted : geneticPalette[i % geneticPalette.length];
}

/** Genéticas presentes en las plantas activas, con cuántas hay de cada una. */
export function activeGenetics(s: Store): { id: string; name: string; color: string; count: number }[] {
  const counts = new Map<string, number>();
  activePlants(s).forEach(({ plant }) => {
    if (plant.geneticId) counts.set(plant.geneticId, (counts.get(plant.geneticId) ?? 0) + 1);
  });
  return [...counts.entries()].flatMap(([id, count]) => {
    const g = s.genetics.find((x) => x.id === id);
    return g ? [{ id, name: g.name, color: geneticColor(s, id), count }] : [];
  });
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

/** Fotos de las plantas del ciclo activo, también de las descartadas. Las de ciclos cerrados quedan en su historial. */
export function activeCyclePhotos(s: Store): Photo[] {
  const cycle = activeCycle(s);
  if (!cycle) return [];
  return s.photos.filter((photo) => {
    const plant = s.plants.find((p) => p.id === photo.plantId);
    return !!plant && plantCycle(s, plant)?.id === cycle.id;
  });
}

export function cyclePlants(s: Store, cycleId: string): { plant: Plant; pot: Pot }[] {
  return s.pots
    .filter((pot) => pot.cycleId === cycleId)
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .flatMap((pot) => s.plants.filter((plant) => plant.potId === pot.id).map((plant) => ({ plant, pot })));
}

/** Ciclos cerrados de la carpa activa, del más reciente al más viejo. */
export function archivedCycles(s: Store): { cycle: Cycle; plantCount: number }[] {
  return s.cycles
    .filter((c) => c.tentId === s.activeTentId && c.status === 'archivado')
    .map((cycle) => ({ cycle, plantCount: cyclePlants(s, cycle.id).length }))
    .sort((a, b) => (b.cycle.endDate ?? '').localeCompare(a.cycle.endDate ?? ''));
}

/** Ciclos para el selector del diario: el activo primero, después los cerrados del más reciente al más viejo. */
export function diaryCycles(s: Store): Cycle[] {
  const active = activeCycle(s);
  const archived = archivedCycles(s).map(({ cycle }) => cycle);
  return active ? [active, ...archived] : archived;
}

/** Ciclo que muestra el diario de entrada: el activo, o el último cerrado. */
export function defaultDiaryCycleId(s: Store): string | undefined {
  return diaryCycles(s)[0]?.id;
}

export type DiaryEntry =
  | { kind: 'riego'; date: string; id: string; title: string; detail: string }
  | { kind: 'foto'; date: string; id: string; title: string; detail: string; uri: string; plantId: string }
  | { kind: 'clima'; date: string; id: string; title: string; detail: string }
  | { kind: 'fase'; date: string; id: string; title: string; detail: string; plantId: string };

/** Lectura de clima dentro del ciclo: misma carpa y día entre el inicio y el cierre. */
function climateInCycle(s: Store, cycle: Cycle, date: string): boolean {
  const day = toYmd(parseDate(date));
  if (day < cycle.startDate) return false;
  if (!cycle.endDate) return true;
  // Si otro ciclo de la carpa arranca el mismo día que este cierra, ese día es del nuevo.
  const handover = s.cycles.some((c) => c.id !== cycle.id && c.tentId === cycle.tentId && c.startDate === cycle.endDate);
  return handover ? day < cycle.endDate : day <= cycle.endDate;
}

/** Riegos, fotos, clima y cambios de fase de un ciclo, del más nuevo al más viejo. Incluye plantas descartadas. */
export function cycleEntries(s: Store, cycleId: string): DiaryEntry[] {
  const cycle = s.cycles.find((c) => c.id === cycleId);
  if (!cycle) return [];
  const plantIds = new Set(cyclePlants(s, cycleId).map(({ plant }) => plant.id));
  const name = (id: string) => s.plants.find((p) => p.id === id)?.name ?? '?';

  const entries: DiaryEntry[] = [
    ...s.waterings
      .filter((w) => w.plantIds.some((id) => plantIds.has(id)))
      .map((w) => ({
        kind: 'riego' as const,
        id: w.id,
        date: w.date,
        title: `Riego · ${w.plantIds.map(name).join(', ')}`,
        detail: [w.recipeName ?? 'Solo agua', `${fmt(w.litersPerPlant)} L c/u`, w.ph != null ? `pH ${fmt(w.ph)}` : '', w.ec != null ? `EC ${fmt(w.ec)}` : '']
          .filter(Boolean)
          .join(' · '),
      })),
    ...s.photos
      .filter((p) => plantIds.has(p.plantId))
      .map((p) => ({
        kind: 'foto' as const,
        id: p.id,
        date: p.date,
        title: `Foto · ${name(p.plantId)}${p.tags.length ? ` · ${p.tags.join(', ')}` : ''}`,
        detail: p.description,
        uri: p.uri,
        plantId: p.plantId,
      })),
    ...s.climate
      .filter((c) => c.tentId === cycle.tentId && climateInCycle(s, cycle, c.date))
      .map((c) => ({
        kind: 'clima' as const,
        id: c.id,
        date: c.date,
        title: 'Clima',
        detail: `${fmt(c.tempC)}° · ${Math.round(c.rh)}% · VPD ${fmt(vpd(c.tempC, c.rh), 2)} kPa`,
      })),
    ...s.phases
      .filter((p) => plantIds.has(p.plantId))
      .map((p) => ({
        kind: 'fase' as const,
        id: p.id,
        date: `${p.date}T12:00:00`,
        title: `${name(p.plantId)} pasa a ${PHASE_LABEL[p.phase].toLowerCase()}`,
        detail: fmtDate(p.date),
        plantId: p.plantId,
      })),
  ];
  return entries.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
}

export interface NewCycleDefaults {
  name: string;
  potCount: number;
  liters: number;
  substrate: string;
  maxPots: number;
  /** Un ciclo no arranca antes de que haya cerrado el anterior. */
  minStartDate?: string;
}

/** Valores iniciales de un ciclo nuevo, tomados del último ciclo de la carpa. */
export function newCycleDefaults(s: Store, tentId: string): NewCycleDefaults {
  const tent = s.tents.find((t) => t.id === tentId);
  const maxPots = Math.max(1, (tent?.rows ?? 1) * (tent?.cols ?? 1));
  const cycles = s.cycles.filter((c) => c.tentId === tentId);
  const last = cycles[cycles.length - 1];
  const pots = last ? s.pots.filter((p) => p.cycleId === last.id) : [];
  return {
    name: `Ciclo ${cycles.length + 1}`,
    potCount: Math.max(1, Math.min(pots.length || maxPots, maxPots)),
    liters: pots[0]?.liters ?? 10,
    substrate: pots[0]?.substrate ?? 'Tierra',
    maxPots,
    minStartDate: last?.endDate,
  };
}

export interface FirstStep {
  id: 'genetica' | 'plantar' | 'clima' | 'riego' | 'foto';
  label: string;
  done: boolean;
}

export function firstSteps(s: Store): { steps: FirstStep[]; visible: boolean } {
  const steps: FirstStep[] = [
    { id: 'genetica', label: 'Cargar una genética', done: s.genetics.length > 0 },
    { id: 'plantar', label: 'Plantar la primera semilla', done: s.plants.length > 0 },
    // Clima solo guarda lecturas ya validadas, así que cualquiera de la carpa activa cuenta.
    {
      id: 'clima',
      label: 'Cargá la primera lectura de temp y humedad',
      done: s.climate.some((c) => c.tentId === s.activeTentId),
    },
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
