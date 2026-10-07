// Détail d'un chapitre (clic sur la carte, les points forts / à renforcer ou le temps par chapitre) :
// sa maîtrise et d'où elle vient, les notions réussies ou pas, le temps passé, ce qui est réussi ou à
// revoir, et quoi faire ensuite.
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, Clock, RotateCcw, X } from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import type { ChapterProgress } from './types';
import { STATUS } from './status';
import { Meter } from './ui';
import { daysAgo, duration, plural, shortDate } from './format';

const QUIZ_LEVEL: Record<string, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé', expert: 'Expert' };

export function ChapterDrawer({ chapter: c, onClose }: { chapter: ChapterProgress; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const st = STATUS[c.status];
  const Icon = st.icon;
  const ringColor = c.status === 'weak' ? '#c0892f' : c.status === 'good' ? '#4fa077' : '#1a7a4a';
  const source = c.self_pct !== null && c.skilliq?.pct != null
    ? `Calculée sur ${plural(c.questions, 'question évaluée', 'questions évaluées')} (60 %) et ton quiz Skill IQ (40 %).`
    : c.self_pct !== null ? `Calculée sur ${plural(c.questions, 'question évaluée', 'questions évaluées')}.`
      : c.skilliq ? 'Calculée sur ton quiz Skill IQ : évalue aussi tes réponses aux exercices pour l’affiner.'
        : c.questions ? `${plural(c.questions, 'question évaluée', 'questions évaluées')} : il en faut au moins 3 pour un pourcentage.`
          : 'Pas encore de résultat sur ce chapitre.';

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="chapitre-titre">
      <div className="absolute inset-0 bg-[rgba(20,18,16,.35)]" onClick={onClose} />
      <aside className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[440px] sm:rounded-none">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{c.subfield}</p>
            <h2 id="chapitre-titre" className="fd-display mt-0.5 text-[20px] leading-tight text-ink">{c.name}</h2>
            <p className={`mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold ${st.text}`}>
              <Icon className="h-3.5 w-3.5" /> {st.label}
              {c.last_at && <span className="font-normal text-ink-faint">· travaillé {daysAgo(c.last_at)}</span>}
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-5 py-5">
          {/* Maîtrise et d'où elle vient */}
          <div className="flex items-center gap-4">
            <ProgressRing percentage={c.mastery ?? 0} size={76} strokeWidth={7} progressColor={ringColor} trackColor="#efece6">
              <span className="text-[18px] font-bold text-ink">{c.mastery !== null ? `${c.mastery} %` : '—'}</span>
            </ProgressRing>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink">Maîtrise du chapitre</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-faint">{source}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <Fact label="Auto-évaluation" value={c.self_pct !== null ? `${c.self_pct} %` : '—'}
              sub={c.questions ? plural(c.questions, 'question', 'questions') : 'aucune question évaluée'} />
            <Fact label="Quiz Skill IQ" value={c.skilliq?.pct != null ? `${c.skilliq.pct} %` : '—'}
              sub={c.skilliq ? `${QUIZ_LEVEL[c.skilliq.level] ?? c.skilliq.level} · ${shortDate(c.skilliq.date)}` : c.quiz_ready ? 'pas encore passé' : 'quiz en préparation'} />
            <Fact label="Temps passé" value={c.seconds ? duration(c.seconds) : '—'} icon={<Clock className="h-3.5 w-3.5" />} />
            <Fact label="Exercices réussis" value={c.contents ? `${c.done} / ${c.contents}` : String(c.done)}
              sub={c.contents ? 'exercices et examens du chapitre' : undefined} />
          </dl>

          {(c.notions.best.length > 0 || c.notions.worst.length > 0) && (
            <div className="flex flex-col gap-4">
              {c.notions.best.length > 0 && (
                <Notions title="Ce que tu réussis" items={c.notions.best} status={c.notions.best[0].pct >= 80 ? 'mastered' : 'good'} />
              )}
              {c.notions.worst.length > 0 && <Notions title="À retravailler" items={c.notions.worst} status="weak" />}
            </div>
          )}

          {c.review.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                <RotateCcw className="h-3.5 w-3.5 text-[#a23b34]" /> Marqués « à revoir »
              </h3>
              <ul className="flex flex-col gap-1.5">
                {c.review.map((r) => (
                  <li key={r.id}>
                    <Link to={r.url} className="block truncate rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink hover:bg-[#faf9f7]">
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Et maintenant ? */}
          <div className="flex flex-col gap-2 border-t border-line pt-5">
            <Link to={`/exercises?chapters=${c.id}`} className="fd-btn-primary w-full justify-center">
              S’entraîner sur ce chapitre <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link to={`/lessons?chapters=${c.id}`} className="fd-btn-ghost justify-center">
                <BookOpen className="h-4 w-4" /> Le cours
              </Link>
              {c.quiz_ready ? (
                <Link to={`/skill-iq?chapitre=${c.id}`} className="fd-btn-ghost justify-center">
                  <Brain className="h-4 w-4" /> {c.skilliq ? 'Refaire le quiz' : 'Passer le quiz'}
                </Link>
              ) : (
                <span className="fd-btn-ghost cursor-default justify-center opacity-60" title="Le quiz de ce chapitre est en préparation">
                  <Brain className="h-4 w-4" /> Quiz bientôt
                </span>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Fact({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-[#faf9f7] px-3.5 py-3">
      <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[.06em] text-ink-faint">{icon}{label}</dt>
      <dd className="mt-1 text-[19px] font-bold leading-tight text-ink">{value}</dd>
      {sub && <dd className="mt-0.5 text-[11.5px] text-ink-faint">{sub}</dd>}
    </div>
  );
}

function Notions({ title, items, status }: { title: string; items: { label: string; pct: number; questions: number }[]; status: 'mastered' | 'good' | 'weak' }) {
  return (
    <div>
      <h3 className="mb-2 text-[13px] font-semibold text-ink">{title}</h3>
      <ul className="flex flex-col gap-2.5">
        {items.map((n) => (
          <li key={n.label}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-ink-soft">{n.label}</span>
              <span className="shrink-0 font-semibold text-ink">{n.pct} %
                <span className="ml-1 font-normal text-ink-faint">· {plural(n.questions, 'question', 'questions')}</span>
              </span>
            </div>
            <Meter pct={n.pct} status={status} className="mt-1" />
          </li>
        ))}
      </ul>
    </div>
  );
}
