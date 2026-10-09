/**
 * Tableau de bord de l'accueil (élève connecté). Données : GET /api/dashboard/overview/ — que des
 * chiffres enregistrés, jamais d'estimation. Allégé le 06/10/2026 (Natsu : « trop chargé ») :
 *   1. bonjour + une action      2. ta semaine (une bande : série, questions, réussite, 7 jours)
 *   3. à faire maintenant (reprendre / à revoir / notions faibles, dans un seul encart, s'il y a quelque chose)
 * Le détail (maîtrise du programme, évolution, temps d'étude) est sur la page « Ma progression » (/progression).
 * Palette encre / vert / or, pas de dégradé ; vert = progression, or = à consolider.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, ArrowDownRight, Minus, Flame, Target, ListChecks,
  RotateCcw, PlayCircle, BookOpen, Brain,
} from 'lucide-react';
import { getDashboardOverview, type DashboardOverview as Overview } from '@/lib/api';
import { getRevisionSuggestions, quickAddToRevision } from '@/lib/api/revisionListApi';
import { Loader2 } from 'lucide-react';
import { NextTestReminder } from '@/components/devoirs/NextTestReminder';

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
  const hasTodo = data.resume.length > 0 || data.review.length > 0 || data.weak_notions.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <Header username={username} data={data} next={next} levelQuery={levelQuery} fallbackExercise={fallbackExercise} />
      {/* Prochain DS (« Mon prochain DS ») : le rappel juste sous le bonjour. */}
      <NextTestReminder />
      <WeekStrip data={data} />
      {hasTodo && <NextSteps data={data} />}
    </div>
  );
};

/* ───────────────────────────── Ta semaine (une seule bande) ───────────────────────────── */

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function WeekStrip({ data }: { data: Overview }) {
  const last7 = data.calendar.slice(-7).map((d) => ({ ...d, day: new Date(`${d.date}T12:00:00`) }));
  const w = data.week;
  return (
    <section aria-label="Ta semaine" data-tour="home-stats"
      className="rounded-2xl border border-line bg-white px-5 py-4 grid grid-cols-2 md:grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-x-6 gap-y-4 items-center">
      <Stat icon={<Flame className="w-4 h-4 text-gold" />} label="Série"
        value={`${data.streak.current} ${data.streak.current > 1 ? 'jours' : 'jour'}`}
        note={data.streak.best > data.streak.current ? `record : ${data.streak.best} j` : data.streak.current ? 'continue demain' : 'un exercice la lance'} />
      <Stat icon={<ListChecks className="w-4 h-4 text-ink-faint" />} label="Questions (7 j)" value={String(w.questions)}
        note={<Delta now={w.questions} before={data.previous_week.questions} />} />
      <Stat icon={<Target className="w-4 h-4 text-ink-faint" />} label="Réussite (7 j)"
        value={w.success_rate !== null ? `${w.success_rate} %` : '—'}
        note={w.success_rate === null ? 'évalue tes réponses' : `${data.totals.exercises_done} exercice${data.totals.exercises_done > 1 ? 's' : ''} réussi${data.totals.exercises_done > 1 ? 's' : ''} en tout`} />
      <div className="col-span-2 md:col-span-1 flex items-end gap-1.5 md:pl-6 md:border-l md:border-line" role="img"
        aria-label={`${w.active_days} jour${w.active_days > 1 ? 's' : ''} actif${w.active_days > 1 ? 's' : ''} sur les 7 derniers jours`}>
        {last7.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1" title={`${d.count ? `${d.count} activité${d.count > 1 ? 's' : ''}` : 'Aucune activité'} — ${d.day.getDate()} ${MONTHS[d.day.getMonth()]}`}>
            <span className="w-6 h-6 rounded-md" style={{ background: HEAT[heatStep(d.count)], border: d.count ? 'none' : '1px solid #e7e3dc' }} />
            <span className="text-[10.5px] text-ink-faint">{DAY_LETTERS[d.day.getDay()]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</span>
      </div>
      <div className="mt-1 text-[22px] font-bold text-ink leading-tight fd-nums" style={{ fontFamily: "'DM Mono', ui-monospace, monospace", letterSpacing: '-0.02em' }}>{value}</div>
      {note && <div className="text-[12px] text-ink-faint leading-snug truncate">{note}</div>}
    </div>
  );
}

/* ───────────────────────────── À faire maintenant (un seul encart) ───────────────────────────── */

function NextSteps({ data }: { data: Overview }) {
  const resume = data.resume.slice(0, 3);
  const review = data.review.slice(0, 3);
  return (
    <section className="rounded-2xl border border-line bg-white">
      <div className={`grid ${resume.length && review.length ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}`}>
        {resume.length > 0 && (
          <div className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink"><PlayCircle className="w-4 h-4 text-ink-faint" /> Reprendre</h2>
            <ul className="mt-2 divide-y divide-line">
              {resume.map((c) => {
                const pct = c.total ? Math.round(((c.assessed ?? 0) / c.total) * 100) : 0;
                return (
                  <li key={c.id}>
                    <Link to={c.url} className="group flex items-center gap-4 py-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-ink truncate group-hover:underline">{c.title}</p>
                        <div className="mt-1.5 flex items-center gap-3">
                          <div className="h-1.5 flex-1 max-w-[220px] rounded-full bg-[#f2f1ee] overflow-hidden">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[12px] text-ink-faint fd-nums whitespace-nowrap">{c.assessed} / {c.total} · {ago(c.last_at)}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-brand-hover flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {review.length > 0 && (
          <div className={`p-5 sm:p-6 ${resume.length ? 'border-t lg:border-t-0 lg:border-l border-line' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink"><RotateCcw className="w-4 h-4 text-ink-faint" /> À revoir</h2>
              <Link to="/revision-lists?onglet=listes" className="text-[12.5px] font-semibold text-brand-hover hover:underline">Mes listes</Link>
            </div>
            <ul className="mt-2 flex flex-col">
              {review.map((c) => (
                <li key={c.id}>
                  <Link to={c.url} className="flex items-center gap-2.5 py-2 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 text-[13.5px] font-medium text-ink truncate group-hover:underline">{c.title}</span>
                    <span className="text-[11.5px] text-ink-faint flex-shrink-0">{typeLabel(c.type)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <RevisionCta />
          </div>
        )}
      </div>
      {data.weak_notions.length > 0 && (
        <div className="px-5 sm:px-6 py-3 border-t border-line bg-[#fcfbf9] rounded-b-2xl flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink"><Target className="w-4 h-4 text-gold-strong" /> À retravailler :</span>
          <span className="text-ink-soft min-w-0">{data.weak_notions.slice(0, 3).map((n) => n.label).join(', ')}</span>
          <Link to="/skill-iq" className="ml-auto inline-flex items-center gap-1.5 font-semibold text-brand-hover hover:underline">
            <Brain className="w-4 h-4" /> Me tester
          </Link>
        </div>
      )}
    </section>
  );
}

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


/** Écart avec les 7 jours précédents : flèche + texte (jamais la couleur seule). */
function Delta({ now, before, unit = '' }: { now: number; before: number; unit?: string }) {
  const d = now - before;
  if (d === 0) return <span className="inline-flex items-center gap-1"><Minus className="w-3.5 h-3.5" /> comme la semaine d’avant</span>;
  const up = d > 0;
  return (
    <span className={`inline-flex items-center gap-1 ${up ? 'text-brand-hover' : 'text-ink-soft'}`}>
      {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
      <span className="fd-nums font-semibold">{up ? '+' : '−'}{Math.abs(d)}{unit}</span>
      <span className="text-ink-faint">vs semaine d’avant</span>
    </span>
  );
}


/* ───────────────────────────── Calendrier d'activité ───────────────────────────── */

// Une seule teinte (magnitude) : papier → vert. 0 = case vide.
const HEAT = ['#f0eee9', '#cfe6d8', '#9fcdb1', '#55a57a', '#1a7a4a'];
const heatStep = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : 4);

/* ───────────────────────────── Maîtrise par chapitre ───────────────────────────── */

/* ───────────────────────────── Divers ───────────────────────────── */

/** Exercices ratés rangés dans aucune liste : les ranger d'un clic dans « À revoir ». */
function RevisionCta() {
  const [ids, setIds] = useState<number[]>([]);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  useEffect(() => {
    getRevisionSuggestions().then((r) => setIds((r.results || []).map((x) => x.id))).catch(() => {});
  }, []);
  if (state === 'done') {
    return (
      <Link to="/revision-lists" className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-brand-soft px-3.5 py-2.5 text-[13px] font-semibold text-brand-hover hover:underline">
        Rangés dans « À revoir » <ArrowRight className="w-4 h-4" />
      </Link>
    );
  }
  if (!ids.length) return null;
  const add = async () => {
    setState('busy');
    try {
      for (const id of ids) await quickAddToRevision(id);
      setState('done');
    } catch {
      setState('idle');
    }
  };
  return (
    <div className="mt-4 rounded-xl border border-gold-line bg-gold-soft/60 px-3.5 py-3">
      <p className="text-[13px] text-ink-soft leading-snug">
        <b className="text-ink fd-nums">{ids.length}</b> exercice{ids.length > 1 ? 's' : ''} raté{ids.length > 1 ? 's' : ''} ne {ids.length > 1 ? 'sont' : 'est'} dans aucune liste de révision.
      </p>
      <button type="button" onClick={add} disabled={state === 'busy'} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-hover hover:underline disabled:opacity-60">
        {state === 'busy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListChecks className="w-3.5 h-3.5" />}
        Les ranger dans « À revoir »
      </button>
    </div>
  );
}

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

function typeLabel(t: string) {
  return t === 'exam' ? 'Examen' : t === 'lesson' ? 'Leçon' : 'Exercice';
}

export default DashboardOverview;
