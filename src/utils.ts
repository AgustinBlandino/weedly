const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Fecha local de hoy en formato YYYY-MM-DD */
export function today(): string {
  return toYmd(new Date());
}

export function toYmd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Acepta YYYY-MM-DD o ISO completo y devuelve un Date local */
export function parseDate(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

export function isValidYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDate(s);
  return !isNaN(d.getTime()) && toYmd(d) === s;
}

/** Días calendario entre a y b (b - a) */
export function daysBetween(a: string, b: string): number {
  const da = parseDate(a);
  const db = parseDate(b);
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86400000);
}

export function fmtDate(s: string): string {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtDateTime(s: string): string {
  const d = parseDate(s);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${hh}:${mm}`;
}

export function relDays(s: string): string {
  const n = daysBetween(toYmd(parseDate(s)), today());
  if (n <= 0) return 'hoy';
  if (n === 1) return 'ayer';
  return `hace ${n} d`;
}

/** Número con coma decimal */
export function fmt(n: number, dec = 1): string {
  const f = Math.pow(10, dec);
  return (Math.round(n * f) / f).toString().replace('.', ',');
}

/** Parsea "6,4" o "6.4" */
export function parseNum(s: string): number | undefined {
  const t = s.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return isNaN(n) ? undefined : n;
}

/** VPD del aire en kPa (sin offset de temperatura de hoja) */
export function vpd(tempC: number, rh: number): number {
  const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  return svp * (1 - rh / 100);
}

export function splitList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}
