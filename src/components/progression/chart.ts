// Tableau de bord « Ma progression » (13/10/2026) : couleurs et petites aides des graphiques.
// Couleurs validées (outil dataviz, fond clair) : réussies / en partie / ratées se distinguent aussi pour les
// daltoniens ; contraste < 3:1 pour les deux claires → légende, valeurs au survol et tableau des chapitres.
export const COULEUR = {
  reussies: '#1a7a4a',
  partielles: '#5fb07f',
  ratees: '#c0892f',
  temps: '#33302b',
  note: '#1a7a4a',
};

/** Jours actifs : une teinte, du plus clair (peu de temps) au plus foncé. */
export const RAMPE_VERTE = ['#f2f1ee', '#cfe6d8', '#8cc4a5', '#4f9f72', '#1a7a4a'];

export const SERIES_QUESTIONS = [
  { key: 'reussies', label: 'Réussies', color: COULEUR.reussies },
  { key: 'partielles', label: 'En partie', color: COULEUR.partielles },
  { key: 'ratees', label: 'À revoir', color: COULEUR.ratees },
] as const;

/** Toutes les dates (AAAA-MM-JJ) de `debut` à `fin`. */
export function joursEntre(debut: string, fin: string): string[] {
  const out: string[] = [];
  const [y, m, d] = debut.split('-').map(Number);
  const day = new Date(y, m - 1, d, 12);
  const end = fin;
  for (let i = 0; i < 800; i++) {
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    out.push(iso);
    if (iso >= end) break;
    day.setDate(day.getDate() + 1);
  }
  return out;
}

export const minutes = (s: number) => Math.round(s / 60);

const lundi = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const day = new Date(y, m - 1, d, 12);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
};

/** Une ligne datée d'un graphique : { date, reussies: 3, … }. */
export type Ligne = { date: string; [cle: string]: string | number };

/** Valeurs datées éparses → une ligne par jour de la période (ou par semaine), zéros compris. */
export function remplir(sparse: Ligne[], debut: string, fin: string, pas: 'jour' | 'semaine', keys: string[]): Ligne[] {
  const out = new Map<string, Ligne>();
  for (const day of joursEntre(debut, fin)) {
    const k = pas === 'semaine' ? lundi(day) : day;
    if (!out.has(k)) out.set(k, { date: k, ...Object.fromEntries(keys.map((x) => [x, 0])) });
  }
  for (const r of sparse) {
    const row = out.get(pas === 'semaine' ? lundi(r.date) : r.date);
    if (row) for (const x of keys) row[x] = Number(row[x] || 0) + Number(r[x] || 0);
  }
  return [...out.values()];
}

/** « ↑ 12 % », « ↓ −3 », « = » ; null si la période d'avant est inconnue. */
export function ecart(now: number, before: number | null, unite: 'pct' | 'abs' = 'pct', fmt = (n: number) => n.toLocaleString('fr-FR')) {
  if (before === null) return { texte: null, sens: 0 as const };
  const diff = Math.round((now - before) * 10) / 10;
  if (diff === 0) return { texte: '=', sens: 0 as const };
  const sens = (diff > 0 ? 1 : -1) as 1 | -1;
  // Pourcentage seulement sur une base assez grande (de 3 à 35 : « ↑ 1067 % » ne dit rien ; « ↑ +32 » si).
  if (unite === 'pct' && before >= 10) {
    const pct = Math.round((diff / before) * 100);
    if (pct !== 0) return { texte: `${sens > 0 ? '↑' : '↓'} ${Math.abs(pct)} %`, sens };
  }
  return { texte: `${sens > 0 ? '↑ +' : '↓ −'}${fmt(Math.abs(diff))}`, sens };
}
