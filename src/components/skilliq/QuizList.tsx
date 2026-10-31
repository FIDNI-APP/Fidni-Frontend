// Des quiz sont prêts pour le niveau de l'élève. 31/10/2026 : deux quiz par chapitre. En haut, les deux quiz en deux
// cartes (ce qu'ils sont, où l'élève en est : quiz du cours faits et moyenne, chapitres approfondis) ; puis le prochain
// quiz à passer (ou à refaire) ; puis tous les chapitres du niveau rangés par sous-domaine, chacun avec ses deux quiz ;
// les chapitres qui n'en ont pas encore sont repliés.
import React from 'react';
import { ArrowRight, Award, CheckCircle2, Circle, CircleDashed, Clock, Play, RotateCcw, Target, TrendingUp } from 'lucide-react';
import { Section } from '@/components/space/Page';
import type { ChapterStatus } from '@/pages/progression/types';
import { ChapterPlan } from './ChapterPlan';
import { ChapterListHeader, ChapterRow, NewBadge, ScoreRing, TypeChip } from './QuizRow';
import { QUIZ_TYPE } from './quizTypes';
import { BADGE_PCT, bySubfield, isApprofondi, pct, quizKey, quizSize, stageOf, type QuizChapter, type QuizEnCours, type QuizType } from './types';
import type { QuizChapters, Suggestion } from './useQuizChapters';
import { t } from '@/i18n';

const REASON: Record<ChapterStatus, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  weak: { label: 'À renforcer d’après tes exercices', icon: Target, cls: 'bg-gold-soft text-gold-strong' },
  started: { label: 'Chapitre commencé', icon: CircleDashed, cls: 'bg-[#f2f1ee] text-ink-soft' },
  todo: { label: 'Pas encore travaillé', icon: Circle, cls: 'bg-[#f2f1ee] text-ink-soft' },
  good: { label: 'En bonne voie : vérifie-le', icon: TrendingUp, cls: 'bg-brand-soft text-brand-hover' },
  mastered: { label: 'Maîtrisé : confirme-le', icon: CheckCircle2, cls: 'bg-brand-soft text-brand-hover' },
};

/** Ce que chaque quiz apporte, en une phrase (cartes du haut, carte du prochain quiz). */
const ABOUT: Record<QuizType, string> = {
  cours: 'Chaque réponse est corrigée tout de suite, puis tu vois ce que tu maîtrises, théorème par théorème. Ton score s’ajoute à Ma progression.',
  approfondissement: 'De vrais problèmes, avec des réponses pièges : calcule avant de choisir, rien ne presse. Réussis-le à {n} % pour le badge « Chapitre approfondi ».',
};

const Bar: React.FC<{ value: number; total: number; tone: string; label: string }> = ({ value, total, tone, label }) => (
  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#efece6]" role="progressbar" aria-valuemin={0} aria-valuemax={total}
    aria-valuenow={value} aria-label={label}>
    <div className={`h-full rounded-full transition-[width] duration-500 ${tone}`} style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
  </div>
);

/** Les deux quiz du niveau : ce qu'ils sont, et où l'élève en est. */
const Overview: React.FC<{ ready: QuizChapter[]; hasDeep: boolean }> = ({ ready, hasDeep }) => {
  const cours = ready.filter((c) => c.ready > 0);
  const coursDone = cours.filter((c) => c.taken);
  const average = coursDone.length ? Math.round(coursDone.reduce((s, c) => s + pct(c.taken!), 0) / coursDone.length) : null;
  const deep = ready.filter((c) => c.deep.ready > 0);
  const earned = deep.filter((c) => isApprofondi(c.deep.taken)).length;
  const C = QUIZ_TYPE.cours;
  const D = QUIZ_TYPE.approfondissement;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <section className="rounded-2xl border border-line bg-white p-4 sm:p-5" aria-labelledby="quiz-cours-titre">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${C.tile}`} aria-hidden><C.icon className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 id="quiz-cours-titre" className="text-[14.5px] font-semibold text-ink">{t(C.label)}</h2>
            <p className="text-[12.5px] leading-snug text-ink-faint">{t('Des QCM sur le cours, pour vérifier que tout est su.')}</p>
          </div>
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <p className="text-[13px] text-ink-soft">
            <b className="fd-display fd-nums text-[26px] font-normal leading-none text-ink">{coursDone.length}</b>
            <span className="fd-nums"> / {cours.length}</span> {cours.length > 1 ? t('quiz faits') : t('quiz fait')}
          </p>
          {average !== null && <p className="fd-nums text-[12.5px] text-ink-faint">{t('Moyenne')} <b className="font-semibold text-ink">{average} %</b></p>}
        </div>
        <Bar value={coursDone.length} total={cours.length} tone="bg-brand" label={t('{a} quiz du cours faits sur {n}', { a: coursDone.length, n: cours.length })} />
      </section>

      <section className={`rounded-2xl border p-4 sm:p-5 ${hasDeep ? 'border-line bg-white' : 'border-dashed border-line bg-transparent'}`}
        aria-labelledby="quiz-approfondissement-titre">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${hasDeep ? D.tile : 'bg-[#f2f1ee] text-ink-faint'}`} aria-hidden>
            <D.icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="quiz-approfondissement-titre" className="text-[14.5px] font-semibold text-ink">{t(D.label)}</h2>
            <p className="text-[12.5px] leading-snug text-ink-faint">{t('De vrais problèmes en QCM, avec des réponses pièges.')}</p>
          </div>
        </div>
        {hasDeep ? (
          <>
            <div className="mt-4 flex items-baseline justify-between gap-3">
              <p className="text-[13px] text-ink-soft">
                <b className="fd-display fd-nums text-[26px] font-normal leading-none text-ink">{earned}</b>
                <span className="fd-nums"> / {deep.length}</span> {deep.length > 1 ? t('chapitres approfondis') : t('chapitre approfondi')}
              </p>
              <p className="inline-flex items-center gap-1 text-[12.5px] text-gold-strong"><Award className="h-3.5 w-3.5" aria-hidden /> {t('badge à {n} %', { n: BADGE_PCT })}</p>
            </div>
            <Bar value={earned} total={deep.length} tone="bg-gold" label={t('{a} chapitres approfondis sur {n}', { a: earned, n: deep.length })} />
          </>
        ) : (
          <p className="mt-4 text-[13px] text-ink-faint">
            <span className="me-1.5 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">{t('Bientôt')}</span>
            {t('Pour aller plus loin, une fois le cours su.')}
          </p>
        )}
      </section>
    </div>
  );
};

/** Le quiz à passer maintenant (ou, tous passés, celui à refaire). */
const NextQuizCard: React.FC<{ suggestion: Suggestion; enCours: QuizEnCours | null; onStart: () => void }> = ({ suggestion, enCours, onStart }) => {
  const { chapter, type } = suggestion;
  const stage = stageOf(chapter, type);
  const taken = stage.taken;
  const reason = REASON[chapter.status];
  const ReasonIcon = reason.icon;
  const coursPct = chapter.taken ? pct(chapter.taken) : null;
  const Icon = QUIZ_TYPE[type].icon;
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="flex min-w-0 items-start gap-4 sm:flex-1">
          {/* Repère visuel (ordinateur) ; sur téléphone, le texte prend toute la largeur. */}
          <span className="hidden sm:block">
            {taken ? <ScoreRing value={pct(taken)} size={56} /> : (
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${QUIZ_TYPE[type].tile}`} aria-hidden>
                <Icon className="h-6 w-6" />
              </span>
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <TypeChip type={type} />
              {stage.fresh && <NewBadge />}
              {taken ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-0.5 text-[12px] font-semibold text-gold-strong">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {t('Ton score le plus bas :')} <span className="fd-nums">{pct(taken)} %</span>
                </span>
              ) : type === 'approfondissement' ? (
                coursPct !== null && (
                  <span className="fd-nums inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-0.5 text-[12px] font-semibold text-brand-hover">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {t('Cours fait : {n} %', { n: coursPct })}
                  </span>
                )
              ) : (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${reason.cls}`}>
                  <ReasonIcon className="h-3.5 w-3.5" aria-hidden /> {t(reason.label)}
                </span>
              )}
            </div>
            <h3 className="fd-display mt-2 text-[22px] leading-tight text-ink sm:text-[24px]">{chapter.name}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-faint">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              <span className="fd-nums">{t('{n} questions', { n: quizSize(stage.ready) })}</span>
              <span>· {t('sans chrono')}</span>
              {chapter.subfield && <span>· {t(chapter.subfield)}</span>}
            </p>
          </div>
        </div>
        <button type="button" onClick={onStart} className="fd-btn-primary min-h-11 w-full justify-center text-[14px] sm:w-auto">
          {enCours ? <><Play className="h-4 w-4" aria-hidden /> {t('Reprendre ({a}/{n})', { a: enCours.repondues, n: enCours.total })}</>
            : taken ? <><RotateCcw className="h-4 w-4" aria-hidden /> {t('Refaire le quiz')}</>
              : <>{t('Commencer')} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden /></>}
        </button>
      </div>
      <p className="border-t border-line bg-[#fcfbf9] px-5 py-2.5 text-[12.5px] leading-relaxed text-ink-faint sm:px-6">
        {t(ABOUT[type], { n: BADGE_PCT })}
      </p>
    </div>
  );
};

export const QuizList: React.FC<{
  data: QuizChapters;
  /** Quiz commencés (clé : quizKey). */
  enCours?: Record<string, QuizEnCours>;
  onStart: (c: QuizChapter, type: QuizType) => void;
  /** Rouvrir le dernier résultat d'un quiz passé. */
  onView?: (c: QuizChapter, type: QuizType) => void;
  children?: React.ReactNode;
}> = ({ data, enCours = {}, onStart, onView, children }) => {
  const started = (c: QuizChapter, type: QuizType) => enCours[quizKey(data.level?.id ?? null, c.id, type)] ?? null;
  const { ready, soon, next, redo, level, hasDeep } = data;
  const featured = next ?? redo;
  // Le prochain quiz est déjà mis en avant : la liste reprend tous les quiz, groupés comme le programme.
  const groups = bySubfield(ready);
  const stage = (c: QuizChapter, type: QuizType) => {
    const s = stageOf(c, type);
    return { stage: s, enCours: started(c, type), onStart: () => onStart(c, type),
      onView: onView && s.taken ? () => onView(c, type) : undefined };
  };

  return (
    <div className="flex flex-col gap-10">
      <Overview ready={ready} hasDeep={hasDeep} />

      {featured && (
        <Section id="prochain-quiz" title={next ? t('Ton prochain quiz') : t('À refaire')}
          hint={next ? undefined : t('Tu as passé tous les quiz de ton niveau : refais le moins réussi.')}>
          <NextQuizCard suggestion={featured} enCours={started(featured.chapter, featured.type)}
            onStart={() => onStart(featured.chapter, featured.type)} />
        </Section>
      )}

      <Section id="tous-les-quiz" title={t('Tous les quiz de ton niveau')} count={ready.length}
        hint={level ? t('{niveau} · rangés par thème', { niveau: level.name }) : undefined}>
        <div data-tour="skilliq-niveaux" className="flex flex-col gap-5">
          {groups.map(([name, list]) => (
            <div key={name}>
              <ChapterListHeader title={groups.length > 1 ? t(name) : null} deep={hasDeep} />
              <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
                {list.map((c) => <ChapterRow key={c.id} name={c.name} cours={stage(c, 'cours')}
                  deep={hasDeep ? stage(c, 'approfondissement') : undefined} />)}
              </ul>
            </div>
          ))}
          {soon.length > 0 && (
            <ChapterPlan title={t('Bientôt')} meta={soon.length > 1 ? t('chapitres sans quiz pour l’instant') : t('chapitre sans quiz pour l’instant')} chapters={soon} />
          )}
        </div>
      </Section>

      {children}
    </div>
  );
};
