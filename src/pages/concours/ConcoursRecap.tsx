/**
 * Result/recap page for a submitted simulation.
 *
 * Layout:
 *   - Top hero: overall score
 *   - "Breakdown by Domain" tile grid (per subfield, with %)
 *   - Domain detail : grille des questions (280 px à gauche sur ordinateur, au-dessus sur téléphone)
 *     + correction de la question choisie, y compris quand elle a été laissée sans réponse
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, Check, X, Lightbulb, ArrowLeft, Zap, ChevronLeft, ChevronRight, MinusCircle,
} from 'lucide-react';
import { ConcoursContentRenderer } from './ConcoursContentRenderer';
import {
  getSimulationRecap, type SimulationRecap, type BreakdownEntry,
} from '@/lib/api/concoursApi';
import { SEO } from '@/components/layout/SEO';
import { t } from '@/i18n';

export default function ConcoursRecapPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [recap, setRecap] = useState<SimulationRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeDomainKey, setActiveDomainKey] = useState<string | null>(null);
  const [activePos, setActivePos] = useState<number | null>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setFailed(false);
        const r = await getSimulationRecap(sessionId);
        if (!alive) return;
        // Simulation pas encore rendue (lien de l'historique, retour arrière…) : on y retourne.
        if (r.status === 'in_progress') {
          navigate(`/concours/simulate/${sessionId}`, { replace: true });
          return;
        }
        setRecap(r);
        if (r.breakdown.length > 0) {
          const first = r.breakdown[0];
          setActiveDomainKey(`${first.subject_id || ''}-${first.subfield_id || ''}`);
          if (first.positions.length > 0) setActivePos(first.positions[0]);
        }
      } catch (e) {
        // 409 : simulation encore en cours (le serveur ne donne pas le corrigé avant la fin).
        if ((e as { response?: { status?: number } })?.response?.status === 409) {
          if (alive) navigate(`/concours/simulate/${sessionId}`, { replace: true });
          return;
        }
        console.error(e);
        if (alive) setFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [sessionId, navigate]);

  const activeBreakdown = useMemo<BreakdownEntry | null>(() => {
    if (!recap || !activeDomainKey) return null;
    return recap.breakdown.find(b => `${b.subject_id || ''}-${b.subfield_id || ''}` === activeDomainKey) || null;
  }, [recap, activeDomainKey]);

  if (!loading && (failed || !recap)) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a1a1a' }} className="flex items-center justify-center px-4">
        <div className="text-center" style={{ maxWidth: 360 }}>
          <p style={{ color: '#d8d4cc', fontSize: 14 }}>
            {t("Impossible d'afficher ce résultat pour le moment. Vérifie ta connexion et réessaie.")}
          </p>
          <button
            onClick={() => navigate('/concours/sessions')}
            className="fd-btn-ghost mt-4 inline-flex"
            style={{ background: 'rgba(255,255,255,.08)', color: '#d8d4cc', border: '1px solid rgba(255,255,255,.15)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('Mon historique')}
          </button>
        </div>
      </div>
    );
  }
  if (loading || !recap) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a1a1a' }} className="flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#b8b4ac' }} />
      </div>
    );
  }

  /** Choix d'une question dans la grille : sur téléphone (une colonne), on descend jusqu'à sa correction. */
  const pick = (p: number) => {
    setActivePos(p);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  const overall = Math.round(recap.score_percentage);

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', color: '#fff', paddingBottom: 60 }}>
      <SEO title={t('Résultat - Fidni')} description={t('Résultat de simulation')} />

      {/* Dark-mode + bigger LaTeX for the recap. */}
      <style>{`
        .concours-dark-prose .ProseMirror,
        .concours-dark-prose .ProseMirror p,
        .concours-dark-prose .ProseMirror span { color: #fff; }
        .concours-dark-prose .katex { color: #fff; }
        .concours-recap-statement .katex,
        .concours-recap-statement .katex-display { font-size: 1.18em; }
        .concours-recap-option .katex,
        .concours-recap-option .katex-display { font-size: 1.05em; }
        .concours-recap-explanation .katex,
        .concours-recap-explanation .katex-display { font-size: 1.05em; }
        .concours-dark-prose .ProseMirror p { margin: 0 0 .35em; }
        .concours-dark-prose .ProseMirror p:last-child { margin-bottom: 0; }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <button
          onClick={() => navigate('/concours/sessions')}
          className="fd-btn-ghost mb-4"
          style={{ background: 'rgba(255,255,255,.08)', color: '#d8d4cc', border: '1px solid rgba(255,255,255,.15)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t('Mon historique')}
        </button>

        <section className="mb-6 border-y border-white/20 py-5 sm:py-7" aria-labelledby="recap-titre">
          <p className="text-sm text-stone-300">{recap.concours_type.toUpperCase()} · {recap.mode === 'exam' ? t('Annale') : recap.mode === 'random_year' ? t('Année aléatoire') : t('Mix aléatoire')}</p>
          <h1 id="recap-titre" className="fd-display mt-1 text-3xl text-white">{t('Résultat')}</h1>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold tabular-nums text-white"><span className="sr-only">{t('Score')} </span>{overall} %</p>
              <p className="mt-1 text-sm text-stone-300">{recap.correct_count > 1 ? t('{n} bonnes réponses sur {total}', { n: recap.correct_count, total: recap.total_questions }) : t('{n} bonne réponse sur {total}', { n: recap.correct_count, total: recap.total_questions })}</p>
            </div>
            <button type="button" onClick={() => navigate('/concours')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/30 px-3 text-sm font-semibold text-white hover:bg-white/10">
              <Zap className="h-4 w-4" aria-hidden /> {t('Nouvelle simulation')}
            </button>
          </div>
        </section>

        {recap.breakdown.length > 0 && (
          <section className="mb-6" aria-labelledby="recap-domaines">
            <h2 id="recap-domaines" className="mb-3 text-lg font-semibold text-white">{t('Par domaine')}</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recap.breakdown.map((b) => {
                const key = `${b.subject_id || ''}-${b.subfield_id || ''}`;
                const isActive = key === activeDomainKey;
                return (
                  <button type="button" key={key} aria-pressed={isActive}
                    onClick={() => { setActiveDomainKey(key); setActivePos(b.positions[0] ?? null); }}
                    className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-start focus-visible:outline-white ${isActive ? 'border-stone-300 bg-white/10' : 'border-white/20 hover:bg-white/5'}`}>
                    <span className="min-w-0">
                      <span className="block break-words font-semibold text-white">{b.subfield_name || b.subject_name || t('Sans matière')}</span>
                      {b.subject_name && b.subfield_name && <span className="block text-xs text-stone-300">{b.subject_name}</span>}
                      <span className="mt-1 block text-sm text-stone-300">{b.correct > 1 ? t('{n} sur {total} correctes', { n: b.correct, total: b.total }) : t('{n} sur {total} correcte', { n: b.correct, total: b.total })}</span>
                    </span>
                    <span className="shrink-0 text-base font-semibold tabular-nums text-white">{b.total ? Math.round(b.correct * 100 / b.total) : 0} %</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Domain detail */}
        {activeBreakdown && (
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] items-start">
            {/* Left: domain summary + question grid */}
            <div
              className="p-4 sm:p-[22px]"
              style={{
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 16,
              }}
            >
              <p className="text-xs font-medium text-stone-300">{t('Sélection des questions')}</p>
              <h3 className="mb-4 mt-1 break-words text-lg font-semibold leading-tight text-white">
                {activeBreakdown.subfield_name || activeBreakdown.subject_name || t('Sans matière')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {activeBreakdown.positions.map(p => {
                  const ans = recap.answers[p];
                  const kind = !ans?.chosen_key ? 'skipped' : ans.is_correct ? 'correct' : 'wrong';
                  const st = PILL[kind];
                  const isCurrent = p === activePos;
                  return (
                    <button
                      key={p}
                      onClick={() => pick(p)}
                      aria-label={t('Question {n} : {label}', { n: p + 1, label: t(st.label) })}
                      aria-current={isCurrent ? 'true' : undefined}
                      style={{
                        minWidth: 40, minHeight: 38, padding: '7px 10px', borderRadius: 8,
                        background: st.bg,
                        border: `1.5px ${kind === 'skipped' ? 'dashed' : 'solid'} ${st.border}`,
                        // La question ouverte garde sa couleur de résultat, entourée de blanc.
                        boxShadow: isCurrent ? '0 0 0 2px #1a1a1a, 0 0 0 4px #fff' : undefined,
                        color: st.color, fontSize: 12, fontWeight: 600, fontFamily: 'var(--fd-mono)', cursor: 'pointer',
                      }}
                    >
                      {p + 1}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-3" style={{ fontSize: 11, color: '#b8b4ac' }}>
                {(['correct', 'wrong', 'skipped'] as const).map(k => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span style={{
                      width: 12, height: 12, borderRadius: 4, background: PILL[k].bg,
                      border: `1.5px ${k === 'skipped' ? 'dashed' : 'solid'} ${PILL[k].border}`,
                    }} />
                    {t(PILL[k].label)}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: selected question review */}
            <div ref={reviewRef} style={{ scrollMarginTop: 72 }} className="min-w-0">
              <QuestionReview
                recap={recap}
                pos={activePos}
                positions={activeBreakdown.positions}
                onGo={pick}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────── Single question review ───────────── */

/** Couleurs des pastilles de la grille : juste, faux, sans réponse (pointillés gris). */
const PILL = {
  correct: { label: 'Correcte', bg: 'rgba(34,197,94,.15)', border: 'rgba(34,197,94,.45)', color: '#86efac' },
  wrong:   { label: 'Fausse', bg: 'rgba(220,38,38,.15)', border: 'rgba(220,38,38,.45)', color: '#fca5a5' },
  skipped: { label: 'Non répondue', bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.35)', color: '#b8b4ac' },
} as const;

function QuestionReview({ recap, pos, positions, onGo }: {
  recap: SimulationRecap; pos: number | null;
  /** Questions du domaine affiché, pour passer à la précédente / suivante. */
  positions: number[];
  onGo: (p: number) => void;
}) {
  if (pos === null) {
    return (
      <div
        style={{
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 16, padding: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <p style={{ color: '#b8b4ac', fontSize: 13 }}>{t('Sélectionne une question.')}</p>
      </div>
    );
  }

  const item = recap.questions_snapshot[pos];
  if (!item) return null;
  const q = item.question;
  const ans = recap.answers[pos];
  const chosen = ans?.chosen_key || null;
  const kind = !chosen ? 'skipped' : ans.is_correct ? 'correct' : 'wrong';
  const at = positions.indexOf(pos);
  const prev = at > 0 ? positions[at - 1] : null;
  const next = at >= 0 && at < positions.length - 1 ? positions[at + 1] : null;

  const navBtn: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 38, padding: '0 12px', borderRadius: 10,
    background: 'transparent', color: '#d8d4cc', border: '1px solid rgba(255,255,255,.18)',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  };

  return (
    <div
      className="p-4 sm:p-[22px]"
      style={{
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 16,
      }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{t('Question {n}', { n: pos + 1 })}</h3>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10, fontWeight: 600,
          color: PILL[kind].color,
          background: kind === 'skipped' ? 'rgba(255,255,255,.08)' : PILL[kind].bg,
          padding: '4px 10px', borderRadius: 99,
        }}>
          {kind === 'correct' && <><Check className="w-3 h-3" /> {t('Correct')}</>}
          {kind === 'wrong' && <><X className="w-3 h-3" /> {t('Incorrect')}</>}
          {kind === 'skipped' && <><MinusCircle className="w-3 h-3" /> {t('Non répondue')}</>}
        </span>
      </div>

      <div className="concours-dark-prose concours-recap-statement" style={{ fontSize: 17, color: '#fff', lineHeight: 1.7, marginBottom: 18 }}>
        <ConcoursContentRenderer html={q.statement} />
      </div>

      {kind === 'skipped' && (
        <p style={{ fontSize: 12, color: '#b8b4ac', marginBottom: 10 }}>
          {t("Tu n'as pas répondu : la bonne réponse est en vert.")}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {q.options.map(opt => {
          const isCorrect = opt.key === q.correct_key;
          const isChosen = opt.key === chosen;
          let bg = 'rgba(255,255,255,.04)';
          let border = 'rgba(255,255,255,.08)';
          if (isCorrect) { bg = 'rgba(34,197,94,.12)'; border = 'rgba(34,197,94,.4)'; }
          else if (isChosen) { bg = 'rgba(220,38,38,.12)'; border = 'rgba(220,38,38,.4)'; }
          return (
            <div
              key={opt.key}
              className="flex items-start gap-3"
              style={{
                padding: '10px 12px', borderRadius: 10,
                background: bg, border: `1px solid ${border}`,
                color: '#fff',
              }}
            >
              <span
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: isCorrect ? '#16a34a' : isChosen ? '#dc2626' : 'transparent',
                  color: '#fff',
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--fd-mono)',
                  border: `1.5px solid ${isCorrect ? '#16a34a' : isChosen ? '#dc2626' : 'rgba(255,255,255,.18)'}`,
                }}
              >
                {opt.key}
              </span>
              <div className="flex-1 min-w-0 concours-dark-prose concours-recap-option" style={{ fontSize: 15, lineHeight: 1.65 }}>
                <ConcoursContentRenderer html={opt.text} />
              </div>
              {isCorrect && <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#86efac' }} />}
              {isChosen && !isCorrect && <X className="w-4 h-4 flex-shrink-0" style={{ color: '#fca5a5' }} />}
            </div>
          );
        })}
      </div>

      {q.explanation && (
        <div
          style={{
            background: 'rgba(251,191,36,.08)',
            border: '1px solid rgba(251,191,36,.3)',
            borderRadius: 10, padding: 14, marginTop: 14,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4" style={{ color: '#c0892f' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#c0892f' }}>{t('Explication')}</span>
          </div>
          <div className="concours-dark-prose concours-recap-explanation" style={{ fontSize: 15, color: '#fff', lineHeight: 1.7 }}>
            <ConcoursContentRenderer html={q.explanation} />
          </div>
        </div>
      )}

      {(prev !== null || next !== null) && (
        <div className="flex items-center justify-between gap-2 mt-4">
          <button
            onClick={() => prev !== null && onGo(prev)}
            disabled={prev === null}
            style={{ ...navBtn, opacity: prev === null ? .35 : 1 }}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> {t('Précédente')}
          </button>
          <button
            onClick={() => next !== null && onGo(next)}
            disabled={next === null}
            style={{ ...navBtn, opacity: next === null ? .35 : 1 }}
          >
            {t('Suivante')} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
