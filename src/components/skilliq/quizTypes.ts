// Les deux quiz d'un chapitre (31/10/2026) à l'écran : nom, icône et couleurs. Le quiz du cours en vert (l'action),
// l'approfondissement à l'encre (le défi) ; le badge « Chapitre approfondi » est doré (QuizRow, DeepBadge).
import type React from 'react';
import { BookOpen, Mountain } from 'lucide-react';
import type { QuizType } from './types';

export const QUIZ_TYPE: Record<QuizType, { label: string; icon: React.ComponentType<{ className?: string }>; tile: string; chip: string }> = {
  cours: { label: 'Quiz du cours', icon: BookOpen, tile: 'bg-brand-soft text-brand-hover ring-1 ring-brand-line', chip: 'bg-brand-soft text-brand-hover' },
  approfondissement: { label: 'Approfondissement', icon: Mountain, tile: 'bg-ink text-white', chip: 'bg-ink text-white' },
};
