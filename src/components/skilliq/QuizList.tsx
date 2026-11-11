// Page des quiz d'un niveau (refaite le 10/11/2026 : les cartes rangées par thème étaient difficiles à lire). En
// tête, un seul encadré clair : le quiz à faire maintenant (un passage commencé, sinon le prochain, sinon le moins
// réussi) et trois repères du niveau. Puis TOUS les chapitres du niveau en une seule liste, dans l'ordre du programme
// (plus de groupes par thème ni d'ordre alphabétique), avec une colonne par quiz ; un chapitre sans quiz garde sa
// place dans la liste, marqué « Bientôt ».
import React, { useMemo } from 'react';
import { ArrowRight, Award, Play, RotateCcw } from 'lucide-react';
import { Section } from '@/components/space/Page';
import { ChapterTable, type ChapterLine, type StageProps } from './ChapterRows';
import { QUIZ_TYPE } from './quizTypes';
import { isApprofondi, pct, quizKey, quizSize, stageOf, typeOf, type QuizChapter, type QuizEnCours, type QuizType } from './types';
import type { QuizChapters, Suggestion } from './useQuizChapters';
import { t } from '@/i18n';

type Featured = Suggestion & { mode: 'reprendre' | 'prochain' | 'refaire' };

/** Le quiz à faire maintenant : le seul bouton plein de la page. */
const Hero: React.FC<{ f: Featured; enCours: QuizEnCours | null; onStart: () => void }> = ({ f, enCours, onStart }) => {
  const stage = stageOf(f.chapter, f.type);
  const Icon = QUIZ_TYPE[f.type].icon;
  const last = stage.taken ? pct(stage.taken) : null;
  const resume = f.mode === 'reprendre';
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
      <span aria-hidden className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:flex ${
        resume ? 'bg-gold-soft text-gold-strong' : 'bg-brand-soft text-brand-hover'}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[12.5px] font-medium ${resume ? 'text-gold-strong' : 'text-brand-hover'}`}>
          {resume ? t('À reprendre') : f.mode === 'refaire' ? t('À refaire') : t('Prochain quiz')}
        </p>
        <h2 id="quiz-hero-titre" className="fd-display mt-1 text-[22px] leading-tight text-ink sm:text-[24px]">{f.chapter.name}</h2>
        <p className="fd-nums mt-1 text-[13px] text-ink-faint">
          {t(QUIZ_TYPE[f.type].label)} · {t('{n} questions', { n: quizSize(stage.ready) })}
          {last !== null && !resume && <> · {t('Dernier score : {n} %', { n: last })}</>}
        </p>
      </div>
      <button type="button" onClick={onStart}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-semibold text-white transition duration-150 active:scale-[.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
          resume ? 'bg-gold hover:opacity-90' : 'bg-brand hover:bg-brand-hover'}`}>
        {resume ? (
          <><Play className="h-4 w-4" aria-hidden /> {t('Reprendre')}{enCours && <span className="fd-nums font-normal text-white/80">{enCours.repondues}/{enCours.total}</span>}</>
        ) : f.mode === 'refaire' ? <><RotateCcw className="h-4 w-4" aria-hidden /> {t('Refaire')}</>
          : <>{t('Commencer')} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden /></>}
      </button>
    </div>
  );
};

/** Trois repères du niveau, sur une ligne : quiz du cours faits, moyenne, chapitres approfondis. */
const Stats: React.FC<{ ready: QuizChapter[]; hasDeep: boolean; bordered: boolean }> = ({ ready, hasDeep, bordered }) => {
  const cours = ready.filter((c) => c.ready > 0);
  const done = cours.filter((c) => c.taken);
  const average = done.length ? Math.round(done.reduce((s, c) => s + pct(c.taken!), 0) / done.length) : null;
  const deep = ready.filter((c) => c.deep.ready > 0);
  const earned = deep.filter((c) => isApprofondi(c.deep.taken)).length;
  const items: { key: string; label: string; value: string; badge?: boolean }[] = [
    { key: 'faits', label: t('Quiz du cours faits'), value: `${done.length}/${cours.length}` },
    ...(average !== null ? [{ key: 'moyenne', label: t('Moyenne au quiz du cours'), value: `${average} %` }] : []),
    ...(hasDeep ? [{ key: 'approfondis', label: t('Chapitres approfondis'), value: `${earned}/${deep.length}`, badge: true }] : []),
  ];
  return (
    <dl className={`flex flex-wrap items-center gap-x-8 gap-y-1.5 px-5 py-3.5 sm:px-6 ${bordered ? 'border-t border-line' : ''}`}>
      {items.map((it) => (
        <div key={it.key} className="flex items-center gap-2">
          <dt className="text-[12.5px] text-ink-faint">{it.label}</dt>
          <dd className="fd-nums inline-flex items-center gap-1 text-[14px] font-semibold text-ink">
            {it.badge && earned > 0 && <Award className="h-3.5 w-3.5 text-gold" aria-hidden />}{it.value}
          </dd>
        </div>
      ))}
    </dl>
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
  const { chapters, ready, next, redo, level, hasDeep } = data;
  const lv = level?.id ?? null;
  const started = (c: QuizChapter, type: QuizType) => enCours[quizKey(lv, c.id, type)] ?? null;

  // Un passage commencé passe avant tout : le plus récent.
  const mine = useMemo(() => Object.values(enCours).filter((e) => e.niveau === lv && ready.some((c) => c.id === e.chapitre)),
    [enCours, lv, ready]);
  const featured = useMemo<Featured | null>(() => {
    const last = [...mine].sort((a, b) => b.maj.localeCompare(a.maj))[0];
    const chapter = last ? ready.find((c) => c.id === last.chapitre) : undefined;
    if (last && chapter) return { chapter, type: typeOf(last), mode: 'reprendre' };
    if (next) return { ...next, mode: 'prochain' };
    return redo ? { ...redo, mode: 'refaire' } : null;
  }, [mine, ready, next, redo]);

  const stage = (c: QuizChapter, type: QuizType): StageProps => {
    const s = stageOf(c, type);
    return { stage: s, enCours: started(c, type), onStart: () => onStart(c, type), onView: onView && s.taken ? () => onView(c, type) : undefined };
  };
  // `chapters` arrive dans l'ordre du programme (GET /stats/progression/) : le numéro est le rang du chapitre.
  const lines: ChapterLine[] = chapters.map((c, i) => ({
    id: c.id, n: i + 1, name: c.name, cours: stage(c, 'cours'), deep: hasDeep ? stage(c, 'approfondissement') : undefined,
  }));

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby={featured ? 'quiz-hero-titre' : undefined} aria-label={featured ? undefined : t('Où j’en suis')}
        className="overflow-hidden rounded-2xl border border-line bg-white">
        {featured && <Hero f={featured} enCours={started(featured.chapter, featured.type)} onStart={() => onStart(featured.chapter, featured.type)} />}
        <Stats ready={ready} hasDeep={hasDeep} bordered={!!featured} />
      </section>

      <Section id="tous-les-quiz" title={t('Chapitres')} count={chapters.length}
        hint={level ? `${level.name} · ${t('dans l’ordre du programme')}` : t('Dans l’ordre du programme')}>
        <div data-tour="skilliq-niveaux">
          <ChapterTable lines={lines} deep={hasDeep} />
        </div>
      </Section>

      {children}
    </div>
  );
};
