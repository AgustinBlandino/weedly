// Catálogo estático de fertilizantes por marca. No vive en el store: el usuario suma productos
// a su estante (Fertilizer con catalogId) desde acá. Los ids son estables: los Fertilizer
// guardados apuntan a ellos.
//
// Formato único para todos los productos: nombre, fase, unidad de dosis y NPK si se conoce.
// No sumar otros datos (presentación, uso de etiqueta, notas): la idea es que todos se vean igual.

import type { DoseUnit, FertilizerStage } from '../types';

export interface CatalogProduct {
  id: string;
  name: string;
  stage: FertilizerStage;
  unit: DoseUnit;
  /** "N-P-K" según la etiqueta. Solo si se conoce. */
  npk?: string;
}

export interface CatalogBrand {
  id: string;
  brand: string;
  products: CatalogProduct[];
}

export const FERTILIZER_CATALOG: CatalogBrand[] = [
  {
    id: 'topcrop-tripack',
    brand: 'Top Crop',
    products: [
      { id: 'tc-deeper', name: 'Deeper Underground', stage: 'enraizamiento', unit: 'ml' },
      { id: 'tc-veg', name: 'Top Veg', stage: 'vege', unit: 'ml' },
      { id: 'tc-bloom', name: 'Top Bloom', stage: 'flora', unit: 'ml' },
      { id: 'tc-candy', name: 'Top Candy', stage: 'flora', unit: 'ml' },
      { id: 'tc-auto', name: 'Top Auto', stage: 'todo', unit: 'ml' },
    ],
  },
  {
    id: 'namaste-nutripack',
    brand: 'Namasté',
    products: [
      { id: 'nm-amazonia', name: 'Amazonia Roots', stage: 'enraizamiento', unit: 'g' },
      { id: 'nm-oronegro', name: 'Oro Negro', stage: 'vege', unit: 'ml' },
      { id: 'nm-florabooster', name: 'Flora Booster', stage: 'flora', unit: 'ml', npk: '0-9-18' },
      { id: 'nm-trico', name: 'Trico+', stage: 'flora', unit: 'g' },
      { id: 'nm-shanti', name: 'Shanti', stage: 'todo', unit: 'ml' },
      { id: 'nm-bioneem', name: 'Bioneem', stage: 'todo', unit: 'ml' },
    ],
  },
  {
    id: 'biobizz-starter',
    brand: 'BioBizz',
    products: [
      { id: 'bb-rootjuice', name: 'Root·Juice', stage: 'enraizamiento', unit: 'ml' },
      { id: 'bb-grow', name: 'Bio·Grow', stage: 'vege', unit: 'ml' },
      { id: 'bb-bloom', name: 'Bio·Bloom', stage: 'flora', unit: 'ml' },
      { id: 'bb-topmax', name: 'Top·Max', stage: 'flora', unit: 'ml' },
    ],
  },
  {
    id: 'eden-pack-x4',
    brand: 'Eden',
    products: [
      { id: 'ed-roots', name: 'Eden Roots', stage: 'enraizamiento', unit: 'ml' },
      { id: 'ed-vege', name: 'Eden Vege', stage: 'vege', unit: 'ml' },
      { id: 'ed-flora', name: 'Eden Flora', stage: 'flora', unit: 'ml' },
      { id: 'ed-sugar', name: 'Eden Sugar', stage: 'flora', unit: 'ml' },
    ],
  },
];

export function findCatalogProduct(id: string): { brand: CatalogBrand; product: CatalogProduct } | undefined {
  for (const brand of FERTILIZER_CATALOG) {
    const product = brand.products.find((p) => p.id === id);
    if (product) return { brand, product };
  }
  return undefined;
}
