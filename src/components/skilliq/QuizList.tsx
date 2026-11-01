// Page des quiz d'un niveau (refaite le 31/10/2026). En tête : le quiz à faire maintenant (un passage commencé,
// sinon le prochain, sinon le moins réussi) et les chiffres du niveau. Puis les chapitres en cartes, rangés par thème,
// chacun avec ses deux quiz ; un filtre garde ceux qui restent à faire, ceux qui sont faits ou approfondis. Les
// chapitres sans quiz sont repliés à la fin.
import React, { useMemo, useState } from 'react';
import { ArrowRight, Award, Play, RotateCcw } from 'lucide-react';
import { Section, Segmented } from '@/components/space/Page';
import { ChapterCard, type StageProps } from './ChapterCard';
import { ChapterPlan } from './ChapterPlan';
import { QUIZ_TYPE } from './quizTypes';
import { bySubfield, isApprofondi, pct, quizKey, quizSize, stageOf, typeOf, type QuizChapter, type QuizEnCours, type QuizType } from './types';
import type { QuizChapters, Suggestion } from './useQuizChapters';
import { t } from '@/i18n';

type Filter = 'tous' | 'a-faire' | 'faits' | 'approfondis';
type Featured = Suggestion & { mode: 'reprendre' | 'prochain' | 'refaire' };

/** Le quiz à faire maintenant, en grand. */
const Hero: React.FC<{ f: Featured; enCours: QuizEnCours | null; onStart: () => void }> = ({ f, enCours, onStart }) => {
  const stage = stageOf(f.chapter, f.type);
  const Icon = QUIZ_TYPE[f.type].icon;
  const last = stage.taken ? pct(stage.taken) : null;
  return (
    <section aria-labelledby="quiz-hero-titre" className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-8">
      <Icon className="pointer-events-none absolute -bottom-6 end-6 hidden h-36 w-36 text-white/10 sm:block" aria-hidden />
      <p className="relative text-[11px] font-bold uppercase tracking-[.12em] text-white/70">
        {f.mode === 'reprendre' ? t('À reprendre') : f.mode === 'refaire' ? t('À refaire') : t('Prochain quiz')}
      </p>
      <h2 id="quiz-hero-titre" className="fd-display relative mt-2 max-w-xl text-[27px] leading-[1.12] sm:text-[34px]">{f.chapter.name}</h2>
      <p className="fd-nums relative mt-2 text-[13.5px] text-white/70">
        {t(QUIZ_TYPE[f.type].label)} · {t('{n} questions', { n: quizSize(stage.ready) })}{f.chapter.subfield ? ` · ${t(f.chapter.subfield)}` : ''}
      </p>
      <div className="relative mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" onClick={onStart}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-[14px] font-semibold text-ink transition-colors hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          {f.mode === 'reprendre' ? (
            <><Play className="h-4 w-4" aria-hidden /> {t('Reprendre')}{enCours && <span className="fd-nums font-normal text-ink-faint">{enCours.repondues}/{enCours.total}</span>}</>
          ) : f.mode === 'refaire' ? <><RotateCcw className="h-4 w-4" aria-hidden /> {t('Refaire')}</>
            : <>{t('Commencer')} <ArrowRight className="h-4 w-4" aria-hidden /></>}
        </button>
        {last !== null && f.mode !== 'reprendre' && <span className="fd-nums text-[13px] text-white/70">{t('Dernier score : {n} %', { n: last })}</span>}
      </div>
    </section>
  );
};

/** Les chiffres du niveau, en rangée : quiz du cours faits, moyenne, chapitres approfondis, passages en cours. */
const Stats: React.FC<{ ready: QuizChapter[]; hasDeep: boolean; inProgress: number }> = ({ ready, hasDeep, inProgress }) => {
  const cours = ready.filter((c) => c.ready > 0);
  const done = cours.filter((c) => c.taken);
  const average = done.length ? Math.round(done.reduce((s, c) => s + pct(c.taken!), 0) / done.length) : null;
  const deep = ready.filter((c) => c.deep.ready > 0);
  const earned = deep.filter((c) => isApprofondi(c.deep.taken)).length;
  const items: { key: string; label: string; value: string; bar?: number; badge?: boolean }[] = [
    { key: 'faits', label: t('Quiz du cours faits'), value: `${done.length}/${cours.length}`, bar: cours.length ? done.length / cours.length : 0 },
    { key: 'moyenne', label: t('Moyenne au quiz du cours'), value: average !== null ? `${average} %` : '–' },
    ...(hasDeep ? [{ key: 'approfondis', label: t('Chapitres approfondis'), value: `${earned}/${deep.length}`, badge: true }] : []),
    ...(inProgress ? [{ key: 'en-cours', label: t('Quiz en cours'), value: String(inProgress) }] : []),
  ];
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line ${
      items.length === 4 ? 'sm:grid-cols-4' : items.length === 3 ? 'sm:grid-cols-3' : ''}`}>
      {items.map((it, i) => (
        <div key={it.key} className={`flex flex-col justify-center bg-white px-5 py-4 ${
          items.length % 2 && i === items.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}>
          <dt className="text-[12.5px] text-ink-faint">{it.label}</dt>
          <dd className="fd-nums mt-1 flex items-center gap-1.5 text-[24px] font-bold leading-none text-ink">
            {it.badge && <Award className="h-5 w-5 text-gold" aria-hidden />}{it.value}
          </dd>
          {it.bar !== undefined && (
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#efece6]" aria-hidden>
              <div className="h-full rounded-full bg-brand" style={{ width: `${it.bar * 100}%` }} />
            </div>
          )}
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
  const { ready, soon, next, redo, level, hasDeep } = data;
  const lv = level?.id ?? null;
  const started = (c: QuizChapter, type: QuizType) => enCours[quizKey(lv, c.id, type)] ?? null;
  const [filter, setFilter] = useState<Filter>('tous');

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

  const toDo = (c: QuizChapter) => (c.ready > 0 && (!c.taken || !!started(c, 'cours')))
    || (c.deep.ready > 0 && (!c.deep.taken || !!started(c, 'approfondissement')));
  const keep: Record<Filter, (c: QuizChapter) => boolean> = {
    tous: () => true, 'a-faire': toDo, faits: (c) => !toDo(c), approfondis: (c) => isApprofondi(c.deep.taken),
  };
  const groups = bySubfield(ready.filter(keep[filter]));
  const count = (f: Filter) => ready.filter(keep[f]).length;
  const stage = (c: QuizChapter, type: QuizType): StageProps => {
    const s = stageOf(c, type);
    return { stage: s, enCours: started(c, type), onStart: () => onStart(c, type), onView: onView && s.taken ? () => onView(c, type) : undefined };
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        {featured && <Hero f={featured} enCours={started(featured.chapter, featured.type)} onStart={() => onStart(featured.chapter, featured.type)} />}
        <Stats ready={ready} hasDeep={hasDeep} inProgress={mine.length} />
      </div>

      <Section id="tous-les-quiz" title={t('Chapitres')} count={ready.length} hint={level ? level.name : undefined}>
        <div className="mb-5">
          <Segmented label="Filtrer les chapitres" value={filter} onChange={setFilter} options={[
            { key: 'tous', label: 'Tous', count: count('tous') },
            { key: 'a-faire', label: 'À faire', count: count('a-faire') },
            { key: 'faits', label: 'Faits', count: count('faits') },
            ...(hasDeep ? [{ key: 'approfondis' as const, label: 'Approfondis', count: count('approfondis') }] : []),
          ]} />
        </div>
        <div data-tour="skilliq-niveaux" className="flex flex-col gap-7">
          {groups.map(([name, list]) => (
            <div key={name}>
              {groups.length > 1 && (
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">
                  {t(name)} <span className="fd-nums font-semibold text-ink-faint/70">· {list.length}</span>
                </h3>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((c) => <ChapterCard key={c.id} name={c.name} cours={stage(c, 'cours')}
                  deep={hasDeep ? stage(c, 'approfondissement') : undefined} />)}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-[13.5px] text-ink-faint">{t('Aucun chapitre dans ce filtre.')}</p>
          )}
          {filter === 'tous' && soon.length > 0 && (
            <ChapterPlan title={t('Sans quiz pour l’instant')} chapters={soon} />
          )}
        </div>
      </Section>

      {children}
    </div>
  );
};
