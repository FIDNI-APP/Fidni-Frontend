// « Mon programme » (08/10/2026) : les chapitres du niveau, ceux à renforcer d'abord, et le détail du
// chapitre choisi à côté (ordinateur) ou juste dessous (téléphone). Un clic sur un autre chapitre change
// le détail directement : plus de fenêtre à fermer avant d'en ouvrir une autre.
// 10/10/2026 : « S'entraîner » ouvre la page du chapitre à son niveau (les plus faciles d'abord, sans les réussis),
// « Le cours » ses leçons ; « Indique ton niveau » mène à la scolarité du profil (plus à l'onboarding, déjà fait).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, ChevronDown, ChevronRight, Clock, RotateCcw } from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { useAuth } from '@/contexts/AuthContext';
import { trackAction } from '@/lib/usage';
import type { ChapterProgress, ChapterStatus } from './types';
import { STATUS } from './status';
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
const RING: Record<ChapterStatus, string> = { mastered: '#1a7a4a', good: '#5fa47f', weak: '#c0892f', started: '#9a958c', todo: '#cfcdc8' };

const byPriority = (a: ChapterProgress, b: ChapterProgress) =>
  (a.mastery ?? 101) - (b.mastery ?? 101) || (b.last_at ?? '').localeCompare(a.last_at ?? '') || a.name.localeCompare(b.name, 'fr');

export function Programme({ chapters, levelName, initial }: { chapters: ChapterProgress[]; levelName: string | null; initial: number | null }) {
  const groups = useMemo(() => GROUPS.map((g) => ({
    ...g, items: chapters.filter((c) => g.statuses.includes(c.status)).sort(byPriority),
  })).filter((g) => g.items.length), [chapters]);
  const ordered = groups.flatMap((g) => g.items);
  const [selected, setSelected] = useState<number | null>(initial ?? ordered[0]?.id ?? null);
  // Téléphone : le détail s'ouvre sous la ligne touchée (aucun ouvert d'office).
  const [expanded, setExpanded] = useState<number | null>(initial);
  const [showTodo, setShowTodo] = useState(() => !!initial && chapters.find((c) => c.id === initial)?.status === 'todo');
  const current = chapters.find((c) => c.id === selected) ?? ordered[0];
  const { user } = useAuth();
  const rowRefs = useRef<Record<number, HTMLLIElement | null>>({});

  // Arrivée avec « ?chapitre=12 » : le chapitre est choisi et amené à l'écran.
  useEffect(() => {
    if (!initial) return;
    const t = window.setTimeout(() => rowRefs.current[initial]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    return () => window.clearTimeout(t);
  }, [initial]);

  const choose = (id: number) => {
    setSelected(id);
    setExpanded((cur) => (cur === id ? null : id));
  };

  if (!chapters.length) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-white px-5 py-8 text-center text-[14px] text-ink-faint">
        Ton programme apparaîtra ici dès tes premiers exercices.{' '}
        <Link to={user ? `/profile/${user.username}/edit#scolarite` : '/complete-profile'} className="font-semibold text-brand-hover hover:underline">Indique ton niveau</Link> pour le voir en entier.
      </section>
    );
  }

  return (
    <section aria-labelledby="mon-programme" data-tour="prog-carte" id="programme" className="scroll-mt-20">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="mon-programme" className="fd-display text-[21px] leading-tight text-ink">Mon programme</h2>
        {levelName && <span className="text-[12.5px] text-ink-faint">{levelName}</span>}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-line bg-white p-2">
          {groups.map((g) => {
            const folded = g.key === 'todo' && !showTodo;
            return (
              <div key={g.key} className="py-1">
                {g.key === 'todo' ? (
                  <button type="button" onClick={() => setShowTodo((v) => !v)} aria-expanded={!folded}
                    className="flex w-full items-center gap-1.5 rounded-lg px-3 pb-1.5 pt-2 text-left text-[11.5px] font-bold uppercase tracking-[.07em] text-ink-faint hover:text-ink">
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${folded ? '' : 'rotate-90'}`} />
                    {g.label} <span className="fd-nums normal-case tracking-normal">· {g.items.length}</span>
                  </button>
                ) : (
                  <p className="px-3 pb-1.5 pt-2 text-[11.5px] font-bold uppercase tracking-[.07em] text-ink-faint">
                    {g.label} <span className="fd-nums normal-case tracking-normal">· {g.items.length}</span>
                  </p>
                )}
                {!folded && (
                  <ul>
                    {g.items.map((c) => (
                      <li key={c.id} ref={(el) => { rowRefs.current[c.id] = el; }}>
                        <Row chapter={c} active={current?.id === c.id} open={expanded === c.id} onClick={() => choose(c.id)} />
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
    </section>
  );
}

function Row({ chapter: c, active, open, onClick }: { chapter: ChapterProgress; active: boolean; open: boolean; onClick: () => void }) {
  const st = STATUS[c.status];
  const Icon = st.icon;
  return (
    <button type="button" onClick={onClick} aria-expanded={open} aria-current={active || undefined}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        active ? 'lg:bg-[#f2f1ee]' : ''} hover:bg-[#f7f6f3]`}>
      <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${c.status === 'todo' ? 'bg-[#f2f1ee]' : st.track}`}>
        <Icon className={`h-3.5 w-3.5 ${st.text}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[14px] font-semibold ${c.status === 'todo' ? 'text-ink-soft' : 'text-ink'}`}>{c.name}</span>
        <span className="block truncate text-[12px] text-ink-faint">{c.subfield}</span>
      </span>
      <span className={`fd-nums shrink-0 text-[13px] font-bold ${st.text}`}>
        {c.mastery !== null ? `${c.mastery} %` : c.status === 'started' ? 'commencé' : ''}
      </span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform lg:hidden ${open ? 'rotate-180' : ''}`} />
      <ChevronRight className={`hidden h-4 w-4 shrink-0 transition-colors lg:block ${active ? 'text-ink' : 'text-[#cfcdc8] group-hover:text-ink-faint'}`} />
    </button>
  );
}

/** Le détail d'un chapitre : sa maîtrise, ce qui reste à travailler, et quoi faire maintenant. */
export function ChapterDetail({ chapter: c, compact = false }: { chapter: ChapterProgress; compact?: boolean }) {
  const st = STATUS[c.status];
  const source = c.self_pct !== null && c.skilliq?.pct != null
    ? `D’après ${plural(c.questions, 'question évaluée', 'questions évaluées')} et ton quiz Skill IQ.`
    : c.self_pct !== null ? `D’après ${plural(c.questions, 'question évaluée', 'questions évaluées')}.`
      : c.skilliq ? 'D’après ton quiz Skill IQ. Évalue aussi tes réponses aux exercices pour l’affiner.'
        : c.questions ? `${plural(c.questions, 'question évaluée', 'questions évaluées')} : encore un peu et tu auras ton pourcentage.`
          : 'Pas encore travaillé.';
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
        <ProgressRing percentage={c.mastery ?? 0} size={compact ? 58 : 68} strokeWidth={6} progressColor={RING[c.status]} trackColor="#efece6">
          <span className="fd-nums text-[15px] font-bold text-ink">{c.mastery !== null ? `${c.mastery}%` : '—'}</span>
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
          <ul className="mt-2 flex flex-col gap-2">
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
          <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink"><RotateCcw className="h-3.5 w-3.5 text-[#a23b34]" /> À revoir</h4>
          <ul className="mt-1.5 flex flex-col gap-1">
            {c.review.map((r) => (
              <li key={r.id}>
                <Link to={r.url} className="block truncate rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink underline decoration-line underline-offset-2 hover:bg-[#f7f6f3]">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {facts.length > 0 && (
        <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-ink-faint"><Clock className="h-3.5 w-3.5" /> {facts.join(' · ')}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link to={practiceUrl(c.hub_url, c.id)} onClick={() => trackAction('prog-entrainer')} className="fd-btn-primary" style={{ minHeight: 40 }}>
          S’entraîner <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to={lessonsUrl(c.hub_url, c.id)} onClick={() => trackAction('prog-cours')} className="fd-btn-ghost" style={{ minHeight: 40 }}><BookOpen className="h-4 w-4" /> Le cours</Link>
        {c.quiz_ready && (
          <Link to={quizUrl(c.id)} onClick={() => trackAction('prog-quiz')} className="fd-btn-ghost" style={{ minHeight: 40 }}><Brain className="h-4 w-4" /> {c.skilliq ? 'Refaire le quiz' : 'Quiz'}</Link>
        )}
      </div>
    </div>
  );
}
