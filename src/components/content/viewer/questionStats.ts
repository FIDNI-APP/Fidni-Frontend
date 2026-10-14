// Réussite de la classe question par question (GET /contents/{id}/question_stats/), chargée par ContentDetail et
// lue par l'histogramme « Question par question » (QuestionChart) de la colonne de droite. null : pas de page.
import { createContext, useContext } from 'react';
import type { QuestionStat } from '@/lib/api/statisticsApi';

export const QuestionStatsContext = createContext<Record<string, QuestionStat> | null>(null);
export const useQuestionStats = () => useContext(QuestionStatsContext);
