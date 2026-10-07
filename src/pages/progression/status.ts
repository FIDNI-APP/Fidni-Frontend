// États d'un chapitre : toujours une icône + un libellé (jamais la couleur seule).
import { CheckCircle2, Circle, CircleDashed, Target, TrendingUp } from 'lucide-react';
import type { ChapterStatus } from './types';

export const STATUS: Record<ChapterStatus, {
  label: string;
  icon: typeof CheckCircle2;
  /** Tuile de la carte du programme. */
  tile: string;
  /** Icône et libellé. */
  text: string;
  /** Jauge : remplissage et piste (un cran plus clair, même teinte). */
  fill: string;
  track: string;
}> = {
  mastered: {
    label: 'Maîtrisé', icon: CheckCircle2,
    tile: 'border-brand/35 bg-brand-soft hover:border-brand/60', text: 'text-brand-hover',
    fill: 'bg-brand', track: 'bg-brand/15',
  },
  good: {
    label: 'En bonne voie', icon: TrendingUp,
    tile: 'border-brand-line bg-white hover:border-brand/50', text: 'text-brand-hover',
    fill: 'bg-brand/60', track: 'bg-brand/10',
  },
  weak: {
    label: 'À renforcer', icon: Target,
    // Texte un cran plus foncé que gold-strong : 4,9:1 sur le fond doré clair (gold-strong : 4,1:1).
    tile: 'border-gold-line bg-gold-soft hover:border-gold', text: 'text-[#8a6318]',
    fill: 'bg-gold', track: 'bg-gold/20',
  },
  started: {
    label: 'Commencé', icon: CircleDashed,
    tile: 'border-line bg-white hover:border-[#cfcac0]', text: 'text-ink-soft',
    fill: 'bg-ink-faint', track: 'bg-[#f2f1ee]',
  },
  todo: {
    label: 'Pas commencé', icon: Circle,
    tile: 'border-line bg-[#faf9f7] hover:border-[#cfcac0]', text: 'text-ink-faint',
    fill: 'bg-ink-faint', track: 'bg-[#f2f1ee]',
  },
};

export const STATUS_ORDER: ChapterStatus[] = ['mastered', 'good', 'weak', 'started', 'todo'];
