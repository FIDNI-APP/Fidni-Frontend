// « Mon programme » : les chapitres du niveau, ceux à renforcer d'abord, et le détail du chapitre choisi à côté
// (ordinateur) ou juste dessous (téléphone, en accordéon). Un clic sur un autre chapitre change le détail.
// 10/10/2026 : « S'entraîner » ouvre la page du chapitre à son niveau (les plus faciles d'abord, sans les réussis),
// « Le cours » ses leçons.
// 11/10/2026 (refonte) : groupes en titres simples, lignes plus aérées avec une jauge, « Pas encore commencés »
// replié seulement s'il y a d'autres groupes ; rien de travaillé : le programme rangé par domaine. Le chapitre
// choisi d'office est celui du « prochain pas » ; `focus` (bouton « Voir le détail », notions, temps) le change.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, ChevronDown, ChevronRight, Clock, RotateCcw } from 'lucide-react';
import { Section } from '@/components/space/Page';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { trackAction } from '@/lib/usage';
import type { ChapterProgress, ChapterStatus } from './types';
import { RING, STATUS } from './status';
import { Meter } from './ui';
import { daysAgo, duration, plural } from './format';
import { lessonsUrl, practiceUrl, quizUrl } from './links';

// Ordre de travail : ce qui est à renforcer d'abord, puis ce qui est en cours, puis ce qui est acquis.
const GROUPS: { key: string; label: string; statuses: ChapterStatus[] }[] = [
  { key: 'weak', label: 'À renforcer', statuses: ['weak'] },
  { key: 'doing', label: 'En cours', statuses: ['good', 'started'] },
  { key: 'mastered', label: 'Maîtrisés', statuses: ['mastered'] },
  { key: 'todo', label: 'Pas encore commencés', statuses: ['todo'] },
];

const byPriority = (a: ChapterProgress, b: ChapterProgress) =>
  (a.mastery ?? 101) - (b.mastery ?? 101) || (b.last_at ?? '').localeCompare(a.last_at ?? '') || a.name.localeCompare(b.name, 'fr');

export interface Focus { id: number; at: number }

export function Programme({ chapters, levelName, preferred, focus, levelLink }: {
  chapters: ChapterProgress[];
  levelName: string | null;
  /** Chapitre montré d'office (celui du prochain pas). */
  preferred: number | null;
  /** Chapitre demandé (« ?chapitre= », « Voir le détail ») : choisi, ouvert et amené à l'écran. */
  focus: Focus | null;
  levelLink: string;
}) {
  const fresh = chapters.every((c) => c.status === 'todo');
  const groups = useMemo(() => {
    if (fresh) {
      // Rien de travaillé : le programme par domaine (Algèbre, Analyse…), dans l'ordre du serveur.
      const names = [...new Set(chapters.map((c) => c.subfield))];
      return names.map((n) => ({ key: n, label: n, items: chapters.filter((c) => c.subfield === n) }));
    }
    return GROUPS.map((g) => ({ key: g.key, label: g.label, items: chapters.filter((c) => g.statuses.includes(c.status)).sort(byPriority) }))
      .filter((g) => g.items.length);
  }, [chapters, fresh]);
  const ordered = groups.flatMap((g) => g.items);
  const [selected, setSelected] = useState<number | null>(focus?.id ?? preferred ?? ordered[0]?.id ?? null);
  // Téléphone : le détail s'ouvre sous la ligne touchée (aucun ouvert d'office).
  const [expanded, setExpanded] = useState<number | null>(focus?.id ?? null);
  const foldable = !fresh && groups.length > 1;
  const [showTodo, setShowTodo] = useState(() => !!focus && chapters.find((c) => c.id === focus.id)?.status === 'todo');
  const current = chapters.find((c) => c.id === selected) ?? ordered[0];
  const rowRefs = useRef<Record<number, HTMLLIElement | null>>({});

  // Chapitre demandé : choisi, ouvert (téléphone), déplié s'il est replié, puis amené à l'écran.
  useEffect(() => {
    if (!focus) return;
    setSelected(focus.id);
    setExpanded(focus.id);
    if (chapters.find((c) => c.id === focus.id)?.status === 'todo') setShowTodo(true);
    const t = window.setTimeout(() => rowRefs.current[focus.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const choose = (id: number) => {
    setSelected(id);
    setExpanded((cur) => (cur === id ? null : id));
  };

  const hint = !levelName
    ? <>Les chapitres que tu as travaillés. <Link to={levelLink} className="font-semibold text-brand-hover hover:underline">Indique ta classe</Link> pour voir tout ton programme.</>
    : fresh ? `${levelName} · touche un chapitre pour savoir par où commencer.`
      : `${levelName} · touche un chapitre pour voir où tu en es.`;

  return (
    <div data-tour="prog-carte">
      <Section id="programme" title="Mon programme" count={chapters.length} hint={hint}>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="rounded-2xl border border-line bg-white p-2">
            {groups.map((g, gi) => {
              const isTodo = g.key === 'todo' && foldable;
              const folded = isTodo && !showTodo;
              return (
                <div key={g.key} className={gi ? 'mt-1 border-t border-line pt-1' : ''}>
                  {isTodo ? (
                    <button type="button" onClick={() => setShowTodo((v) => !v)} aria-expanded={!folded}
                      className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-[13px] font-semibold text-ink-soft transition-colors hover:bg-[#f7f6f3] hover:text-ink">
                      {g.label} <Count n={g.items.length} />
                      <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-faint">
                        {folded ? 'Afficher' : 'Masquer'}
                        <ChevronDown className={`h-4 w-4 transition-transform ${folded ? '' : 'rotate-180'}`} />
                      </span>
                    </button>
                  ) : (
                    <h3 className="flex items-center gap-2 px-3 pb-1 pt-2.5 text-[13px] font-semibold text-ink-soft">
                      {g.label} <Count n={g.items.length} />
                    </h3>
                  )}
                  {!folded && (
                    <ul>
                      {g.items.map((c) => (
                        <li key={c.id} ref={(el) => { rowRefs.current[c.id] = el; }} className="scroll-mt-24">
                          <Row chapter={c} plain={fresh} active={current?.id === c.id} open={expanded === c.id} onClick={() => choose(c.id)} />
                          {expanded === c.id && (
                            <div className="mx-1 mb-2 mt-1 rounded-xl border border-line bg-[#fcfbf9] p-4 lg:hidden">
                              <ChapterDetail chapter={c} compact />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          {current && (
            <aside aria-label={`Détail : ${current.name}`} className="sticky top-[76px] hidden rounded-2xl border border-line bg-white p-5 lg:block xl:p-6">
              <ChapterDetail chapter={current} />
            </aside>
          )}
        </div>
      </Section>
    </div>
  );
}

const Count = ({ n }: { n: number }) => (
  <span className="fd-nums rounded-full bg-[#f2f1ee] px-1.5 text-[11.5px] font-semibold text-ink-faint">{n}</span>
);

function Row({ chapter: c, plain, active, open, onClick }: {
  chapter: ChapterProgress; plain: boolean; active: boolean; open: boolean; onClick: () => void;
}) {
  const st = STATUS[c.status];
  const Icon = st.icon;
  const sub = plain ? (c.contents ? plural(c.contents, 'exercice', 'exercices') : 'Pas encore d’exercice') : c.subfield;
  return (
    <button type="button" onClick={onClick} aria-expanded={open} aria-current={active || undefined}
      className={`group flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[#f7f6f3] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        active ? 'lg:bg-[#f2f1ee] lg:hover:bg-[#f2f1ee]' : ''}`}>
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${st.track}`} aria-hidden>
        <Icon className={`h-4 w-4 ${st.text}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[14.5px] font-semibold ${c.status === 'todo' && !plain ? 'text-ink-soft' : 'text-ink'}`}>{c.name}</span>
        <span className="block truncate text-[12px] text-ink-faint">
          {sub}<span className="sr-only"> · {st.label}</span>
        </span>
      </span>
      {c.mastery !== null ? (
        <span className="flex shrink-0 items-center gap-2.5">
          <Meter pct={c.mastery} status={c.status} className="hidden w-14 sm:block" />
          <span className={`fd-nums w-10 text-right text-[13px] font-bold ${st.text}`}>{c.mastery} %</span>
        </span>
      ) : c.status === 'started' ? <span className="shrink-0 text-[12px] text-ink-faint">commencé</span> : null}
      <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform lg:hidden ${open ? 'rotate-180' : ''}`} />
      <ChevronRight className={`hidden h-4 w-4 shrink-0 transition-colors lg:block ${active ? 'text-ink' : 'text-[#cfcdc8] group-hover:text-ink-faint'}`} />
    </button>
  );
}

/** Le détail d'un chapitre : sa maîtrise, ce qui reste à travailler, et quoi faire maintenant. */
export function ChapterDetail({ chapter: c, compact = false }: { chapter: ChapterProgress; compact?: boolean }) {
  const st = STATUS[c.status];
  const evaluated = plural(c.questions, 'question évaluée', 'questions évaluées');
  const source = c.self_pct !== null && c.skilliq?.pct != null ? `D’après ${evaluated} et ton quiz du chapitre.`
    : c.self_pct !== null ? `D’après ${evaluated}.`
      : c.skilliq ? 'D’après ton quiz du chapitre. Évalue aussi tes réponses aux exercices pour l’affiner.'
        : c.questions ? `${evaluated} : encore un peu et tu auras ton pourcentage.`
          : c.status === 'started' ? 'Dis pour chaque question si tu l’as réussie : tu verras où tu en es.'
            : 'Commence par les exercices les plus faciles, ou par le cours.';
  const facts = [
    c.contents ? `${c.done} / ${plural(c.contents, 'exercice réussi', 'exercices réussis')}` : null,
    c.seconds ? `${duration(c.seconds)} de travail` : null,
    c.skilliq?.pct != null ? `quiz : ${c.skilliq.pct} %` : null,
  ].filter(Boolean);

  return (
    <div>
      {!compact && (
        <>
          <p className="text-[11.5px] font-bold uppercase tracking-[.07em] text-ink-faint">{c.subfield}</p>
          <h3 className="fd-display mt-1 text-[22px] leading-tight text-ink">{c.name}</h3>
        </>
      )}
      <div className={`flex items-center gap-4 ${compact ? '' : 'mt-4'}`}>
        <ProgressRing percentage={c.mastery ?? 0} size={compact ? 56 : 64} strokeWidth={6} progressColor={RING[c.status]} trackColor="#efece6">
          <span className="fd-nums text-[14px] font-bold text-ink">{c.mastery !== null ? `${c.mastery}%` : '—'}</span>
        </ProgressRing>
        <div className="min-w-0">
          <p className={`text-[14px] font-semibold ${st.text}`}>
            {st.label}{c.last_at && <span className="font-normal text-ink-faint"> · travaillé {daysAgo(c.last_at)}</span>}
          </p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-faint">{source}</p>
        </div>
      </div>

      {c.notions.worst.length > 0 && (
        <div className="mt-5">
          <h4 className="text-[13px] font-semibold text-ink">À retravailler</h4>
          <ul className="mt-2 flex flex-col gap-2.5">
            {c.notions.worst.map((n) => (
              <li key={n.label}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate text-ink-soft">{n.label}</span>
                  <span className="fd-nums shrink-0 font-semibold text-[#8a6318]">{n.pct} %</span>
                </div>
                <Meter pct={n.pct} status="weak" className="mt-1" />
              </li>
            ))}
          </ul>
        </div>
      )}
      {c.notions.best.length > 0 && (
        <p className="mt-4 text-[13px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-brand-hover">Tu réussis :</span> {c.notions.best.map((n) => n.label).join(', ')}
        </p>
      )}
      {c.review.length > 0 && (
        <div className="mt-4">
          <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink"><RotateCcw className="h-3.5 w-3.5 text-gold-strong" /> À revoir</h4>
          <ul className="mt-1 flex flex-col">
            {c.review.map((r) => (
              <li key={r.id}>
                <Link to={r.url} className="flex min-h-10 items-center rounded-lg px-2 text-[13px] font-medium text-ink underline decoration-line underline-offset-2 hover:bg-[#f7f6f3]">
                  <span className="truncate">{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {facts.length > 0 && (
        <p className="mt-4 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-ink-faint"><Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {facts.join(' · ')}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link to={practiceUrl(c.hub_url, c.id)} onClick={() => trackAction('prog-entrainer')} className="fd-btn-primary min-h-10">
          S’entraîner <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to={lessonsUrl(c.hub_url, c.id)} onClick={() => trackAction('prog-cours')} className="fd-btn-ghost min-h-10">
          <BookOpen className="h-4 w-4" /> Le cours
        </Link>
        {c.quiz_ready && (
          <Link to={quizUrl(c.id)} onClick={() => trackAction('prog-quiz')} className="fd-btn-ghost min-h-10">
            <Brain className="h-4 w-4" /> {c.skilliq ? 'Refaire le quiz' : 'Passer le quiz'}
          </Link>
        )}
      </div>
    </div>
  );
}
