// « Un autre niveau ? » : les quiz prêts des autres niveaux (cas rare : réviser l'année d'avant, professeur,
// élève sans niveau). Le programme de tous les niveaux n'est chargé qu'à l'ouverture. Chaque chapitre a ses deux quiz
// (31/10/2026) : le quiz du cours et, s'il existe à ce niveau, l'approfondissement.
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Loader2, RotateCcw } from 'lucide-react';
import { getTaxonomy, type TaxonomyLevel } from './api';
import { ChapterListHeader, ChapterRow, type StageProps } from './QuizRow';
import { t } from '@/i18n';
import { isFresh, quizKey, takenOn, type ActiveQuiz, type QuizEnCours, type QuizType, type SkillAssessment } from './types';

type ByLevel = Record<string, Record<string, number>>;

interface Props {
  /** Quiz du cours prêts par niveau : { "<niveau>": { "<chapitre>": nombre } } (un quiz = chapitre + niveau). */
  availableByLevel: ByLevel;
  /** Approfondissements prêts par niveau, même forme. */
  deepByLevel?: ByLevel;
  /** Tous les résultats de l'élève (un par chapitre, niveau et type). */
  mine: SkillAssessment[];
  /** Niveau de l'élève, déjà montré au-dessus. */
  excludeLevelId?: number | null;
  /** Ouvert d'emblée, sans repli (professeur, élève sans niveau). */
  standalone?: boolean;
  /** Un seul niveau, choisi ailleurs (barre de niveaux de la page, 13/10/2026) : pas d'onglets ici. */
  fixedLevelId?: number;
  /** Quiz sortis récemment ({quizKey: date}) : étiquette « Nouveau ». */
  fresh?: Record<string, string>;
  /** Quiz commencés (clé : quizKey) : « Reprendre ». */
  enCours?: Record<string, QuizEnCours>;
  /** `redo` : quiz déjà passé et pas de passage en cours (nouveau tirage). */
  onStart: (q: ActiveQuiz, redo: boolean) => void;
  /** Rouvrir le dernier résultat d'un quiz passé. */
  onView?: (q: ActiveQuiz) => void;
}

/** Niveaux qui ont au moins un quiz prêt (cours ou approfondissement), avec ces chapitres (par matière, sans doublon). */
export function levelsWithQuizzes(levels: TaxonomyLevel[], availableByLevel: ByLevel, deepByLevel: ByLevel = {},
  excludeLevelId?: number | null) {
  return levels
    .filter((l) => l.id !== excludeLevelId)
    .map((l) => {
      const cours = availableByLevel[String(l.id)] ?? {};
      const deep = deepByLevel[String(l.id)] ?? {};
      const subjects = l.subjects.map((s) => {
        const seen = new Set<number>();
        const chapters = s.chapters
          .filter((c) => (cours[String(c.id)] > 0 || deep[String(c.id)] > 0) && !seen.has(c.id) && (seen.add(c.id), true))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        return { ...s, chapters };
      }).filter((s) => s.chapters.length > 0);
      return { ...l, subjects, count: subjects.reduce((n, s) => n + s.chapters.length, 0), hasDeep: Object.values(deep).some((n) => n > 0) };
    })
    .filter((l) => l.count > 0);
}

export const LevelQuizzes: React.FC<Omit<Props, 'standalone'>> = ({
  availableByLevel, deepByLevel = {}, mine, excludeLevelId, fixedLevelId, fresh = {}, enCours = {}, onStart, onView,
}) => {
  const [levels, setLevels] = useState<TaxonomyLevel[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [levelId, setLevelId] = useState<number | null>(fixedLevelId ?? null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { if (fixedLevelId != null) setLevelId(fixedLevelId); }, [fixedLevelId]);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    getTaxonomy().then((l) => { if (alive) setLevels(l); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [attempt]);

  const withQuizzes = useMemo(() => levelsWithQuizzes(levels ?? [], availableByLevel, deepByLevel, excludeLevelId),
    [levels, availableByLevel, deepByLevel, excludeLevelId]);

  if (failed) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
        <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">{t('Les niveaux n’ont pas pu se charger.')}</p>
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="fd-btn-ghost min-h-9"><RotateCcw className="h-4 w-4" /> {t('Réessayer')}</button>
      </div>
    );
  }
  if (!levels) {
    return <p className="flex min-h-12 items-center gap-2 text-[13px] text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /> {t('Chargement des niveaux…')}</p>;
  }
  if (withQuizzes.length === 0) {
    return <p className="text-[13.5px] text-ink-faint">{t('Pas encore de quiz pour les autres niveaux.')}</p>;
  }
  const level = withQuizzes.find((l) => l.id === levelId) ?? withQuizzes[0];

  /** Un des deux quiz d'un chapitre de ce niveau, pour sa ligne. */
  const stage = (c: { id: number; name: string }, subject: string, type: QuizType): StageProps => {
    const taken = takenOn(mine, c.id, level.id, undefined, type);
    const started = enCours[quizKey(level.id, c.id, type)] ?? null;
    const q: ActiveQuiz = { id: c.id, name: c.name, subject, hub_url: taken?.hub_url ?? null, levelId: level.id, type };
    const ready = (type === 'cours' ? availableByLevel : deepByLevel)[String(level.id)]?.[String(c.id)] ?? 0;
    return {
      stage: { ready, taken, fresh: isFresh(fresh[quizKey(level.id, c.id, type)], taken) },
      enCours: started, onStart: () => onStart(q, !!taken && !started), onView: onView && taken ? () => onView(q) : undefined,
    };
  };

  return (
    <div className="flex flex-col gap-4">
      {withQuizzes.length > 1 && fixedLevelId == null && (
        <div role="tablist" aria-label={t('Niveau')} className="flex flex-wrap gap-2">
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
          <ChapterListHeader title={level.subjects.length > 1 ? s.name : null} deep={level.hasDeep} />
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
            {s.chapters.map((c) => (
              <ChapterRow key={c.id} name={c.name} cours={stage(c, s.name, 'cours')}
                deep={level.hasDeep ? stage(c, s.name, 'approfondissement') : undefined} />
            ))}
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
        <span className="min-w-0 flex-1"><b className="font-semibold text-ink">{t('Un autre niveau ?')}</b> · {t('des quiz existent aussi pour d’autres niveaux')}</span>
      </summary>
      {open && <div className="border-t border-line px-4 py-4 sm:px-5"><LevelQuizzes {...props} /></div>}
    </details>
  );
};
