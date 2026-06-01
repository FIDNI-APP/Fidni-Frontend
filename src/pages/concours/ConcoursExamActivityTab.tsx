/**
 * "Activité" tab of the exam detail page.
 *
 *  - mine:      the signed-in user's own simulations on this exam (history).
 *               Hidden behind a login CTA for anonymous visitors.
 *  - community: last 10 submitted exam-mode sessions, anonymised.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Trophy, Clock, ChevronRight, Users, Lock } from 'lucide-react';
import { getExamActivity, type ExamActivity } from '@/lib/api/concoursApi';

type Theme = { from: string; to: string; light: string; text: string };

const scoreColor = (pct: number) =>
  pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';

const relDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function ConcoursExamActivityTab({
  examId, theme, isAuthenticated,
}: { examId: number; theme: Theme; isAuthenticated: boolean }) {
  const [data, setData] = useState<ExamActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setLoading(true); setData(await getExamActivity(examId)); }
      finally { setLoading(false); }
    })();
  }, [examId]);

  if (loading) return (
    <div className="flex justify-center" style={{ padding: '60px 0' }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: theme.from }} />
    </div>
  );
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6 animate-fade-up">

      {/* ── My history ── */}
      <section style={{
        background: '#fff', borderRadius: 18, border: '1px solid #ece9fb', padding: '24px 28px',
      }}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5" style={{ color: theme.from }} />
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em' }}>
            Mes simulations sur cet examen
          </h2>
        </div>

        {!isAuthenticated ? (
          <div style={{
            background: theme.light, borderRadius: 12, padding: '24px',
            textAlign: 'center', border: `1px solid ${theme.from}22`,
          }}>
            <Lock className="w-7 h-7 mx-auto mb-3" style={{ color: theme.from }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1e1b4b', marginBottom: 4 }}>
              Connecte-toi pour suivre tes simulations
            </p>
            <p style={{ fontSize: 13, color: '#7068a8', marginBottom: 16 }}>
              Garde une trace de tes scores et de ta progression sur cet examen.
            </p>
            <Link to="/login" className="fd-btn-primary inline-flex" style={{ background: theme.from }}>
              Se connecter
            </Link>
          </div>
        ) : !data.mine || data.mine.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9391b8', fontStyle: 'italic' }}>
            Tu n'as pas encore lancé de simulation sur cet examen.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.mine.map(s => {
              const submitted = s.status === 'submitted';
              const pct = Math.round(s.score_percentage);
              return (
                <Link
                  key={s.id}
                  to={submitted ? `/concours/sessions/${s.id}/recap` : `/concours/simulate/${s.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '13px 16px', borderRadius: 12, textDecoration: 'none',
                    background: '#faf9ff', border: '1px solid #efedf9',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e1b4b' }}>
                        {submitted ? 'Terminée' : 'En cours'}
                      </span>
                      {!submitted && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: '#a16207', background: '#fef9c3',
                          padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase',
                        }}>
                          Reprendre
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1" style={{ fontSize: 11, color: '#9391b8' }}>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {s.duration_minutes} min
                      </span>
                      <span>·</span>
                      <span>{relDate(s.started_at)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: 18, fontWeight: 800, fontFamily: 'DM Mono',
                      color: submitted ? scoreColor(pct) : '#9391b8',
                    }}>
                      {submitted ? `${pct}%` : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: '#9391b8', fontFamily: 'DM Mono' }}>
                      {s.correct_count}/{s.total_questions}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#c4c0e8' }} />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Community ── */}
      <section style={{
        background: '#fff', borderRadius: 18, border: '1px solid #ece9fb', padding: '24px 28px',
      }}>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5" style={{ color: theme.from }} />
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em' }}>
            Dernières sessions de la communauté
          </h2>
        </div>
        <p style={{ fontSize: 13, color: '#7068a8', marginBottom: 16 }}>
          Les 10 dernières simulations terminées sur cet examen (anonymisées).
        </p>

        {data.community.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9391b8', fontStyle: 'italic' }}>
            Personne n'a encore terminé de simulation sur cet examen. Sois le premier !
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.community.map((s, i) => {
              const pct = Math.round(s.score_percentage);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 12,
                  background: '#faf9ff', border: '1px solid #efedf9',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: theme.light, color: theme.text,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800,
                  }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>
                      Un étudiant
                    </div>
                    <div style={{ fontSize: 11, color: '#9391b8' }}>
                      {relDate(s.submitted_at)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: 17, fontWeight: 800, fontFamily: 'DM Mono', color: scoreColor(pct),
                    }}>
                      {pct}%
                    </div>
                    <div style={{ fontSize: 10, color: '#9391b8', fontFamily: 'DM Mono' }}>
                      {s.correct_count}/{s.total_questions}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
