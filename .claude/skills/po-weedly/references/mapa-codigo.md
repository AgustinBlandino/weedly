# Mapa del código (orientación, verificá antes de afirmar)

Stack: Expo SDK 58, React Native 0.88, React 19, expo-router, TypeScript strict, Zustand 5 con persist sobre AsyncStorage. Alias `@/` → `src/`.

## Dónde vive cada cosa
- `app/`: pantallas (expo-router). `(tabs)/` tiene Carpa (`index`), `diario` y `biblioteca`. Modales: `riego`, `foto`, `clima`, `editar-planta/[id]`, `genetica/[id]`, `receta/[id]`, `fertilizante/[id]`, `plantar/[potId]`, `ciclo/cerrar`, `ciclo/nuevo`. Pantallas: `planta/[id]`, `onboarding`. El historial de ciclos vive en `diario` (parámetro `ciclo`). Se registran en `app/_layout.tsx`, que espera la hidratación y manda al onboarding con `Stack.Protected` si no hay carpa.
- `src/types.ts`: entidades (Tent, Cycle, Pot, Plant, PhaseChange, Genetic, Fertilizer, Recipe, Watering, ClimateReading, Photo, Tasting, Settings).
- `src/store.ts`: todo el estado y las acciones. Persistencia con key `weedly-data` (o `EXPO_PUBLIC_STORE_KEY` para un espacio de prueba), `version: 1`.
- `src/selectors.ts`: fase y días (`summarize`), riego pendiente (`needsWater`), portada (`coverOf`), plantas del ciclo activo (`activePlants`), último clima con VPD (`latestClimate`).
- `src/utils.ts`: fechas, formateo con coma decimal, `vpd`, `uid`.
- `src/seed.ts`: solo el pack opcional de Namasté. El estado inicial está vacío; el ciclo de Agus vive en su celular.
- `src/onboarding.ts`: lógica pura del onboarding (grilla y validación de fechas).
- `tools/plant-render/`: renders de Blender por etapa (`--stage`), armados con `pack_blender.py`.
- `src/theme.ts`, `src/ui.tsx`: tokens y componentes compartidos. `Tent3D.tsx`, `TiltPhoto.tsx`, `PhaseBar.tsx`: visuales.

## Relaciones del modelo
Tent → Cycle (por `tentId`, con `status` activo/archivado) → Pot (por `cycleId`, con fila y columna) → Plant (por `potId`). Las fases (`PhaseChange`), fotos y riegos cuelgan de `plantId` o `plantIds`. La fase actual no se guarda: se calcula de la lista de cambios de fase hasta hoy.

## Invariantes que hay que respetar
- **Orden de las listas**: `waterings`, `climate` y `photos` se guardan con lo más nuevo primero (las acciones agregan al principio). Los selectores como `lastWatering` y `latestClimate` usan `find` y dependen de eso. Si se importan datos o se sincroniza, hay que preservar o reimponer ese orden.
- **Fechas**: `YYYY-MM-DD` para días, ISO con hora para eventos. Se parsean como fecha local, no UTC.
- **Ids**: strings de `uid()`. Las acciones de creación reciben `Omit<T, 'id'>`; los `upsert` devuelven el id.
- **Borrados en cascada a mano**: borrar una genética limpia `geneticId` de las plantas; borrar un fertilizante lo saca de las recetas; borrar una foto limpia la portada si era esa. No hay integridad referencial automática: cada borrado nuevo tiene que pensar sus dependientes.
- **Cambios de forma del estado guardado** necesitan `migrate` y subir `version`, o el campo nuevo tiene que ser opcional. Hoy no hay función `migrate` definida: **subir `version` sin ella descarta lo guardado**.
- **Acciones disponibles** (al momento de escribir esto): riego, clima, foto/portada, editar planta y maceta, cambio de fase, genéticas/fertilizantes/recetas (upsert y delete), cata, ajustes, `setupTent`, `startCycle`, `closeCycle`, `plantSeed`, `discardPlant`, `addNamastePack`.
- **Plantas terminadas**: una planta con `endedAt` o de un ciclo archivado no se borra. `summarize` corta los días en su fecha de fin y las pantallas usan `isPlantActive` para dejarla de solo lectura.
- Estilos desde `theme.ts`; cálculos derivados en `selectors.ts`; estado de dominio solo en el store.

## Cómo estimar costo
- Un campo opcional nuevo en una entidad existente: barato (tipo, formulario, mostrarlo).
- Una entidad nueva con pantalla propia: medio (tipo, estado, acciones, borrados en cascada, ruta y modal).
- Algo que cambia la forma de entidades existentes o la persistencia: caro y riesgoso por los datos guardados; exige migración.
- Sync, cuentas o multiusuario: transversal, toca almacenamiento, modelo y ruteo; planificarlo por etapas.
