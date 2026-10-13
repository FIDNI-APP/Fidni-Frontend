// Données de démonstration des scènes « Nouveautés » (14/10/2026) : un élève de 2ème Bac SM inventé, vrais noms de
// chapitres et de théorèmes du programme officiel. Dates relatives au jour (le graphique a l'air d'aujourd'hui).
import type { PointFaible } from '@/lib/api/tableauApi';
import type { BarRow } from '@/components/progression/DayBars';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const ilYa = (n: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return iso(d); };

/** 14 derniers jours : réussies / en partie / à revoir. Le jour cliqué est le plus haut (`JOUR`). */
const SERIE: [number, number, number][] = [
  [2, 0, 1], [0, 0, 0], [3, 1, 1], [4, 1, 0], [0, 0, 0], [2, 1, 2], [5, 0, 1],
  [3, 2, 0], [0, 0, 0], [6, 1, 1], [4, 0, 2], [7, 1, 1], [3, 1, 0], [5, 2, 1],
];
export const JOURS: BarRow[] = SERIE.map(([reussies, partielles, ratees], i) => ({ date: ilYa(13 - i), reussies, partielles, ratees }));
export const JOUR = JOURS[11].date;

export const DU_JOUR = [
  { titre: 'Suites numériques · Exercice 4', chapitre: 'Suites numériques', reussies: 4, partielles: 1, ratees: 0, temps: '32 min' },
  { titre: 'DS n° 1 · 2ème Bac SM', chapitre: 'Limites et continuité', reussies: 3, partielles: 0, ratees: 1, temps: '48 min' },
];

const chapitre = (id: number, nom: string) => ({ id, nom, hub_url: null });
export const POINTS_FAIBLES: PointFaible[] = [
  {
    nom: 'Théorème des valeurs intermédiaires (TVI)', id: 1, taux: 25, questions: 4, reussies: 1, partielles: 0, ratees: 3,
    chapitre: chapitre(1, 'Limites et continuité'), a_revoir_total: 3,
    a_revoir: [
      { id: 11, titre: 'DS n° 1 · 2ème Bac SM', url: '#', question: '2.b', statut: 'failed', date: ilYa(2) },
      { id: 12, titre: 'Limites et continuité · Exercice 7', url: '#', question: '3', statut: 'review', date: ilYa(5) },
      { id: 13, titre: 'Limites et continuité · Exercice 2', url: '#', question: '1.c', statut: 'partial', date: ilYa(9) },
    ],
  },
  {
    nom: 'Inégalité des accroissements finis', id: 2, taux: 38, questions: 4, reussies: 1, partielles: 1, ratees: 2,
    chapitre: chapitre(3, 'Dérivation et étude des fonctions'), a_revoir_total: 2, a_revoir: [],
  },
  {
    nom: 'Formule de Moivre', id: 3, taux: 50, questions: 2, reussies: 1, partielles: 0, ratees: 1,
    chapitre: chapitre(8, 'Nombres complexes'), a_revoir_total: 1, a_revoir: [],
  },
];

/** Notes aux examens par chapitre (/20), dans l'ordre des examens. */
export const CHAPITRES = [
  { nom: 'Limites et continuité', notes: [9.5, 11, 12.5, 14], reussies: 18, ratees: 4 },
  { nom: 'Suites numériques', notes: [13, 12, 15.5], reussies: 14, ratees: 2 },
  { nom: 'Nombres complexes', notes: [8, 10.5], reussies: 7, ratees: 5 },
];
export const moyenne = (n: number[]) => Math.round((n.reduce((s, x) => s + x, 0) / n.length) * 10) / 10;

/** Temps de travail (secondes) par chapitre, puis les contenus du premier. */
export const TEMPS = [
  { nom: 'Suites numériques', secondes: 9300, contenus: 4 },
  { nom: 'Limites et continuité', secondes: 7200, contenus: 5 },
  { nom: 'Nombres complexes', secondes: 4500, contenus: 2 },
  { nom: 'Dérivation et étude des fonctions', secondes: 2700, contenus: 2 },
];
export const TEMPS_CONTENUS = [
  { titre: 'Suites numériques · Exercice 4', type: 'exercise' as const, secondes: 3900 },
  { titre: 'Les suites numériques (cours)', type: 'lesson' as const, secondes: 2700 },
  { titre: 'DS n° 2 · 2ème Bac SM', type: 'exam' as const, secondes: 1800 },
  { titre: 'Suites numériques · Exercice 9', type: 'exercise' as const, secondes: 900 },
];
