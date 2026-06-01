/**
 * Live simulation runner. Timed, no solutions visible.
 * Auto-saves each answer. Auto-submits on timeout.
 *
 * Layout:
 *   Top bar: title + countdown timer + submit button
 *   Body: current question (left ~70%) + question grid sidebar (right)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, Clock, AlertTriangle, Check, ChevronLeft, ChevronRight, Send,
} from 'lucide-react';
import { ConcoursContentRenderer } from './ConcoursContentRenderer';
import {
  getSimulationSession, answerSimulationQuestion, submitSimulation,
  type SimulationSessionView,
} from '@/lib/api/concoursApi';
import { SEO } from '@/components/layout/SEO';

export default function ConcoursSimulatePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [sess, setSess] = useState<SimulationSessionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const submittedRef = useRef(false);

  // Load session
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        setLoading(true);
        const s = await getSimulationSession(sessionId);
        setSess(s);
        setAnswers(s.answers || {});
        // Compute seconds left from started_at + duration_minutes
        const startMs = new Date(s.started_at).getTime();
        const endMs = startMs + s.duration_minutes * 60 * 1000;
        setSecondsLeft(Math.max(0, Math.round((endMs - Date.now()) / 1000)));
        if (s.status !== 'in_progress') {
          // Already submitted — go to recap
          navigate(`/concours/sessions/${s.session_id}/recap`, { replace: true });
        }
      } catch (e) {
        console.error(e);
        navigate('/concours');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, navigate]);

  // Countdown
  useEffect(() => {
    if (!sess || sess.status !== 'in_progress') return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          // Auto-submit
          if (!submittedRef.current) handleSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [sess]);

  const choose = async (key: string) => {
    if (!sess) return;
    setAnswers((prev) => ({ ...prev, [pos]: key }));
    try {
      await answerSimulationQuestion(sess.session_id, pos, key);
    } catch (e) {
      console.error('answer save failed', e);
    }
  };

  const handleSubmit = async (silent = false) => {
    if (!sess || submittedRef.current) return;
    if (!silent && !window.confirm('Soumettre la simulation maintenant ?')) {
      return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await submitSimulation(sess.session_id);
      navigate(`/concours/sessions/${sess.session_id}/recap`, { replace: true });
    } catch (e) {
      console.error(e);
      submittedRef.current = false;
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const lowTime = secondsLeft <= 60 && secondsLeft > 0;
  const answered = useMemo(() =>
    new Set(Object.entries(answers).filter(([, v]) => v).map(([k]) => Number(k))),
  [answers]);

  if (loading || !sess) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0effe' }} className="flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#4f46e5' }} />
      </div>
    );
  }

  const item = sess.questions_snapshot[pos];
  if (!item) return null;
  const q = item.question;

  return (
    <div style={{ minHeight: '100vh', background: '#1e1b4b', color: '#fff', paddingBottom: 32 }}>
      <SEO title="Simulation - Fidni" description="Simulation de concours" />

      {/* Dark-mode + bigger LaTeX for the simulation runner. */}
      <style>{`
        .concours-dark-prose .ProseMirror,
        .concours-dark-prose .ProseMirror p,
        .concours-dark-prose .ProseMirror span { color: #fff; }
        .concours-dark-prose .katex { color: #fff; }
        .concours-sim-statement .katex,
        .concours-sim-statement .katex-display { font-size: 1.2em; }
        .concours-sim-option .katex,
        .concours-sim-option .katex-display { font-size: 1.1em; }
        .concours-dark-prose .ProseMirror p { margin: 0 0 .35em; }
        .concours-dark-prose .ProseMirror p:last-child { margin-bottom: 0; }
      `}</style>

      {/* Top bar */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(30,27,75,.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,.08)',
          padding: '14px 24px',
        }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.06em', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 700 }}>
            Simulation · {sess.concours_type.toUpperCase()}
          </div>
          <div style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginTop: 2 }}>
            Question {pos + 1} / {sess.total_questions}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: lowTime ? 'rgba(220,38,38,.2)' : 'rgba(255,255,255,.1)',
              color: lowTime ? '#fca5a5' : '#c7d2fe',
              border: `1px solid ${lowTime ? 'rgba(220,38,38,.4)' : 'rgba(255,255,255,.18)'}`,
              animation: lowTime ? 'pulse 1.5s infinite' : undefined,
            }}
          >
            {lowTime ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            <span style={{ fontFamily: 'DM Mono', fontSize: 16, fontWeight: 700, letterSpacing: '.05em' }}>
              {formatTime(secondsLeft)}
            </span>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="fd-btn-primary"
            style={{ background: '#16a34a' }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Soumettre
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 grid gap-5" style={{ gridTemplateColumns: 'minmax(0, 1fr) 280px' }}>
        {/* Question card */}
        <div
          style={{
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div className="flex items-start gap-4 mb-5">
            <div
              className="inline-flex items-center justify-center flex-shrink-0"
              style={{
                width: 44, height: 44, borderRadius: 11,
                background: 'linear-gradient(135deg,#4f46e5,#818cf8)', color: '#fff',
                fontSize: 16, fontWeight: 800, fontFamily: 'DM Mono',
              }}
            >
              {pos + 1}
            </div>
            <div className="flex-1 min-w-0 concours-dark-prose concours-sim-statement" style={{ fontSize: 18, color: '#fff', lineHeight: 1.7 }}>
              <ConcoursContentRenderer html={q.statement} />
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {q.options.map(opt => {
              const selected = answers[pos] === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => choose(opt.key)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '14px 16px', borderRadius: 12,
                    background: selected ? 'rgba(129,140,248,.18)' : 'rgba(255,255,255,.04)',
                    border: `1.5px solid ${selected ? '#818cf8' : 'rgba(255,255,255,.08)'}`,
                    color: '#fff',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all .15s',
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: selected ? '#4f46e5' : 'transparent',
                      color: selected ? '#fff' : '#c7d2fe',
                      fontSize: 14, fontWeight: 800, fontFamily: 'DM Mono',
                      border: `1.5px solid ${selected ? '#4f46e5' : 'rgba(255,255,255,.18)'}`,
                    }}
                  >
                    {opt.key}
                  </span>
                  <div className="flex-1 concours-dark-prose concours-sim-option" style={{ fontSize: 16, lineHeight: 1.65 }}>
                    <ConcoursContentRenderer html={opt.text} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setPos(p => Math.max(0, p - 1))}
              disabled={pos === 0}
              className="fd-btn-ghost"
              style={{
                background: 'transparent', color: '#c7d2fe',
                border: '1px solid rgba(255,255,255,.18)',
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Précédente
            </button>
            <button
              onClick={() => choose('')}
              className="fd-btn-ghost"
              style={{
                background: 'transparent', color: '#c7d2fe',
                border: '1px solid rgba(255,255,255,.18)',
              }}
            >
              Effacer
            </button>
            <button
              onClick={() => setPos(p => Math.min(sess.total_questions - 1, p + 1))}
              disabled={pos === sess.total_questions - 1}
              className="fd-btn-primary"
            >
              Suivante <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sidebar — question grid */}
        <div
          style={{
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 16,
            padding: 18,
            height: 'fit-content',
            position: 'sticky',
            top: 92,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            Questions
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {sess.questions_snapshot.map((_, i) => {
              const isAnswered = answered.has(i);
              const isCurrent = i === pos;
              return (
                <button
                  key={i}
                  onClick={() => setPos(i)}
                  style={{
                    aspectRatio: '1 / 1',
                    minWidth: 36,
                    borderRadius: 8,
                    border: `1.5px solid ${isCurrent ? '#818cf8' : isAnswered ? 'rgba(34,197,94,.4)' : 'rgba(255,255,255,.12)'}`,
                    background: isCurrent
                      ? 'rgba(129,140,248,.25)'
                      : isAnswered ? 'rgba(34,197,94,.15)' : 'transparent',
                    color: isCurrent ? '#fff' : isAnswered ? '#86efac' : '#c7d2fe',
                    fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono',
                    cursor: 'pointer',
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-1.5 mt-4" style={{ fontSize: 11, color: '#c7d2fe' }}>
            <div className="flex items-center gap-2">
              <span style={{ width: 12, height: 12, borderRadius: 4, background: 'rgba(34,197,94,.15)', border: '1.5px solid rgba(34,197,94,.4)' }} />
              {answered.size} répondues
            </div>
            <div className="flex items-center gap-2">
              <span style={{ width: 12, height: 12, borderRadius: 4, border: '1.5px solid rgba(255,255,255,.12)' }} />
              {sess.total_questions - answered.size} restantes
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div className="fd-card" style={{ maxWidth: 420, padding: 22 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b' }}>Soumettre la simulation ?</h3>
            <p style={{ fontSize: 13, color: '#7068a8', marginTop: 6 }}>
              Tu as répondu à <strong style={{ color: '#1e1b4b' }}>{answered.size}</strong> question{answered.size > 1 ? 's' : ''} sur {sess.total_questions}.
              Les questions non répondues compteront comme fausses.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button className="fd-btn-ghost" onClick={() => setShowConfirm(false)}>Continuer</button>
              <button
                className="fd-btn-primary"
                onClick={() => { setShowConfirm(false); handleSubmit(true); }}
                disabled={submitting}
                style={{ background: '#16a34a' }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Soumettre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
