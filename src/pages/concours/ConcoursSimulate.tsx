/**
 * Live simulation runner. Timed, no solutions visible.
 * Auto-saves each answer. Auto-submits on timeout.
 * Une réponse dont l'enregistrement a échoué (réseau) est signalée et renvoyée avant la remise de la
 * copie : sinon le serveur noterait la question comme non répondue.
 *
 * Layout:
 *   Top bar (collante) : titre + chrono + Soumettre ; sur téléphone, bande défilante des questions 1…N
 *   Ordinateur (lg) : question à gauche + grille des questions à droite (280 px)
 *   Téléphone : question pleine largeur + barre Précédente / Suivante collée en bas, à portée de pouce
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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

const ghostDark: CSSProperties = {
  background: 'transparent', color: '#d8d4cc',
  border: '1px solid rgba(255,255,255,.18)',
};

/** Boutons de la barre du bas (téléphone). */
const barBtn: CSSProperties = {
  minHeight: 44, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

/** Le serveur refuse les réponses : temps écoulé (délai de grâce compris). */
const isTimeOver = (e: unknown) =>
  (e as { response?: { data?: { code?: string } } })?.response?.data?.code === 'time_over';

/** Pastille d'une question (grille de droite et bande du téléphone). */
function QuestionPill({ index, current, answered, onClick, square = false }: {
  index: number; current: boolean; answered: boolean; onClick: () => void;
  /** Grille de l'ordinateur : case carrée qui remplit sa colonne. */
  square?: boolean;
}) {
  return (
    <button
      data-pos={index}
      onClick={onClick}
      aria-label={`Question ${index + 1}${answered ? ', répondue' : ''}`}
      aria-current={current ? 'step' : undefined}
      className={square ? undefined : 'flex-shrink-0'}
      style={{
        ...(square ? { aspectRatio: '1 / 1', minWidth: 36 } : { width: 38, height: 38 }),
        borderRadius: 8,
        border: `1.5px solid ${current ? '#d8d4cc' : answered ? 'rgba(34,197,94,.4)' : 'rgba(255,255,255,.12)'}`,
        background: current
          ? 'rgba(180,176,168,.3)'
          : answered ? 'rgba(34,197,94,.15)' : 'transparent',
        color: current ? '#fff' : answered ? '#86efac' : '#d8d4cc',
        fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono',
        cursor: 'pointer',
      }}
    >
      {index + 1}
    </button>
  );
}

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
  const [submitError, setSubmitError] = useState('');
  const submittedRef = useRef(false);
  const stripRef = useRef<HTMLDivElement>(null);
  // Dernière réponse choisie par question (lue par les envois en cours) et réponses à renvoyer.
  const answersRef = useRef<Record<number, string>>({});
  const unsavedRef = useRef<Set<number>>(new Set());
  const [unsaved, setUnsaved] = useState<ReadonlySet<number>>(() => new Set());

  const markUnsaved = useCallback((p: number, on: boolean) => {
    if (unsavedRef.current.has(p) === on) return;
    const next = new Set(unsavedRef.current);
    if (on) next.add(p); else next.delete(p);
    unsavedRef.current = next;
    setUnsaved(next);
  }, []);

  // Load session
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        setLoading(true);
        const s = await getSimulationSession(sessionId);
        setSess(s);
        answersRef.current = s.answers || {};
        setAnswers(answersRef.current);
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

  const handleSubmit = useCallback(async (silent = false) => {
    if (!sess || submittedRef.current) return;
    if (!silent && !window.confirm('Soumettre la simulation maintenant ?')) {
      return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      // Réponses restées en échec : renvoyées d'abord, sinon elles compteraient comme non répondues.
      for (const p of Array.from(unsavedRef.current)) {
        try {
          await answerSimulationQuestion(sess.session_id, p, answersRef.current[p] ?? '');
          markUnsaved(p, false);
        } catch (e) {
          if (!isTimeOver(e)) throw e;  // temps écoulé : la copie part avec ce qui est enregistré
        }
      }
      await submitSimulation(sess.session_id);
      navigate(`/concours/sessions/${sess.session_id}/recap`, { replace: true });
    } catch (e) {
      console.error(e);
      submittedRef.current = false;
      setSubmitting(false);
      setSubmitError(unsavedRef.current.size > 0
        ? "Certaines réponses ne sont pas encore enregistrées. Vérifie ta connexion, puis réessaie."
        : "Ta copie n'a pas pu être envoyée. Vérifie ta connexion, puis réessaie.");
    }
  }, [sess, navigate, markUnsaved]);

  // Compte à rebours recalculé depuis l'heure de fin à chaque tic : les navigateurs ralentissent
  // les minuteries des onglets en arrière-plan, et un simple « -1 par seconde » dérivait alors
  // de plusieurs minutes. Au retour sur l'onglet, l'affichage est juste immédiatement.
  useEffect(() => {
    if (!sess || sess.status !== 'in_progress') return;
    const endMs = new Date(sess.started_at).getTime() + sess.duration_minutes * 60 * 1000;
    const tick = () => {
      const left = Math.max(0, Math.round((endMs - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(t);
        if (!submittedRef.current) handleSubmit(true);
      }
    };
    const t = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [sess, handleSubmit]);

  // Bande des questions (téléphone) : la pastille courante reste en vue.
  useEffect(() => {
    const strip = stripRef.current;
    const pill = strip?.querySelector<HTMLElement>(`[data-pos="${pos}"]`);
    if (!strip || !pill) return;
    strip.scrollTo({ left: pill.offsetLeft - (strip.clientWidth - pill.offsetWidth) / 2, behavior: 'smooth' });
  }, [pos, sess]);

  const choose = async (key: string) => {
    if (!sess) return;
    const p = pos;
    answersRef.current = { ...answersRef.current, [p]: key };
    setAnswers(answersRef.current);
    try {
      await answerSimulationQuestion(sess.session_id, p, key);
      // Seule la dernière réponse choisie compte (un envoi plus ancien peut aboutir après).
      if ((answersRef.current[p] ?? '') === key) markUnsaved(p, false);
    } catch (e) {
      console.error('answer save failed', e);
      // Temps écoulé côté serveur (horloge de l'appareil en retard, onglet endormi…) : on rend la copie.
      if (isTimeOver(e)) {
        if (!submittedRef.current) handleSubmit(true);
        return;
      }
      if ((answersRef.current[p] ?? '') === key) markUnsaved(p, true);
    }
  };

  /** Change de question et remonte au début de l'énoncé (utile sur téléphone, où l'on a défilé). */
  const goTo = (i: number) => {
    setPos(i);
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
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
      <div style={{ minHeight: '100vh', background: '#faf9f7' }} className="flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#1a1a1a' }} />
      </div>
    );
  }

  const item = sess.questions_snapshot[pos];
  if (!item) return null;
  const q = item.question;
  const isLast = pos === sess.total_questions - 1;

  return (
    // Colonne flexible : sur téléphone, la barre Précédente / Suivante reste en bas même si la question est courte.
    <div className="flex flex-col lg:pb-8" style={{ minHeight: '100vh', background: '#1a1a1a', color: '#fff' }}>
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
        .concours-sim-strip { scrollbar-width: none; }
        .concours-sim-strip::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Top bar */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(20,18,16,.94)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,.08)',
        }}
        className="px-4 py-2.5 lg:px-6 lg:py-3.5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate" style={{ fontSize: 11, letterSpacing: '.06em', color: '#b8b4ac', textTransform: 'uppercase', fontWeight: 700 }}>
              <span className="hidden sm:inline">Simulation · </span>{sess.concours_type.toUpperCase()}
            </div>
            <div className="whitespace-nowrap" style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginTop: 2 }}>
              <span className="sm:hidden">Q. </span><span className="hidden sm:inline">Question </span>{pos + 1} / {sess.total_questions}
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            <div
              data-tour="simulation-chrono"
              role="timer"
              aria-label="Temps restant"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 10,
                background: lowTime ? 'rgba(220,38,38,.2)' : 'rgba(255,255,255,.1)',
                color: lowTime ? '#fca5a5' : '#d8d4cc',
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
              data-tour="simulation-soumettre"
              disabled={submitting}
              className="fd-btn-primary"
              style={{ background: '#16a34a', padding: '9px 14px' }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Soumettre
            </button>
          </div>
        </div>

        {/* Téléphone : bande défilante des questions, collée sous le chrono. */}
        <div
          ref={stripRef}
          data-tour="simulation-grille"
          className="lg:hidden concours-sim-strip flex gap-1.5 overflow-x-auto mt-2.5 -mx-4 px-4 pb-0.5"
          style={{ position: 'relative', WebkitOverflowScrolling: 'touch' }}
          aria-label="Questions"
        >
          {sess.questions_snapshot.map((_, i) => (
            <QuestionPill key={i} index={i} current={i === pos} answered={answered.has(i)} onClick={() => goTo(i)} />
          ))}
        </div>

        {submitError && (
          <div
            role="alert"
            className="flex items-center gap-3 flex-wrap mt-2.5"
            style={{
              background: 'rgba(220,38,38,.16)', border: '1px solid rgba(220,38,38,.4)',
              borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#fecaca',
            }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 min-w-0">{submitError}</span>
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="fd-btn-primary"
              style={{ background: '#16a34a', padding: '7px 12px', fontSize: 12 }}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Réessayer
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 lg:py-6 grid gap-5 content-start lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Question card */}
        <div
          className="p-4 sm:p-6 min-w-0"
          style={{
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 16,
          }}
        >
          <div className="flex items-start gap-3 sm:gap-4 mb-5">
            <div
              className="inline-flex items-center justify-center flex-shrink-0"
              style={{
                width: 40, height: 40, borderRadius: 11,
                background: 'linear-gradient(135deg,#1a1a1a,#9a958c)', color: '#fff',
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
                  aria-pressed={selected}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 14px', borderRadius: 12,
                    background: selected ? 'rgba(180,176,168,.18)' : 'rgba(255,255,255,.04)',
                    border: `1.5px solid ${selected ? '#9a958c' : 'rgba(255,255,255,.08)'}`,
                    color: '#fff',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all .15s',
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: selected ? '#1a1a1a' : 'transparent',
                      color: selected ? '#fff' : '#d8d4cc',
                      fontSize: 14, fontWeight: 800, fontFamily: 'DM Mono',
                      border: `1.5px solid ${selected ? '#1a1a1a' : 'rgba(255,255,255,.18)'}`,
                    }}
                  >
                    {opt.key}
                  </span>
                  <div className="flex-1 min-w-0 concours-dark-prose concours-sim-option" style={{ fontSize: 16, lineHeight: 1.65 }}>
                    <ConcoursContentRenderer html={opt.text} />
                  </div>
                </button>
              );
            })}
          </div>

          {unsaved.has(pos) && (
            <p role="status" className="flex items-start gap-1.5 mt-3" style={{ fontSize: 12, color: '#fcd34d' }}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ marginTop: 2 }} />
              Réponse pas encore enregistrée (connexion ?). Elle sera renvoyée quand tu rendras ta copie.
            </p>
          )}

          {/* Nav (ordinateur ; sur téléphone, barre collée en bas) */}
          <div className="hidden lg:flex items-center justify-between mt-6">
            <button
              onClick={() => goTo(Math.max(0, pos - 1))}
              disabled={pos === 0}
              className="fd-btn-ghost"
              style={{ ...ghostDark, opacity: pos === 0 ? .4 : 1 }}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Précédente
            </button>
            <button
              onClick={() => choose('')}
              className="fd-btn-ghost"
              style={ghostDark}
            >
              Effacer
            </button>
            <button
              onClick={() => goTo(Math.min(sess.total_questions - 1, pos + 1))}
              disabled={isLast}
              className="fd-btn-primary"
              style={{ opacity: isLast ? .4 : 1 }}
            >
              Suivante <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sidebar — question grid (ordinateur) */}
        <div
          data-tour="simulation-grille"
          className="hidden lg:block"
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
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b8b4ac', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            Questions
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {sess.questions_snapshot.map((_, i) => (
              <QuestionPill key={i} index={i} square current={i === pos} answered={answered.has(i)} onClick={() => goTo(i)} />
            ))}
          </div>
          <div className="flex flex-col gap-1.5 mt-4" style={{ fontSize: 11, color: '#d8d4cc' }}>
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

      {/* Téléphone : Précédente / Suivante à portée de pouce. */}
      <div
        className="lg:hidden flex items-center gap-2"
        style={{
          position: 'sticky', bottom: 0, zIndex: 30,
          background: 'rgba(20,18,16,.96)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,.1)',
          padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Pas de .fd-btn-ghost ici : son :hover clair reste « collé » après un toucher. */}
        <button
          onClick={() => goTo(Math.max(0, pos - 1))}
          disabled={pos === 0}
          className="flex-1 inline-flex items-center justify-center gap-1.5"
          style={{ ...ghostDark, ...barBtn, opacity: pos === 0 ? .4 : 1 }}
        >
          <ChevronLeft className="w-4 h-4" /> Précédente
        </button>
        {answers[pos] && (
          <button
            onClick={() => choose('')}
            className="inline-flex items-center justify-center"
            style={{ ...ghostDark, ...barBtn, padding: '0 12px' }}
          >
            Effacer
          </button>
        )}
        {isLast ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="fd-btn-primary flex-1 justify-center"
            style={{ minHeight: 44, background: '#16a34a' }}
          >
            <Send className="w-4 h-4" /> Terminer
          </button>
        ) : (
          <button
            onClick={() => goTo(Math.min(sess.total_questions - 1, pos + 1))}
            className="fd-btn-primary flex-1 justify-center"
            style={{ minHeight: 44 }}
          >
            Suivante <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Soumettre la simulation"
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div className="fd-card" style={{ maxWidth: 420, padding: 22 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>Soumettre la simulation ?</h3>
            <p style={{ fontSize: 13, color: '#6b6862', marginTop: 6 }}>
              Tu as répondu à <strong style={{ color: '#1a1a1a' }}>{answered.size}</strong> question{answered.size > 1 ? 's' : ''} sur {sess.total_questions}.
              Les questions non répondues compteront comme fausses.
            </p>
            {unsaved.size > 0 && (
              <p style={{ fontSize: 13, color: '#b45309', marginTop: 6 }}>
                {unsaved.size > 1
                  ? `${unsaved.size} réponses ne sont pas encore enregistrées : elles seront renvoyées avec ta copie.`
                  : "1 réponse n'est pas encore enregistrée : elle sera renvoyée avec ta copie."}
              </p>
            )}
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
