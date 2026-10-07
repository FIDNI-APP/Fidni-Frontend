/**
 * ActivitySection — onglet « Activité » d'un exercice / examen (refait le 06/10/2026).
 *
 * Trois cartes, dans l'ordre des questions que se pose l'élève :
 *  1. Ton bilan             — anneau de tes questions (réussies / en partie / à revoir), comparé aux élèves ;
 *                             sans auto-évaluation : une invitation à cocher ses questions (plus de verrou).
 *  2. Question par question — une colonne par question (part des élèves qui la réussissent) ; on clique
 *                             une colonne pour le détail et pour revenir à la question.
 *  3. Les autres élèves     — combien ont terminé, réussite, temps (répartition).
 *  (+ Tes notions, quand il y a des auto-évaluations.)
 * Que des chiffres enregistrés ; palette encre / vert / or, rouge doux réservé à « à revoir ».
 */

import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, BadgeCheck, Check, CircleDot, Info, Loader2, RotateCcw, Sparkles, Target, Timer, Users } from 'lucide-react';
import { type ContentStatistics } from '@/lib/api';
import { type PerQuestionStat, type SkillMastery } from '@/lib/api/statisticsApi';
import { type QuestionNumber } from '@/lib/reportTargets';

// En dessous, les pourcentages des autres élèves reposent sur trop peu de monde : on le dit.
const SMALL_SAMPLE = 5;

interface ActivitySectionProps {
  statistics: ContentStatistics | null;
  loading: boolean;
  contentType: 'exercise' | 'exam';
  onRemoveSolutionFlag?: () => void;
  /** Revenir à l'énoncé pour s'auto-évaluer (onglet Exercice / Examen). */
  onGoToQuestions?: () => void;
  /** Revenir à une question précise. */
  onGoToQuestion?: (path: string) => void;
  /** Nombre de questions à évaluer dans le contenu. */
  totalQuestions?: number;
  /** Numérotation de l'énoncé (« 2.1 », exercice d'un examen) : les colonnes portent les mêmes numéros. */
  numbering?: QuestionNumber[];
}

type Mine = 'success' | 'partial' | 'review';
const mine = (s: PerQuestionStat['user_status']): Mine | null => (s === 'failed' ? 'review' : s);

const C = { brand: '#1a7a4a', gold: '#c0892f', review: '#c9776e', empty: '#ece9e3' };
const MINE: Record<Mine, { label: string; color: string; chip: string; icon: React.ReactNode }> = {
  success: { label: 'Réussie', color: C.brand, chip: 'bg-brand-soft text-brand-hover border-brand-line', icon: <Check className="w-3 h-3" /> },
  partial: { label: 'En partie', color: C.gold, chip: 'bg-gold-soft text-gold-strong border-gold-line', icon: <CircleDot className="w-3 h-3" /> },
  review: { label: 'À revoir', color: C.review, chip: 'bg-[#fbecea] text-[#a23b34] border-[#f1d3cf]', icon: <RotateCcw className="w-3 h-3" /> },
};

const formatTime = (seconds: number | null | undefined) => {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h} h ${m.toString().padStart(2, '0')}`;
  return m > 0 ? `${m} min ${s.toString().padStart(2, '0')}` : `${s} s`;
};

// Libellé lisible d'une notion : fourni par le serveur (référentiel des notions), sinon l'identifiant.
const skillLabel = (s: SkillMastery) =>
  s.label ?? s.skill.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());

const plural = (n: number, one: string, many = `${one}s`) => (n > 1 ? many : one);

export const ActivitySection: React.FC<ActivitySectionProps> = ({
  statistics,
  loading,
  contentType,
  onGoToQuestions,
  onGoToQuestion,
  totalQuestions = 0,
  numbering = [],
}) => {
  const contentLabel = contentType === 'exercise' ? 'cet exercice' : 'cet examen';
  const perQ = useMemo(() => statistics?.per_question ?? [], [statistics]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin mb-3 text-ink-faint" />
        <p className="text-sm text-ink-faint">Chargement…</p>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="text-center py-16 px-6 bg-white border border-line rounded-2xl">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-[#cfcdc8]" />
        <p className="text-sm text-ink-faint">Impossible de charger les statistiques. Réessaie dans un instant.</p>
      </div>
    );
  }

  const assessed = statistics.user_assessed;
  const nStudents = statistics.total_participants;
  const perSkill = (statistics.per_skill || []).slice().sort((a, b) => a.mastery_pct - b.mastery_pct);

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto">
      {assessed
        ? <MyResult statistics={statistics} perQ={perQ} totalQuestions={totalQuestions} contentLabel={contentLabel} />
        : <Invitation nStudents={nStudents} contentLabel={contentLabel} onGoToQuestions={onGoToQuestions} />}

      <QuestionsChart perQ={perQ} trap={statistics.trap_question} showMine={assessed} totalQuestions={totalQuestions}
        numbering={numbering} onGoToQuestion={onGoToQuestion} />

      <Others statistics={statistics} contentLabel={contentLabel} />

      {perSkill.length > 0 && <Notions skills={perSkill} />}
    </div>
  );
};

/* ───────────────────────────── 1. Ton bilan ───────────────────────────── */

function MyResult({ statistics, perQ, totalQuestions, contentLabel }: {
  statistics: ContentStatistics; perQ: PerQuestionStat[]; totalQuestions: number; contentLabel: string;
}) {
  const counts = { success: 0, partial: 0, review: 0 };
  perQ.forEach((q) => { const m = mine(q.user_status); if (m) counts[m] += 1; });
  const evaluated = counts.success + counts.partial + counts.review;
  const total = Math.max(totalQuestions, evaluated);
  const myPct = evaluated ? Math.round((counts.success / evaluated) * 100) : null;
  // Réussite moyenne des élèves sur les mêmes questions (celles que tu as évaluées).
  const mineQ = perQ.filter((q) => mine(q.user_status));
  const othersPct = mineQ.length ? Math.round(mineQ.reduce((s, q) => s + q.success_pct, 0) / mineQ.length) : null;
  const solvedAlone = statistics.user_completed === 'success' && !statistics.user_viewed_solution;
  const fasterThan = statistics.user_time_percentile;
  const verdict = statistics.user_completed === 'success' ? { t: 'Réussi', c: 'bg-brand text-white' }
    : statistics.user_completed === 'review' ? { t: 'À revoir', c: 'bg-[#fbecea] text-[#a23b34]' }
      : { t: 'En cours', c: 'bg-[#f2f1ee] text-ink-soft' };

  return (
    <section data-tour="activite-bilan" className="bg-white border border-line rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-bold text-ink tracking-tight">Ton bilan</h3>
        <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${verdict.c}`}>{verdict.t}</span>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-6">
        <Ring counts={counts} total={total} />

        <div className="flex-1 min-w-0">
          <p className="text-[15px] text-ink leading-snug">
            Tu as réussi <b className="fd-nums">{counts.success}</b> {plural(counts.success, 'question')} sur <b className="fd-nums">{total}</b>
            {evaluated < total && <span className="text-ink-faint"> ({total - evaluated} pas encore {plural(total - evaluated, 'évaluée')})</span>}.
          </p>

          {myPct !== null && othersPct !== null && (
            <div className="mt-4 flex flex-col gap-2.5" aria-label="Comparaison avec les autres élèves">
              <CompareBar label="Toi" pct={myPct} color={C.brand} strong />
              <CompareBar label="Les élèves" pct={othersPct} color="#b8b4ac" />
              <p className="text-[12px] text-ink-faint">Part des questions réussies, sur les questions que tu as évaluées.</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {(['success', 'partial', 'review'] as Mine[]).filter((k) => counts[k] > 0).map((k) => (
              <span key={k} className={`inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full border ${MINE[k].chip}`}>
                {MINE[k].icon}{counts[k]} {k === 'success' ? plural(counts[k], 'réussie') : k === 'partial' ? 'en partie' : 'à revoir'}
              </span>
            ))}
            {statistics.user_time_seconds ? (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full border border-line text-ink-soft fd-nums">
                <Timer className="w-3 h-3" /> {formatTime(statistics.user_time_seconds)}
                {fasterThan !== null && statistics.total_participants >= SMALL_SAMPLE && <span className="font-normal text-ink-faint">· plus rapide que {fasterThan} %</span>}
              </span>
            ) : null}
          </div>

          {solvedAlone && (
            <p className="mt-3 text-[13px] text-brand-hover inline-flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4" /> {contentLabel.replace(/^cet/, 'Cet')} réussi sans regarder la solution d’ensemble.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Anneau : une part par statut, le reste (non évalué) en gris clair. */
function Ring({ counts, total }: { counts: Record<Mine, number>; total: number }) {
  const R = 46, W = 12, LEN = 2 * Math.PI * R;
  const parts: { key: string; n: number; color: string }[] = [
    { key: 'success', n: counts.success, color: C.brand },
    { key: 'partial', n: counts.partial, color: C.gold },
    { key: 'review', n: counts.review, color: C.review },
  ];
  let offset = 0;
  const gap = total > 1 ? 2 : 0;
  return (
    <div className="relative w-[124px] h-[124px] shrink-0 self-center" role="img"
      aria-label={`${counts.success} réussies, ${counts.partial} en partie, ${counts.review} à revoir, sur ${total}`}>
      <svg viewBox="0 0 124 124" className="w-full h-full -rotate-90">
        <circle cx="62" cy="62" r={R} fill="none" stroke={C.empty} strokeWidth={W} />
        {total > 0 && parts.map((p) => {
          if (!p.n) return null;
          const len = (p.n / total) * LEN;
          const el = (
            <circle key={p.key} cx="62" cy="62" r={R} fill="none" stroke={p.color} strokeWidth={W}
              strokeDasharray={`${Math.max(len - gap, 0.5)} ${LEN}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="fd-display text-[26px] font-bold text-ink leading-none fd-nums">{counts.success}<span className="text-[15px] text-ink-faint">/{total}</span></span>
        <span className="text-[11px] text-ink-faint mt-1">réussies</span>
      </div>
    </div>
  );
}

function CompareBar({ label, pct, color, strong }: { label: string; pct: number; color: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.75rem] items-center gap-3">
      <span className={`text-[12.5px] ${strong ? 'font-bold text-ink' : 'text-ink-faint'}`}>{label}</span>
      <span className="h-2.5 rounded-full bg-[#f2f1ee] overflow-hidden">
        <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
      </span>
      <span className={`text-right text-[12.5px] fd-nums ${strong ? 'font-bold text-ink' : 'text-ink-faint'}`}>{pct} %</span>
    </div>
  );
}

/** Pas encore d'auto-évaluation : on montre quand même les chiffres des élèves, avec une invitation. */
function Invitation({ nStudents, contentLabel, onGoToQuestions }: { nStudents: number; contentLabel: string; onGoToQuestions?: () => void }) {
  return (
    <section className="rounded-2xl border border-gold-line bg-gold-soft/60 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-white border border-gold-line flex items-center justify-center shrink-0">
        <Sparkles className="w-5 h-5 text-gold-strong" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-bold text-ink">Ton bilan personnel t’attend</h3>
        <p className="mt-1 text-[13.5px] text-ink-soft leading-relaxed">
          Coche les questions que tu as réussies : un clic sous chaque question, ou « Tout réussi » en haut de {contentLabel}.
          Tu verras alors ton résultat à côté de celui des autres{nStudents > 0 ? ` (${nStudents} ${plural(nStudents, 'élève')} l’${nStudents > 1 ? 'ont' : 'a'} déjà terminé)` : ''}.
        </p>
      </div>
      {onGoToQuestions && (
        <button type="button" onClick={onGoToQuestions}
          className="shrink-0 inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors">
          Aller aux questions <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </section>
  );
}

/* ───────────────────────────── 2. Question par question ───────────────────────────── */

type Row = PerQuestionStat & { num: string; part: string | null; order: number };

/** « Question 2.1 », ou « Exercice 2 · question 1.3 » dans un examen. */
const fullLabel = (r: Row) => (r.part ? `${r.part} · question ${r.num}` : `Question ${r.num}`);

function QuestionsChart({ perQ: stats, trap, showMine, totalQuestions, numbering, onGoToQuestion }: {
  perQ: PerQuestionStat[]; trap: PerQuestionStat | null; showMine: boolean; totalQuestions: number;
  numbering: QuestionNumber[]; onGoToQuestion?: (path: string) => void;
}) {
  const perQ: Row[] = useMemo(() => {
    const idx = new Map(numbering.map((n, i) => [n.path, { ...n, i }]));
    return stats
      .map((q, k) => {
        const n = idx.get(q.path);
        return { ...q, num: n?.num ?? q.label, part: n?.part ?? null, order: n ? n.i : numbering.length + k };
      })
      .sort((a, b) => a.order - b.order);
  }, [stats, numbering]);
  // Examen : une étiquette par exercice au-dessus de ses colonnes.
  const groups = useMemo(() => {
    const out: { part: string | null; rows: Row[] }[] = [];
    perQ.forEach((r) => {
      const last = out[out.length - 1];
      if (last && last.part === r.part) last.rows.push(r); else out.push({ part: r.part, rows: [r] });
    });
    return out;
  }, [perQ]);
  const grouped = groups.some((g) => g.part);
  const initial = useMemo(() => {
    const failedMine = perQ.find((q) => showMine && mine(q.user_status) === 'review');
    return (failedMine ?? trap ?? perQ[0])?.path ?? null;
  }, [perQ, trap, showMine]);
  const [selected, setSelected] = useState<string | null>(null);
  const sel = perQ.find((q) => q.path === (selected ?? initial));
  const missing = Math.max(totalQuestions - perQ.length, 0);

  return (
    <section data-tour="activite-questions" className="bg-white border border-line rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[15px] font-bold text-ink tracking-tight">Question par question</h3>
          <p className="text-[12.5px] text-ink-faint mt-0.5">Part des élèves qui réussissent chaque question. Clique sur une colonne.</p>
        </div>
        <div className={`flex items-center gap-3 text-[11.5px] text-ink-faint ${perQ.length ? '' : 'hidden'}`}>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.brand }} /> plutôt réussie</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.gold }} /> difficile (&lt; 50 %)</span>
        </div>
      </div>

      {perQ.length === 0 ? (
        <p className="mt-5 flex items-center gap-2 text-[13px] text-ink-faint">
          <Users className="w-4 h-4" /> Personne n’a encore évalué ses réponses ici : sois le premier, les colonnes apparaîtront.
        </p>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto -mx-1 px-1 pb-1">
            <div className={`flex items-stretch min-w-full ${grouped ? 'gap-3' : 'gap-1.5'}`} style={{ minWidth: groups.reduce((w, g) => w + Math.max(g.rows.length * 42, grouped ? 104 : 0), 0) }}>
              {groups.map((g, gi) => (
              <div key={gi} className={`flex flex-col ${grouped ? "min-w-[5.75rem]" : "min-w-0"} ${grouped && gi > 0 ? 'pl-3 border-l border-line' : ''}`} style={{ flex: g.rows.length }}>
                {grouped && (
                  <span className="mb-1 text-[11.5px] font-semibold text-ink-soft truncate" title={g.part ?? ''}>{g.part ?? 'Sujet'}</span>
                )}
                <div className="flex items-stretch gap-1.5">
              {g.rows.map((q) => {
                const m = showMine ? mine(q.user_status) : null;
                const isSel = sel?.path === q.path;
                const hard = q.success_pct < 50;
                return (
                  <button key={q.path} type="button" onClick={() => setSelected(q.path)} aria-pressed={isSel}
                    title={`${fullLabel(q)} : ${q.success_pct} % réussissent`}
                    className={`group flex-1 min-w-[34px] flex flex-col items-center rounded-lg pt-1.5 pb-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                      isSel ? 'bg-[#f2f1ee]' : 'hover:bg-[#f7f6f3]'}`}>
                    <span className={`text-[10.5px] fd-nums mb-1 ${isSel ? 'text-ink font-bold' : 'text-ink-faint opacity-0 group-hover:opacity-100'}`}>{q.success_pct} %</span>
                    <span className="relative w-full max-w-[30px] h-28 rounded-md bg-[#f2f1ee] overflow-hidden">
                      <span className="absolute bottom-0 inset-x-0 rounded-md transition-[height] duration-500"
                        style={{ height: `${Math.max(q.success_pct, 3)}%`, background: hard ? C.gold : C.brand, opacity: isSel ? 1 : 0.85 }} />
                    </span>
                    <span className={`mt-1.5 text-[11.5px] font-semibold truncate max-w-full fd-nums ${isSel ? 'text-ink' : 'text-ink-soft'}`}>{q.num}</span>
                    <span className="h-4 mt-0.5 flex items-center justify-center" aria-label={m ? MINE[m].label : 'non évaluée'}>
                      {m ? <span className="w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ background: MINE[m].color }}>{
                        React.cloneElement(MINE[m].icon as React.ReactElement, { className: 'w-2.5 h-2.5' })}</span>
                        : showMine ? <span className="w-1.5 h-1.5 rounded-full bg-[#d8d4cc]" /> : null}
                    </span>
                  </button>
                );
              })}
                </div>
              </div>
              ))}
            </div>
          </div>

          {sel && (
            <div className="mt-3 rounded-xl border border-line bg-[#faf9f7] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0 text-[13.5px] text-ink-soft leading-relaxed">
                <b className="text-ink">{fullLabel(sel)}</b> : <b className="text-ink fd-nums">{sel.success_pct} %</b> des élèves la réussissent
                <span className="text-ink-faint fd-nums"> ({sel.total} {plural(sel.total, 'évaluation')})</span>.
                {trap?.path === sel.path && <span className="text-gold-strong font-semibold"> C’est la question qui fait le plus échouer.</span>}
                {showMine && (
                  <span className="block mt-0.5">
                    Toi : {mine(sel.user_status) ? <b className={mine(sel.user_status) === 'success' ? 'text-brand-hover' : mine(sel.user_status) === 'partial' ? 'text-gold-strong' : 'text-[#a23b34]'}>
                      {MINE[mine(sel.user_status)!].label.toLowerCase()}</b> : <span className="text-ink-faint">pas encore évaluée</span>}.
                  </span>
                )}
              </div>
              {onGoToQuestion && (
                <button type="button" onClick={() => onGoToQuestion(sel.path)}
                  className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-hover hover:underline">
                  Revoir la question <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          {missing > 0 && (
            <p className="mt-2.5 text-[12px] text-ink-faint">
              {missing} {plural(missing, 'question')} sans évaluation pour l’instant {missing > 1 ? 'ne sont' : 'n’est'} pas dans le graphique.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ───────────────────────────── 3. Les autres élèves ───────────────────────────── */

function Others({ statistics, contentLabel }: { statistics: ContentStatistics; contentLabel: string }) {
  const n = statistics.total_participants;
  const hist = statistics.time_histogram;
  const maxBucket = hist ? Math.max(...hist.buckets, 1) : 1;
  const few = n < SMALL_SAMPLE;

  return (
    <section className="bg-white border border-line rounded-2xl p-5 sm:p-6">
      <h3 className="text-[15px] font-bold text-ink tracking-tight">Les autres élèves</h3>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        <Fact label={`${plural(n, 'Élève')} ${n > 1 ? 'ont' : 'a'} terminé`} value={String(n)} />
        <Fact label="Ont réussi" value={n ? `${statistics.success_percentage} %` : '—'} />
        <Fact label="Temps moyen" value={formatTime(statistics.average_time_seconds)} />
      </dl>

      {hist && hist.buckets.some((b) => b > 0) && (
        <div className="mt-5 pt-4 border-t border-line">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
              <Timer className="w-3.5 h-3.5 text-ink-faint" /> Temps de résolution
            </span>
            {hist.user_bucket !== null && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-faint">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand" /> toi
              </span>
            )}
          </div>
          <div className="flex items-end gap-1.5 h-16 mt-3" role="img" aria-label={`Répartition des temps de ${n} élèves`}>
            {hist.buckets.map((count, i) => {
              const isMe = hist.user_bucket === i;
              const from = i === 0 ? '0 s' : formatTime(i * hist.bucket_width_seconds);
              const range = i === hist.buckets.length - 1 ? `${from} et plus` : `${from} à ${formatTime((i + 1) * hist.bucket_width_seconds)}`;
              return (
                <div key={i} className="flex-1 h-full relative group" title={`${range} : ${count} ${plural(count, 'élève')}`}>
                  <div className={`absolute bottom-0 inset-x-0 rounded-t ${isMe ? 'bg-brand' : 'bg-line group-hover:bg-[#d8d4cc]'}`}
                    style={{ height: `${count ? Math.max(6, (count / maxBucket) * 100) : 2}%` }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1.5 text-[10.5px] text-ink-faint fd-nums" style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>
            <span>0</span>
            <span>{formatTime(hist.bucket_width_seconds * (hist.buckets.length - 1))} et +</span>
          </div>
        </div>
      )}

      {few && (
        <p className="mt-4 flex items-start gap-2 text-[12.5px] text-ink-faint">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          {n === 0
            ? `Personne n’a encore terminé ${contentLabel} : les comparaisons arriveront avec les premiers élèves.`
            : `Encore peu d’élèves (${n}) : les pourcentages deviendront parlants quand d’autres auront terminé ${contentLabel}.`}
        </p>
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#faf9f7] border border-line px-3 py-2.5 min-w-0 flex flex-col-reverse">
      <dt className="text-[11.5px] text-ink-faint mt-0.5 leading-snug">{label}</dt>
      <dd className="text-[19px] font-bold text-ink fd-nums leading-tight">{value}</dd>
    </div>
  );
}

/* ───────────────────────────── Tes notions ───────────────────────────── */

function Notions({ skills }: { skills: SkillMastery[] }) {
  const weak = skills.filter((s) => s.mastery_pct < 50);
  return (
    <section data-tour="activite-notions" className="bg-white border border-line rounded-2xl p-5 sm:p-6">
      <h3 className="text-[15px] font-bold text-ink tracking-tight">Tes notions</h3>
      <p className="text-[12.5px] text-ink-faint mt-0.5">Ta maîtrise de chaque notion de {skills.length > 1 ? 'ces questions' : 'cette question'}, d’après tes auto-évaluations.</p>
      {weak.length > 0 && (
        <p className="mt-3 flex items-start gap-2 text-[13px] text-ink-soft">
          <Target className="w-4 h-4 mt-0.5 text-gold-strong flex-shrink-0" />
          <span><b className="text-ink">À retravailler :</b> {weak.slice(0, 3).map(skillLabel).join(', ')}.</span>
        </p>
      )}
      <ul className="mt-3 grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
        {skills.map((s) => {
          const low = s.mastery_pct < 50;
          return (
            <li key={s.skill} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] text-ink truncate" title={skillLabel(s)}>{skillLabel(s)}</span>
                <span className={`text-[12px] fd-nums ${low ? 'text-gold-strong font-semibold' : 'text-ink-faint'}`}>{s.mastery_pct} %</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#f2f1ee] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(s.mastery_pct, 3)}%`, background: low ? C.gold : C.brand }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
