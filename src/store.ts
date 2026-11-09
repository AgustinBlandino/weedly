import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { namastePack } from './seed';
import type {
  ClimateReading,
  Cycle,
  Fertilizer,
  Genetic,
  Light,
  Phase,
  PhaseChange,
  Photo,
  Plant,
  Pot,
  Recipe,
  Settings,
  Tasting,
  Tent,
  Watering,
} from './types';
import { lightLabel, uid } from './utils';

const STORE_VERSION = 1;

// Acceso literal: Expo inlinea process.env.EXPO_PUBLIC_* en build.
export const STORE_KEY: string = process.env.EXPO_PUBLIC_STORE_KEY || 'weedly-data';
export const IS_TEST_STORE: boolean = STORE_KEY !== 'weedly-data';

interface Data {
  tents: Tent[];
  cycles: Cycle[];
  pots: Pot[];
  plants: Plant[];
  phases: PhaseChange[];
  genetics: Genetic[];
  lights: Light[];
  fertilizers: Fertilizer[];
  recipes: Recipe[];
  waterings: Watering[];
  climate: ClimateReading[];
  photos: Photo[];
  tastings: Tasting[];
  settings: Settings;
  activeTentId: string;
}

export interface CycleInput {
  name: string;
  startDate: string;
  potCount: number;
  liters: number;
  substrate: string;
}

export interface ExistingPlantsInput {
  count: number;
  germinationDate: string;
  vegeDate?: string;
  floraDate?: string;
  type: 'foto' | 'auto';
}

interface Actions {
  setupTent: (tent: Omit<Tent, 'id'>, cycle: CycleInput, existing?: ExistingPlantsInput) => string;
  startCycle: (tentId: string, cycle: CycleInput) => string;
  closeCycle: (cycleId: string, endDate: string) => void;
  plantSeed: (input: {
    potId: string;
    geneticId?: string;
    germinationDate: string;
    name?: string;
    type?: 'foto' | 'auto';
  }) => string | undefined;
  discardPlant: (plantId: string, date: string) => void;
  addNamastePack: () => void;
  addWatering: (w: Omit<Watering, 'id'>) => void;
  deleteWatering: (id: string) => void;
  addClimate: (c: Omit<ClimateReading, 'id'>) => void;
  addPhoto: (p: Omit<Photo, 'id'>, asCover: boolean) => void;
  deletePhoto: (id: string) => void;
  setCover: (plantId: string, photoId: string) => void;
  updatePlant: (id: string, patch: Partial<Plant>) => void;
  updatePot: (id: string, patch: Partial<Pot>) => void;
  changePhase: (plantId: string, phase: Phase, date: string) => void;
  deletePhase: (id: string) => void;
  upsertGenetic: (g: Genetic) => string;
  deleteGenetic: (id: string) => void;
  upsertLight: (l: Light) => string;
  deleteLight: (id: string) => void;
  setCycleLights: (cycleId: string, lightIds: string[]) => void;
  upsertFertilizer: (f: Fertilizer) => string;
  deleteFertilizer: (id: string) => void;
  upsertRecipe: (r: Recipe) => string;
  deleteRecipe: (id: string) => void;
  upsertTasting: (t: Tasting) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

export type Store = Data & Actions;

const initialData: Data = {
  tents: [],
  cycles: [],
  pots: [],
  plants: [],
  phases: [],
  genetics: [],
  // Los datos guardados antes de Iluminación no traen `lights`: el merge de persist
  // ({ ...inicial, ...guardado }) deja este [] sin tocar el resto.
  lights: [],
  fertilizers: [],
  recipes: [],
  waterings: [],
  climate: [],
  photos: [],
  tastings: [],
  settings: { wateringEveryDays: 3 },
  activeTentId: '',
};

function toCount(n: number): number {
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

// Crea un ciclo activo con sus macetas ocupando la grilla de la carpa en orden.
function buildCycle(tent: Tent, input: CycleInput): { cycle: Cycle; pots: Pot[] } {
  const rows = Math.max(1, toCount(tent.rows));
  const cols = Math.max(1, toCount(tent.cols));
  const potCount = Math.max(1, Math.min(toCount(input.potCount), rows * cols));
  const cycle: Cycle = {
    id: uid(),
    tentId: tent.id,
    name: input.name,
    startDate: input.startDate,
    status: 'activo',
  };
  const pots: Pot[] = Array.from({ length: potCount }, (_, i) => ({
    id: uid(),
    cycleId: cycle.id,
    row: Math.floor(i / cols),
    col: i % cols,
    liters: input.liters,
    substrate: input.substrate,
  }));
  return { cycle, pots };
}

// El siguiente P{n} del ciclo, contando también las plantas descartadas.
function nextPlantNumber(cycleId: string, pots: Pot[], plants: Plant[]): number {
  const potIds = new Set(pots.filter((p) => p.cycleId === cycleId).map((p) => p.id));
  return plants.reduce((max, plant) => {
    const match = potIds.has(plant.potId) ? /^P(\d+)$/.exec(plant.name) : null;
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

type HydrationStatus = 'pending' | 'ok' | 'error';

// Vive fuera de React y antes de create(): la hidratación arranca al crear el store.
let hydrationStatus: HydrationStatus = 'pending';
const hydrationListeners = new Set<() => void>();

function setHydrationStatus(status: HydrationStatus) {
  hydrationStatus = status;
  hydrationListeners.forEach((listener) => listener());
}

function subscribeHydration(listener: () => void) {
  hydrationListeners.add(listener);
  return () => {
    hydrationListeners.delete(listener);
  };
}

function getHydrationStatus() {
  return hydrationStatus;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialData,

      // Las acciones que pueden no hacer nada validan con get() antes de llamar a set():
      // persist escribe en disco en cada set(), aunque el estado no cambie.
      setupTent: (tentInput, cycleInput, existing) => {
        const tent: Tent = { ...tentInput, id: uid() };
        const { cycle, pots } = buildCycle(tent, cycleInput);
        const plants: Plant[] = pots
          .slice(0, Math.max(0, toCount(existing?.count ?? 0)))
          .map((pot, i) => ({
            id: uid(),
            potId: pot.id,
            name: `P${i + 1}`,
            type: existing!.type,
            germinationDate: existing!.germinationDate,
            description: '',
          }));
        const phases: PhaseChange[] = plants.flatMap((plant) => {
          const changes: PhaseChange[] = [];
          if (existing?.vegeDate) {
            changes.push({ id: uid(), plantId: plant.id, phase: 'vege', date: existing.vegeDate });
          }
          if (existing?.floraDate) {
            changes.push({ id: uid(), plantId: plant.id, phase: 'flora', date: existing.floraDate });
          }
          return changes;
        });
        set((s) => ({
          tents: [...s.tents, tent],
          cycles: [...s.cycles, cycle],
          pots: [...s.pots, ...pots],
          plants: [...s.plants, ...plants],
          phases: [...s.phases, ...phases],
          activeTentId: tent.id,
        }));
        return tent.id;
      },

      startCycle: (tentId, input) => {
        const s = get();
        const current = s.cycles.find((c) => c.tentId === tentId && c.status === 'activo');
        if (current) return current.id;
        const tent = s.tents.find((t) => t.id === tentId);
        if (!tent) return '';
        const { cycle, pots } = buildCycle(tent, input);
        // Hereda las luminarias del último ciclo de la carpa, con su copia.
        const previous = s.cycles.filter((c) => c.tentId === tentId).pop();
        if (previous?.lights?.length) cycle.lights = previous.lights.map((l) => ({ ...l }));
        set({ cycles: [...s.cycles, cycle], pots: [...s.pots, ...pots] });
        return cycle.id;
      },

      closeCycle: (cycleId, endDate) => {
        const s = get();
        if (!s.cycles.some((c) => c.id === cycleId && c.status === 'activo')) return;
        set({
          cycles: s.cycles.map((c) =>
            c.id === cycleId ? { ...c, status: 'archivado' as const, endDate } : c,
          ),
        });
      },

      plantSeed: ({ potId, geneticId, germinationDate, name, type }) => {
        const s = get();
        const pot = s.pots.find((p) => p.id === potId);
        if (!pot) return undefined;
        if (!s.cycles.some((c) => c.id === pot.cycleId && c.status === 'activo')) return undefined;
        if (s.plants.some((p) => p.potId === potId && !p.endedAt)) return undefined;
        const genetic = geneticId ? s.genetics.find((g) => g.id === geneticId) : undefined;
        if (geneticId && !genetic) return undefined;

        const plant: Plant = {
          id: uid(),
          potId,
          name: name?.trim() || `P${nextPlantNumber(pot.cycleId, s.pots, s.plants)}`,
          geneticId,
          type: type ?? (genetic?.type.toLowerCase().includes('auto') ? 'auto' : 'foto'),
          germinationDate,
          description: '',
        };
        set({ plants: [...s.plants, plant] });
        return plant.id;
      },

      discardPlant: (plantId, date) => {
        const s = get();
        if (!s.plants.some((p) => p.id === plantId && !p.endedAt)) return;
        set({ plants: s.plants.map((p) => (p.id === plantId ? { ...p, endedAt: date } : p)) });
      },

      addNamastePack: () => {
        const s = get();
        const missing = namastePack.filter((f) => !s.fertilizers.some((x) => x.id === f.id));
        if (!missing.length) return;
        set({ fertilizers: [...s.fertilizers, ...missing] });
      },

      addWatering: (w) => set((s) => ({ waterings: [{ ...w, id: uid() }, ...s.waterings] })),
      deleteWatering: (id) => set((s) => ({ waterings: s.waterings.filter((w) => w.id !== id) })),

      addClimate: (c) => set((s) => ({ climate: [{ ...c, id: uid() }, ...s.climate] })),

      addPhoto: (p, asCover) =>
        set((s) => {
          const id = uid();
          const photos = [{ ...p, id }, ...s.photos];
          const plants = asCover
            ? s.plants.map((pl) => (pl.id === p.plantId ? { ...pl, coverPhotoId: id } : pl))
            : s.plants;
          return { photos, plants };
        }),
      deletePhoto: (id) =>
        set((s) => ({
          photos: s.photos.filter((p) => p.id !== id),
          plants: s.plants.map((pl) => (pl.coverPhotoId === id ? { ...pl, coverPhotoId: undefined } : pl)),
        })),
      setCover: (plantId, photoId) =>
        set((s) => ({
          plants: s.plants.map((pl) => (pl.id === plantId ? { ...pl, coverPhotoId: photoId } : pl)),
        })),

      updatePlant: (id, patch) =>
        set((s) => ({ plants: s.plants.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      updatePot: (id, patch) =>
        set((s) => ({ pots: s.pots.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      changePhase: (plantId, phase, date) =>
        set((s) => ({ phases: [...s.phases, { id: uid(), plantId, phase, date }] })),
      deletePhase: (id) => set((s) => ({ phases: s.phases.filter((p) => p.id !== id) })),

      upsertGenetic: (g) => {
        const item = g.id ? g : { ...g, id: uid() };
        set((s) => ({ genetics: upsert(s.genetics, item) }));
        return item.id;
      },
      deleteGenetic: (id) =>
        set((s) => ({
          genetics: s.genetics.filter((g) => g.id !== id),
          plants: s.plants.map((p) => (p.geneticId === id ? { ...p, geneticId: undefined } : p)),
        })),

      upsertLight: (l) => {
        const item = l.id ? l : { ...l, id: uid() };
        const copy = { label: lightLabel(item), watts: item.watts, type: item.type };
        set((s) => ({
          lights: upsert(s.lights, item),
          // La copia de los ciclos queda al día por si después se borra la luminaria.
          cycles: s.cycles.map((c) =>
            c.lights?.some((x) => x.lightId === item.id)
              ? { ...c, lights: c.lights.map((x) => (x.lightId === item.id ? { ...x, ...copy } : x)) }
              : c,
          ),
        }));
        return item.id;
      },
      deleteLight: (id) =>
        set((s) => ({
          lights: s.lights.filter((l) => l.id !== id),
          cycles: s.cycles.map((c) =>
            c.lights?.some((x) => x.lightId === id)
              ? { ...c, lights: c.lights.map((x) => (x.lightId === id ? { ...x, lightId: undefined } : x)) }
              : c,
          ),
        })),
      // Lo histórico se conserva: las copias de luminarias borradas (sin lightId) quedan siempre
      // en el ciclo, y a continuación van las del catálogo seleccionadas.
      setCycleLights: (cycleId, lightIds) => {
        const s = get();
        const cycle = s.cycles.find((c) => c.id === cycleId);
        if (!cycle) return;
        const deleted = (cycle.lights ?? [])
          .filter((x) => !x.lightId || !s.lights.some((l) => l.id === x.lightId))
          .map((x) => ({ ...x, lightId: undefined }));
        const selected = [...new Set(lightIds)].flatMap((id) => {
          const l = s.lights.find((x) => x.id === id);
          return l ? [{ lightId: l.id, label: lightLabel(l), watts: l.watts, type: l.type }] : [];
        });
        const lights = [...deleted, ...selected];
        set({ cycles: s.cycles.map((c) => (c.id === cycleId ? { ...c, lights } : c)) });
      },

      upsertFertilizer: (f) => {
        const item = f.id ? f : { ...f, id: uid() };
        set((s) => ({ fertilizers: upsert(s.fertilizers, item) }));
        return item.id;
      },
      deleteFertilizer: (id) =>
        set((s) => ({
          fertilizers: s.fertilizers.filter((f) => f.id !== id),
          recipes: s.recipes.map((r) => ({ ...r, items: r.items.filter((it) => it.fertilizerId !== id) })),
        })),

      upsertRecipe: (r) => {
        const item = r.id ? r : { ...r, id: uid() };
        set((s) => ({ recipes: upsert(s.recipes, item) }));
        return item.id;
      },
      deleteRecipe: (id) => set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),

      upsertTasting: (t) =>
        set((s) => ({ tastings: [...s.tastings.filter((x) => x.plantId !== t.plantId), t] })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => {
        setHydrationStatus('pending');
        return (state, error) => setHydrationStatus(state && !error ? 'ok' : 'error');
      },
    },
  ),
);

export function useHydrationStatus(): HydrationStatus {
  return useSyncExternalStore(subscribeHydration, getHydrationStatus, getHydrationStatus);
}

export function exportDataJson(): string {
  const s = useStore.getState();
  // Record<keyof Data, ...> hace fallar a tsc si se agrega un campo a Data y no se exporta.
  const data: Record<keyof Data, unknown> = {
    tents: s.tents,
    cycles: s.cycles,
    pots: s.pots,
    plants: s.plants,
    phases: s.phases,
    genetics: s.genetics,
    lights: s.lights,
    fertilizers: s.fertilizers,
    recipes: s.recipes,
    waterings: s.waterings,
    climate: s.climate,
    photos: s.photos,
    tastings: s.tastings,
    settings: s.settings,
    activeTentId: s.activeTentId,
  };
  return JSON.stringify(
    { app: 'weedly', exportedAt: new Date().toISOString(), storeKey: STORE_KEY, version: STORE_VERSION, data },
    null,
    2,
  );
}
