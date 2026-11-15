// Opciones rápidas que comparten varios formularios.

export const SUBSTRATE_PRESETS = ['Tierra', 'Coco', 'Turba y perlita', 'Living Soil'];

export const SPECTRUM_PRESETS = [
  'Full spectrum',
  'Full spectrum + rojo profundo',
  'Full spectrum + UV/IR',
  'Cálido (2700–3000 K)',
  'Frío (6500 K)',
];

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

/** Ícono de cada parte del tipo de semilla, igual en la Biblioteca y en el formulario de genética. */
export const SEED_TYPE_ICON = {
  Fem: 'female',
  Regular: 'male-female',
  Foto: 'sunny-outline',
  Auto: 'flash-outline',
} as const;

export type SeedTypePart = keyof typeof SEED_TYPE_ICON;

/** Partes reconocidas de un tipo ("Fem · Foto"), ciclo primero. Un texto que no se reconoce devuelve []. */
export function seedTypeParts(type: string): SeedTypePart[] {
  const parts: SeedTypePart[] = [];
  if (/auto/i.test(type)) parts.push('Auto');
  else if (/foto/i.test(type)) parts.push('Foto');
  if (/fem/i.test(type)) parts.push('Fem');
  else if (/regular/i.test(type)) parts.push('Regular');
  return parts;
}

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
