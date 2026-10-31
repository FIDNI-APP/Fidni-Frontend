// Une ligne de chapitre et ses quiz. 14/10/2026 : un quiz commencé se reprend (« Reprendre ») ; un quiz passé rouvre
// son dernier résultat (où l'on peut le refaire). 31/10/2026 : deux quiz par chapitre, côte à côte sur ordinateur,
// l'un sous l'autre sur téléphone : le quiz du cours, puis l'approfondissement (badge « Chapitre approfondi » à
// BADGE_PCT %). Un quiz pas encore prêt n'a pas de bouton : « Bientôt » (approfondissement seulement, quand le niveau
// en a ailleurs).
import React from 'react';
import { Award, ChevronRight, Play } from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { t } from '@/i18n';
import { QUIZ_TYPE } from './quizTypes';
import {
  RING, frDate, isApprofondi, pct, previousPct, quizSize, type QuizEnCours, type QuizStage, type QuizType, type SkillAssessment,
} from './types';

/** Petit anneau du dernier score (hors .fd-card : la règle CSS des cartes forcerait le vert). */
export const ScoreRing: React.FC<{ value: number; size?: number }> = ({ value, size = 44 }) => (
  <ProgressRing percentage={value} size={size} strokeWidth={size < 40 ? 3.5 : 4} trackColor={RING.track} progressColor={value >= 50 ? RING.good : RING.low}>
    <span className={`fd-nums font-bold text-ink ${size < 40 ? 'text-[10.5px]' : 'text-[12px]'}`}>{value}<span className="sr-only"> %</span></span>
  </ProgressRing>
);

/** Écart avec le passage précédent (« +20 pts »), rien au premier passage. */
export const Delta: React.FC<{ a: SkillAssessment; long?: boolean; className?: string }> = ({ a, long = false, className = '' }) => {
  const before = previousPct(a);
  if (before === null) return null;
  const d = pct(a) - before;
  const tone = d > 0 ? 'bg-brand-soft text-brand-hover' : 'bg-[#f2f1ee] text-ink-soft';
  const vars = { signe: d > 0 ? '+' : '−', n: Math.abs(d) };
  const text = d === 0 ? (long ? t('Même score que la dernière fois') : '=')
    : Math.abs(d) > 1
      ? (long ? t('{signe}{n} pts depuis la dernière fois', vars) : t('{signe}{n} pts', vars))
      : (long ? t('{signe}{n} pt depuis la dernière fois', vars) : t('{signe}{n} pt', vars));
  return (
    <span className={`fd-nums inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${tone} ${className}`}
      title={t('Avant : {n} %', { n: before })}>
      {text}<span className="sr-only"> {t('(avant : {n} %)', { n: before })}</span>
    </span>
  );
};

/** Étiquette « Nouveau » : quiz sorti il y a moins de 14 jours, pas encore passé. */
export const NewBadge: React.FC = () => (
  <span className="inline-flex items-center rounded-full bg-gold px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.06em] text-white">{t('Nouveau')}</span>
);

/** Badge « Chapitre approfondi » : l'approfondissement réussi à BADGE_PCT % au moins (dernier passage). */
export const DeepBadge: React.FC<{ large?: boolean }> = ({ large = false }) => (
  <span className={`inline-flex items-center gap-1 rounded-full bg-gold-soft font-semibold text-gold-strong ring-1 ring-gold-line ${
    large ? 'px-3 py-1 text-[13px]' : 'px-2 py-0.5 text-[11.5px]'}`}>
    <Award className={large ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden /> {t('Chapitre approfondi')}
  </span>
);

/** Étiquette du type de quiz (en-têtes, carte du prochain quiz). */
export const TypeChip: React.FC<{ type: QuizType; className?: string }> = ({ type, className = '' }) => {
  const m = QUIZ_TYPE[type];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${m.chip} ${className}`}>
      <m.icon className="h-3.5 w-3.5" aria-hidden /> {t(m.label)}
    </span>
  );
};

/** Colonnes de la liste : chapitre, quiz du cours, approfondissement (`deep` : le niveau en a au moins un). */
const COLUMNS = { deep: 'xl:grid-cols-[minmax(0,1fr)_15rem_15rem]', cours: 'xl:grid-cols-[minmax(0,1fr)_15rem]' } as const;

/** En-tête d'un groupe de chapitres : son thème ; sur grand écran, aussi le nom des colonnes de quiz. */
export const ChapterListHeader: React.FC<{ title?: string | null; deep: boolean }> = ({ title, deep }) => (
  <div className={`mb-2 flex items-end gap-3 px-1 xl:grid xl:px-4 ${deep ? COLUMNS.deep : COLUMNS.cours} ${title ? '' : 'hidden'}`}>
    <h3 className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{title}</h3>
    {(['cours', ...(deep ? ['approfondissement' as const] : [])] as QuizType[]).map((type) => {
      const m = QUIZ_TYPE[type];
      return (
        <span key={type} className="hidden items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint xl:flex">
          <m.icon className="h-3.5 w-3.5" aria-hidden /> {t(m.label)}
        </span>
      );
    })}
  </div>
);

/** Un des deux quiz d'un chapitre : à passer, commencé, passé (score ; ouvre le résultat, où l'on peut le refaire) ou
 *  bientôt. Téléphone et tablette : son nom dans la case ; grand écran : le nom est en tête de colonne. */
const StageButton: React.FC<{
  type: QuizType; name: string; stage: QuizStage; enCours: QuizEnCours | null; onStart: () => void; onView?: () => void;
}> = ({ type, name, stage, enCours, onStart, onView }) => {
  const m = QUIZ_TYPE[type];
  const label = t(m.label);
  const { ready, taken } = stage;
  const tile = (cls: string) => (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg xl:hidden ${cls}`} aria-hidden><m.icon className="h-4 w-4" /></span>
  );
  if (ready === 0 && !taken) {
    return (
      <div className="flex min-h-14 items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2 text-ink-faint xl:min-h-12">
        {tile('bg-[#f2f1ee]')}
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold leading-tight xl:hidden">{label}</span>
          <span className="block text-[12.5px]">{t('Bientôt')}</span>
        </span>
      </div>
    );
  }
  const view = taken && onView && !enCours ? onView : null;
  const state = enCours ? t('Reprendre · {a}/{n} corrigées', { a: enCours.repondues, n: enCours.total })
    : taken ? t('Fait le {date}', { date: frDate(taken.completed_at) })
      : t('Commencer · {n} questions', { n: quizSize(ready) });
  const aria = enCours ? t('Reprendre : {quiz} « {name} »', { quiz: label, name })
    : view ? t('Voir mon dernier résultat : {quiz} « {name} »', { quiz: label, name })
      : t('Commencer : {quiz} « {name} »', { quiz: label, name });
  return (
    <button type="button" onClick={view ?? onStart} aria-label={aria}
      className={`group flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 xl:min-h-12 ${
        enCours ? 'border-gold-line bg-gold-soft/60 hover:bg-gold-soft' : 'border-line bg-white hover:border-[#cfc9bf] hover:bg-[#fcfbf9]'}`}>
      {tile(m.tile)}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold leading-tight text-ink xl:hidden">{label}</span>
        <span className={`fd-nums block text-[12.5px] leading-snug ${enCours ? 'font-semibold text-gold-strong' : taken ? 'text-ink-soft' : 'font-semibold text-brand-hover'}`}>{state}</span>
      </span>
      {taken && !enCours ? <ScoreRing value={pct(taken)} size={36} />
        : (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${enCours ? 'bg-gold' : 'bg-brand'}`} aria-hidden>
            <Play className="h-3.5 w-3.5" />
          </span>
        )}
      {view && <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint group-hover:text-ink rtl:rotate-180" aria-hidden />}
    </button>
  );
};

/** Un quiz d'un chapitre pour la ligne : son état et ses actions. */
export interface StageProps { stage: QuizStage; enCours: QuizEnCours | null; onStart: () => void; onView?: () => void }

/** Une ligne de chapitre : son nom (badges « Nouveau », « Chapitre approfondi »), puis ses quiz. `deep` absent : le niveau
 *  n'a encore aucun approfondissement, la colonne n'est pas montrée. */
export const ChapterRow: React.FC<{ name: string; cours: StageProps; deep?: StageProps }> = ({ name, cours, deep }) => {
  const isNew = cours.stage.fresh || (!!deep && deep.stage.fresh);
  // Sous le nom : pas de case « Bientôt » sous chaque chapitre ; grand écran : la colonne reste alignée.
  const showDeep = !!deep && (deep.stage.ready > 0 || !!deep.stage.taken);
  return (
    <li className={`grid gap-2.5 px-3 py-3 sm:px-4 xl:items-center xl:gap-3 ${deep ? COLUMNS.deep : COLUMNS.cours}`}>
      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] font-semibold leading-snug text-ink">
        {name}
        {isNew && <NewBadge />}
        {deep && isApprofondi(deep.stage.taken) && <DeepBadge />}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 xl:contents">
        <StageButton type="cours" name={name} {...cours} />
        {deep && (showDeep
          ? <StageButton type="approfondissement" name={name} {...deep} />
          : <div className="hidden xl:block"><StageButton type="approfondissement" name={name} {...deep} /></div>)}
      </div>
    </li>
  );
};

