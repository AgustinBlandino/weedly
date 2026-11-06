// Lógica pura del onboarding: sin React ni store, para poder probarla sola.

export interface Grid {
  rows: number;
  cols: number;
}

// Una celda más alargada que 2:1 ya no se ve como una grilla razonable.
const MAX_CELL_ASPECT = 2;

/**
 * Filas y columnas para que entren todas las macetas. Las columnas reparten el ancho y las filas
 * la profundidad. Prefiere no dejar celdas de más y, a igual sobrante, celdas más cuadradas.
 * En un empate gana la opción con más filas: 6 macetas en 80 × 80 dan 3 filas × 2 columnas.
 */
export function gridFor(potCount: number, widthCm: number, depthCm: number): Grid {
  const count = Math.max(1, Math.floor(potCount) || 1);
  const width = widthCm > 0 ? widthCm : 1;
  const depth = depthCm > 0 ? depthCm : 1;

  const options = Array.from({ length: count }, (_, i) => {
    const cols = i + 1;
    const rows = Math.ceil(count / cols);
    const ratio = width / cols / (depth / rows);
    return { rows, cols, waste: rows * cols - count, aspect: Math.max(ratio, 1 / ratio) };
  });

  const fitting = options.filter((o) => o.aspect <= MAX_CELL_ASPECT + 1e-9);
  const pool = fitting.length ? fitting : options;
  const [best] = pool.sort((a, b) => {
    // Sin celdas proporcionadas, lo que manda es acercarse a la proporción de la carpa.
    if (fitting.length && a.waste !== b.waste) return a.waste - b.waste;
    if (Math.abs(a.aspect - b.aspect) > 1e-9) return a.aspect - b.aspect;
    if (a.waste !== b.waste) return a.waste - b.waste;
    return b.rows - a.rows;
  });
  return { rows: best.rows, cols: best.cols };
}

export interface ExistingDates {
  germinationDate: string;
  vegeDate?: string;
  floraDate?: string;
}

export interface ExistingDateErrors {
  germination?: string;
  vege?: string;
  flora?: string;
}

const FUTURE = 'No puede ser una fecha futura.';

/** Fechas en YYYY-MM-DD: comparar los textos alcanza para ordenarlas. */
export function existingDateErrors(dates: ExistingDates, todayYmd: string): ExistingDateErrors {
  const { germinationDate, vegeDate, floraDate } = dates;
  const errors: ExistingDateErrors = {};
  if (germinationDate > todayYmd) errors.germination = FUTURE;
  if (vegeDate) {
    if (vegeDate > todayYmd) errors.vege = FUTURE;
    else if (vegeDate < germinationDate) errors.vege = 'Tiene que ser el día de la germinación o después.';
  }
  if (floraDate) {
    const previous = vegeDate ?? germinationDate;
    if (floraDate > todayYmd) errors.flora = FUTURE;
    else if (floraDate < previous) {
      errors.flora = vegeDate
        ? 'Tiene que ser el día que arrancó vege o después.'
        : 'Tiene que ser el día de la germinación o después.';
    }
  }
  return errors;
}
