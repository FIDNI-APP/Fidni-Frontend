// « Un autre niveau ? » : les quiz prêts des autres niveaux (cas rare : réviser l'année d'avant, professeur,
// élève sans niveau). Le programme de tous les niveaux n'est chargé qu'à l'ouverture.
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Loader2, RotateCcw } from 'lucide-react';
import { getTaxonomy, type TaxonomyLevel } from './api';
import { QuizRow } from './QuizRow';
import type { ActiveQuiz, SkillAssessment } from './types';

interface Props {
  available: Record<string, number>;
  taken: Map<number, SkillAssessment>;
  /** Niveau de l'élève, déjà montré au-dessus. */
  excludeLevelId?: number | null;
  /** Ouvert d'emblée, sans repli (professeur, élève sans niveau). */
  standalone?: boolean;
  onStart: (q: ActiveQuiz, redo: boolean) => void;
}

const LevelQuizzes: React.FC<Omit<Props, 'standalone'>> = ({ available, taken, excludeLevelId, onStart }) => {
  const [levels, setLevels] = useState<TaxonomyLevel[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [levelId, setLevelId] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    getTaxonomy().then((l) => { if (alive) setLevels(l); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [attempt]);

  // Niveaux qui ont au moins un quiz prêt, avec leurs chapitres prêts (par matière, sans doublon).
  const withQuizzes = useMemo(() => (levels ?? [])
    .filter((l) => l.id !== excludeLevelId)
    .map((l) => {
      const subjects = l.subjects.map((s) => {
        const seen = new Set<number>();
        const chapters = s.chapters.filter((c) => available[String(c.id)] > 0 && !seen.has(c.id) && (seen.add(c.id), true))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        return { ...s, chapters };
      }).filter((s) => s.chapters.length > 0);
      return { ...l, subjects, count: subjects.reduce((n, s) => n + s.chapters.length, 0) };
    })
    .filter((l) => l.count > 0), [levels, available, excludeLevelId]);

  if (failed) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
        <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Les niveaux n’ont pas pu se charger.</p>
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="fd-btn-ghost min-h-9"><RotateCcw className="h-4 w-4" /> Réessayer</button>
      </div>
    );
  }
  if (!levels) {
    return <p className="flex min-h-12 items-center gap-2 text-[13px] text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /> Chargement des niveaux…</p>;
  }
  if (withQuizzes.length === 0) {
    return <p className="text-[13.5px] text-ink-faint">Pas encore de quiz pour les autres niveaux.</p>;
  }
  const level = withQuizzes.find((l) => l.id === levelId) ?? withQuizzes[0];

  return (
    <div className="flex flex-col gap-4">
      {withQuizzes.length > 1 && (
        <div role="tablist" aria-label="Niveau" className="flex flex-wrap gap-2">
          {withQuizzes.map((l) => {
            const on = l.id === level.id;
            return (
              <button key={l.id} type="button" role="tab" aria-selected={on} onClick={() => setLevelId(l.id)}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors ${
                  on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`}>
                {l.name}
                <span className={`fd-nums text-[11.5px] ${on ? 'text-white/70' : 'text-ink-faint'}`}>{l.count}</span>
              </button>
            );
          })}
        </div>
      )}
      {level.subjects.map((s) => (
        <div key={s.id}>
          {level.subjects.length > 1 && <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{s.name}</h3>}
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
            {s.chapters.map((c) => {
              const t = taken.get(c.id) ?? null;
              return (
                <QuizRow key={c.id} name={c.name} ready={available[String(c.id)]} taken={t}
                  onStart={() => onStart({ id: c.id, name: c.name, subject: s.name, hub_url: t?.hub_url ?? null }, !!t)} />
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

export const OtherLevel: React.FC<Props> = ({ standalone = false, ...props }) => {
  const [open, setOpen] = useState(false);
  if (standalone) return <LevelQuizzes {...props} />;
  return (
    <details className="group rounded-2xl border border-line bg-white" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 text-[13.5px] text-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:px-5 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-open:rotate-90" aria-hidden />
        <span className="min-w-0 flex-1"><b className="font-semibold text-ink">Un autre niveau ?</b> · des quiz existent aussi pour d’autres niveaux</span>
      </summary>
      {open && <div className="border-t border-line px-4 py-4 sm:px-5"><LevelQuizzes {...props} /></div>}
    </details>
  );
};
