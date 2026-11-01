// Les deux quiz d'un chapitre (31/10/2026) à l'écran : nom et icône. Le quiz du cours se joue en vert (l'action),
// l'approfondissement à l'encre (le défi) ; le badge « Chapitre approfondi » est doré.
import type React from 'react';
import { BookOpen, Mountain } from 'lucide-react';
import type { QuizType } from './types';

export const QUIZ_TYPE: Record<QuizType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  cours: { label: 'Quiz du cours', icon: BookOpen },
  approfondissement: { label: 'Approfondissement', icon: Mountain },
};
