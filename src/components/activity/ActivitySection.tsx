/**
 * ActivitySection — onglet « Activité » d'un exercice / examen.
 *
 * Dans l'ordre des questions que se pose l'élève :
 *  1. Mon bilan            — mon résultat, mon temps, la réussite des autres élèves
 *  2. Question par question — mon statut et le taux de réussite de chaque question
 *  3. Mes notions à retravailler
 * Verrou de réciprocité : rien ne s'affiche tant que l'élève ne s'est pas auto-évalué.
 */

import React from 'react';
import { Loader2, AlertCircle, Lock, Eye, X, BadgeCheck, Users, Timer, Target, ArrowRight, Info } from 'lucide-react';
import { type ContentStatistics } from '@/lib/api';
import { type PerQuestionStat, type SkillMastery } from '@/lib/api/statisticsApi';

// En dessous, les pourcentages des autres élèves reposent sur trop peu de monde : on le dit.
const SMALL_SAMPLE = 5;

interface ActivitySectionProps {
  statistics: ContentStatistics | null;
  loading: boolean;
  contentType: 'exercise' | 'exam';
  onRemoveSolutionFlag?: () => void;
  /** Revenir à l'énoncé pour s'auto-évaluer (onglet Exercice / Examen). */
  onGoToQuestions?: () => void;
}

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

const STATUS: Record<NonNullable<PerQuestionStat['user_status']>, { label: string; className: string }> = {
  success: { label: 'Réussie', className: 'bg-brand-soft text-brand-hover border-brand-line' },
  partial: { label: 'En partie', className: 'bg-gold-soft text-gold-strong border-gold-line' },
  review: { label: 'À revoir', className: 'bg-[#fbecea] text-[#a23b34] border-[#f1d3cf]' },
  failed: { label: 'À revoir', className: 'bg-[#fbecea] text-[#a23b34] border-[#f1d3cf]' },
};

export const ActivitySection: React.FC<ActivitySectionProps> = ({
  statistics,
  loading,
  contentType,
  onRemoveSolutionFlag,
  onGoToQuestions,
}) => {
  const contentLabel = contentType === 'exercise' ? 'cet exercice' : 'cet examen';

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

  const nStudents = statistics.total_participants;

  // ── Verrou de réciprocité ──────────────────────────────────────────────
  if (!statistics.user_assessed) {
    return (
      <div className="text-center py-14 px-6 bg-white border border-line rounded-2xl">
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-[#f7f6f3] flex items-center justify-center">
          <Lock className="w-6 h-6 text-ink-faint" />
        </div>
        <h3 className="text-[17px] font-bold text-ink mb-2">Évalue tes réponses pour te situer</h3>
        <p className="text-[13.5px] text-ink-faint max-w-md mx-auto">
          {nStudents > 0 && `${nStudents} élève${nStudents > 1 ? 's ont' : ' a'} déjà travaillé ${contentLabel}. `}
          Sous chaque question, indique si tu l'as réussie : tu verras alors où tu te situes, question par
          question, par rapport aux autres élèves.
        </p>
        {onGoToQuestions && (
          <button
            onClick={onGoToQuestions}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors"
          >
            Aller aux questions <ArrowRight className="w-4 h-4" />
          </button>
        )}
        <p className="mt-4 text-xs text-ink-faint">Tes réponses ne servent qu'à toi. Personne d'autre ne les voit.</p>
      </div>
    );
  }

  // ── Données dérivées ────────────────────────────────────────────────────
  const fasterThan = statistics.user_time_percentile !== null ? Math.round(statistics.user_time_percentile) : null;
  const hist = statistics.time_histogram;
  const maxBucket = hist ? Math.max(...hist.buckets, 1) : 1;
  const perQ = statistics.per_question || [];
  const trap = statistics.trap_question;
  const perSkill = (statistics.per_skill || []).slice().sort((a, b) => a.mastery_pct - b.mastery_pct);
  const weakSkills = perSkill.filter(s => s.mastery_pct < 50);
  const solvedAlone = statistics.user_completed === 'success' && !statistics.user_viewed_solution;
  const assessedQ = perQ.filter(q => q.user_status);
  const successQ = perQ.filter(q => q.user_status === 'success');
  const fewStudents = nStudents < SMALL_SAMPLE;

  const verdict =
    statistics.user_completed === 'success' ? 'Réussi'
      : statistics.user_completed === 'review' ? 'À revoir'
        : 'En cours';

  return (
    <div className="flex flex-col gap-4">

      {/* ══ 1. Mon bilan ══ */}
      <section data-tour="activite-bilan" className="bg-white border border-line rounded-2xl p-5 sm:p-6">
        <SectionTitle hint={`Ton travail sur ${contentLabel}, comparé à celui des autres élèves.`}>Mon bilan</SectionTitle>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <Tile label="Mon résultat" tone={statistics.user_completed === 'success' ? 'brand' : statistics.user_completed === 'review' ? 'gold' : 'ink'}>
            <span className="inline-flex items-center gap-1.5">
              {verdict}
              {solvedAlone && <BadgeCheck className="w-4 h-4 text-brand" aria-label="sans la solution" />}
            </span>
            {perQ.length > 0 && (
              <small>{successQ.length} question{successQ.length > 1 ? 's' : ''} réussie{successQ.length > 1 ? 's' : ''} sur {perQ.length}</small>
            )}
          </Tile>
          <Tile label="Mon temps">
            {formatTime(statistics.user_time_seconds)}
            <small>
              {fasterThan !== null && !fewStudents
                ? `plus rapide que ${fasterThan} % des élèves`
                : statistics.user_time_seconds ? 'temps enregistré' : 'lance le chrono pour le mesurer'}
            </small>
          </Tile>
          <Tile label="Réussite des élèves">
            {nStudents > 0 ? `${statistics.success_percentage} %` : '—'}
            <small>{nStudents > 0 ? `${statistics.success_count} réussite${statistics.success_count > 1 ? 's' : ''} sur ${nStudents}` : 'pas encore de résultat'}</small>
          </Tile>
          <Tile label="Élèves">
            {nStudents}
            <small>{nStudents > 1 ? 'ont terminé' : 'a terminé'} {contentLabel}</small>
          </Tile>
        </div>

        {solvedAlone && (
          <p className="mt-3 text-[13px] text-brand-hover inline-flex items-center gap-1.5">
            <BadgeCheck className="w-4 h-4" /> Réussi sans regarder la solution : c'est la vraie maîtrise.
          </p>
        )}

        {fewStudents && (
          <p className="mt-3 flex items-start gap-2 text-[12.5px] text-ink-faint">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            {nStudents === 0
              ? `Personne n'a encore terminé ${contentLabel} : clique sur « Terminer » une fois fini pour lancer les comparaisons.`
              : `Encore peu d'élèves (${nStudents}) : les comparaisons deviendront parlantes quand d'autres auront terminé ${contentLabel}.`}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {statistics.solution_view_percentage !== undefined && statistics.success_count > 0 && (
            <span className="inline-flex items-center gap-1.5 border border-line rounded-lg px-3 py-1.5 text-[12.5px] text-ink-faint">
              <Eye className="w-3.5 h-3.5" />
              <b className="text-ink">{statistics.solution_view_percentage} %</b> ont regardé la solution avant de réussir
            </span>
          )}
          {statistics.user_viewed_solution && onRemoveSolutionFlag && (
            <button
              onClick={onRemoveSolutionFlag}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] text-ink-faint hover:text-ink hover:bg-[#f2f1ee] transition-colors"
            >
              Solution marquée comme consultée, c'était une erreur ? <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Distribution des temps */}
        {hist && hist.buckets.some(b => b > 0) && (
          <div className="mt-6 pt-5 border-t border-line">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
                <Timer className="w-3.5 h-3.5 text-ink-faint" /> Temps de résolution des élèves
              </span>
              {hist.user_bucket !== null && (
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-faint">
                  <span className="w-2.5 h-2.5 rounded-sm bg-brand" /> toi
                </span>
              )}
            </div>
            <div className="flex items-end gap-1.5 h-20 mt-3" role="img"
              aria-label={`Répartition des temps de ${nStudents} élèves`}>
              {hist.buckets.map((count, i) => {
                const isMe = hist.user_bucket === i;
                const from = formatTime(i * hist.bucket_width_seconds) === '—' ? '0 s' : formatTime(i * hist.bucket_width_seconds);
                const range = i === hist.buckets.length - 1
                  ? `${from} et plus`
                  : `${from} à ${formatTime((i + 1) * hist.bucket_width_seconds)}`;
                return (
                  <div key={i} className="flex-1 h-full relative group" title={`${range} : ${count} élève${count > 1 ? 's' : ''}`}>
                    <div
                      className={`absolute bottom-0 inset-x-0 rounded-t ${isMe ? 'bg-brand' : 'bg-line group-hover:bg-[#d8d4cc]'}`}
                      style={{ height: `${count ? Math.max(6, (count / maxBucket) * 100) : 2}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1.5 text-[10.5px] text-ink-faint fd-nums" style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>
              <span>0</span>
              <span>{formatTime(hist.bucket_width_seconds * 4)}</span>
              <span>{formatTime(hist.bucket_width_seconds * (hist.buckets.length - 1))} et +</span>
            </div>
          </div>
        )}
      </section>

      {/* ══ 2. Question par question ══ */}
      {perQ.length > 0 && (
        <section data-tour="activite-questions" className="bg-white border border-line rounded-2xl p-5 sm:p-6">
          <SectionTitle hint={`Tu as évalué ${assessedQ.length} question${assessedQ.length > 1 ? 's' : ''} sur ${perQ.length}. La barre montre la part des élèves qui réussissent chacune.`}>
            Question par question
          </SectionTitle>

          {trap && (
            <div className="mt-4 rounded-xl border border-gold-line border-l-[3px] border-l-gold bg-gold-soft px-4 py-3 text-[13.5px] text-ink-soft">
              <b className="text-ink">{trap.label} fait échouer {100 - trap.success_pct} % des élèves.</b>{' '}
              {trap.user_status && trap.user_status !== 'success'
                ? "Toi aussi : c'est le point n° 1 à retravailler ici."
                : trap.user_status === 'success'
                  ? "Tu l'as réussie, bravo : la plupart échouent ici."
                  : "Garde-la en tête quand tu t'y attaques."}
            </div>
          )}

          <ul className="mt-4 divide-y divide-line">
            {perQ.map((q) => {
              const status = q.user_status ? STATUS[q.user_status] : null;
              const isTrap = trap && trap.path === q.path;
              const hard = q.success_pct < 50;
              return (
                <li key={q.path} className="py-2.5 grid items-center gap-x-4 gap-y-1.5 grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]">
                  <span className="text-[13.5px] font-semibold text-ink truncate">
                    {q.label}
                    {isTrap && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-gold-strong">piège</span>}
                  </span>
                  <span className="sm:order-last">
                    {status ? (
                      <span className={`inline-block text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full border ${status.className}`}>
                        {status.label}
                      </span>
                    ) : (
                      <span className="text-[11.5px] text-ink-faint">non évaluée</span>
                    )}
                  </span>
                  <span className="col-span-2 sm:col-span-1 flex items-center gap-3">
                    <span className="flex-1 h-2 rounded-full bg-[#f2f1ee] overflow-hidden">
                      <span className={`block h-full rounded-full ${hard ? 'bg-gold' : 'bg-brand'}`} style={{ width: `${q.success_pct}%` }} />
                    </span>
                    <span className="text-[12px] text-ink-faint whitespace-nowrap fd-nums w-[5.5rem] text-right">
                      <b className="text-ink">{q.success_pct} %</b> réussissent
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ══ 3. Mes notions à retravailler ══ */}
      {perSkill.length > 0 && (
        <section data-tour="activite-notions" className="bg-white border border-line rounded-2xl p-5 sm:p-6">
          <SectionTitle hint="Ta maîtrise de chaque notion, d'après tes auto-évaluations sur Fidni.">Mes notions</SectionTitle>

          {weakSkills.length > 0 && (
            <div className="mt-4 rounded-xl border border-brand-line border-l-[3px] border-l-brand bg-brand-soft px-4 py-3 text-[13.5px] text-ink-soft flex items-start gap-2">
              <Target className="w-4 h-4 mt-0.5 text-brand flex-shrink-0" />
              <span>
                <b className="text-ink">À cibler en priorité :</b> {weakSkills.slice(0, 3).map(s => skillLabel(s)).join(', ')}.
              </span>
            </div>
          )}

          <ul className="mt-3">
            {perSkill.map((s) => {
              const weak = s.mastery_pct < 50;
              return (
                <li key={s.skill} className="grid items-center gap-3 py-2 grid-cols-[minmax(0,1fr)_6rem_2.75rem] sm:grid-cols-[minmax(0,1fr)_10rem_2.75rem]">
                  <span className="text-[13px] text-ink truncate" title={skillLabel(s)}>{skillLabel(s)}</span>
                  <span className="h-2 rounded-full bg-[#f2f1ee] overflow-hidden">
                    <span className={`block h-full rounded-full ${weak ? 'bg-gold' : 'bg-brand'}`} style={{ width: `${s.mastery_pct}%` }} />
                  </span>
                  <span className={`text-right text-[12px] fd-nums ${weak ? 'text-gold-strong font-semibold' : 'text-ink-faint'}`}>{s.mastery_pct} %</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {perQ.length === 0 && perSkill.length === 0 && (
        <p className="flex items-center justify-center gap-2 text-[12.5px] text-ink-faint text-center py-2">
          <Users className="w-3.5 h-3.5" />
          Les statistiques par question apparaîtront quand plus d'élèves auront évalué leurs réponses.
        </p>
      )}
    </div>
  );
};

// ── Primitives ────────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <div>
    <h3 className="text-[15px] font-bold text-ink tracking-tight">{children}</h3>
    {hint && <p className="text-[12.5px] text-ink-faint mt-0.5">{hint}</p>}
  </div>
);

const TONES = { ink: 'text-ink', brand: 'text-brand-hover', gold: 'text-gold-strong' } as const;

const Tile: React.FC<{ label: string; tone?: keyof typeof TONES; children: React.ReactNode }> = ({ label, tone = 'ink', children }) => (
  <div className={`rounded-xl border border-line bg-[#faf9f7] px-3.5 py-3 min-w-0 ${TONES[tone]}`}>
    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">{label}</div>
    <div className="mt-1 text-lg font-bold fd-nums leading-tight flex flex-col [&>small]:text-[11.5px] [&>small]:font-normal [&>small]:text-ink-faint [&>small]:mt-0.5 [&>small]:leading-snug">
      {children}
    </div>
  </div>
);
