/**
 * Non-simulation view of a single concours exam.
 * Shows every question with correct answer + explanation.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Bookmark, MessageSquare, Loader2,
  Check, Lightbulb, Clock, ListChecks, Trash2, Play, ChevronDown, ChevronUp, ChevronRight,
  BookOpen, BarChart3, Trophy,
} from 'lucide-react';
import {
  getConcoursExam, toggleSaveExam, startSimulation,
  listExamComments, postExamComment, deleteConcoursComment,
  type ConcoursExam, type ConcoursComment,
} from '@/lib/api/concoursApi';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import { ConcoursContentRenderer } from './ConcoursContentRenderer';
import { ConcoursExamStatsTab } from './ConcoursExamStatsTab';
import { ConcoursExamActivityTab } from './ConcoursExamActivityTab';

type ExamTab = 'navigation' | 'stats' | 'activity';

const CONCOURS_COLOR: Record<string, { from: string; to: string; light: string; text: string; headerVia: string }> = {
  ensa:     { from: '#4f46e5', to: '#818cf8', light: '#eef2ff', text: '#4338ca', headerVia: '#6d28d9' },
  ensam:    { from: '#0891b2', to: '#22d3ee', light: '#ecfeff', text: '#0e7490', headerVia: '#0e7490' },
  medecine: { from: '#be185d', to: '#f472b6', light: '#fdf2f8', text: '#9d174d', headerVia: '#db2777' },
};

export default function ConcoursExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [exam, setExam] = useState<ConcoursExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<ExamTab>('navigation');

  const refresh = async () => {
    if (!id) return;
    try { setLoading(true); setExam(await getConcoursExam(id)); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [id]);

  const onSave = async () => {
    if (!exam || saving) return;
    setSaving(true);
    try { const r = await toggleSaveExam(exam.id); setExam({ ...exam, is_saved: r.is_saved }); }
    finally { setSaving(false); }
  };

  const onStartSimulation = async () => {
    if (!exam || starting) return;
    if (!isAuthenticated) { navigate('/login'); return; }
    setStarting(true);
    try {
      const r = await startSimulation({ mode: 'exam', concours_type: exam.concours_type, exam_id: exam.id });
      navigate(`/concours/simulate/${r.session_id}`);
    } catch (e) { console.error(e); setStarting(false); }
  };

  const revealAll = () => {
    if (!exam) return;
    const q = exam.structure?.questions || [];
    const all: Record<number, boolean> = {};
    q.forEach((_, i) => { all[i] = true; });
    setRevealed(all);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff' }} className="flex items-center justify-center">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#4f46e5' }} />
    </div>
  );

  if (!exam) return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff' }} className="flex items-center justify-center">
      <div className="fd-card p-8 text-center">
        <p style={{ color: '#7068a8' }}>Examen introuvable.</p>
        <Link to="/concours" className="fd-btn-primary mt-4 inline-flex">Retour</Link>
      </div>
    </div>
  );

  const theme = CONCOURS_COLOR[exam.concours_type] || CONCOURS_COLOR.ensa;
  const questions = exam.structure?.questions || [];
  const revealedCount = Object.values(revealed).filter(Boolean).length;

  const allRevealed = questions.length > 0 && revealedCount === questions.length;
  const pct = questions.length > 0 ? Math.round((revealedCount / questions.length) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#fbfaff' }}>
      <SEO title={`${exam.title} - Fidni`} description={exam.description} />
      <style>{`
        .concours-question-card .ProseMirror p { margin: 0 0 .5em; }
        .concours-question-card .ProseMirror p:last-child { margin-bottom: 0; }
        .concours-question-text .katex,
        .concours-question-text .katex-display { font-size: 1.18em; }
        .concours-option-text .katex,
        .concours-option-text .katex-display { font-size: 1.06em; }
        .concours-explanation-text .katex,
        .concours-explanation-text .katex-display { font-size: 1.06em; }
        .concours-question-card .katex-display { margin: .5em 0; }
        .opt-row { transition: background .12s, border-color .12s; }
        .opt-row:hover { background: #f4f2ff !important; }
        .reveal-btn { transition: all .15s; }
        .reveal-btn:hover { filter: brightness(.97); }
      `}</style>

      {/* ═══════════ Header (gradient, full-width — ContentDetail style) ═══════════ */}
      <div className="relative" style={{
        background: `linear-gradient(110deg, ${theme.from} 0%, ${theme.headerVia} 55%, ${theme.to} 100%)`,
      }}>
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="concoursGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#concoursGrid)" />
          </svg>
        </div>
        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {/* Top row: breadcrumb + actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/concours')}
                className="p-2 -ml-2 rounded-xl text-white/75 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <nav className="flex items-center gap-1.5 text-sm">
                <button onClick={() => navigate('/concours')}
                        className="text-white/75 hover:text-white transition-colors">
                  Examens
                </button>
                <ChevronRight className="w-4 h-4 text-white/40" />
                <button onClick={() => navigate(`/concours?concours=${exam.concours_type}`)}
                        className="text-white/75 hover:text-white transition-colors">
                  {exam.concours_type_display}
                </button>
                <ChevronRight className="w-4 h-4 text-white/40" />
                <span className="text-white font-medium">{exam.year}</span>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onStartSimulation}
                disabled={starting}
                className="rounded-xl flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white hover:bg-white/90 transition-colors disabled:opacity-70"
                style={{ color: theme.text }}
              >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span className="hidden sm:inline">Simulation</span>
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className={`rounded-xl flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors ${exam.is_saved ? 'bg-white/20' : ''}`}
              >
                {saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Bookmark className="w-4 h-4" fill={exam.is_saved ? 'currentColor' : 'none'} />}
                <span className="hidden sm:inline">{exam.is_saved ? 'Enregistré' : 'Enregistrer'}</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {exam.title}
          </h1>
          {exam.description && (
            <p className="text-sm text-white/80 mt-2 max-w-2xl leading-relaxed">
              {exam.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="w-4 h-4" /> {exam.question_count} questions
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {exam.duration_minutes} min
            </span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-5 -mb-px overflow-x-auto scrollbar-hide">
            {([
              { id: 'navigation', label: 'Navigation', icon: BookOpen },
              { id: 'stats',      label: 'Statistiques', icon: BarChart3 },
              { id: 'activity',   label: 'Activité', icon: Trophy },
            ] as { id: ExamTab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all whitespace-nowrap ${
                    isActive ? 'bg-[#fbfaff]' : 'text-white/75 hover:text-white hover:bg-white/10'
                  }`}
                  style={isActive ? { color: theme.text } : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ───── Content ───── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-7" style={{ paddingBottom: 120 }}>

        {/* ═════ TAB: Statistiques ═════ */}
        {activeTab === 'stats' && (
          <ConcoursExamStatsTab examId={exam.id} theme={theme} />
        )}

        {/* ═════ TAB: Activité ═════ */}
        {activeTab === 'activity' && (
          <ConcoursExamActivityTab examId={exam.id} theme={theme} isAuthenticated={isAuthenticated} />
        )}

        {/* ═════ TAB: Navigation (révision) ═════ */}
        {activeTab === 'navigation' && (
        <div className="max-w-3xl mx-auto">
        <p style={{ fontSize: 13, color: '#9391b8', marginBottom: 20, lineHeight: 1.5 }}>
          📖 Mode révision — les réponses sont masquées. Réfléchis à chaque question, puis révèle le corrigé.
        </p>

        {/* Questions */}
        {questions.length === 0 ? (
          <div className="fd-card text-center" style={{ padding: 56 }}>
            <p style={{ color: '#9391b8', fontSize: 14 }}>Aucune question disponible pour cet examen.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {questions.map((q, idx) => {
              const open = !!revealed[idx];
              const correctOpt = q.options.find(o => o.key === q.correct_key);
              return (
                <div
                  key={q.id || idx}
                  className="concours-question-card animate-fade-up"
                  style={{
                    background: '#fff', borderRadius: 18,
                    border: '1px solid #ece9fb',
                    boxShadow: '0 1px 3px rgba(90,70,200,.05)',
                    padding: '26px 28px',
                  }}
                >
                  {/* Question header line */}
                  <div className="flex items-center gap-3 mb-4">
                    <span style={{
                      fontSize: 12, fontWeight: 800, fontFamily: 'DM Mono',
                      color: theme.from, letterSpacing: '.02em',
                    }}>
                      QUESTION {idx + 1}
                    </span>
                    <span style={{ flex: 1, height: 1, background: '#f0eefb' }} />
                    {q.points && (
                      <span style={{ fontSize: 11, color: '#9391b8', fontFamily: 'DM Mono', fontWeight: 600 }}>
                        {q.points} pt{q.points > 1 ? 's' : ''}
                      </span>
                    )}
                    {open && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 700, color: '#16a34a',
                        background: '#ecfdf5', padding: '2px 9px', borderRadius: 99,
                      }}>
                        <Check className="w-3 h-3" /> Révélée
                      </span>
                    )}
                  </div>

                  {/* Statement */}
                  <div className="concours-question-text"
                       style={{ fontSize: 17, color: '#1e1b4b', lineHeight: 1.8, marginBottom: 22 }}>
                    <ConcoursContentRenderer html={q.statement} />
                  </div>

                  {/* Options */}
                  <div className="flex flex-col gap-2.5">
                    {q.options.map(opt => {
                      const isCorrect = opt.key === q.correct_key;
                      const showCorrect = open && isCorrect;
                      return (
                        <div
                          key={opt.key}
                          className="opt-row flex items-start gap-3"
                          style={{
                            padding: '13px 16px', borderRadius: 12,
                            background: showCorrect ? '#f0fdf4' : '#faf9ff',
                            border: `1.5px solid ${showCorrect ? '#86efac' : '#efedf9'}`,
                          }}
                        >
                          <span style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: showCorrect ? '#16a34a' : '#fff',
                            color: showCorrect ? '#fff' : '#9391b8',
                            fontSize: 13, fontWeight: 800, fontFamily: 'DM Mono',
                            border: `1.5px solid ${showCorrect ? '#16a34a' : '#e4e2f5'}`,
                          }}>
                            {opt.key}
                          </span>
                          <div className="flex-1 concours-option-text"
                               style={{ fontSize: 15, color: showCorrect ? '#166534' : '#1e1b4b', lineHeight: 1.6, paddingTop: 3, fontWeight: showCorrect ? 600 : 400 }}>
                            <ConcoursContentRenderer html={opt.text} />
                          </div>
                          {showCorrect && (
                            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#16a34a' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reveal button */}
                  <button
                    className="reveal-btn"
                    onClick={() => setRevealed(prev => ({ ...prev, [idx]: !prev[idx] }))}
                    style={{
                      marginTop: 18, width: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '12px 18px', borderRadius: 11, cursor: 'pointer',
                      background: open ? '#fff' : theme.from,
                      color: open ? '#9391b8' : '#fff',
                      border: open ? '1.5px solid #e4e2f5' : 'none',
                      fontSize: 14, fontWeight: 700,
                    }}
                  >
                    {open
                      ? <><ChevronUp className="w-4 h-4" /> Masquer le corrigé</>
                      : <><ChevronDown className="w-4 h-4" /> Voir le corrigé</>}
                  </button>

                  {/* Explanation */}
                  {open && q.explanation && (
                    <div className="mt-4 animate-fade-up" style={{
                      background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14, padding: '18px 22px',
                    }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4" style={{ color: '#a16207' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#a16207' }}>Explication</span>
                        {correctOpt && (
                          <span style={{
                            marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                            color: '#15803d', background: '#dcfce7', padding: '3px 10px', borderRadius: 99,
                          }}>
                            Réponse : {q.correct_key}
                          </span>
                        )}
                      </div>
                      <div className="concours-explanation-text"
                           style={{ fontSize: 15, color: '#3f3d63', lineHeight: 1.75 }}>
                        <ConcoursContentRenderer html={q.explanation} />
                      </div>
                    </div>
                  )}
                  {open && !q.explanation && (
                    <div className="mt-4" style={{
                      background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 11,
                      padding: '12px 18px', fontSize: 14, color: '#15803d', fontWeight: 600,
                    }}>
                      Bonne réponse : <strong>{q.correct_key}</strong>
                      {correctOpt && (
                        <span style={{ fontWeight: 400, color: '#166534', marginLeft: 8 }}>
                          — <ConcoursContentRenderer html={correctOpt.text} />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Comments */}
        <div className="mt-10" style={{
          background: '#fff', borderRadius: 18, border: '1px solid #ece9fb', padding: '24px 28px',
        }}>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4" style={{ color: '#4338ca' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>Commentaires</h3>
          </div>
          <CommentsBlock examId={exam.id} currentUserId={user?.id} />
        </div>
        </div>
        )}
      </div>

      {/* ───── Floating action bar (navigation tab only) ───── */}
      {activeTab === 'navigation' && questions.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          display: 'flex', justifyContent: 'center',
          padding: '0 16px 18px', pointerEvents: 'none',
        }}>
          <div style={{
            pointerEvents: 'auto',
            width: '100%', maxWidth: 640,
            background: '#fff', borderRadius: 16,
            border: '1px solid #e8e5f7',
            boxShadow: '0 8px 30px rgba(60,40,160,.16)',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            {/* Progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#7068a8' }}>
                  {revealedCount}/{questions.length} corrigés révélés
                </span>
                <button
                  onClick={() => allRevealed ? setRevealed({}) : revealAll()}
                  style={{
                    fontSize: 11, fontWeight: 700, color: theme.from,
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  {allRevealed ? 'Tout masquer' : 'Tout révéler'}
                </button>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: '#efedf9', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 99,
                  background: `linear-gradient(90deg,${theme.from},${theme.to})`,
                  transition: 'width .3s ease',
                }} />
              </div>
            </div>

            {/* Simulation CTA */}
            <button
              onClick={onStartSimulation}
              disabled={starting}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg,${theme.from},${theme.to})`,
                color: '#fff', fontSize: 14, fontWeight: 700,
                boxShadow: `0 4px 14px ${theme.from}44`,
                opacity: starting ? .7 : 1,
              }}
            >
              {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span className="hidden sm:inline">Lancer la</span> simulation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────── Comments ────────── */

function CommentsBlock({ examId, currentUserId }: { examId: number; currentUserId?: number | string }) {
  const [comments, setComments] = useState<ConcoursComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const refresh = async () => {
    try { setLoading(true); setComments(await listExamComments(examId)); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [examId]);

  const post = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try { await postExamComment(examId, text.trim()); setText(''); await refresh(); }
    finally { setPosting(false); }
  };

  const remove = async (cid: number) => {
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    await deleteConcoursComment(cid); await refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pose une question ou partage une astuce…"
          rows={2}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            border: '1.5px solid #e4e2f5', background: '#f9f8ff',
            fontSize: 13, color: '#1e1b4b',
            outline: 'none', resize: 'vertical', minHeight: 64,
          }}
        />
        <button
          onClick={post}
          disabled={!text.trim() || posting}
          className="fd-btn-primary"
          style={{ alignSelf: 'flex-end', minWidth: 80 }}
        >
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publier'}
        </button>
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: 16 }}>
          <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: '#4f46e5' }} />
        </div>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9391b8', fontStyle: 'italic' }}>Aucun commentaire pour le moment.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3" style={{
              background: '#f9f8ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '12px 14px',
            }}>
              {c.author.avatar
                ? <img src={c.author.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                : (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#4f46e5,#818cf8)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>{c.author.username[0]?.toUpperCase()}</div>
                )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e1b4b' }}>{c.author.username}</span>
                  <span style={{ fontSize: 10, color: '#9391b8' }}>
                    {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#4b4880', marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.content}</p>
              </div>
              {currentUserId !== undefined && Number(currentUserId) === c.author.id && (
                <button onClick={() => remove(c.id)}
                        style={{ background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer', flexShrink: 0 }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
