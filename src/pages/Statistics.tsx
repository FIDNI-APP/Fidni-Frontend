// Page Statistiques : « Comment est-ce que je progresse ? »
// Filtrable par période, matière et niveau (l'élève change de niveau au fil des années).
// Ordre de lecture : résultats aux examens → évolution → difficultés → temps d'étude → activité.
// Données : GET /api/stats/me/ (backend apps/users/my_stats.py) ; uniquement des chiffres enregistrés.
import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Clock, Loader2, Minus, Target, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import { YearOverview } from '@/components/dashboard/DashboardOverview';

interface ExamResult { id: number; title: string; url: string; date: string; note: number; complete: boolean }
interface Summary { count: number; average: number | null; best: number | null; worst: number | null }
interface Point { start: string; label: string; exam_average: number | null; exams: number; questions: number; success_rate: number | null; minutes: number }
interface Difficulty { slug: string; label: string; questions: number; success_rate: number; chapter: string | null; url: string }
interface Theme { name: string; seconds: number }
interface Stats {
  period: { key: string; start: string; end: string; days: number; granularity: 'day' | 'week' | 'month'; comparable: boolean };
  filters: { subjects: { id: number; name: string }[]; levels: { id: number; name: string }[] };
  results: Summary & { previous: Summary | null; exams: ExamResult[] };
  questions: { count: number; success_rate: number | null; previous_success_rate: number | null };
  time: { seconds: number; previous_seconds: number | null; by_theme: Record<'chapter' | 'subfield' | 'theorem', Theme[]> };
  series: Point[];
  difficulties: Difficulty[];
  activity: { active_days: number; exercises_validated: number };
}

const PERIODS = [
  { key: '7', label: '7 jours' },
  { key: '30', label: '30 jours' },
  { key: '90', label: '3 mois' },
  { key: '365', label: '12 mois' },
  { key: 'all', label: 'Tout' },
] as const;
const PERIOD_TEXT: Record<string, string> = {
  '7': 'sur les 7 derniers jours', '30': 'sur les 30 derniers jours', '90': 'sur les 3 derniers mois',
  '365': 'sur les 12 derniers mois', all: 'depuis le début',
};
const PREVIOUS_TEXT: Record<string, string> = {
  '7': 'aux 7 jours précédents', '30': 'aux 30 jours précédents', '90': 'aux 3 mois précédents', '365': 'aux 12 mois précédents',
};
const THEMES = { chapter: 'Chapitres', subfield: 'Sous-domaines', theorem: 'Théorèmes' } as const;

const note = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(n).replace('.', ','));
const duration = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
};
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export const StatisticsPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [period, setPeriod] = useState(() => { try { return localStorage.getItem('fidni:stats-periode') || '30'; } catch { return '30'; } });
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setFailed(false);
    api.get('/stats/me/', { params: { period, ...(subject ? { subject } : {}), ...(level ? { level } : {}) } })
      .then((r) => setData(r.data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [isAuthenticated, period, subject, level]);

  const choosePeriod = (k: string) => {
    setPeriod(k);
    try { localStorage.setItem('fidni:stats-periode', k); } catch { /* stockage indisponible */ }
  };

  if (!authLoading && !isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <SEO title="Mes statistiques | Fidni" description="Tes résultats, ta progression, tes difficultés et ton temps d’étude." noindex />
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="fd-display text-[28px] leading-tight text-ink md:text-[32px]">Mes statistiques</h1>
          <p className="mt-1 text-[14px] text-ink-faint">Comment tu progresses, {PERIOD_TEXT[period] ?? ''}.</p>
        </div>
      </header>

      {/* Filtres : une seule ligne */}
      <div className="md:sticky md:top-[60px] z-10 -mx-1 mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white/95 px-3 py-2.5 backdrop-blur" data-tour="stats-filtres">
        <div role="radiogroup" aria-label="Période" className="inline-flex flex-wrap rounded-xl bg-[#f2f1ee] p-1">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" role="radio" aria-checked={period === p.key} onClick={() => choosePeriod(p.key)}
              className={`h-9 rounded-lg px-3 text-[13px] transition-colors ${period === p.key ? 'bg-white font-semibold text-ink shadow-sm' : 'font-medium text-ink-faint hover:text-ink'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {(data?.filters.subjects.length ?? 0) > 1 && (
            <Select label="Matière" value={subject} onChange={setSubject} options={data!.filters.subjects} />
          )}
          {(data?.filters.levels.length ?? 0) > 1 && (
            <Select label="Niveau" value={level} onChange={setLevel} options={data!.filters.levels} />
          )}
        </div>
      </div>

      {failed && <p className="rounded-xl border border-line bg-white px-4 py-3 text-[13px] text-ink-faint">Les statistiques n’ont pas pu être chargées. Recharge la page dans un instant.</p>}
      {!data && loading && <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-ink-faint" /></div>}

      {data && (
        <div className={`flex flex-col gap-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <Results data={data} />
          <Evolution data={data} />
          <div className="grid gap-6 lg:grid-cols-2">
            <Difficulties data={data} />
            <Activity data={data} />
          </div>
          <StudyTime data={data} />
        </div>
      )}

      {/* Bilan sur l'année (indépendant des filtres) : venu de l'accueil, allégé le 06/10/2026. */}
      {data && <div className="mt-6"><YearOverview /></div>}
    </div>
  );
};

/* ───────────────────────────── Résultats aux examens */

function Results({ data }: { data: Stats }) {
  const r = data.results;
  const prev = r.previous;
  const [showAll, setShowAll] = useState(false);
  return (
    <Section title="Résultats aux examens" icon={<Target className="h-4 w-4" />} tour="stats-resultats"
      hint="Note estimée à partir de ton auto-évaluation : réussi = tous les points, partiel = la moitié. Un examen compte dès que la moitié de son barème est corrigée.">
      {r.count === 0 ? (
        <Empty text="Aucun examen corrigé sur cette période. Passe un sujet, puis évalue tes réponses question par question : ta note apparaîtra ici."
          action={{ to: '/exams', label: 'Choisir un examen' }} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Note moyenne" value={`${note(r.average)}`} unit="/ 20" strong
              delta={prev && prev.average !== null && r.average !== null ? <Delta value={r.average - prev.average} unit=" pt" text={PREVIOUS_TEXT[data.period.key]} /> : undefined} />
            <Tile label="Meilleure note" value={note(r.best)} unit="/ 20" />
            <Tile label="Note la plus basse" value={note(r.worst)} unit="/ 20" />
            <Tile label="Examens réalisés" value={String(r.count)}
              delta={prev ? <span className="text-[12px] text-ink-faint">{prev.count} sur la période précédente</span> : undefined} />
          </dl>
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
            {(showAll ? r.exams : r.exams.slice(0, 4)).map((e) => (
              <li key={e.id}>
                <Link to={e.url} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#faf9f7]">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{e.title}</span>
                  <span className="shrink-0 text-[12px] text-ink-faint">{shortDate(e.date)}{!e.complete && ' · corrigé en partie'}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold fd-nums ${e.note >= 10 ? 'bg-brand-soft text-brand-hover' : 'bg-gold-soft text-gold-strong'}`}>
                    {note(e.note)} / 20
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {r.exams.length > 4 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-[13px] font-semibold text-brand-hover hover:underline">
              {showAll ? 'Voir moins' : `Voir les ${r.exams.length} examens`}
            </button>
          )}
        </>
      )}
    </Section>
  );
}

/* ───────────────────────────── Évolution */

function Evolution({ data }: { data: Stats }) {
  const hasExams = data.series.some((p) => p.exam_average !== null);
  const hasQuestions = data.series.some((p) => p.success_rate !== null);
  const [metric, setMetric] = useState<'exam' | 'success'>(hasExams ? 'exam' : 'success');
  useEffect(() => { if (metric === 'exam' && !hasExams && hasQuestions) setMetric('success'); }, [hasExams, hasQuestions, metric]);
  const values = data.series.map((p) => (metric === 'exam' ? p.exam_average : p.success_rate));
  const known = values.filter((v): v is number => v !== null);
  const max = metric === 'exam' ? 20 : 100;
  const unit = metric === 'exam' ? ' / 20' : ' %';
  const trend = known.length >= 2 ? known[known.length - 1] - known[0] : null;
  return (
    <Section title="Évolution de mes résultats" icon={<TrendingUp className="h-4 w-4" />} tour="stats-evolution"
      action={(hasExams || hasQuestions) && (
        <div role="radiogroup" aria-label="Mesure" className="inline-flex rounded-lg bg-[#f2f1ee] p-0.5">
          {([['exam', 'Notes d’examen'], ['success', 'Réussite aux questions']] as const).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={metric === k} onClick={() => setMetric(k)}
              className={`h-8 rounded-md px-2.5 text-[12.5px] ${metric === k ? 'bg-white font-semibold text-ink shadow-sm' : 'font-medium text-ink-faint hover:text-ink'}`}>
              {l}
            </button>
          ))}
        </div>
      )}>
      {known.length === 0 ? (
        <Empty text="Pas encore de résultat sur cette période : la courbe se dessine dès tes premières questions évaluées." />
      ) : (
        <>
          {trend !== null && (
            <p className="mb-3 text-[13.5px] text-ink-soft">
              {metric === 'exam' ? 'Ta moyenne aux examens' : 'Ta réussite aux questions'} passe de{' '}
              <b className="text-ink fd-nums">{note(known[0])}{unit}</b> à <b className="text-ink fd-nums">{note(known[known.length - 1])}{unit}</b>{' '}
              {trend > 0 ? '— tu progresses.' : trend < 0 ? '— à surveiller.' : '— stable.'}
            </p>
          )}
          <LineChart points={data.series.map((p, i) => ({ label: p.label, value: values[i], detail: metric === 'exam' ? `${p.exams} examen${p.exams > 1 ? 's' : ''}` : `${p.questions} question${p.questions > 1 ? 's' : ''}` }))}
            max={max} unit={unit} />
        </>
      )}
    </Section>
  );
}

function LineChart({ points, max, unit }: { points: { label: string; value: number | null; detail: string }[]; max: number; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 220, L = 36, R = 12, T = 12, B = 28;
  const x = (i: number) => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const known = points.map((p, i) => ({ ...p, i })).filter((p) => p.value !== null) as { label: string; value: number; detail: string; i: number }[];
  const path = known.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const ticks = max === 20 ? [0, 5, 10, 15, 20] : [0, 25, 50, 75, 100];
  const every = Math.ceil(points.length / 8);
  const h = hover !== null ? points[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Évolution des résultats"
        onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#efece6" strokeWidth={1} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#9a958c">{t}</text>
          </g>
        ))}
        {max === 20 && <line x1={L} x2={W - R} y1={y(10)} y2={y(10)} stroke="#d9d4ca" strokeDasharray="4 4" strokeWidth={1} />}
        {points.map((p, i) => (i % every === 0 || i === points.length - 1) && (
          <text key={i} x={x(i)} y={H - 8} fontSize="11" fill="#9a958c"
            textAnchor={points.length > 1 && i === 0 ? 'start' : points.length > 1 && i === points.length - 1 ? 'end' : 'middle'}>{p.label}</text>
        ))}
        <path d={path} fill="none" stroke="#1a7a4a" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {known.map((p) => (
          <circle key={p.i} cx={x(p.i)} cy={y(p.value)} r={hover === p.i ? 5.5 : 4} fill="#fff" stroke="#1a7a4a" strokeWidth={2.5} />
        ))}
        {points.map((_, i) => (
          <rect key={i} x={x(i) - (W - L - R) / Math.max(points.length - 1, 1) / 2} y={T} width={(W - L - R) / Math.max(points.length - 1, 1)} height={H - T - B}
            fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {h && hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#cfcdc8" strokeWidth={1} pointerEvents="none" />}
      </svg>
      {h && hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-lg border border-line bg-white px-3 py-2 text-[12px] shadow-md"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > points.length / 2 ? '-105%' : '5%'})` }}>
          <p className="font-semibold text-ink">{h.label}</p>
          <p className="text-ink-soft fd-nums">{h.value === null ? 'Pas de résultat' : `${note(h.value)}${unit}`} · {h.detail}</p>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Difficultés */

function Difficulties({ data }: { data: Stats }) {
  return (
    <Section title="Mes difficultés" icon={<Target className="h-4 w-4" />} tour="stats-difficultes"
      hint="Les notions des questions que tu réussis le moins (au moins 3 questions évaluées sur la période).">
      {data.difficulties.length === 0 ? (
        <Empty text={data.questions.count < 3
          ? 'Évalue tes réponses aux questions : les notions où tu bloques apparaîtront ici.'
          : 'Aucune notion en difficulté sur cette période. Continue comme ça !'} />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.difficulties.map((d) => (
            <li key={d.slug} className="rounded-xl border border-line px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink">{d.label}</span>
                  <span className="block truncate text-[12px] text-ink-faint">{[d.chapter, `${d.questions} question${d.questions > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="shrink-0 text-[13px] font-semibold text-gold-strong fd-nums">{d.success_rate} %</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f2f1ee]">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(d.success_rate, 3)}%` }} />
                </div>
                <Link to={d.url} className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-brand-hover hover:underline">
                  Revoir ce thème <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ───────────────────────────── Activité */

function Activity({ data }: { data: Stats }) {
  const q = data.questions;
  return (
    <Section title="Mon activité" icon={<BarChart3 className="h-4 w-4" />}>
      <dl className="grid grid-cols-2 gap-3">
        <Mini label="Questions évaluées" value={String(q.count)} />
        <Mini label="Réussite" value={q.success_rate === null ? '—' : `${q.success_rate} %`}
          sub={q.previous_success_rate !== null && q.success_rate !== null ? <Delta value={q.success_rate - q.previous_success_rate} unit=" pts" text={PREVIOUS_TEXT[data.period.key]} /> : undefined} />
        <Mini label="Jours actifs" value={`${data.activity.active_days}`} sub={<span className="text-[12px] text-ink-faint">sur {data.period.days} jour{data.period.days > 1 ? 's' : ''}</span>} />
        <Mini label="Exercices validés" value={String(data.activity.exercises_validated)} />
      </dl>
    </Section>
  );
}

/* ───────────────────────────── Temps d'étude */

function StudyTime({ data }: { data: Stats }) {
  const [tab, setTab] = useState<keyof typeof THEMES>('chapter');
  const t = data.time;
  const themes = t.by_theme[tab];
  const maxTheme = Math.max(1, ...themes.map((x) => x.seconds));
  const maxMin = Math.max(1, ...data.series.map((p) => p.minutes));
  const every = Math.ceil(data.series.length / 8);
  return (
    <Section title="Temps d’étude" icon={<Clock className="h-4 w-4" />} tour="stats-temps"
      hint="Mesuré automatiquement quand tu travailles sur un exercice, une leçon ou un examen.">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="fd-display text-[30px] font-semibold leading-none text-ink fd-nums">{duration(t.seconds)}</span>
        <span className="text-[13px] text-ink-faint">{PERIOD_TEXT[data.period.key]}</span>
        {t.previous_seconds !== null && (
          <Delta value={Math.round((t.seconds - t.previous_seconds) / 60)} unit=" min" text={PREVIOUS_TEXT[data.period.key]} />
        )}
      </div>
      {t.seconds > 0 ? (
        <>
          <div className="mt-5 flex h-[120px] items-end gap-[3px]" role="img" aria-label="Temps d’étude par période">
            {data.series.map((p) => (
              <div key={p.start} className="group relative flex h-full flex-1 flex-col justify-end">
                <div className="rounded-t-[3px] bg-ink/80 transition-colors group-hover:bg-brand" style={{ height: `${p.minutes ? Math.max((p.minutes / maxMin) * 100, 3) : 0}%` }} />
                <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11px] text-white group-hover:block">
                  {p.label} · {p.minutes} min
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-[3px]">
            {data.series.map((p, i) => (
              <span key={p.start} className="flex-1 truncate text-center text-[10.5px] text-ink-faint">{i % every === 0 ? p.label : ''}</span>
            ))}
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[14px] font-semibold text-ink">Temps par thème</h3>
              <div role="tablist" aria-label="Type de thème" className="inline-flex rounded-lg bg-[#f2f1ee] p-0.5">
                {(Object.keys(THEMES) as (keyof typeof THEMES)[]).map((k) => (
                  <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)}
                    className={`h-8 rounded-md px-2.5 text-[12.5px] ${tab === k ? 'bg-white font-semibold text-ink shadow-sm' : 'font-medium text-ink-faint hover:text-ink'}`}>
                    {THEMES[k]}
                  </button>
                ))}
              </div>
            </div>
            {themes.length === 0 ? <Empty text="Pas de thème renseigné pour les contenus travaillés." /> : (
              <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                {themes.map((x) => (
                  <li key={x.name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13.5px] font-medium text-ink" title={x.name}>{x.name}</span>
                      <span className="shrink-0 text-[12.5px] font-semibold text-ink fd-nums">{duration(x.seconds)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max((x.seconds / maxTheme) * 100, 2)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4"><Empty text="Aucun temps d’étude enregistré sur cette période." /></div>
      )}
    </Section>
  );
}

/* ───────────────────────────── Petits éléments */

function Section({ title, icon, hint, action, tour, children }: { title: string; icon: React.ReactNode; hint?: string; action?: React.ReactNode; tour?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" data-tour={tour}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[16px] font-bold tracking-tight text-ink"><span className="text-ink-faint">{icon}</span>{title}</h2>
          {hint && <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-ink-faint">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, unit, delta, strong }: { label: string; value: string; unit?: string; delta?: React.ReactNode; strong?: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-3.5 ${strong ? 'bg-brand-soft/60 border border-brand-line' : 'bg-[#faf9f7] border border-line'}`}>
      <dt className="text-[11.5px] font-semibold uppercase tracking-[.06em] text-ink-faint">{label}</dt>
      <dd className="mt-1.5 flex items-baseline gap-1.5">
        <span className="fd-display text-[30px] font-semibold leading-none text-ink fd-nums">{value}</span>
        {unit && <span className="text-[13px] text-ink-faint">{unit}</span>}
      </dd>
      {delta && <div className="mt-2">{delta}</div>}
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-[#faf9f7] px-4 py-3">
      <dt className="text-[11.5px] font-semibold uppercase tracking-[.06em] text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[22px] font-bold leading-tight text-ink fd-nums">{value}</dd>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  );
}

function Delta({ value, unit, text }: { value: number; unit: string; text?: string }) {
  const v = Math.round(value * 10) / 10;
  const Icon = v > 0 ? ArrowUpRight : v < 0 ? ArrowDownRight : Minus;
  const tone = v > 0 ? 'text-brand-hover' : v < 0 ? 'text-gold-strong' : 'text-ink-faint';
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1 text-[12px] font-semibold ${tone}`} title={text ? `Par rapport ${text}` : undefined}>
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
        <Icon className="h-3.5 w-3.5" />
        <span className="fd-nums">{v > 0 ? '+' : ''}{String(v).replace('.', ',')}{unit}</span>
      </span>
      {text && <span className="font-normal text-ink-faint">par rapport {text}</span>}
    </span>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { id: number; name: string }[] }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
      className={`h-10 rounded-lg border px-3 text-[13px] ${value ? 'border-brand bg-brand-soft font-semibold text-brand-hover' : 'border-line bg-white text-ink-soft'}`}>
      <option value="">{label} : toutes</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

function Empty({ text, action }: { text: string; action?: { to: string; label: string } }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-[#faf9f7] px-4 py-5 text-[13px] leading-relaxed text-ink-faint">
      {text}
      {action && <Link to={action.to} className="ml-1 font-semibold text-brand-hover hover:underline">{action.label} →</Link>}
    </div>
  );
}

export default StatisticsPage;
