// Liste des chapitres de la page des quiz (10/11/2026, à la place des cartes) : une ligne par chapitre, dans l'ordre
// du programme, et une colonne par quiz (le quiz du cours, l'approfondissement). Chaque case dit où en est l'élève et
// porte l'action : commencer, reprendre, rouvrir son dernier résultat, refaire. Les colonnes n'apparaissent que sur
// un grand écran (xl : la barre latérale prend déjà sa place) ; en dessous, les deux quiz passent sous le nom du
// chapitre, avec leur nom : côte à côte si la place le permet (lg), sinon l’un sous l’autre.
import React from 'react';
import { Award, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { t } from '@/i18n';
import { NewBadge } from './QuizRow';
import { QUIZ_TYPE } from './quizTypes';
import { frDate, isApprofondi, pct, quizSize, type QuizEnCours, type QuizStage, type QuizType } from './types';

/** Un quiz d'un chapitre : son état et ses actions. */
export interface StageProps { stage: QuizStage; enCours: QuizEnCours | null; onStart: () => void; onView?: () => void }

/** Une ligne de la liste. `n` : rang du chapitre dans le programme (absent : pas de numéro). */
export interface ChapterLine { id: number; n?: number; name: string; cours: StageProps; deep?: StageProps }

// Les boutons font 36 px de haut ; leur zone de toucher est étendue à 44 px.
const HIT = 'relative after:absolute after:inset-x-0 after:-inset-y-1';
const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';
const BTN = `${HIT} ${FOCUS} inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition duration-150 active:scale-[.97] motion-reduce:transition-none motion-reduce:active:scale-100`;

/** Colonnes de l'ordinateur : le chapitre, puis une colonne de largeur fixe par quiz (alignées d'une ligne à l'autre). */
const cols = (deep: boolean) => `xl:grid xl:items-center xl:gap-x-8 ${
  deep ? 'xl:grid-cols-[minmax(0,1fr)_15.5rem_15.5rem]' : 'xl:grid-cols-[minmax(0,1fr)_15.5rem]'}`;

/** La case d'un quiz : à gauche son état (questions, en cours, dernier score), à droite l'action. */
const QuizCell: React.FC<{ type: QuizType; name: string; p: StageProps }> = ({ type, name, p }) => {
  const label = t(QUIZ_TYPE[type].label);
  const { ready, taken } = p.stage;
  const vars = { quiz: label, name };
  let state: React.ReactNode;
  let action: React.ReactNode = null;

  if (p.enCours) {
    state = <span className="fd-nums whitespace-nowrap text-[13px] font-medium text-gold-strong">{t('En cours · {a}/{n}', { a: p.enCours.repondues, n: p.enCours.total })}</span>;
    action = (
      <button type="button" onClick={p.onStart} aria-label={t('Reprendre : {quiz} « {name} »', vars)} className={`${BTN} bg-gold text-white hover:opacity-90`}>
        <Play className="h-3.5 w-3.5" aria-hidden /> {t('Reprendre')}
      </button>
    );
  } else if (taken) {
    const score = pct(taken);
    const result = (
      <>
        {type === 'approfondissement' && isApprofondi(taken) && (
          <span title={t('Chapitre approfondi')} className="inline-flex"><Award className="h-4 w-4 text-gold" aria-hidden /><span className="sr-only">{t('Chapitre approfondi')}</span></span>
        )}
        <span className={`fd-nums whitespace-nowrap text-[15px] font-semibold ${score >= 50 ? 'text-brand-hover' : 'text-gold-strong'}`}>{score} %</span>
        <span className="fd-nums whitespace-nowrap text-[12.5px] font-normal text-ink-faint">{frDate(taken.completed_at)}</span>
      </>
    );
    // Le score rouvre le dernier résultat (correction, bilan par théorème).
    state = p.onView ? (
      <button type="button" onClick={p.onView} aria-label={t('Voir mon dernier résultat : {quiz} « {name} »', vars)}
        className={`${HIT} ${FOCUS} group/score -mx-2 inline-flex h-9 max-w-full items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-paper`}>
        {result}
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-colors group-hover/score:text-ink rtl:rotate-180" aria-hidden />
      </button>
    ) : <span className="inline-flex h-9 items-center gap-1.5">{result}</span>;
    action = ready > 0 ? (
      <button type="button" onClick={p.onStart} aria-label={t('Refaire : {quiz} « {name} »', vars)} className={`${BTN} -me-2 text-ink-soft hover:bg-paper hover:text-ink`}>
        <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {t('Refaire')}
      </button>
    ) : null;
  } else if (ready > 0) {
    state = <span className="fd-nums whitespace-nowrap text-[13px] text-ink-faint">{t('{n} questions', { n: quizSize(ready) })}</span>;
    action = (
      <button type="button" onClick={p.onStart} aria-label={t('Commencer : {quiz} « {name} »', vars)}
        className={`${BTN} bg-brand-soft text-brand-hover hover:bg-brand hover:text-white`}>
        {t('Commencer')}
      </button>
    );
  } else {
    state = <span className="text-[13px] text-ink-faint">{t('Bientôt')}</span>;
  }

  return (
    <div className="flex min-h-12 items-center justify-between gap-3 xl:min-h-9">
      <div className="min-w-0">
        {/* Nom du quiz : au-dessus de l'état sur téléphone ; sur ordinateur, c'est l'en-tête de la colonne. */}
        <p className="truncate text-[12.5px] font-medium leading-tight text-ink-soft xl:sr-only">{label}</p>
        {state}
      </div>
      {action}
    </div>
  );
};

const Line: React.FC<{ line: ChapterLine; deep: boolean; numbered: boolean }> = ({ line, deep, numbered }) => {
  const { name, cours } = line;
  const second = deep ? line.deep : undefined;
  const has = (p?: StageProps) => !!p && (p.stage.ready > 0 || !!p.stage.taken || !!p.enCours);
  // Chapitre sans quiz pour l'instant : une ligne discrète, il garde sa place dans le programme.
  const idle = !has(cours) && !has(second);
  const isNew = cours.stage.fresh || !!second?.stage.fresh;
  // Sous le nom (écrans étroits), un approfondissement pas encore prêt ne prend pas de ligne : il n'y a rien à y faire.
  const deepIdle = !!second && !has(second);
  return (
    <li className="flex gap-3 border-t border-line px-4 py-3.5 first:border-t-0 sm:px-5 xl:items-center xl:py-2.5">
      {numbered && <span className="fd-nums w-6 shrink-0 text-[13px] font-semibold leading-[1.35rem] text-ink-faint" aria-hidden>{line.n}</span>}
      <div className={`min-w-0 flex-1 ${deep ? 'lg:grid lg:grid-cols-2 lg:gap-x-8' : ''} ${cols(deep)}`}>
        <h3 className={`flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5 text-[15px] leading-snug lg:col-span-2 xl:col-span-1 xl:mb-0 ${idle ? 'font-medium text-ink-soft' : 'font-semibold text-ink'}`}>
          {name}{isNew && <NewBadge />}
        </h3>
        {idle ? (
          <p className={`-mt-1 text-[13px] text-ink-faint lg:col-span-2 xl:mt-0 xl:flex xl:min-h-9 xl:items-center ${deep ? '' : 'xl:col-span-1'}`}>{t('Bientôt')}</p>
        ) : (
          <>
            <div><QuizCell type="cours" name={name} p={cours} /></div>
            {second && <div className={deepIdle ? 'hidden xl:block' : undefined}><QuizCell type="approfondissement" name={name} p={second} /></div>}
          </>
        )}
      </div>
    </li>
  );
};

/** Les chapitres en lignes, dans l'ordre reçu (celui du programme). `deep` : montrer la colonne Approfondissement. */
export const ChapterTable: React.FC<{ lines: ChapterLine[]; deep: boolean }> = ({ lines, deep }) => {
  const numbered = lines.some((l) => l.n != null);
  const head = (type: QuizType) => {
    const Icon = QUIZ_TYPE[type].icon;
    return <span className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {t(QUIZ_TYPE[type].label)}</span>;
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div aria-hidden className="hidden gap-3 border-b border-line bg-paper px-5 py-2.5 text-[12.5px] font-medium text-ink-faint xl:flex">
        {numbered && <span className="w-6 shrink-0" />}
        <div className={`min-w-0 flex-1 ${cols(deep)}`}>
          <span>{t('Chapitre')}</span>
          {head('cours')}
          {deep && head('approfondissement')}
        </div>
      </div>
      <ol>
        {lines.map((l) => <Line key={l.id} line={l} deep={deep} numbered={numbered} />)}
      </ol>
    </div>
  );
};
