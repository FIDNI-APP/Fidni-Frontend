import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Landing } from './Landing';
import { HomeContentCard } from '@/components/content/HomeContentCard';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import {
  voteExercise, voteLesson, voteExam,
  getRecommendedContent,
  getWeeklyProgress, type WeeklyProgress,
} from '@/lib/api';
import { Content, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';

/**
 * Homepage at "/". Branches on auth:
 *  · logged-out visitor → <Landing/> (marketing)
 *  · signed-in student  → the dashboard below
 *
 * Dashboard design — same "ink & paper" system as Landing: Fraunces display,
 * tabular DM Mono figures, flat + bordered, green only for action/progress,
 * one warm amber accent reserved for the streak. No emojis, no gradients.
 */
export function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [recExercises, setRecExercises] = useState<Content[]>([]);
  const [recLessons, setRecLessons] = useState<Content[]>([]);
  const [recExams, setRecExams] = useState<Content[]>([]);
  const [recLevel, setRecLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<WeeklyProgress | null>(null);
  const [, setProgressLoading] = useState(false);

  useEffect(() => {
    // Signed-in dashboard only — logged-out visitors get the Landing page.
    if (!authLoading && isAuthenticated) {
      fetchRecs();
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
      const data = await getRecommendedContent();
      setRecExercises(data.exercises || []);
      setRecLessons(data.lessons || []);
      setRecExams(data.exams || []);
      setRecLevel(data.level);
    } catch (err) {
      console.error('Home: fetchRecs failed', err);
    } finally {
      setLoading(false);
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

  // Wait for auth to resolve, then branch: visitors → Landing, students → dashboard.
  if (authLoading) return null;
  if (!isAuthenticated) return <Landing />;

  return (
    <div style={{ minHeight: '100vh', background: PAPER }}>
      <SEO
        title="Fidni - Tableau de bord"
        description="Plateforme moderne d'apprentissage en mathématiques."
        keywords={['mathématiques', 'bac', 'exercices']}
        ogType="website"
        canonicalUrl="/"
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-7 md:py-10" data-tour="home-accueil">
        {/* Tableau de bord : semaine, reprendre, régularité, maîtrise (données réelles) */}
        <DashboardOverview
          username={user?.username}
          fallbackExercise={recExercises[0] ? { id: recExercises[0].id, title: recExercises[0].title } : undefined}
        />

        {/* Progression comparée à la classe — seulement dans une classe */}
        {isAuthenticated && progress?.has_classroom && progress.you.length > 0 ? (
          <div className="fd-card p-5 md:p-6 mt-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div>
                <Eyebrow>Sur 8 semaines</Eyebrow>
                <h2 className="fd-display" style={{ fontSize: 19, fontWeight: 600, color: INK, letterSpacing: '-0.015em', marginTop: 6 }}>
                  Ta progression
                </h2>
                {progress.classroom && (
                  <p style={{ fontSize: 12.5, color: FAINT, marginTop: 4 }}>
                    Score moyen · <span style={{ color: INK, fontWeight: 600 }}>{progress.classroom.name}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4" style={{ fontSize: 11.5, color: FAINT }}>
                <span className="inline-flex items-center gap-1.5">
                  <span style={{ width: 18, height: 3, background: ACCENT, borderRadius: 2 }} /> Toi
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span style={{ width: 18, height: 2, background: NEUTRAL, borderRadius: 2, opacity: .8 }} /> Classe
                </span>
              </div>
            </div>
            <ProgressChart data={progress.you} compare={progress.average} labels={progress.labels} />
          </div>
        ) : null}

        {/* Recommendations */}
        <div data-tour="home-reco" className="mt-9">
          <RecTabs loading={loading} level={recLevel} exercises={recExercises} lessons={recLessons} exams={recExams} onVote={handleVote} />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Progress chart ────────────────────────── */

function ProgressChart({ data, compare, labels }: {
  data: number[]; compare: number[]; labels: string[];
}) {
  const [hov, setHov] = React.useState<number | null>(null);
  const W = 600, H = 180, P = 28;
  const iw = W - P * 2, ih = H - P * 2 - 16;
  const toY = (v: number) => P + ih - ((v - 40) / 60) * ih;
  const toX = (i: number) => P + (i / (data.length - 1)) * iw;
  const path = (d: number[]) => d.map((v, i) => `${i ? 'L' : 'M'}${toX(i)},${toY(v)}`).join(' ');
  const area = (d: number[]) => `${path(d)} L${toX(d.length - 1)},${H - P} L${toX(0)},${H - P} Z`;

  // SVG presentation attributes can't resolve CSS vars, so the chart mirrors
  // the canonical brand/ink tokens (:root in index.css) as literals.
  const C_BRAND = '#1a7a4a', C_NEUTRAL = '#b8b4ac', C_INK = '#1a1a1a', C_FAINT = '#6b6862';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} onMouseLeave={() => setHov(null)}>
      {[40, 55, 70, 85, 100].map(v => (
        <line key={v} x1={P} x2={W - P} y1={toY(v)} y2={toY(v)} stroke="#ece9e3" strokeWidth="1" strokeDasharray="3,5" />
      ))}
      {/* Flat tint instead of a gradient (no gradients in the system) */}
      <path d={area(data)} fill={C_BRAND} fillOpacity="0.07" />
      <path d={path(compare)} fill="none" stroke={C_NEUTRAL} strokeWidth="1.5" strokeDasharray="4,4" opacity=".85" />
      <path d={path(data)} fill="none" stroke={C_BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <g key={i} onMouseEnter={() => setHov(i)} style={{ cursor: 'pointer' }}>
          <circle cx={toX(i)} cy={toY(v)} r={hov === i ? 6 : 3.5} fill={C_BRAND} stroke="white" strokeWidth="2" />
          <circle cx={toX(i)} cy={toY(compare[i])} r={hov === i ? 4 : 2.5} fill={C_NEUTRAL} stroke="white" strokeWidth="1.5" />
          {hov === i && (
            <>
              <rect x={toX(i) - 40} y={toY(v) - 50} width={80} height={40} rx={8} fill={C_INK} opacity=".96" />
              <text x={toX(i)} y={toY(v) - 33} textAnchor="middle" fontSize="11" fill="#fff" fontFamily="DM Mono">Toi : {v}%</text>
              <text x={toX(i)} y={toY(v) - 17} textAnchor="middle" fontSize="10" fill={C_NEUTRAL} fontFamily="DM Mono">Classe : {compare[i]}%</text>
            </>
          )}
          <text x={toX(i)} y={H - 4} textAnchor="middle" fontSize="9" fill={C_FAINT} fontFamily="DM Sans">{labels[i]}</text>
        </g>
      ))}
    </svg>
  );
}

/* ────────────────────────── Recommendation section ────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 11, color: ACCENT, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase' }}>
      {children}
    </span>
  );
}

/** Titre de l'encart des exercices : « les plus aimés » seulement s'il y a vraiment des j'aime. */
function likedHeading(items: Content[], level: string | null, kind: 'exercise' | 'lesson' | 'exam' = 'exercise'): { title: string; hint: string } {
  const where = level ? ` en ${level}` : '';
  const liked = items.slice(0, 3).some((i) => ((i as any).like_count ?? 0) > 0);
  const noun = kind === 'lesson' ? ['Les leçons les plus aimées', 'Leçons à découvrir']
    : kind === 'exam' ? ['Les examens les plus aimés', 'Examens à découvrir']
      : ['Les exercices les plus aimés', 'Exercices à découvrir'];
  return liked
    ? { title: `${noun[0]}${where}`, hint: 'Classés par les j’aime des élèves. Un contenu t’a aidé ? Mets-lui un j’aime pour guider les autres.' }
    : { title: `${noun[1]}${where}`, hint: 'Pas encore de j’aime : sois le premier à recommander ce qui t’a aidé, ça remontera ici pour les autres.' };
}

type RecKind = 'exercise' | 'lesson' | 'exam';
const REC_TABS: { key: RecKind; label: string; link: string }[] = [
  { key: 'exercise', label: 'Exercices', link: '/exercises?sort=most_upvoted' },
  { key: 'lesson', label: 'Leçons', link: '/lessons?sort=most_upvoted' },
  { key: 'exam', label: 'Examens', link: '/exams?sort=most_upvoted' },
];

/** Les plus aimés du niveau, en trois onglets (une seule rangée de cartes à l'écran). */
function RecTabs({ loading, level, exercises, lessons, exams, onVote }: {
  loading: boolean; level: string | null; exercises: Content[]; lessons: Content[]; exams: Content[];
  onVote: (id: string, value: VoteValue, contentType?: RecKind) => void;
}) {
  const [tab, setTab] = useState<RecKind>('exercise');
  const items = tab === 'exercise' ? exercises : tab === 'lesson' ? lessons : exams;
  const tabs = REC_TABS.filter((t) => t.key === 'exercise' || (t.key === 'lesson' ? lessons.length : exams.length) > 0);
  const current = REC_TABS.find((t) => t.key === tab)!;
  const { title, hint } = likedHeading(items, level, tab);
  return (
    <RecSection title={title} hint={hint} eyebrow="Tu ne sais pas quoi travailler ?" link={current.link}
      loading={loading} items={items}
      onVote={(id, v) => onVote(id, v, tab)}
      tabs={tabs.length > 1 ? (
        <div role="tablist" aria-label="Type de contenu" className="inline-flex rounded-xl bg-[#f2f1ee] p-1">
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`h-8 rounded-lg px-3 text-[13px] transition-colors ${tab === t.key ? 'bg-white font-semibold text-ink shadow-sm' : 'font-medium text-ink-faint hover:text-ink'}`}>
              {t.label}
            </button>
          ))}
        </div>
      ) : null} />
  );
}

function RecSection({ title, hint, eyebrow, link, loading, items, onVote, tabs }: {
  title: string; hint?: string; eyebrow: string; link: string;
  loading: boolean; items: Content[];
  onVote: (id: string, value: VoteValue, contentType?: 'exercise' | 'lesson' | 'exam') => void;
  tabs?: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="fd-display" style={{ fontSize: 20, fontWeight: 600, color: INK, letterSpacing: '-0.02em', marginTop: 5 }}>
            {title}
          </h2>
          {hint && <p style={{ fontSize: 12.5, color: FAINT, marginTop: 4, maxWidth: 520 }}>{hint}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tabs}
          <Link to={link} className="fd-btn-ghost">
            Voir tout <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="fd-card animate-pulse" style={{ height: 280 }}>
              <div style={{ height: 96, background: '#f2f1ee', borderRadius: '16px 16px 0 0' }} />
              <div className="p-4 space-y-3">
                <div style={{ height: 12, background: LINE, borderRadius: 6, width: '70%' }} />
                <div style={{ height: 8, background: PAPER, borderRadius: 6 }} />
                <div style={{ height: 8, background: PAPER, borderRadius: 6, width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="fd-card p-8 text-center">
          <p style={{ color: FAINT, fontSize: 13 }}>Aucune recommandation pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.slice(0, 3).map((item) => (
            <HomeContentCard key={item.id} content={item} onVote={onVote} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Tokens — aliases of the canonical CSS vars in src/index.css (:root).
      Used in HTML inline styles only; the SVG chart keeps its own literals
      (SVG presentation attributes can't resolve CSS vars). ── */
const PAPER = 'var(--paper)';
const INK = 'var(--ink)';
const FAINT = 'var(--ink-faint)';
const NEUTRAL = 'var(--neutral)';
const LINE = 'var(--line)';
const ACCENT = 'var(--brand)';
const MONO = "'DM Mono', ui-monospace, monospace";

