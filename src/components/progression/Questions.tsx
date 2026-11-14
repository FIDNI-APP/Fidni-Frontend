// « Mes questions, réussies et à revoir » : le graphique par jour de Ma progression (vue « Questions réussies »),
// partagé avec l'accueil depuis le 15/11/2026 (components/dashboard/MesQuestions.tsx).
import React from 'react';
import { t } from '@/i18n';
import type { Tableau } from '@/lib/api/tableauApi';
import { DayBars, type BarRow } from './DayBars';
import { SERIES_QUESTIONS } from './chart';

/** « 20 réussies · 1 en partie · 7 à revoir », le premier chiffre en grand. */
export function Total({ r }: { r: { reussies: number; partielles: number; ratees: number } }) {
  return (
    <>{r.reussies} <span className="text-[14px] font-semibold text-ink-faint">
      {r.reussies > 1 ? t('réussies') : t('réussie')}{r.partielles ? ` · ${t('{n} en partie', { n: r.partielles })}` : ''} · {t('{n} à revoir', { n: r.ratees })}
    </span></>
  );
}

/** Une barre : « 3 réussies · 1 à revoir ». */
export function decrireJour(r: BarRow) {
  const tot = Number(r.reussies) + Number(r.partielles) + Number(r.ratees);
  if (!tot) return t('Aucune question');
  return [Number(r.reussies) > 1 ? t('{n} réussies', { n: r.reussies }) : t('{n} réussie', { n: r.reussies }), Number(r.partielles) ? t('{n} en partie', { n: r.partielles }) : '', t('{n} à revoir', { n: r.ratees })].filter(Boolean).join(' · ');
}

export const QuestionsChart: React.FC<{
  data: Tableau;
  selected?: string | null;
  onPick?: (date: string) => void;
  emptyText?: string;
  height?: number;
}> = ({ data, selected = null, onPick, emptyText = t('Aucune question évaluée sur cette période.'), height }) => {
  const q = data.kpis.questions;
  return (
    <DayBars rows={data.jours} series={SERIES_QUESTIONS} pas={data.periode.pas} selected={selected} onPick={onPick}
      describe={decrireJour} height={height}
      headline={q.reussies + q.partielles + q.ratees ? <Total r={q} /> : t('Aucune question évaluée')}
      emptyText={emptyText} />
  );
};
