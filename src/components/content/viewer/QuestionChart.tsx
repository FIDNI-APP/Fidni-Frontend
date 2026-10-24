/**
 * « Question par question » (15/10/2026) : l'histogramme de l'ancien onglet « Activité », remis dans la page, en
 * vertical dans la colonne de droite (examen : à la place de « Ta copie », dont il garde la note). Une ligne par
 * question : la part d'élèves qui la réussissent (barre verte, or sous 50 %) et le résultat de l'élève (pastille). Un clic sur
 * une ligne la déplie (le détail, « Aller à la question ») ; au bout de chaque ligne, les boutons rapides Réussi /
 * (En partie, examen) / À revoir : s'évaluer en un clic, sans ouvrir la solution. Dès la 1re évaluation (25/10/2026) : un compte « 2/3 » tant qu'il y en a
 * peu, un pourcentage à partir de 5 ; comptes de l'équipe exclus.
 */
import React, { useMemo, useState } from 'react';
import { ArrowDown, Check, Contrast, RotateCcw } from 'lucide-react';
import type { AssessmentStatus } from '@/types/content';
import { questionNumbering } from '@/lib/reportTargets';
import { questionAnchor } from './ExerciseRenderer';
import { useQuestionStats } from './questionStats';
import { t } from '@/i18n';

// En dessous, « 2/3 » plutôt qu'un pourcentage trompeur (« 100 % » pour un seul élève).
const POURCENT_DES = 5;

const STATUS: Partial<Record<AssessmentStatus, { label: string; icon: React.ElementType; dot: string; hover: string }>> = {
  success: { label: 'Réussi', icon: Check, dot: 'bg-brand text-white', hover: 'hover:border-brand-line hover:text-brand-hover' },
  partial: { label: 'En partie', icon: Contrast, dot: 'bg-[#a8a196] text-white', hover: 'hover:border-[#cfc9bf] hover:text-ink' },
  review: { label: 'À revoir', icon: RotateCcw, dot: 'bg-gold text-white', hover: 'hover:border-gold-line hover:text-gold-strong' },
};

// Anciens statuts : « failed » se lit « À revoir », « partial » aussi quand « En partie » n'est pas proposé.
const shown = (s: AssessmentStatus | undefined, options: AssessmentStatus[]) =>
  (s && !options.includes(s) && (s === 'failed' || s === 'partial') ? 'review' : s);

export const QuestionChart: React.FC<{
  structure: unknown;
  progress: Record<string, AssessmentStatus | undefined>;
  options: AssessmentStatus[];
  /** Choisir un résultat (re-choisir l'actif l'efface) ; visiteur : ouvre la connexion (ContentDetail). */
  onAssess?: (path: string, s: AssessmentStatus) => void;
  /** Examen : points obtenus / barème d'une partie (titre de partie de questionNumbering). */
  partScore?: (part: string) => string | null;
  /** Au-dessus de l'histogramme (examen : la note estimée). */
  header?: React.ReactNode;
  tour?: string;
}> = ({ structure, progress, options, onAssess, partScore, header, tour = 'reussite' }) => {
  const stats = useQuestionStats();
  const rows = useMemo(() => questionNumbering(structure), [structure]);
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return null;

  const rate = (path: string) => {
    const s = stats?.[path];
    return s && s.total >= 1 ? Math.round((s.success / s.total) * 100) : null;
  };
  // La plus ratée (au moins POURCENT_DES évaluations, et vraiment ratée) : un repère, pas un classement.
  const known = rows.map((r) => ({ path: r.path, p: (stats?.[r.path]?.total ?? 0) >= POURCENT_DES ? rate(r.path) : null }))
    .filter((x) => x.p !== null) as { path: string; p: number }[];
  const trap = known.length > 1 ? known.reduce((a, b) => (b.p < a.p ? b : a)) : null;
  const trapPath = trap && trap.p < 50 ? trap.path : null;
  const grouped = rows.some((r) => r.part) && new Set(rows.map((r) => r.part)).size > 1;

  const goTo = (path: string) => document.getElementById(questionAnchor(path))?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div className="rounded-2xl border border-line bg-white p-5" data-tour={tour}>
      {header}
      <div className={header ? 'mt-4 border-t border-line pt-4' : ''}>
        <p className="text-[11px] font-bold uppercase tracking-[.1em] text-ink-faint">{t('Question par question')}</p>
        <ol className="mt-3 flex flex-col">
          {rows.map((r, i) => {
            const p = rate(r.path);
            const s = stats?.[r.path];
            const peu = !!s && s.total < POURCENT_DES;
            const mine = shown(progress[r.path], options);
            const m = mine ? STATUS[mine] : undefined;
            const isOpen = open === r.path;
            const newPart = grouped && r.part && r.part !== rows[i - 1]?.part;
            const score = newPart && partScore ? partScore(r.part!) : null;
            return (
              <li key={r.path}>
                {newPart && (
                  <p className={`flex items-baseline justify-between gap-2 px-1 pb-1 text-[12px] font-semibold text-ink ${i ? 'mt-3' : ''}`}>
                    <span className="truncate">{r.part}</span>
                    {score && <span className="shrink-0 font-normal text-ink-faint fd-nums">{score}</span>}
                  </p>
                )}
                {/* La ligne : un clic déplie le détail ; au bout, les boutons rapides (un clic pour s'évaluer). */}
                <div className={`flex items-center gap-1.5 rounded-lg pe-1 transition-colors ${isOpen ? 'bg-[#f2f1ee]' : 'hover:bg-[#f7f6f3]'}`}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.path)}
                    title={p === null ? t('Question {num}', { num: r.num }) : peu
                      ? t('{r} élève(s) sur {n} réussissent la question {num}', { r: s!.success, n: s!.total, num: r.num })
                      : t('{p} % des élèves réussissent la question {num}', { p, num: r.num })}
                    className="grid min-w-0 flex-1 grid-cols-[2.25rem_minmax(0,1fr)_2.5rem] items-center gap-2 rounded-lg py-1.5 ps-1 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                    <span className="text-[12.5px] font-medium text-ink-soft fd-nums">{r.num}</span>
                    <span className="block h-2 overflow-hidden rounded-full bg-[#f2f1ee]" aria-hidden>
                      {p !== null && <span className={`block h-full rounded-full ${p >= 50 ? 'bg-brand' : 'bg-gold'}`} style={{ width: `${Math.max(p, 3)}%` }} />}
                    </span>
                    <span dir="ltr" className="text-end text-[12px] text-ink-faint fd-nums">{p === null ? '—' : peu ? `${s!.success}/${s!.total}` : `${p} %`}</span>
                  </button>
                  {onAssess ? (
                    <span role="group" aria-label={t('As-tu réussi la question {num} ?', { num: r.num })} className="flex shrink-0 items-center gap-1">
                      {options.map((st) => {
                        const o = STATUS[st];
                        if (!o) return null;
                        const active = mine === st;
                        return (
                          <button key={st} type="button" aria-pressed={active} aria-label={t('{label} (question {num})', { label: t(o.label), num: r.num })} title={t(o.label)}
                            onClick={() => onAssess(r.path, active && progress[r.path] ? progress[r.path]! : st)}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:w-8 ${
                              active ? `${o.dot} border-transparent` : `border-line bg-white text-[#b9b3a8] ${o.hover}`}`}>
                            <o.icon className="h-3 w-3" strokeWidth={active ? 3 : 2.25} aria-hidden />
                          </button>
                        );
                      })}
                    </span>
                  ) : m ? (
                    <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${m.dot}`} aria-label={t('Ton résultat : {label}', { label: t(m.label) })}>
                      <m.icon className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                    </span>
                  ) : null}
                </div>

                {isOpen && (
                  <div className="mb-1.5 mt-1 rounded-lg bg-[#faf9f7] px-2.5 py-2.5">
                    <p className="text-[12.5px] leading-snug text-ink-soft">
                      {p === null
                        ? t('Personne ne s’est encore évalué sur cette question.')
                        : peu
                          ? <><b className="text-ink fd-nums">{s!.success}/{s!.total}</b> {t('élèves la réussissent pour l’instant')}</>
                          : <><b className="text-ink fd-nums">{p} %</b> {t('des élèves la réussissent')} <span className="text-ink-faint fd-nums">{t('({n} évaluations)', { n: s!.total })}</span></>}
                    </p>
                    {trapPath === r.path && <p className="mt-0.5 text-[12px] text-gold-strong">{t('La plus ratée : prends ton temps.')}</p>}
                    <button type="button" onClick={() => goTo(r.path)}
                      className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-ink-faint hover:text-brand-hover">
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden /> {t('Aller à la question')}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};
