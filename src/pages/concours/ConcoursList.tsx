import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock, Calendar, ListChecks, Shuffle,
  Loader2, BookOpen, Trophy, ArrowRight,
} from 'lucide-react';
import {
  CONCOURS_TYPES, listConcoursExams, startSimulation,
  type ConcoursType, type ConcoursExamListItem, type SimulationMode,
} from '@/lib/api/concoursApi';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import { ConcoursHero } from './ConcoursHero';

const CONCOURS_THEME: Record<ConcoursType, { from: string; to: string; light: string; text: string; emoji: string; sub: string }> = {
  ensa:     { from: '#4f46e5', to: '#818cf8', light: '#eef2ff', text: '#4338ca', emoji: '⚙️', sub: 'École Nationale des Sciences Appliquées' },
  ensam:    { from: '#0891b2', to: '#22d3ee', light: '#ecfeff', text: '#0e7490', emoji: '🛠️', sub: "École Nationale Supérieure d'Arts et Métiers" },
  medecine: { from: '#be185d', to: '#f472b6', light: '#fdf2f8', text: '#9d174d', emoji: '🩺', sub: 'Concours commun de médecine' },
};

export default function ConcoursListPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const concoursParam = (searchParams.get('concours') as ConcoursType | null) || null;
  const yearMin = searchParams.get('year_min') || '';
  const yearMax = searchParams.get('year_max') || '';

  const [exams, setExams] = useState<ConcoursExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSimModal, setShowSimModal] = useState<ConcoursType | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (concoursParam) params.concours_type = concoursParam;
        if (yearMin) params.year_min = Number(yearMin);
        if (yearMax) params.year_max = Number(yearMax);
        const data = await listConcoursExams(params);
        setExams(data);
      } catch (e) {
        console.error('listConcoursExams failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [concoursParam, yearMin, yearMax]);

  const setFilter = (k: string, v: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set(k, v); else next.delete(k);
    setSearchParams(next);
  };

  const examsByConcours = useMemo(() => {
    const map: Record<string, ConcoursExamListItem[]> = {};
    for (const e of exams) {
      (map[e.concours_type] ||= []).push(e);
    }
    return map;
  }, [exams]);

  const totalExams = exams.length;
  const totalQuestions = useMemo(
    () => exams.reduce((sum, e) => sum + (e.question_count || 0), 0),
    [exams],
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff' }}>
      <SEO title="Concours - Fidni" description="Préparation aux concours d'entrée des grandes écoles" />
      <style>{`
        .exam-card:hover { transform: translateY(-3px); box-shadow: 0 14px 34px rgba(90,70,200,.14) !important; }
        .concours-card:hover { transform: translateY(-2px); }
      `}</style>

      <ConcoursHero
        icon={Trophy}
        badge="CONCOURS"
        title="Préparation aux concours"
        subtitle="Entraîne-toi sur les annales d'ENSA, ENSAM et Médecine dans les conditions réelles de l'examen."
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">

        {/* Quick stats */}
        {!loading && totalExams > 0 && (
          <div className="flex items-center gap-3 mb-7 flex-wrap animate-fade-up">
            <div className="inline-flex items-center gap-2.5" style={{
              background: '#fff', borderRadius: 12, border: '1px solid #ece9fb',
              padding: '10px 16px', boxShadow: '0 1px 4px rgba(90,70,200,.05)',
            }}>
              <BookOpen className="w-4 h-4" style={{ color: '#4f46e5' }} />
              <span style={{ fontSize: 13, color: '#7068a8' }}>
                <strong style={{ color: '#1e1b4b', fontWeight: 800, fontFamily: 'DM Mono' }}>{totalExams}</strong> annales
              </span>
            </div>
            <div className="inline-flex items-center gap-2.5" style={{
              background: '#fff', borderRadius: 12, border: '1px solid #ece9fb',
              padding: '10px 16px', boxShadow: '0 1px 4px rgba(90,70,200,.05)',
            }}>
              <ListChecks className="w-4 h-4" style={{ color: '#4f46e5' }} />
              <span style={{ fontSize: 13, color: '#7068a8' }}>
                <strong style={{ color: '#1e1b4b', fontWeight: 800, fontFamily: 'DM Mono' }}>{totalQuestions}</strong> questions
              </span>
            </div>
          </div>
        )}

        {/* Concours type picker */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-9">
          {CONCOURS_TYPES.map((c) => {
            const t = CONCOURS_THEME[c.id];
            const isActive = concoursParam === c.id;
            const count = loading ? null : (examsByConcours[c.id] || []).length;
            return (
              <div
                key={c.id}
                className="concours-card animate-fade-up"
                style={{
                  borderRadius: 20, overflow: 'hidden', position: 'relative',
                  border: `1.5px solid ${isActive ? t.from : '#e8e6f8'}`,
                  background: '#fff',
                  boxShadow: isActive
                    ? `0 8px 28px ${t.from}28`
                    : '0 2px 10px rgba(90,70,200,.06)',
                  transition: 'box-shadow .2s, border-color .2s, transform .2s',
                }}
              >
                {/* Top zone — filtre les annales */}
                <div
                  onClick={() => setFilter('concours', isActive ? null : c.id)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  {/* Colored banner */}
                  <div style={{
                    height: 64, position: 'relative', overflow: 'hidden',
                    background: `linear-gradient(120deg,${t.from},${t.to})`,
                  }}>
                    <div style={{
                      position: 'absolute', right: -20, top: -20, width: 110, height: 110,
                      borderRadius: '50%', background: 'rgba(255,255,255,.14)',
                    }} />
                    <div style={{
                      position: 'absolute', left: 18, bottom: -22,
                      width: 56, height: 56, borderRadius: 16,
                      background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26, boxShadow: '0 4px 12px rgba(0,0,0,.1)',
                    }}>
                      {t.emoji}
                    </div>
                  </div>

                  <div style={{ padding: '30px 20px 16px' }}>
                    <div className="flex items-center justify-between">
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em' }}>
                        {c.label}
                      </div>
                      {count !== null && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: t.text, background: t.light,
                          padding: '3px 10px', borderRadius: 99, fontFamily: 'DM Mono',
                        }}>
                          {count} annale{count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#9391b8', marginTop: 4, lineHeight: 1.5 }}>
                      {t.sub}
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 700, marginTop: 12,
                      color: isActive ? t.from : '#a5a1c9',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      {isActive ? 'Filtre actif' : 'Voir les annales'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Bottom zone — lancer simulation */}
                <button
                  onClick={() => isAuthenticated ? setShowSimModal(c.id) : navigate('/login')}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '13px 20px', cursor: 'pointer',
                    background: t.light, border: 'none', borderTop: `1px solid ${t.from}1f`,
                    fontSize: 13, fontWeight: 700, color: t.text,
                    transition: 'filter .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(.96)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                >
                  <Shuffle className="w-4 h-4" />
                  Lancer une simulation
                </button>
              </div>
            );
          })}
        </div>

        {/* Section title + filters */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 style={{ fontSize: 19, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.03em' }}>
            {concoursParam
              ? `Annales ${CONCOURS_TYPES.find(c => c.id === concoursParam)?.label}`
              : 'Tous les examens'}
            {!loading && (
              <span style={{ fontSize: 13, fontWeight: 500, color: '#9391b8', fontFamily: 'DM Mono', marginLeft: 10 }}>
                {exams.length} résultat{exams.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {concoursParam && (
              <button
                className="fd-btn-ghost"
                style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={() => setFilter('concours', null)}
              >
                ✕ {CONCOURS_TYPES.find(c => c.id === concoursParam)?.label}
              </button>
            )}
            <span style={{ fontSize: 11, color: '#b0adcd', fontWeight: 600 }}>Année</span>
            <input
              type="number"
              placeholder="Depuis"
              value={yearMin}
              onChange={(e) => setFilter('year_min', e.target.value || null)}
              style={{
                width: 78, padding: '7px 10px', borderRadius: 10,
                border: '1.5px solid #e4e2f5', background: '#fff',
                fontSize: 12, fontFamily: 'DM Mono', color: '#1e1b4b', outline: 'none',
              }}
            />
            <span style={{ color: '#b0adcd', fontSize: 13 }}>–</span>
            <input
              type="number"
              placeholder="Jusqu'à"
              value={yearMax}
              onChange={(e) => setFilter('year_max', e.target.value || null)}
              style={{
                width: 78, padding: '7px 10px', borderRadius: 10,
                border: '1.5px solid #e4e2f5', background: '#fff',
                fontSize: 12, fontFamily: 'DM Mono', color: '#1e1b4b', outline: 'none',
              }}
            />
            {(yearMin || yearMax) && (
              <button
                className="fd-btn-ghost"
                style={{ fontSize: 11, padding: '6px 10px' }}
                onClick={() => { setFilter('year_min', null); setFilter('year_max', null); }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Exams grid */}
        {loading ? (
          <div className="flex justify-center" style={{ padding: '80px 0' }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#4f46e5' }} />
          </div>
        ) : exams.length === 0 ? (
          <div className="fd-card text-center" style={{ padding: 56 }}>
            <BookOpen className="w-9 h-9 mx-auto mb-3" style={{ color: '#b0adcd' }} />
            <p style={{ fontSize: 14, color: '#7068a8' }}>Aucun examen pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((e) => {
              const t = CONCOURS_THEME[e.concours_type];
              return (
                <Link
                  key={e.id}
                  to={`/concours/exams/${e.id}`}
                  className="exam-card animate-fade-up"
                  style={{
                    overflow: 'hidden', textDecoration: 'none', display: 'flex', flexDirection: 'column',
                    background: '#fff', borderRadius: 18, border: '1px solid #ece9fb',
                    boxShadow: '0 2px 10px rgba(90,70,200,.05)',
                    transition: 'transform .2s, box-shadow .2s',
                  }}
                >
                  {/* Year banner */}
                  <div style={{
                    position: 'relative', overflow: 'hidden', padding: '18px 20px 16px',
                    background: `linear-gradient(120deg,${t.from},${t.to})`,
                  }}>
                    <div style={{
                      position: 'absolute', right: -30, top: -30, width: 120, height: 120,
                      borderRadius: '50%', background: 'rgba(255,255,255,.12)',
                    }} />
                    <div className="relative flex items-center justify-between">
                      <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
                        color: '#fff', background: 'rgba(255,255,255,.22)',
                        padding: '3px 10px', borderRadius: 99, backdropFilter: 'blur(4px)',
                      }}>
                        {e.concours_type_display.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 18 }}>{t.emoji}</span>
                    </div>
                    <div className="relative" style={{
                      fontSize: 32, fontWeight: 800, color: '#fff',
                      fontFamily: 'DM Mono', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 8,
                    }}>
                      {e.year}
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b', lineHeight: 1.35 }}>
                      {e.title}
                    </h3>
                    {e.description && (
                      <p style={{ fontSize: 12, color: '#7068a8', lineHeight: 1.5 }} className="line-clamp-2">
                        {e.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-auto pt-3" style={{ fontSize: 11, color: '#9391b8', borderTop: '1px solid #f0effe' }}>
                      <span className="inline-flex items-center gap-1">
                        <ListChecks className="w-3.5 h-3.5" /> {e.question_count} Q
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {e.duration_minutes} min
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1" style={{ color: t.from, fontWeight: 700 }}>
                        Réviser <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showSimModal && (
        <SimulationModal
          concoursType={showSimModal}
          onClose={() => setShowSimModal(null)}
          onStarted={(sessionId) => navigate(`/concours/simulate/${sessionId}`)}
        />
      )}
    </div>
  );
}

/* ───────────── Simulation start modal ───────────── */

function SimulationModal({ concoursType, onClose, onStarted }: {
  concoursType: ConcoursType;
  onClose: () => void;
  onStarted: (sessionId: string) => void;
}) {
  const t = CONCOURS_THEME[concoursType];
  const [mode, setMode] = useState<SimulationMode>('random_year');
  const [nQuestions, setNQuestions] = useState(30);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const start = async () => {
    try {
      setBusy(true); setErr('');
      const r = await startSimulation({
        mode,
        concours_type: concoursType,
        ...(mode === 'random_mix' ? { n_questions: nQuestions } : {}),
      });
      onStarted(r.session_id);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Impossible de lancer la simulation.');
    } finally { setBusy(false); }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(15,12,50,.5)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="fd-card animate-fade-up"
        style={{ width: '100%', maxWidth: 480, padding: 28 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center gap-3 mb-5">
          <div style={{
            width: 42, height: 42, borderRadius: 11, flexShrink: 0,
            background: `linear-gradient(135deg,${t.from},${t.to})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            {CONCOURS_TYPES.find(c => c.id === concoursType) && t.emoji}
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b' }}>
              Lancer une simulation
            </h3>
            <p style={{ fontSize: 12, color: '#7068a8', marginTop: 1 }}>
              {CONCOURS_TYPES.find(c => c.id === concoursType)?.label}
            </p>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#7068a8', marginBottom: 14 }}>
          Les solutions sont masquées pendant la session.
        </p>

        <div className="flex flex-col gap-2">
          {([
            { id: 'random_year', icon: Calendar, label: 'Annale aléatoire', desc: 'Une année tirée au hasard.' },
            { id: 'random_mix',  icon: Shuffle,  label: 'Mix aléatoire',    desc: 'Questions piochées dans toutes les années.' },
          ] as { id: SimulationMode; icon: any; label: string; desc: string }[]).map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px', borderRadius: 12,
                border: `1.5px solid ${mode === id ? t.from : '#ede9fe'}`,
                background: mode === id ? t.light : '#faf9ff',
                color: '#1e1b4b', cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: mode === id ? t.from : '#ede9fe',
                color: mode === id ? '#fff' : '#7068a8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 11, color: '#7068a8', marginTop: 1 }}>{desc}</div>
              </div>
              {mode === id && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.from, flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>

        {mode === 'random_mix' && (
          <div className="mt-4" style={{ background: '#faf9ff', borderRadius: 12, padding: '14px 16px' }}>
            <div className="flex items-center justify-between mb-2">
              <label style={{ fontSize: 12, color: '#7068a8', fontWeight: 600 }}>Nombre de questions</label>
              <span style={{ fontFamily: 'DM Mono', fontSize: 14, fontWeight: 800, color: t.from }}>{nQuestions}</span>
            </div>
            <input
              type="range" min={5} max={200} step={5}
              value={nQuestions}
              onChange={(e) => setNQuestions(Number(e.target.value))}
              style={{ width: '100%', accentColor: t.from }}
            />
            <div className="flex items-center justify-between" style={{ fontSize: 10, color: '#9391b8', marginTop: 4 }}>
              <span>5 q</span>
              <span>~{Math.round(nQuestions * 1.5)} min estimées</span>
              <span>200 q</span>
            </div>
          </div>
        )}

        {err && <p style={{ color: '#b91c1c', fontSize: 12, marginTop: 10 }}>{err}</p>}

        <div className="flex gap-2 mt-6">
          <button className="fd-btn-ghost flex-1" onClick={onClose} style={{ justifyContent: 'center' }}>
            Annuler
          </button>
          <button
            className="fd-btn-primary flex-1"
            onClick={start}
            disabled={busy}
            style={{ background: t.from, justifyContent: 'center' }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
            Lancer
          </button>
        </div>
      </div>
    </div>
  );
}
