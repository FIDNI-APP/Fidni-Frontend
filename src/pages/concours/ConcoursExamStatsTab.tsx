/**
 * "Statistiques" tab of the exam detail page.
 *
 *  1. Auto distribution of this exam's questions across subject / subfield /
 *     chapter (sub-tabs), derived from question metadata by the backend.
 *  2. Admin-curated comparison block: free rich-text + insight cards.
 */
import { useEffect, useState } from 'react';
import { Loader2, BarChart3, Layers } from 'lucide-react';
import { getExamStats, type ExamStats, type DistributionEntry } from '@/lib/api/concoursApi';
import { ConcoursContentRenderer } from './ConcoursContentRenderer';

type Theme = { from: string; to: string; light: string; text: string };
type Level = 'subject' | 'subfield' | 'chapter';

const LEVEL_LABEL: Record<Level, string> = {
  subject: 'Matière',
  subfield: 'Domaine',
  chapter: 'Chapitre',
};

export function ConcoursExamStatsTab({ examId, theme }: { examId: number; theme: Theme }) {
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<Level>('subject');

  useEffect(() => {
    (async () => {
      try { setLoading(true); setStats(await getExamStats(examId)); }
      finally { setLoading(false); }
    })();
  }, [examId]);

  if (loading) return (
    <div className="flex justify-center" style={{ padding: '60px 0' }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: theme.from }} />
    </div>
  );
  if (!stats) return null;

  const rows: DistributionEntry[] = stats.distribution[level] || [];
  const maxPct = rows.reduce((m, r) => Math.max(m, r.pct), 0) || 1;
  const hasComparison = !!stats.comparison_html?.trim() || (stats.insight_cards?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6 animate-fade-up">

      {/* ── Distribution ── */}
      <section style={{
        background: '#fff', borderRadius: 18, border: '1px solid #ece9fb', padding: '24px 28px',
      }}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5" style={{ color: theme.from }} />
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em' }}>
            Répartition des questions
          </h2>
        </div>
        <p style={{ fontSize: 13, color: '#7068a8', marginBottom: 18 }}>
          Comment les <strong style={{ color: '#1e1b4b' }}>{stats.total_questions}</strong> questions de cet examen
          se répartissent.
        </p>

        {/* Level sub-tabs */}
        <div className="flex gap-1 mb-5" style={{
          background: '#f4f2ff', borderRadius: 11, padding: 4, width: 'fit-content',
        }}>
          {(['subject', 'subfield', 'chapter'] as Level[]).map(l => {
            const active = level === l;
            return (
              <button
                key={l}
                onClick={() => setLevel(l)}
                style={{
                  padding: '7px 16px', borderRadius: 8, cursor: 'pointer', border: 'none',
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  color: active ? theme.from : '#7068a8',
                  background: active ? '#fff' : 'transparent',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {LEVEL_LABEL[l]}
              </button>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9391b8', fontStyle: 'italic' }}>
            Aucune donnée — les questions ne sont pas encore taguées par {LEVEL_LABEL[level].toLowerCase()}.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((r, i) => {
              const untagged = r.id === null;
              return (
                <div key={`${r.id}-${i}`}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: untagged ? '#9391b8' : '#1e1b4b',
                      fontStyle: untagged ? 'italic' : 'normal',
                    }}>
                      {r.name}
                    </span>
                    <span style={{ fontSize: 12, color: '#7068a8', fontFamily: 'DM Mono', fontWeight: 600 }}>
                      {r.count} Q · {r.pct}%
                    </span>
                  </div>
                  <div style={{ height: 9, borderRadius: 99, background: '#f0eefb', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${(r.pct / maxPct) * 100}%`, borderRadius: 99,
                      background: untagged
                        ? '#c4c0e8'
                        : `linear-gradient(90deg,${theme.from},${theme.to})`,
                      transition: 'width .4s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Comparison (admin curated) ── */}
      {hasComparison ? (
        <section style={{
          background: '#fff', borderRadius: 18, border: '1px solid #ece9fb', padding: '24px 28px',
        }}>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5" style={{ color: theme.from }} />
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em' }}>
              Analyse & tendances
            </h2>
          </div>

          {/* Insight cards */}
          {stats.insight_cards?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              {stats.insight_cards.map((c, i) => (
                <div key={i} style={{
                  background: theme.light, borderRadius: 12, padding: '16px 18px',
                  border: `1px solid ${theme.from}22`,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#4b4880', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {c.text}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rich text comparison */}
          {stats.comparison_html?.trim() && (
            <div className="concours-comparison-text"
                 style={{ fontSize: 15, color: '#3f3d63', lineHeight: 1.75 }}>
              <ConcoursContentRenderer html={stats.comparison_html} />
            </div>
          )}
        </section>
      ) : (
        <section style={{
          background: '#faf9ff', borderRadius: 18, border: '1px dashed #d9d4f5',
          padding: '32px 28px', textAlign: 'center',
        }}>
          <Layers className="w-8 h-8 mx-auto mb-3" style={{ color: '#c4c0e8' }} />
          <p style={{ fontSize: 14, color: '#9391b8' }}>
            L'analyse comparative de cet examen sera bientôt disponible.
          </p>
        </section>
      )}
    </div>
  );
}
