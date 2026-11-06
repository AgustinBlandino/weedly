import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  seedCycle,
  seedFertilizers,
  seedPhases,
  seedPlants,
  seedPots,
  seedTent,
} from './seed';
import type {
  ClimateReading,
  Cycle,
  Fertilizer,
  Genetic,
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
import { uid } from './utils';

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
  fertilizers: Fertilizer[];
  recipes: Recipe[];
  waterings: Watering[];
  climate: ClimateReading[];
  photos: Photo[];
  tastings: Tasting[];
  settings: Settings;
  activeTentId: string;
}

interface Actions {
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
  upsertFertilizer: (f: Fertilizer) => string;
  deleteFertilizer: (id: string) => void;
  upsertRecipe: (r: Recipe) => string;
  deleteRecipe: (id: string) => void;
  upsertTasting: (t: Tasting) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

export type Store = Data & Actions;

const initialData: Data = {
  tents: [seedTent],
  cycles: [seedCycle],
  pots: seedPots,
  plants: seedPlants,
  phases: seedPhases,
  genetics: [],
  fertilizers: seedFertilizers,
  recipes: [],
  waterings: [],
  climate: [],
  photos: [],
  tastings: [],
  settings: { wateringEveryDays: 3 },
  activeTentId: seedTent.id,
};

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
    (set) => ({
      ...initialData,

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
