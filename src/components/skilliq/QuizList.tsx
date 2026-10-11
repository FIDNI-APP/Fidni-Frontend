// Des quiz sont prêts pour le niveau de l'élève : le prochain à passer (le chapitre le plus fragile pas encore
// testé), puis tous les quiz du niveau rangés par sous-domaine, et les chapitres qui n'en ont pas encore (repliés).
import React from 'react';
import { ArrowRight, CheckCircle2, Circle, CircleDashed, Clock, Play, RotateCcw, Target, TrendingUp } from 'lucide-react';
import { Section, StatTile } from '@/components/space/Page';
import type { ChapterStatus } from '@/pages/progression/types';
import { ChapterPlan } from './ChapterPlan';
import { QuizRow, ScoreRing } from './QuizRow';
import { bySubfield, estMinutes, pct, quizSize, type QuizChapter } from './types';
import type { QuizChapters } from './useQuizChapters';

const REASON: Record<ChapterStatus, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  weak: { label: 'À renforcer d’après tes exercices', icon: Target, cls: 'bg-gold-soft text-gold-strong' },
  started: { label: 'Chapitre commencé', icon: CircleDashed, cls: 'bg-[#f2f1ee] text-ink-soft' },
  todo: { label: 'Pas encore travaillé', icon: Circle, cls: 'bg-[#f2f1ee] text-ink-soft' },
  good: { label: 'En bonne voie : vérifie-le', icon: TrendingUp, cls: 'bg-brand-soft text-brand-hover' },
  mastered: { label: 'Maîtrisé : confirme-le', icon: CheckCircle2, cls: 'bg-brand-soft text-brand-hover' },
};

/** Le quiz à passer maintenant (ou, tous passés, celui à refaire). */
const NextQuizCard: React.FC<{ chapter: QuizChapter; onStart: () => void }> = ({ chapter, onStart }) => {
  const taken = chapter.taken;
  const reason = REASON[chapter.status];
  const ReasonIcon = reason.icon;
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="flex min-w-0 items-start gap-4 sm:flex-1">
          {/* Repère visuel (ordinateur) ; sur téléphone, le texte prend toute la largeur. */}
          <span className="hidden sm:block">
            {taken ? <ScoreRing value={pct(taken)} size={56} /> : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-hover ring-1 ring-brand-line" aria-hidden>
                <Play className="h-6 w-6" />
              </span>
            )}
          </span>
          <div className="min-w-0">
            {taken ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-0.5 text-[12px] font-semibold text-gold-strong">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Ton score le plus bas : <span className="fd-nums">{pct(taken)} %</span>
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${reason.cls}`}>
                <ReasonIcon className="h-3.5 w-3.5" aria-hidden /> {reason.label}
              </span>
            )}
            <h3 className="fd-display mt-2 text-[22px] leading-tight text-ink sm:text-[24px]">{chapter.name}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-faint">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              <span className="fd-nums">{quizSize(chapter.ready)} questions · environ {estMinutes(chapter.ready)} min</span>
              {chapter.subfield && <span>· {chapter.subfield}</span>}
            </p>
          </div>
        </div>
        <button type="button" onClick={onStart} className="fd-btn-primary min-h-11 w-full justify-center text-[14px] sm:w-auto">
          {taken ? 'Refaire le quiz' : 'Commencer le quiz'} <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="border-t border-line bg-[#fcfbf9] px-5 py-2.5 text-[12.5px] text-ink-faint sm:px-6">
        Corrigé à la fin, avec les explications. Ton score s’ajoute à Ma progression.
      </p>
    </div>
  );
};

export const QuizList: React.FC<{
  data: QuizChapters;
  onStart: (c: QuizChapter) => void;
  children?: React.ReactNode;
}> = ({ data, onStart, children }) => {
  const { ready, soon, next, redo, mine, level } = data;
  const featured = next ?? redo;
  const doneHere = ready.filter((c) => c.taken);
  const average = mine.length ? Math.round(mine.reduce((s, a) => s + pct(a), 0) / mine.length) : null;
  // Le prochain quiz est déjà mis en avant : la liste reprend tous les quiz, groupés comme le programme.
  const groups = bySubfield(ready);

  return (
    <div className="flex flex-col gap-10">
      {mine.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <StatTile label="Quiz faits" value={mine.length} />
          <StatTile label="Moyenne" value={average !== null ? `${average} %` : '—'} />
          <StatTile label="À passer" value={ready.length - doneHere.length} hint={`sur ${ready.length} prêt${ready.length > 1 ? 's' : ''}`} />
        </div>
      )}

      {featured && (
        <Section id="prochain-quiz" title={next ? 'Ton prochain quiz' : 'À refaire'}
          hint={next ? undefined : 'Tu as passé tous les quiz de ton niveau : refais le moins réussi.'}>
          <NextQuizCard chapter={featured} onStart={() => onStart(featured)} />
        </Section>
      )}

      <Section id="tous-les-quiz" title="Tous les quiz de ton niveau" count={ready.length}
        hint={level ? `${level.name} · rangés par thème` : undefined}>
        <div data-tour="skilliq-niveaux" className="flex flex-col gap-5">
          {groups.map(([name, list]) => (
            <div key={name}>
              {groups.length > 1 && <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{name}</h3>}
              <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
                {list.map((c) => <QuizRow key={c.id} name={c.name} ready={c.ready} taken={c.taken} onStart={() => onStart(c)} />)}
              </ul>
            </div>
          ))}
          {soon.length > 0 && (
            <ChapterPlan title="Bientôt" meta={`chapitre${soon.length > 1 ? 's' : ''} sans quiz pour l’instant`} chapters={soon} />
          )}
        </div>
      </Section>

      {children}
    </div>
  );
};
