import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Flame, Trophy, Star, Clock, Target,
  BookOpen, TrendingUp, ChevronRight, Award,
} from 'lucide-react';
import { HomeContentCard } from '@/components/content/HomeContentCard';
import { StudyTimeBreakdown } from '@/components/dashboard/StudyTimeBreakdown';
import {
  voteExercise, voteLesson, voteExam,
  getUserDashboardStats, getRecommendedContent,
  getWeeklyProgress, type WeeklyProgress,
  type DashboardStats,
} from '@/lib/api';
import { Content, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';

export function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [recExercises, setRecExercises] = useState<Content[]>([]);
  const [recLessons, setRecLessons] = useState<Content[]>([]);
  const [recExams, setRecExams] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [progress, setProgress] = useState<WeeklyProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    if (!authLoading) fetchRecs();
    if (!authLoading && isAuthenticated) {
      fetchStats();
      fetchProgress();
    }
  }, [authLoading, isAuthenticated]);

  const fetchProgress = async () => {
    try {
      setProgressLoading(true);
      const p = await getWeeklyProgress();
      setProgress(p);
    } catch (err) {
      console.error('Home: fetchProgress failed', err);
      setProgress(null);
    } finally {
      setProgressLoading(false);
    }
  };

  const fetchRecs = async () => {
    try {
      setLoading(true);
      if (isAuthenticated) {
        const data = await getRecommendedContent();
        setRecExercises(data.exercises || []);
        setRecLessons(data.lessons || []);
        setRecExams(data.exams || []);
      } else {
        const { getExercises, getLessons, getExams } = await import('@/lib/api');
        const [ex, le, exa] = await Promise.all([
          getExercises({ sort: 'most_upvoted', per_page: 6 }),
          getLessons({ sort: 'most_upvoted', per_page: 6 }),
          getExams({ sort: 'most_upvoted', per_page: 6 }),
        ]);
        setRecExercises(ex.results || []);
        setRecLessons(le.results || []);
        setRecExams(exa.results || []);
      }
    } catch (err) {
      console.error('Home: fetchRecs failed', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const s = await getUserDashboardStats();
      setStats(s);
    } catch (err) {
      console.error('Home: fetchStats failed', err);
    }
  };

  const handleVote = async (id: string, value: VoteValue, contentType?: 'exercise' | 'lesson' | 'exam') => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      let updated: Content; let type = contentType;
      if (!type) {
        if (recExercises.some(i => i.id.toString() === id)) type = 'exercise';
        else if (recLessons.some(i => i.id.toString() === id)) type = 'lesson';
        else if (recExams.some(i => i.id.toString() === id)) type = 'exam';
      }
      if (type === 'exercise') { updated = await voteExercise(id, value); setRecExercises(p => p.map(i => i.id.toString() === id ? updated : i)); }
      else if (type === 'lesson') { updated = await voteLesson(id, value); setRecLessons(p => p.map(i => i.id.toString() === id ? updated : i)); }
      else if (type === 'exam') { updated = await voteExam(id, value); setRecExams(p => p.map(i => i.id.toString() === id ? updated : i)); }
    } catch (err) { console.error('Vote failed', err); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0effe' }}>
      <SEO
        title="Fidni - Tableau de bord"
        description="Plateforme moderne d'apprentissage en mathématiques."
        keywords={['mathématiques', 'bac', 'exercices']}
        ogType="website"
        canonicalUrl="/"
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Rich dashboard hero — navy → indigo gradient with stats + streak medallion */}
        <DashboardHero
          isAuthenticated={isAuthenticated}
          username={user?.username}
          stats={stats}
        />

        {/* Stats grid */}
        {isAuthenticated && stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard
              icon={<Flame className="w-4 h-4" />} accent="#f59e0b"
              label="Série"
              value={`${stats.streak_days || 0}`} unit="jours"
            />
            <StatCard
              icon={<Trophy className="w-4 h-4" />} accent="#4f46e5"
              label="Exercices parfaits"
              value={`${stats.perfect_completions || 0}`}
            />
            <StatCard
              icon={<Target className="w-4 h-4" />} accent="#059669"
              label="Commencés"
              value={`${stats.exercises_started || 0}`} unit={`/ ${stats.total_exercises || 0}`}
            />
            <StatCard
              icon={<Clock className="w-4 h-4" />} accent="#7c3aed"
              label="Temps d'étude"
              value={stats.study_time || '0min'}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard icon={<BookOpen className="w-4 h-4" />} accent="#4f46e5" label="Exercices" value="1K+" />
            <StatCard icon={<Trophy className="w-4 h-4" />} accent="#059669" label="Examens" value="200+" />
            <StatCard icon={<Award className="w-4 h-4" />} accent="#f59e0b" label="Leçons" value="500+" />
            <StatCard icon={<Star className="w-4 h-4" />} accent="#7c3aed" label="Élèves actifs" value="5K+" />
          </div>
        )}

        {/* Two-column: 8-week chart + per-subject panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 mb-6">
          {/* Progress chart — only when student has joined a classroom */}
          {isAuthenticated && progress?.has_classroom && progress.you.length > 0 ? (
            <div className="fd-card p-5 animate-fade-up">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>
                    Progression sur 8 semaines
                  </h3>
                  <p style={{ fontSize: 12, color: '#9391b8', marginTop: 2 }}>
                    Score moyen
                    {progress.classroom && <> · <span style={{ color: '#4338ca', fontWeight: 600 }}>{progress.classroom.name}</span></>}
                  </p>
                </div>
                <div className="flex items-center gap-3" style={{ fontSize: 11, color: '#9391b8' }}>
                  <span className="inline-flex items-center gap-1.5">
                    <span style={{ width: 18, height: 3, background: '#4f46e5', borderRadius: 2 }} />
                    Toi
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span style={{ width: 18, height: 2, background: '#94a3b8', borderRadius: 2, opacity: .7 }} />
                    Classe
                  </span>
                </div>
              </div>
              <ProgressChart data={progress.you} compare={progress.average} labels={progress.labels} accent="#4f46e5" />
            </div>
          ) : (
            <div className="fd-card p-5 animate-fade-up flex flex-col items-center justify-center text-center" style={{ minHeight: 240 }}>
              <div
                className="inline-flex items-center justify-center mb-3"
                style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'linear-gradient(135deg,#eef2ff,#f0effe)', color: '#7068a8',
                }}
              >
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>
                {progressLoading ? 'Chargement…' : 'Rejoins une classe pour comparer ta progression'}
              </h3>
              {!progressLoading && (
                <>
                  <p style={{ fontSize: 12, color: '#7068a8', marginTop: 6, maxWidth: 360 }}>
                    Une fois dans une classe, ton taux de réussite hebdomadaire sera comparé à celui de tes camarades.
                  </p>
                  <Link to="/classrooms" className="fd-btn-primary" style={{ marginTop: 14, padding: '8px 16px', fontSize: 12 }}>
                    Rejoindre une classe <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Per-subject progress panel */}
          <SubjectsPanel timeBreakdown={stats?.time_breakdown} />
        </div>

        {/* Time breakdown (existing component, redesigned) */}
        {isAuthenticated && stats?.time_breakdown && (
          <div className="fd-card p-5 mb-6 animate-fade-up">
            <StudyTimeBreakdown
              timeBreakdown={stats.time_breakdown}
              insights={stats.insights}
            />
          </div>
        )}

        {/* Recommendations */}
        <RecSection
          title="Exercices recommandés"
          subtitle="Pour toi"
          link="/exercises"
          loading={loading}
          items={recExercises}
          onVote={handleVote}
        />

        {recLessons.length > 0 && (
          <RecSection
            title="Leçons à explorer"
            subtitle="Continue d'apprendre"
            link="/lessons"
            loading={loading}
            items={recLessons}
            onVote={handleVote}
          />
        )}

        {recExams.length > 0 && (
          <RecSection
            title="Examens disponibles"
            subtitle="Mets-toi à l'épreuve"
            link="/exams"
            loading={loading}
            items={recExams}
            onVote={handleVote}
          />
        )}
      </div>
    </div>
  );
}

/* ────── Sub-components ────── */

function StatCard({ icon, label, value, unit, accent }: {
  icon: React.ReactNode; label: string; value: string; unit?: string; accent: string;
}) {
  return (
    <div
      className="fd-card p-4 animate-fade-up"
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <div className="flex items-center justify-between">
        <div
          className="inline-flex items-center justify-center"
          style={{
            width: 30, height: 30, borderRadius: 9,
            background: `${accent}15`, color: accent,
          }}
        >
          {icon}
        </div>
        <TrendingUp className="w-3 h-3" style={{ color: '#b0adcd' }} />
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span
          style={{
            fontSize: 24, fontWeight: 700, fontFamily: 'DM Mono',
            color: '#1e1b4b', letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
        {unit && <span style={{ fontSize: 11, color: '#9391b8', fontWeight: 600 }}>{unit}</span>}
      </div>
      <div
        style={{
          fontSize: 10, color: '#9391b8', fontWeight: 600,
          letterSpacing: '.04em', textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ProgressChart({ data, compare, labels, accent }: {
  data: number[]; compare: number[]; labels: string[]; accent: string;
}) {
  const [hov, setHov] = React.useState<number | null>(null);
  const W = 600, H = 180, P = 28;
  const iw = W - P * 2, ih = H - P * 2 - 16;
  const toY = (v: number) => P + ih - ((v - 40) / 60) * ih;
  const toX = (i: number) => P + (i / (data.length - 1)) * iw;
  const path = (d: number[]) => d.map((v, i) => `${i ? 'L' : 'M'}${toX(i)},${toY(v)}`).join(' ');
  const area = (d: number[]) => `${path(d)} L${toX(d.length - 1)},${H - P} L${toX(0)},${H - P} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} onMouseLeave={() => setHov(null)}>
      <defs>
        <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity=".2" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 55, 70, 85, 100].map(v => (
        <line key={v} x1={P} x2={W - P} y1={toY(v)} y2={toY(v)} stroke="#e8e5f8" strokeWidth="1" strokeDasharray="3,5" />
      ))}
      <path d={area(data)} fill="url(#chartArea)" />
      <path d={path(compare)} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,4" opacity=".8" />
      <path d={path(data)} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <g key={i} onMouseEnter={() => setHov(i)} style={{ cursor: 'pointer' }}>
          <circle cx={toX(i)} cy={toY(v)} r={hov === i ? 6 : 3.5} fill={accent} stroke="white" strokeWidth="2" />
          <circle cx={toX(i)} cy={toY(compare[i])} r={hov === i ? 4 : 2.5} fill="#94a3b8" stroke="white" strokeWidth="1.5" />
          {hov === i && (
            <>
              <rect x={toX(i) - 40} y={toY(v) - 50} width={80} height={40} rx={8} fill="#1e1b4b" opacity=".95" />
              <text x={toX(i)} y={toY(v) - 33} textAnchor="middle" fontSize="11" fill="#fff" fontFamily="DM Mono">Toi : {v}%</text>
              <text x={toX(i)} y={toY(v) - 17} textAnchor="middle" fontSize="10" fill="#a5b4fc" fontFamily="DM Mono">Classe : {compare[i]}%</text>
            </>
          )}
          <text x={toX(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9391b8" fontFamily="DM Sans">{labels[i]}</text>
        </g>
      ))}
    </svg>
  );
}

function RecSection({ title, subtitle, link, loading, items, onVote }: {
  title: string; subtitle: string; link: string;
  loading: boolean; items: Content[];
  onVote: (id: string, value: VoteValue, contentType?: 'exercise' | 'lesson' | 'exam') => void;
}) {
  return (
    <section className="mb-7">
      <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
        <div>
          <span
            style={{
              fontSize: 10, color: '#9391b8', fontWeight: 700,
              letterSpacing: '.08em', textTransform: 'uppercase',
            }}
          >
            {subtitle}
          </span>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em', marginTop: 2 }}>
            {title}
          </h2>
        </div>
        <Link to={link} className="fd-btn-ghost">
          Voir tout <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="fd-card animate-pulse" style={{ height: 280 }}>
              <div style={{ height: 96, background: 'linear-gradient(135deg,#e4e2f5,#f0effe)', borderRadius: '20px 20px 0 0' }} />
              <div className="p-4 space-y-3">
                <div style={{ height: 12, background: '#ede9fe', borderRadius: 6, width: '70%' }} />
                <div style={{ height: 8, background: '#f0effe', borderRadius: 6 }} />
                <div style={{ height: 8, background: '#f0effe', borderRadius: 6, width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="fd-card p-8 text-center">
          <p style={{ color: '#7068a8', fontSize: 13 }}>Aucune recommandation pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.slice(0, 3).map((item, idx) => (
            <div key={item.id} className="animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
              <HomeContentCard content={item} onVote={onVote} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ────── Dashboard hero (mockup-faithful) ────── */

const FRENCH_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const FRENCH_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function formatFrenchDate(d: Date) {
  return `${FRENCH_DAYS[d.getDay()]} ${d.getDate()} ${FRENCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function DashboardHero({ isAuthenticated, username, stats }: {
  isAuthenticated: boolean;
  username?: string;
  stats: DashboardStats | null;
}) {
  const today = new Date();
  const heroStats = isAuthenticated && stats
    ? [
        { v: `${stats.exercises_started ?? 0}`, l: 'Exercices' },
        { v: `${stats.perfect_completions ?? 0}`, l: 'Parfaits' },
        { v: stats.study_time || '0min', l: 'Cette semaine' },
      ]
    : [
        { v: '1K+', l: 'Exercices' },
        { v: '500+', l: 'Leçons' },
        { v: '5K+', l: 'Élèves' },
      ];
  const streak = stats?.streak_days ?? 0;

  return (
    <div
      className="relative overflow-hidden mb-5 animate-fade-up"
      style={{
        borderRadius: 24,
        background: 'linear-gradient(135deg,#1e1b4b 0%,#3730a3 50%,#4f46e5 100%)',
        padding: '32px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
      }}
    >
      {/* Dotted SVG pattern */}
      <svg
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .04, pointerEvents: 'none' }}
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1.5" fill="white" />
          </pattern>
        </defs>
        <rect width="400" height="200" fill="url(#dots)" />
      </svg>
      {/* Decorative bubble */}
      <div
        aria-hidden
        style={{
          position: 'absolute', right: -60, bottom: -60,
          width: 260, height: 260, borderRadius: '50%',
          background: 'rgba(129,140,248,.1)',
        }}
      />

      {/* Left: greeting + inline stats */}
      <div style={{ position: 'relative', minWidth: 0, flex: '1 1 360px' }}>
        <p style={{
          fontSize: 11, fontWeight: 700, color: '#a5b4fc',
          letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          {formatFrenchDate(today)}
        </p>
        <h1 style={{
          fontSize: 30, fontWeight: 800, color: '#fff',
          letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 10,
        }}>
          {isAuthenticated && username
            ? <>Bonjour, {username}</>
            : <>Bienvenue sur fidni</>}
        </h1>
        <p style={{ fontSize: 14, color: '#c7d2fe', maxWidth: 460, lineHeight: 1.6 }}>
          {isAuthenticated
            ? <>Continue sur ta lancée — chaque exercice compte pour ta progression.</>
            : <>Crée un compte pour suivre ta progression et débloquer des recommandations personnalisées.</>}
        </p>

        <div className="flex flex-wrap" style={{ gap: 24, marginTop: 20 }}>
          {heroStats.map(s => (
            <div key={s.l}>
              <div style={{
                fontSize: 22, fontWeight: 800, color: '#fff',
                fontFamily: 'DM Mono', letterSpacing: '-0.03em',
              }}>
                {s.v}
              </div>
              <div style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 500, marginTop: 1 }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: floating streak medallion */}
      {isAuthenticated && (
        <div
          style={{
            position: 'relative',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            animation: 'floaty 3s ease-in-out infinite',
          }}
        >
          <div
            style={{
              width: 84, height: 84, borderRadius: '50%',
              background: 'rgba(255,255,255,.10)',
              border: '2px solid rgba(255,255,255,.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 2,
            }}
          >
            <Flame className="w-6 h-6" style={{ color: '#fb923c' }} />
            <span style={{
              fontSize: 20, fontWeight: 800, color: '#fff',
              fontFamily: 'DM Mono', lineHeight: 1,
            }}>
              {streak}
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#c7d2fe', fontWeight: 600 }}>
            jour{streak > 1 ? 's' : ''} de streak
          </span>
        </div>
      )}
    </div>
  );
}

/* ────── Subjects panel (per-subject % vs class average) ────── */

const SUBJECT_PANEL_THEMES: Record<string, { from: string; to: string }> = {
  Analyse:           { from: '#4f46e5', to: '#818cf8' },
  Mathématiques:     { from: '#4f46e5', to: '#818cf8' },
  Algèbre:           { from: '#0891b2', to: '#22d3ee' },
  Géométrie:         { from: '#7c3aed', to: '#a78bfa' },
  Probabilités:      { from: '#059669', to: '#34d399' },
  Statistiques:      { from: '#059669', to: '#34d399' },
  Physique:          { from: '#d97706', to: '#fbbf24' },
  'Physique-Chimie': { from: '#d97706', to: '#fbbf24' },
  SVT:               { from: '#16a34a', to: '#86efac' },
  Français:          { from: '#be185d', to: '#f472b6' },
  Philosophie:       { from: '#6d28d9', to: '#a78bfa' },
  Anglais:           { from: '#0891b2', to: '#22d3ee' },
};
const DEFAULT_PANEL_THEME = SUBJECT_PANEL_THEMES.Analyse;

function SubjectsPanel({ timeBreakdown }: { timeBreakdown?: any }) {
  // Until per-subject success rates are wired up, derive a placeholder list
  // from the time-breakdown content types so the panel always shows something.
  const rows = [
    { s: 'Analyse',      y: 88, c: 70 },
    { s: 'Algèbre',      y: 76, c: 68 },
    { s: 'Probabilités', y: 62, c: 65 },
  ];
  // (timeBreakdown is here for the future per-subject API; not used yet.)
  void timeBreakdown;

  return (
    <div className="fd-card p-5 flex flex-col gap-4 animate-fade-up">
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>Par matière</h2>
        <p style={{ fontSize: 11, color: '#9391b8', marginTop: 2 }}>Tes scores vs. la classe</p>
      </div>
      {rows.map(m => {
        const th = SUBJECT_PANEL_THEMES[m.s] || DEFAULT_PANEL_THEME;
        const above = m.y >= m.c;
        return (
          <div key={m.s}>
            <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 5 }}>
              <span style={{ fontWeight: 600, color: '#1e1b4b' }}>{m.s}</span>
              <span style={{
                fontFamily: 'DM Mono', fontSize: 11, fontWeight: 700,
                color: above ? '#059669' : '#dc2626',
              }}>
                {m.y}%
              </span>
            </div>
            <div style={{
              height: 7, borderRadius: 99, background: '#f0effe',
              overflow: 'hidden', position: 'relative',
            }}>
              {/* Class average (background bar) */}
              <div style={{
                position: 'absolute', top: 0, left: 0, height: '100%',
                width: `${m.c}%`, background: '#ddd8f8', borderRadius: 99,
              }} />
              {/* Your score (foreground bar) */}
              <div style={{
                position: 'absolute', top: 0, left: 0, height: '100%',
                width: `${m.y}%`,
                background: `linear-gradient(90deg,${th.from},${th.to})`,
                borderRadius: 99,
              }} />
            </div>
            <div style={{ fontSize: 10, color: '#9391b8', marginTop: 3 }}>Classe : {m.c}%</div>
          </div>
        );
      })}
    </div>
  );
}
