// États de maîtrise d'un chapitre (13/10/2026, apps/users/maitrise.py) : toujours une icône et un libellé, jamais la
// couleur seule, jamais de rouge pour l'élève. « Pas encore évalué » est gris : ce n'est pas une difficulté.
import { CheckCircle2, CircleDashed, RefreshCw, Sprout, Target, TrendingUp } from 'lucide-react';
import type { Etat } from './types';

export const ETAT: Record<Etat, {
  label: string;
  icon: typeof CheckCircle2;
  /** Pastille : fond, bordure, texte. */
  pill: string;
  /** Jauge : remplissage et piste. */
  fill: string;
  track: string;
  /** Couleur pleine (SVG, mini-barres). */
  hex: string;
}> = {
  maitrise: { label: 'Maîtrisé', icon: CheckCircle2, pill: 'border-brand/30 bg-brand-soft text-brand-hover', fill: 'bg-brand', track: 'bg-brand/15', hex: '#1a7a4a' },
  bonne_voie: { label: 'En bonne voie', icon: TrendingUp, pill: 'border-brand-line bg-white text-brand-hover', fill: 'bg-brand/60', track: 'bg-brand/10', hex: '#5fa47f' },
  a_consolider: { label: 'À consolider', icon: RefreshCw, pill: 'border-gold-line bg-gold-soft text-[#8a6318]', fill: 'bg-gold', track: 'bg-gold/20', hex: '#c0892f' },
  // Or foncé (pas de rouge) : texte à 4,9:1 sur le fond doré clair.
  a_renforcer: { label: 'À renforcer', icon: Target, pill: 'border-[#e2c58f] bg-[#f6ead2] text-[#7a560f]', fill: 'bg-[#8a6318]', track: 'bg-[#8a6318]/15', hex: '#8a6318' },
  non_evalue: { label: 'Pas encore évalué', icon: CircleDashed, pill: 'border-line bg-[#f7f6f3] text-ink-faint', fill: 'bg-ink-faint', track: 'bg-[#f2f1ee]', hex: '#cfcdc8' },
};

/** Ordre d'affichage des états (mini-barre « chapitres évalués »). */
export const ETAT_ORDER: Etat[] = ['maitrise', 'bonne_voie', 'a_consolider', 'a_renforcer', 'non_evalue'];

export const DIFF_LABEL = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' } as const;

/** Icône « en progrès » (pousse) à côté d'un état. */
export const ProgresIcon = Sprout;
