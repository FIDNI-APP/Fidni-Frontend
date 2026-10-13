// Action immédiate d'un chapitre de « Ma progression » (13/10/2026), selon son état : la même logique que l'objectif
// (backend apps/users/objectif.py), en plus court pour la liste « Mes chapitres ».
import type { ChapterProgress, ObjectifAction } from './types';

export interface ChapterAction extends ObjectifAction { label: string }

export function chapterAction(c: ChapterProgress): ChapterAction {
  if (!c.contents) return { kind: 'cours', label: 'Le cours' };
  switch (c.etat) {
    case 'a_renforcer': return { kind: 'cours', label: 'Le cours' };
    case 'a_consolider': return { kind: 'entrainer', difficulte: 'medium', label: 'S’entraîner' };
    case 'bonne_voie':
      return c.durable?.etat === 'a_verifier' && c.durable.due
        ? { kind: 'entrainer', label: 'Vérifier' }
        : { kind: 'entrainer', label: 'S’entraîner' };
    case 'maitrise': return { kind: 'entrainer', difficulte: 'hard', label: 'Aller plus loin' };
    default:
      return c.quiz_ready ? { kind: 'quiz', label: 'Évaluer' } : { kind: 'entrainer', difficulte: 'easy', label: 'Évaluer' };
  }
}
