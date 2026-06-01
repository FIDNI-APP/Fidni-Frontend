import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConcoursHero } from './ConcoursHero';
import {
  Loader2, Trophy, Clock, ChevronRight, Calendar, Shuffle, ListChecks,
  TrendingUp, Target, History as HistoryIcon,
} from 'lucide-react';
import {
  listMySessions, CONCOURS_TYPES,
  type SimulationSessionListItem, type ConcoursType, type SimulationMode,
} from '@/lib/api/concoursApi';
import { SEO } from '@/components/layout/SEO';

const MODE_ICON: Record<SimulationMode, any> = {
  exam: ListChecks, random_year: Calendar, random_mix: Shuffle,
};

const SCORE_COLOR = (pct: number, submitted: boolean) => {
  if (!submitted) return { color: '#9391b8', bg: '#f5f4ff' };
  if (pct >= 75) return { color: '#16a34a', bg: '#f0fdf4' };
  if (pct >= 50) return { color: '#d97706', bg: '#fffbeb' };
  return { color: '#dc2626', bg: '#fef2f2' };
};

export default function ConcoursHistoryPage() {
  const [sessions, setSessions] = useState<SimulationSessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ConcoursType | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listMySessions(filterType ? { concours_type: filterType } : {});
        setSessions(data);
      } finally { setLoading(false); }
    })();
  }, [filterType]);

  const stats = useMemo(() => {
    const done = sessions.filter(s => s.status === 'submitted');
    const count = done.length;
    const avg = count ? Math.round(done.reduce((a, s) => a + s.score_percentage, 0) / count) : 0;
    const best = count ? Math.round(Math.max(...done.map(s => s.score_percentage))) : 0;
    return { total: sessions.length, count, avg, best };
  }, [sessions]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff' }}>
      <SEO title="Historique de simulations - Fidni" description="Historique des simulations" />
      <style>{`
        .session-card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(90,70,200,.12) !important; }
      `}</style>

      <ConcoursHero
        icon={HistoryIcon}
        badge="HISTORIQUE"
        title="Mon historique"
        subtitle="Suis tes simulations et ta progression au fil du temps."
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">

        {/* Stat cards */}
        {!loading && stats.count > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-7 animate-fade-up">
            {[
              { icon: Trophy, label: 'Simulations', value: stats.count, color: '#4f46e5', bg: '#eef2ff' },
              { icon: TrendingUp, label: 'Score moyen', value: `${stats.avg}%`, color: '#0e7490', bg: '#ecfeff' },
              { icon: Target, label: 'Meilleur score', value: `${stats.best}%`, color: '#16a34a', bg: '#f0fdf4' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} style={{
                background: '#fff', borderRadius: 16, border: '1px solid #ece9fb',
                padding: '18px 20px', boxShadow: '0 2px 10px rgba(90,70,200,.05)',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, background: bg, color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#1e1b4b', fontFamily: 'DM Mono', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontSize: 12, color: '#9391b8', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          <button
            className={`fd-pill ${!filterType ? 'is-active' : ''}`}
            onClick={() => setFilterType(null)}
          >
            Tous
          </button>
          {CONCOURS_TYPES.map(c => (
            <button
              key={c.id}
              className={`fd-pill ${filterType === c.id ? 'is-active' : ''}`}
              onClick={() => setFilterType(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center" style={{ padding: '80px 0' }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#4f46e5' }} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="fd-card text-center" style={{ padding: 64 }}>
            <Trophy className="w-10 h-10 mx-auto mb-4" style={{ color: '#c4c0e8' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b', marginBottom: 6 }}>
              Aucune simulation pour le moment
            </p>
            <p style={{ fontSize: 13, color: '#7068a8', marginBottom: 20 }}>
              Lance ta première simulation depuis la page des examens.
            </p>
            <Link to="/concours" className="fd-btn-primary inline-flex">
              Parcourir les examens
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map(s => {
              const Icon = MODE_ICON[s.mode] || ListChecks;
              const pct = Math.round(s.score_percentage);
              const isSubmitted = s.status === 'submitted';
              const sc = SCORE_COLOR(pct, isSubmitted);
              return (
                <Link
                  key={s.id}
                  to={isSubmitted ? `/concours/sessions/${s.id}/recap` : `/concours/simulate/${s.id}`}
                  className="session-card animate-fade-up"
                  style={{
                    textDecoration: 'none', display: 'flex', alignItems: 'stretch',
                    background: '#fff', borderRadius: 16, border: '1px solid #ece9fb',
                    boxShadow: '0 2px 10px rgba(90,70,200,.05)', overflow: 'hidden',
                    transition: 'transform .2s, box-shadow .2s',
                  }}
                >
                  {/* Left accent + score */}
                  <div style={{
                    flexShrink: 0, width: 92,
                    background: sc.bg,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderRight: `1px solid ${sc.color}1a`,
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: sc.color, fontFamily: 'DM Mono', letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {isSubmitted ? `${pct}%` : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: sc.color, opacity: .75, marginTop: 3, fontFamily: 'DM Mono' }}>
                      {s.correct_count}/{s.total_questions}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex items-center gap-3 flex-1 min-w-0" style={{ padding: '14px 18px' }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: '#f4f2ff', color: '#4338ca',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>
                          {s.concours_type_display}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: '#4338ca', background: '#eef2ff',
                          padding: '2px 8px', borderRadius: 99, letterSpacing: '.04em', textTransform: 'uppercase',
                        }}>
                          {s.mode_display}
                        </span>
                        {!isSubmitted && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: '#a16207', background: '#fef9c3',
                            padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '.04em',
                          }}>
                            À reprendre
                          </span>
                        )}
                      </div>
                      {s.exam_title && (
                        <div style={{ fontSize: 12, color: '#7068a8', marginTop: 3 }} className="truncate">{s.exam_title}</div>
                      )}
                      <div className="flex items-center gap-3 mt-1.5" style={{ fontSize: 11, color: '#9391b8' }}>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {s.duration_minutes} min
                        </span>
                        <span>·</span>
                        <span>{new Date(s.started_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#c4c0e8' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
