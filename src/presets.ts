// Opciones rápidas que comparten varios formularios.

export const SUBSTRATE_PRESETS = ['Tierra', 'Coco', 'Turba y perlita', 'Living Soil'];

export const EFFECT_OPTIONS = [
  'Relajante',
  'Eufórico',
  'Creativo',
  'Energizante',
  'Feliz',
  'Sedante',
  'Concentración',
  'Hambre',
  'Risueño',
];

export const FLAVOR_OPTIONS = [
  'Cítrico',
  'Terroso',
  'Dulce',
  'Frutal',
  'Pino',
  'Especiado',
  'Diesel',
  'Floral',
  'Herbal',
  'Skunk',
];

/** Clave para comparar opciones sin importar mayúsculas ni espacios de más. */
export const optionKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');

/** Une listas de opciones sin repetir, con las de `base` primero y en su orden. */
export function mergeOptions(base: string[], ...extra: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [base, ...extra].flat()) {
    const clean = value.trim().replace(/\s+/g, ' ');
    const key = optionKey(clean);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}
