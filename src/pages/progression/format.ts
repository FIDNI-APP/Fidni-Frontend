/** Petites mises en forme de « Ma progression ». */

/** « 2026-10-07 » → date locale (pas de décalage d'un jour selon le fuseau). */
export const parseDay = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const duration = (seconds: number) => {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`;
};

export const shortDate = (iso: string) => parseDay(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
export const longDate = (iso: string) => parseDay(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
export const weekday = (iso: string) => parseDay(iso).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');

export const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
export const decimal = (n: number) => String(n).replace('.', ',');

export const daysAgo = (iso: string) => {
  const days = Math.round((Date.now() - parseDay(iso).getTime()) / 86400000);
  return days <= 0 ? 'aujourd’hui' : days === 1 ? 'hier' : `il y a ${days} jours`;
};

/** Graduations rondes de 0 à au moins `max` (pas de 1, 2, 5 × 10ⁿ ; jamais moins de 1 : ce sont des nombres entiers). */
export const niceTicks = (max: number) => {
  const raw = Math.max(max, 1) / 5;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p);
  const top = Math.ceil(Math.max(max, 1) / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
};
