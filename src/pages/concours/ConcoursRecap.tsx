/**
 * Result/recap page for a submitted simulation.
 *
 * Layout matches the screenshot:
 *   - Top hero: overall score
 *   - "Breakdown by Domain" tile grid (per subfield, with %)
 *   - Domain detail card: domain title + question selector grid + selected question review
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, Trophy, Check, X, Lightbulb, ArrowLeft, EyeOff, Zap,
} from 'lucide-react';
import { ConcoursContentRenderer } from './ConcoursContentRenderer';
import {
  getSimulationRecap, type SimulationRecap, type BreakdownEntry,
} from '@/lib/api/concoursApi';
import { SEO } from '@/components/layout/SEO';

export default function ConcoursRecapPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [recap, setRecap] = useState<SimulationRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDomainKey, setActiveDomainKey] = useState<string | null>(null);
  const [activePos, setActivePos] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        setLoading(true);
        const r = await getSimulationRecap(sessionId);
        setRecap(r);
        if (r.breakdown.length > 0) {
          const first = r.breakdown[0];
          setActiveDomainKey(`${first.subject_id || ''}-${first.subfield_id || ''}`);
          if (first.positions.length > 0) setActivePos(first.positions[0]);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [sessionId]);

  const activeBreakdown = useMemo<BreakdownEntry | null>(() => {
    if (!recap || !activeDomainKey) return null;
    return recap.breakdown.find(b => `${b.subject_id || ''}-${b.subfield_id || ''}` === activeDomainKey) || null;
  }, [recap, activeDomainKey]);

  if (loading || !recap) {
    return (
      <div style={{ minHeight: '100vh', background: '#1e1b4b' }} className="flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#a5b4fc' }} />
      </div>
    );
  }

  const overall = Math.round(recap.score_percentage);
  const overallColor = overall >= 75 ? '#16a34a' : overall >= 50 ? '#f59e0b' : '#dc2626';

  return (
    <div style={{ minHeight: '100vh', background: '#1e1b4b', color: '#fff', paddingBottom: 60 }}>
      <SEO title="Résultat - Fidni" description="Résultat de simulation" />

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
          style={{ background: 'rgba(255,255,255,.08)', color: '#c7d2fe', border: '1px solid rgba(255,255,255,.15)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Mon historique
        </button>

        {/* Score hero */}
        <div
          style={{
            background: 'linear-gradient(135deg,#3730a3 0%,#4f46e5 50%,#7c3aed 100%)',
            borderRadius: 24,
            padding: '32px 36px',
            position: 'relative',
            overflow: 'hidden',
          }}
          className="mb-6"
        >
          <div aria-hidden style={{
            position: 'absolute', right: -40, bottom: -60, width: 240, height: 240,
            borderRadius: '50%', background: 'rgba(167,139,250,.15)',
          }} />
          <div className="flex items-center justify-between flex-wrap gap-4" style={{ position: 'relative' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                {recap.concours_type.toUpperCase()} · {recap.mode === 'exam' ? 'Annale' : recap.mode === 'random_year' ? 'Année aléatoire' : 'Mix aléatoire'}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginTop: 8 }}>
                Résultat
              </h1>
              <p style={{ fontSize: 13, color: '#c7d2fe', marginTop: 6 }}>
                {recap.correct_count} bonne{recap.correct_count > 1 ? 's' : ''} réponse{recap.correct_count > 1 ? 's' : ''} sur {recap.total_questions}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => navigate('/concours')} className="fd-btn-ghost"
                        style={{ background: 'rgba(255,255,255,.14)', color: '#fff', border: '1px solid rgba(255,255,255,.22)' }}>
                  <Zap className="w-3.5 h-3.5" /> Nouvelle simulation
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 110, height: 110, borderRadius: '50%',
                  background: `conic-gradient(${overallColor} ${overall * 3.6}deg, rgba(255,255,255,.1) 0)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{
                  width: 92, height: 92, borderRadius: '50%',
                  background: '#3730a3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column',
                }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: 'DM Mono' }}>
                    {overall}%
                  </div>
                  <div style={{ fontSize: 9, color: '#c7d2fe', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    Score
                  </div>
                </div>
              </div>
              <Trophy className="w-10 h-10" style={{ color: overall >= 75 ? '#fbbf24' : '#a5b4fc' }} />
            </div>
          </div>
        </div>

        {/* Breakdown by domain */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)', maxWidth: 120 }} />
            <h2 style={{ fontSize: 12, color: '#a5b4fc', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700 }}>
              Par domaine
            </h2>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)', maxWidth: 120 }} />
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 16, padding: 22,
            }}
          >
            <div className="grid gap-x-6 gap-y-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
              {recap.breakdown.map((b, i) => {
                const key = `${b.subject_id || ''}-${b.subfield_id || ''}`;
                const pct = b.total ? Math.round((b.correct * 100) / b.total) : 0;
                const ringColor = pct >= 75 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#7c3aed';
                const isActive = key === activeDomainKey;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveDomainKey(key);
                      setActivePos(b.positions[0] ?? null);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 14px', borderRadius: 12,
                      background: isActive ? 'rgba(129,140,248,.15)' : 'transparent',
                      border: `1px solid ${isActive ? '#818cf8' : 'transparent'}`,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all .15s',
                    }}
                  >
                    <div
                      style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: `conic-gradient(${ringColor} ${pct * 3.6}deg, rgba(255,255,255,.1) 0)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{
                        width: 46, height: 46, borderRadius: '50%',
                        background: '#1e1b4b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: 'DM Mono' }}>{pct}%</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                        {b.subfield_name || b.subject_name || 'Sans matière'}
                      </div>
                      {b.subject_name && b.subfield_name && (
                        <div style={{ fontSize: 11, color: '#a5b4fc', marginTop: 1 }}>{b.subject_name}</div>
                      )}
                      <div style={{ fontSize: 11, color: '#c7d2fe', marginTop: 2 }}>
                        {b.correct} sur {b.total} correct{b.correct > 1 ? 'es' : 'e'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Domain detail */}
        {activeBreakdown && (
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: 'minmax(0, 280px) minmax(0, 1fr)' }}
          >
            {/* Left: domain summary + question grid */}
            <div
              style={{
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 16, padding: 22,
              }}
            >
              <div style={{ fontSize: 11, color: '#a5b4fc', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
                Domaine
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {activeBreakdown.subfield_name || activeBreakdown.subject_name || 'Sans matière'}
              </h3>
              <p style={{ fontSize: 13, color: '#c7d2fe', marginTop: 6 }}>
                {activeBreakdown.correct} sur {activeBreakdown.total} correct{activeBreakdown.correct > 1 ? 'es' : 'e'}
              </p>

              <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '14px 0' }} />

              <div style={{ fontSize: 11, color: '#a5b4fc', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
                Sélection des questions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeBreakdown.positions.map(p => {
                  const ans = recap.answers[p];
                  const isAnswered = ans && ans.chosen_key;
                  const isCorrect = ans?.is_correct;
                  const isCurrent = p === activePos;
                  let bg = 'transparent';
                  let border = 'rgba(255,255,255,.18)';
                  let color = '#c7d2fe';
                  if (isCurrent) { bg = 'rgba(129,140,248,.25)'; border = '#818cf8'; color = '#fff'; }
                  else if (isAnswered && isCorrect) { bg = 'rgba(34,197,94,.15)'; border = 'rgba(34,197,94,.4)'; color = '#86efac'; }
                  else if (isAnswered && !isCorrect) { bg = 'rgba(220,38,38,.15)'; border = 'rgba(220,38,38,.4)'; color = '#fca5a5'; }
                  return (
                    <button
                      key={p}
                      onClick={() => setActivePos(p)}
                      style={{
                        minWidth: 38, padding: '7px 10px', borderRadius: 8,
                        background: bg,
                        border: `1.5px solid ${border}`,
                        color, fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono', cursor: 'pointer',
                      }}
                    >
                      {p + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: selected question review */}
            <QuestionReview recap={recap} pos={activePos} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────── Single question review ───────────── */

function QuestionReview({ recap, pos }: { recap: SimulationRecap; pos: number | null }) {
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
        <p style={{ color: '#a5b4fc', fontSize: 13 }}>Sélectionne une question.</p>
      </div>
    );
  }

  const item = recap.questions_snapshot[pos];
  if (!item) return null;
  const q = item.question;
  const ans = recap.answers[pos];
  const answered = !!(ans && ans.chosen_key);

  if (!answered) {
    return (
      <div
        style={{
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 16, padding: 22,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Question {pos + 1}</h3>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
            color: '#a5b4fc', background: 'rgba(255,255,255,.08)',
            padding: '3px 9px', borderRadius: 99, textTransform: 'uppercase',
          }}>
            Non répondue
          </span>
        </div>
        <div className="text-center" style={{ padding: 60 }}>
          <EyeOff className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,.3)' }} />
          <p style={{ color: '#a5b4fc', fontSize: 13 }}>Détail indisponible pour les questions non répondues.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 16, padding: 22,
      }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Question {pos + 1}</h3>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
          color: ans.is_correct ? '#86efac' : '#fca5a5',
          background: ans.is_correct ? 'rgba(34,197,94,.15)' : 'rgba(220,38,38,.15)',
          padding: '4px 10px', borderRadius: 99,
        }}>
          {ans.is_correct ? <><Check className="w-3 h-3" /> Correct</> : <><X className="w-3 h-3" /> Incorrect</>}
        </span>
      </div>

      <div className="concours-dark-prose concours-recap-statement" style={{ fontSize: 17, color: '#fff', lineHeight: 1.7, marginBottom: 18 }}>
        <ConcoursContentRenderer html={q.statement} />
      </div>

      <div className="flex flex-col gap-2">
        {q.options.map(opt => {
          const isCorrect = opt.key === q.correct_key;
          const isChosen = opt.key === ans.chosen_key;
          let bg = 'rgba(255,255,255,.04)';
          let border = 'rgba(255,255,255,.08)';
          if (isCorrect) { bg = 'rgba(34,197,94,.12)'; border = 'rgba(34,197,94,.4)'; }
          else if (isChosen && !isCorrect) { bg = 'rgba(220,38,38,.12)'; border = 'rgba(220,38,38,.4)'; }
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
                  fontSize: 12, fontWeight: 800, fontFamily: 'DM Mono',
                  border: `1.5px solid ${isCorrect ? '#16a34a' : isChosen ? '#dc2626' : 'rgba(255,255,255,.18)'}`,
                }}
              >
                {opt.key}
              </span>
              <div className="flex-1 concours-dark-prose concours-recap-option" style={{ fontSize: 15, lineHeight: 1.65 }}>
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
            <Lightbulb className="w-4 h-4" style={{ color: '#fbbf24' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>Explication</span>
          </div>
          <div className="concours-dark-prose concours-recap-explanation" style={{ fontSize: 15, color: '#fff', lineHeight: 1.7 }}>
            <ConcoursContentRenderer html={q.explanation} />
          </div>
        </div>
      )}
    </div>
  );
}
