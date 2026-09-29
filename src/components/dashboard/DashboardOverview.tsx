/**
 * Tableau de bord de l'accueil (élève connecté). Données : GET /api/dashboard/overview/ — que des
 * chiffres enregistrés, jamais d'estimation. Hiérarchie de lecture :
 *   1. où j'en suis cette semaine (4 chiffres)       2. quoi faire maintenant (reprendre / à revoir)
 *   3. ma régularité (calendrier)                   4. ma maîtrise du programme (chapitres, notions)
 * Palette encre / vert / or, pas de dégradé ; vert = progression, or = à consolider.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, ArrowDownRight, Minus, Flame, CheckCircle2, Target, ListChecks,
  RotateCcw, PlayCircle, CalendarDays, BookOpen, Brain, ChevronDown, Sparkles,
} from 'lucide-react';
import { getDashboardOverview, type DashboardOverview as Overview, type OverviewChapter } from '@/lib/api';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export const DashboardOverview: React.FC<{ username?: string; fallbackExercise?: { id: string | number; title: string } }> = ({
  username, fallbackExercise,
}) => {
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getDashboardOverview().then(setData).catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-faint">
        Ton tableau de bord n’a pas pu être chargé. Recharge la page dans un instant.
      </div>
    );
  }
  if (!data) return <Skeleton />;

  const next = data.resume[0];
  const levelQuery = data.level ? `?classLevels=${data.level.id}` : '';

  return (
    <div className="flex flex-col gap-6">
      <Header username={username} data={data} next={next} levelQuery={levelQuery} fallbackExercise={fallbackExercise} />

      {/* 1. Cette semaine */}
      <section aria-label="Cette semaine" data-tour="home-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile icon={<Flame className="w-4 h-4" />} label="Série" tone="gold"
          value={data.streak.current} unit={data.streak.current > 1 ? 'jours' : 'jour'}
          note={data.streak.best > 0 ? `record : ${data.streak.best} j` : 'un exercice aujourd’hui la lance'} />
        <Tile icon={<ListChecks className="w-4 h-4" />} label="Questions (7 j)"
          value={data.week.questions}
          delta={<Delta now={data.week.questions} before={data.previous_week.questions} />} />
        <Tile icon={<Target className="w-4 h-4" />} label="Réussite (7 j)"
          value={data.week.success_rate ?? '—'} unit={data.week.success_rate !== null ? '%' : undefined}
          delta={data.week.success_rate !== null && data.previous_week.success_rate !== null
            ? <Delta now={data.week.success_rate} before={data.previous_week.success_rate} unit=" pts" />
            : undefined}
          note={data.week.success_rate === null ? 'auto-évalue tes réponses pour la voir' : undefined} />
        <Tile icon={<CheckCircle2 className="w-4 h-4" />} label="Exercices réussis"
          value={data.totals.exercises_done}
          note={data.totals.exams_done ? `+ ${data.totals.exams_done} examen${data.totals.exams_done > 1 ? 's' : ''}` : 'depuis ton inscription'} />
      </section>

      {/* 2. Quoi faire maintenant */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2" icon={<PlayCircle className="w-4 h-4" />} title="Reprendre là où tu t’es arrêté">
          {data.resume.length ? (
            <ul className="divide-y divide-line">
              {data.resume.map((c) => {
                const pct = c.total ? Math.round(((c.assessed ?? 0) / c.total) * 100) : 0;
                return (
                  <li key={c.id}>
                    <Link to={c.url} className="group flex items-center gap-4 py-3.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] font-semibold text-ink truncate group-hover:underline">{c.title}</p>
                        <p className="text-[12.5px] text-ink-faint mt-0.5">
                          {c.chapter ?? 'Sans chapitre'} · {ago(c.last_at)}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1.5 flex-1 max-w-[260px] rounded-full bg-[#f2f1ee] overflow-hidden">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[12px] text-ink-faint fd-nums">{c.assessed} / {c.total} questions</span>
                        </div>
                      </div>
                      <span className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-hover">
                        Continuer <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty
              text="Rien en cours pour l’instant. Commence un exercice : il apparaîtra ici dès ta première auto-évaluation."
              action={fallbackExercise
                ? { to: `/exercises/${fallbackExercise.id}`, label: `Commencer « ${fallbackExercise.title} »` }
                : { to: `/exercises${levelQuery}`, label: 'Choisir un exercice' }} />
          )}
        </Panel>

        <Panel icon={<RotateCcw className="w-4 h-4" />} title="À revoir"
          action={data.review.length ? { to: '/revision-lists', label: 'Listes' } : undefined}>
          {data.review.length ? (
            <ul className="flex flex-col gap-1.5">
              {data.review.map((c) => (
                <li key={c.id}>
                  <Link to={c.url} className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 -mx-2.5 hover:bg-[#faf9f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium text-ink truncate">{c.title}</span>
                      <span className="block text-[12px] text-ink-faint">{typeLabel(c.type)}{c.chapter ? ` · ${c.chapter}` : ''}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-faint leading-relaxed">
              Rien à revoir. Quand tu marques un exercice « Échoué », il t’attend ici pour une seconde tentative.
            </p>
          )}
        </Panel>
      </div>

      {/* 3. Régularité */}
      <Panel icon={<CalendarDays className="w-4 h-4" />} title="Ta régularité"
        subtitle="Chaque case est un jour : questions auto-évaluées, exercices terminés, chronos enregistrés et quiz Skill IQ.">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
          <ActivityCalendar days={data.calendar} />
          <dl className="grid grid-cols-3 lg:grid-cols-1 gap-4 lg:w-44 flex-shrink-0">
            <Fact label="Jours actifs (7 j)" value={data.week.active_days} />
            <Fact label="Meilleure série" value={`${data.streak.best} j`} />
            <Fact label="Chrono enregistré" value={minutes(data.totals.chrono_minutes)} />
          </dl>
        </div>
      </Panel>

      {/* 4. Maîtrise du programme */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2" icon={<BookOpen className="w-4 h-4" />} title="Ta maîtrise du programme"
          subtitle={data.level ? `Programme de ${data.level.name}` : 'Choisis ton niveau dans ton profil pour voir tout ton programme.'}>
          <ChapterMastery chapters={data.chapters} coverage={data.coverage} hasLevel={!!data.level} />
        </Panel>

        <Panel icon={<Target className="w-4 h-4" />} title="Notions à retravailler">
          {data.weak_notions.length ? (
            <>
              <ul className="flex flex-col gap-3">
                {data.weak_notions.map((n) => (
                  <li key={n.slug}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13.5px] font-medium text-ink">{n.label}</span>
                      <span className="text-[12px] text-gold-strong font-semibold fd-nums">{n.mastery_pct} %</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[#f2f1ee] overflow-hidden">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(n.mastery_pct, 3)}%` }} />
                    </div>
                    <p className="text-[11.5px] text-ink-faint mt-1">sur {n.assessed} question{n.assessed > 1 ? 's' : ''} évaluée{n.assessed > 1 ? 's' : ''}</p>
                  </li>
                ))}
              </ul>
              <Link to="/skill-iq" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-hover hover:underline">
                <Brain className="w-4 h-4" /> Me tester avec Skill IQ
              </Link>
            </>
          ) : (
            <p className="text-[13px] text-ink-faint leading-relaxed">
              Aucune notion en difficulté. Elles apparaissent ici dès 2 questions évaluées sur une même notion, sous 60 % de réussite.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
};

/* ───────────────────────────── En-tête ───────────────────────────── */

function Header({ username, data, next, levelQuery, fallbackExercise }: {
  username?: string; data: Overview; next?: Overview['resume'][number]; levelQuery: string;
  fallbackExercise?: { id: string | number; title: string };
}) {
  const now = new Date();
  const hello = now.getHours() >= 18 || now.getHours() < 6 ? 'Bonsoir' : 'Bonjour';
  const w = data.week;
  const summary = w.questions
    ? `Cette semaine : ${w.questions} question${w.questions > 1 ? 's' : ''} évaluée${w.questions > 1 ? 's' : ''}`
      + (w.success_rate !== null ? `, ${w.success_rate} % réussies` : '') + '.'
    : data.totals.questions
      ? 'Pas encore d’activité cette semaine : reprends là où tu t’étais arrêté.'
      : 'Bienvenue ! Fais un premier exercice : ton tableau de bord se remplira au fil de ton travail.';
  const primary = next
    ? { to: next.url, label: 'Reprendre', detail: next.title }
    : fallbackExercise
      ? { to: `/exercises/${fallbackExercise.id}`, label: 'Commencer', detail: fallbackExercise.title }
      : { to: `/exercises${levelQuery}`, label: 'Choisir un exercice', detail: undefined };

  return (
    <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[.1em] text-ink-faint fd-nums"
          style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>
          {DAYS[now.getDay()]} {now.getDate()} {MONTHS[now.getMonth()].replace('.', '')} {data.level ? `· ${data.level.name}` : ''}
        </p>
        <h1 className="fd-display text-ink mt-2.5" style={{ fontSize: 'clamp(28px,3.4vw,38px)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
          {hello}{username ? <>, <span className="italic font-medium">{username}</span></> : ''}
        </h1>
        <p className="text-[14.5px] text-ink-faint mt-2.5 max-w-xl leading-relaxed">{summary}</p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Link to={primary.to}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-brand text-white text-[14px] font-semibold hover:bg-brand-hover transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand max-w-[340px]">
          <PlayCircle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{primary.label}{primary.detail ? ` : ${primary.detail}` : ''}</span>
        </Link>
        <Link to={`/lessons${levelQuery}`}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-line bg-white text-[14px] font-semibold text-ink-soft hover:border-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          <BookOpen className="w-4 h-4" /> Leçons
        </Link>
      </div>
    </header>
  );
}

/* ───────────────────────────── Briques ───────────────────────────── */

function Tile({ icon, label, value, unit, note, delta, tone }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; unit?: string;
  note?: string; delta?: React.ReactNode; tone?: 'gold';
}) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-4 min-w-0">
      <div className={`flex items-center gap-2 ${tone === 'gold' ? 'text-gold' : 'text-ink-faint'}`}>
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[28px] font-bold text-ink leading-none fd-nums" style={{ fontFamily: "'DM Mono', ui-monospace, monospace", letterSpacing: '-0.02em' }}>{value}</span>
        {unit && <span className="text-[12.5px] font-semibold text-ink-faint">{unit}</span>}
      </div>
      <div className="mt-2 text-[12px] text-ink-faint leading-snug min-h-[16px]">{delta ?? note}</div>
    </div>
  );
}

/** Écart avec les 7 jours précédents : flèche + texte (jamais la couleur seule). */
function Delta({ now, before, unit = '' }: { now: number; before: number; unit?: string }) {
  const d = now - before;
  if (d === 0) return <span className="inline-flex items-center gap-1"><Minus className="w-3.5 h-3.5" /> comme les 7 jours d’avant</span>;
  const up = d > 0;
  return (
    <span className={`inline-flex items-center gap-1 ${up ? 'text-brand-hover' : 'text-ink-soft'}`}>
      {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
      <span className="fd-nums font-semibold">{up ? '+' : '−'}{Math.abs(d)}{unit}</span>
      <span className="text-ink-faint">vs 7 j d’avant</span>
    </span>
  );
}

function Panel({ icon, title, subtitle, action, className = '', children }: {
  icon: React.ReactNode; title: string; subtitle?: string; action?: { to: string; label: string };
  className?: string; children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="flex items-center gap-2 text-[15.5px] font-bold text-ink tracking-tight">
            <span className="text-ink-faint">{icon}</span>{title}
          </h2>
          {subtitle && <p className="text-[12.5px] text-ink-faint mt-1 leading-relaxed">{subtitle}</p>}
        </div>
        {action && (
          <Link to={action.to} className="text-[12.5px] font-semibold text-brand-hover hover:underline flex-shrink-0">{action.label}</Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ text, action }: { text: string; action: { to: string; label: string } }) {
  return (
    <div className="rounded-xl bg-[#faf9f7] border border-dashed border-line px-5 py-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <Sparkles className="w-5 h-5 text-gold flex-shrink-0" aria-hidden />
      <p className="text-[13.5px] text-ink-soft flex-1 leading-relaxed">{text}</p>
      <Link to={action.to} className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-lg bg-brand text-white text-[13px] font-semibold hover:bg-brand-hover self-start sm:self-auto max-w-full">
        <span className="truncate">{action.label}</span> <ArrowRight className="w-4 h-4 flex-shrink-0" />
      </Link>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[20px] font-bold text-ink fd-nums" style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>{value}</dd>
    </div>
  );
}

/* ───────────────────────────── Calendrier d'activité ───────────────────────────── */

// Une seule teinte (magnitude) : papier → vert. 0 = case vide.
const HEAT = ['#f0eee9', '#cfe6d8', '#9fcdb1', '#55a57a', '#1a7a4a'];
const heatStep = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : 4);

function ActivityCalendar({ days }: { days: { date: string; count: number }[] }) {
  const { weeks, months, activeDays } = useMemo(() => {
    const parsed = days.map((d) => ({ ...d, day: new Date(`${d.date}T12:00:00`) }));
    const lead = (parsed[0].day.getDay() + 6) % 7; // lundi = 0
    const cells: (typeof parsed[number] | null)[] = [...Array(lead).fill(null), ...parsed];
    const w: (typeof parsed[number] | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));
    const m: { col: number; label: string }[] = [];
    w.forEach((col, i) => {
      const first = col.find(Boolean);
      if (first && (i === 0 || first.day.getDate() <= 7)) {
        const label = MONTHS[first.day.getMonth()];
        if (!m.length || m[m.length - 1].label !== label) m.push({ col: i, label });
      }
    });
    return { weeks: w, months: m, activeDays: parsed.filter((d) => d.count > 0).length };
  }, [days]);

  const CELL = 12, GAP = 3, LEFT = 26, TOP = 16; // 52 semaines ≈ 800 px : tient dans le panneau sur un écran de portable
  const width = LEFT + weeks.length * (CELL + GAP);
  const height = TOP + 7 * (CELL + GAP);
  // Écran étroit : le calendrier défile, on montre d'abord les semaines les plus récentes.
  const scroller = React.useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth; }, [weeks.length]);

  return (
    <figure className="flex-1 min-w-0">
      <div ref={scroller} className="overflow-x-auto pb-1">
        <svg width={width} height={height} role="img"
          aria-label={`${activeDays} jour${activeDays > 1 ? 's' : ''} d’activité sur les ${weeks.length} dernières semaines`}>
          {months.map((m) => (
            <text key={`${m.col}-${m.label}`} x={LEFT + m.col * (CELL + GAP)} y={10} fontSize="10.5" fill="#6b6862" fontFamily="DM Sans">{m.label}</text>
          ))}
          {['Lun', 'Mer', 'Ven'].map((l, i) => (
            <text key={l} x={0} y={TOP + (i * 2) * (CELL + GAP) + CELL - 2} fontSize="10" fill="#6b6862" fontFamily="DM Sans">{l}</text>
          ))}
          {weeks.map((col, wi) => col.map((d, di) => d && (
            <rect key={d.date} x={LEFT + wi * (CELL + GAP)} y={TOP + di * (CELL + GAP)} width={CELL} height={CELL} rx={3}
              fill={HEAT[heatStep(d.count)]} stroke={d.count ? 'none' : '#e7e3dc'} strokeWidth={d.count ? 0 : 1}>
              <title>{`${d.count ? `${d.count} activité${d.count > 1 ? 's' : ''}` : 'Aucune activité'} — ${d.day.getDate()} ${MONTHS[d.day.getMonth()]}`}</title>
            </rect>
          )))}
        </svg>
      </div>
      <figcaption className="mt-2 flex items-center justify-between gap-3 flex-wrap text-[11.5px] text-ink-faint">
        <span><b className="text-ink fd-nums">{activeDays}</b> jour{activeDays > 1 ? 's' : ''} actif{activeDays > 1 ? 's' : ''} sur les 12 derniers mois</span>
        <span className="inline-flex items-center gap-1.5" aria-hidden>
          Moins {HEAT.map((c, i) => <span key={c} className="inline-block w-3 h-3 rounded-[3px]" style={{ background: c, border: i ? 'none' : '1px solid #e7e3dc' }} />)} Plus
        </span>
      </figcaption>
    </figure>
  );
}

/* ───────────────────────────── Maîtrise par chapitre ───────────────────────────── */

function ChapterMastery({ chapters, coverage, hasLevel }: { chapters: OverviewChapter[]; coverage: Overview['coverage']; hasLevel: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const started = chapters.filter((c) => c.assessed > 0 || c.skilliq_pct !== null)
    .sort((a, b) => (a.success_pct ?? 101) - (b.success_pct ?? 101));
  const rest = chapters.filter((c) => !(c.assessed > 0 || c.skilliq_pct !== null));
  const coveragePct = coverage.total ? Math.round((coverage.touched / coverage.total) * 100) : 0;

  return (
    <div>
      {/* Couverture : seulement quand le niveau (donc le programme) est connu, sinon « 100 % » ne voudrait rien dire. */}
      {hasLevel ? (
        <>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="text-[13.5px] text-ink-soft">
              <b className="text-ink fd-nums">{coverage.touched}</b> chapitre{coverage.touched > 1 ? 's' : ''} travaillé{coverage.touched > 1 ? 's' : ''} sur <b className="text-ink fd-nums">{coverage.total}</b>
            </p>
            <span className="text-[12px] text-ink-faint fd-nums">{coveragePct} % du programme</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-[#f2f1ee] overflow-hidden"
            role="progressbar" aria-valuenow={coveragePct} aria-valuemin={0} aria-valuemax={100} aria-label="Couverture du programme">
            <div className="h-full rounded-full bg-ink" style={{ width: `${coveragePct}%` }} />
          </div>
        </>
      ) : (
        <p className="text-[13.5px] text-ink-soft">
          <b className="text-ink fd-nums">{coverage.touched}</b> chapitre{coverage.touched > 1 ? 's' : ''} travaillé{coverage.touched > 1 ? 's' : ''}.{' '}
          <Link to="/complete-profile" className="font-semibold text-brand-hover hover:underline">Indique ton niveau</Link> pour voir tout ton programme.
        </p>
      )}

      {started.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3.5">
          {started.map((c) => {
            const pct = c.success_pct;
            const weak = pct !== null && pct < 50;
            return (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <Link to={`/exercises?chapters=${c.id}`} className="text-[13.5px] font-semibold text-ink hover:underline truncate">{c.name}</Link>
                  <span className="flex items-center gap-2 flex-shrink-0 text-[12px] fd-nums">
                    {c.skilliq_pct !== null && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#f2f1ee] text-ink-soft font-semibold" title="Score au quiz Skill IQ de ce chapitre">
                        Skill IQ {c.skilliq_pct} %
                      </span>
                    )}
                    {pct !== null
                      ? <span className={weak ? 'text-gold-strong font-semibold' : 'text-ink font-semibold'}>{pct} %</span>
                      : <span className="text-ink-faint">—</span>}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-[#f2f1ee] overflow-hidden">
                  <div className={`h-full rounded-full ${weak ? 'bg-gold' : 'bg-brand'}`} style={{ width: `${Math.max(pct ?? 0, pct === null ? 0 : 3)}%` }} />
                </div>
                <p className="text-[11.5px] text-ink-faint mt-1">
                  {c.assessed ? `${c.assessed} question${c.assessed > 1 ? 's' : ''} évaluée${c.assessed > 1 ? 's' : ''}` : 'pas encore d’auto-évaluation'}
                  {weak && ' · à consolider'}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {rest.length > 0 && (
        <div className="mt-5 pt-4 border-t border-line">
          <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink min-h-[32px]">
            <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            {rest.length} chapitre{rest.length > 1 ? 's' : ''} pas encore commencé{rest.length > 1 ? 's' : ''}
          </button>
          {showAll && (
            <ul className="mt-2 grid sm:grid-cols-2 gap-x-6">
              {rest.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-[#f2f1ee] last:border-0">
                  <span className="text-[13px] text-ink-soft truncate">{c.name}</span>
                  {c.contents > 0
                    ? <Link to={`/exercises?chapters=${c.id}`} className="text-[12px] font-semibold text-brand-hover hover:underline flex-shrink-0">{c.contents} contenu{c.contents > 1 ? 's' : ''}</Link>
                    : <span className="text-[12px] text-ink-faint flex-shrink-0">bientôt</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Divers ───────────────────────────── */

function Skeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="h-24 rounded-2xl bg-white border border-line animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[112px] rounded-2xl bg-white border border-line animate-pulse" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-56 rounded-2xl bg-white border border-line animate-pulse" />
        <div className="h-56 rounded-2xl bg-white border border-line animate-pulse" />
      </div>
    </div>
  );
}

function ago(iso?: string) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  return `il y a ${days} jours`;
}

function minutes(m: number) {
  if (!m) return '0 min';
  const h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

function typeLabel(t: string) {
  return t === 'exam' ? 'Examen' : t === 'lesson' ? 'Leçon' : 'Exercice';
}

export default DashboardOverview;
