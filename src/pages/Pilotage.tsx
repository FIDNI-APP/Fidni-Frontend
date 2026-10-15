/**
 * Pilotage — tableau de bord des administrateurs, en plusieurs onglets :
 *  - Aperçu (refondu le 12/10/2026, « moniteur ») : bandeau « En ce moment » (ce qui attend, activité du jour vs hier),
 *    huit tuiles avec leur petite courbe (les quatre premières choisissent la grande courbe), carte « Membres »
 *    (anneau des actifs + parcours des inscrits, ex-Entonnoir), « Activité en direct », contenus les plus vus.
 *    Le direct vient de /api/pilotage/direct/, relu toutes les 30 s quand la page est visible
 *    (components/pilotage/livePilotage, StatusStrip, KpiTile, Sparkline, RingGauge, MembersCard, LiveActivity, DayChart) ;
 *  - À traiter : signalements d'erreurs, corrections « à vérifier » à valider ;
 *  - Membres : recherche, filtres rapides, fiche dépliable avec les dernières actions ;
 *  - Usage (06/10/2026) : membres qui se servent de chaque fonctionnalité, pages les plus visitées, filtres et
 *    leurs valeurs les plus choisies (difficulté, chapitre, tri…, 09/10/2026) ;
 *  - Visiteurs (09/10/2026) : les visiteurs non connectés, à part (components/pilotage/VisitorsTab) ;
 *  - Membres : aussi « Un membre n'arrive pas à se connecter ? » (components/pilotage/LoginDiagnostic) et
 *    « Comptes bannis » (components/pilotage/BansCard, 11/10/2026) ;
 *  - IA : un document (PDF, Word, photos) → fiches préparées par l'IA, relues puis publiées (components/pilotage/IATab).
 * Audit du 10/10/2026 : « Entonnoir » dans l'Aperçu (aujourd'hui dans MembersCard), « Écarts de difficulté » dans
 * À traiter (DifficultyGapsPanel), « Portes d'inscription » dans Usage (AuthDoorsCard).
 * Données : /api/pilotage/?jours=7|30|90, /api/pilotage/utilisateurs/ (+ /<id>/) — backend apps/users/admin_dashboard.py.
 * Les comptes maison (admins, compte éditorial, compte de test) sont exclus des chiffres.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  Activity, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Eye, Flag, Gauge, Inbox,
  Loader2, LineChart, PenLine, RefreshCw, Repeat, RotateCcw, Search, ShieldCheck, Sparkles,
  UserPlus, Users, type LucideIcon,
} from 'lucide-react';
import { SerieModal, type SerieTarget } from '@/components/pilotage/SerieModal';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/apiClient';
import { ReportsPanel } from '@/components/pilotage/ReportsPanel';
import { IATab } from '@/components/pilotage/IATab';
import { ValidationTab } from '@/components/pilotage/ValidationTab';
import { QuizAdminTab } from '@/components/pilotage/QuizAdminTab';
import { VisitorsTab, type AnonymousStats } from '@/components/pilotage/VisitorsTab';
import { LoginDiagnostic } from '@/components/pilotage/LoginDiagnostic';
import { BansCard } from '@/components/pilotage/BansCard';
import type { Funnel } from '@/components/pilotage/FunnelCard';
import { DifficultyGapsPanel, type DifficultyGap } from '@/components/pilotage/DifficultyGapsPanel';
import { AuthDoorsCard, type AuthDoor } from '@/components/pilotage/AuthDoorsCard';
import { AvisDiagnosticsCard, type AvisDiagnostic } from '@/components/pilotage/AvisDiagnosticsCard';
import { NouveautesCard, type NouveauteStat } from '@/components/pilotage/NouveautesCard';
import { KpiTile } from '@/components/pilotage/KpiTile';
import { DayChart } from '@/components/pilotage/DayChart';
import { MembersCard } from '@/components/pilotage/MembersCard';
import { StatusStrip, type StatusPillDef } from '@/components/pilotage/StatusStrip';
import { LiveActivity } from '@/components/pilotage/LiveActivity';
import { MemberJournal } from '@/components/pilotage/MemberJournal';
import { LivePill } from '@/components/pilotage/LivePill';
import { useLivePilotage, type LiveData, type LiveStatus } from '@/components/pilotage/livePilotage';
import { PAGES, pageInfo } from '@/lib/usage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface ContentRef { id: number; type: string; title: string; url: string }
type MetricKey = 'views' | 'active' | 'signups' | 'work';
interface Metric { value: number; previous: number | null }
type Day = { date: string } & Record<MetricKey, number | null>;
interface Overview {
  generated_at: string;
  days: number;
  views_since: string;
  members_total: number;
  todo: { reports_open: number; a_verifier: ContentRef[]; difficulty_gaps?: DifficultyGap[] };
  metrics: Record<MetricKey, Metric>;
  series: Day[];
  top_contents: (ContentRef & { views: number; readers: number })[];
  usage_since: string;
  features: { key: string; label: string; source: 'base' | 'navigateur' | 'filtre'; actions: number; users: number | null; visits?: number; previous: number | null }[];
  pages: { page: string; views: number; visits: number }[];
  filter_values: FilterValue[];
  anonymes: AnonymousStats;
  /** Absents d'un serveur plus ancien : les blocs correspondants ne s'affichent pas. */
  funnel?: Funnel;
  auth_doors?: AuthDoor[];
  avis_diagnostics?: AvisDiagnostic[];
  nouveautes?: NouveauteStat[];
}
interface FilterValue { filter: string; type: 'exercise' | 'exam' | 'lesson'; value: string; label: string; count: number; visits: number; anon: number }
interface UserRow {
  id: number; username: string; email: string; full_name: string; user_type: string | null;
  class_level: string | null; school: string | null; date_joined: string; last_login: string | null;
  last_activity: string | null; onboarding_completed: boolean; email_verified: boolean; is_admin: boolean; is_house: boolean;
  stats: { views: number; completions: number; questions: number; comments: number; study_minutes: number };
}
interface UsersPage { count: number; pages: number; results: UserRow[]; counts: Record<string, number> }

const PERIODS = [7, 30, 90];
type TabKey = 'apercu' | 'a-traiter' | 'validation' | 'membres' | 'usage' | 'visiteurs' | 'quiz' | 'ia';

/* Réponse de /api/pilotage/ remise en forme une seule fois (10/10/2026) : un champ absent, nul ou d'un autre
 * type (serveur plus ancien ou plus récent que la page) devient une valeur vide au lieu de faire planter
 * l'affichage. Les blocs facultatifs (funnel, auth_doors, difficulty_gaps) restent absents s'ils le sont. */
type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const obj = (v: unknown): Json => (isObj(v) ? v : {});
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback);
const list = <T,>(v: unknown, item: (x: Json) => T | null): T[] =>
  (Array.isArray(v) ? v.filter(isObj).map(item).filter((x): x is T => x !== null) : []);
const contentRef = (x: Json): ContentRef => ({ id: num(x.id), type: str(x.type), title: str(x.title, 'Sans titre'), url: str(x.url, '/') });
const totals = (v: unknown) => {
  const t = obj(v);
  return { visits: num(t.visits), member_visits: num(t.member_visits), pages: num(t.pages), contents: num(t.contents), contents_all: num(t.contents_all) };
};

function normalizeOverview(raw: unknown, requestedDays: number): Overview {
  if (!isObj(raw)) throw new Error('Réponse inattendue du serveur.');
  const metrics = obj(raw.metrics);
  const todo = obj(raw.todo);
  const anon = obj(raw.anonymes);
  const days = PERIODS.includes(num(raw.days)) ? num(raw.days) : requestedDays;
  const metric = (k: MetricKey): Metric => ({ value: num(obj(metrics[k]).value), previous: numOrNull(obj(metrics[k]).previous) });
  const page = (x: Json) => ({ page: str(x.page), views: num(x.views), visits: num(x.visits) });
  return {
    generated_at: str(raw.generated_at, new Date().toISOString()),
    days,
    views_since: str(raw.views_since, '2026-10-05'),
    members_total: num(raw.members_total),
    todo: {
      reports_open: num(todo.reports_open),
      a_verifier: list(todo.a_verifier, contentRef),
      difficulty_gaps: Array.isArray(todo.difficulty_gaps)
        ? list(todo.difficulty_gaps, (g) => ({
          ...contentRef(g), edit_url: str(g.edit_url) || undefined, declared: str(g.declared) || null, felt: str(g.felt) || null,
          n: num(g.n), success_pct: numOrNull(g.success_pct), basis: str(g.basis) || null,
          votes: isObj(g.votes) ? { easier: num(g.votes.easier), as_said: num(g.votes.as_said), harder: num(g.votes.harder) } : null,
        }))
        : undefined,
    },
    metrics: { views: metric('views'), active: metric('active'), signups: metric('signups'), work: metric('work') },
    series: list(raw.series, (d) => (typeof d.date === 'string' ? {
      date: d.date, views: numOrNull(d.views), active: numOrNull(d.active), signups: numOrNull(d.signups), work: numOrNull(d.work),
    } : null)),
    top_contents: list(raw.top_contents, (c) => ({ ...contentRef(c), views: num(c.views), readers: num(c.readers) })),
    usage_since: str(raw.usage_since, '2026-10-06'),
    features: list(raw.features, (f) => ({
      key: str(f.key), label: str(f.label, str(f.key)),
      source: (['base', 'navigateur', 'filtre'].includes(str(f.source)) ? f.source : 'base') as Overview['features'][number]['source'],
      actions: num(f.actions), users: numOrNull(f.users), visits: num(f.visits), previous: numOrNull(f.previous),
    })),
    pages: list(raw.pages, page),
    filter_values: list(raw.filter_values, (v) => ({
      filter: str(v.filter), type: str(v.type) as FilterValue['type'], value: str(v.value), label: str(v.label, str(v.value)),
      count: num(v.count), visits: num(v.visits), anon: num(v.anon),
    })),
    anonymes: {
      since: str(anon.since, str(raw.usage_since, '2026-10-09')),
      current: totals(anon.current),
      previous: isObj(anon.previous) ? totals(anon.previous) : null,
      signups: num(anon.signups),
      series: list(anon.series, (d) => (typeof d.date === 'string' ? {
        date: d.date, anon: numOrNull(d.anon), members: numOrNull(d.members), anon_pages: numOrNull(d.anon_pages), anon_contents: numOrNull(d.anon_contents),
      } : null)),
      pages: list(anon.pages, page),
      top_contents: list(anon.top_contents, (c) => ({ ...contentRef(c), views: num(c.views), total: num(c.total) })),
      actions: list(anon.actions, (a) => ({ key: str(a.key), label: str(a.label, str(a.key)), count: num(a.count), total: num(a.total), visits: num(a.visits) })),
    },
    funnel: isObj(raw.funnel) ? {
      signups: num(raw.funnel.signups), verified: num(raw.funnel.verified), onboarded: num(raw.funnel.onboarded),
      first_view: num(raw.funnel.first_view), first_work: num(raw.funnel.first_work), back_d7: num(raw.funnel.back_d7),
      d7_eligible: num(raw.funnel.d7_eligible),
    } : undefined,
    auth_doors: Array.isArray(raw.auth_doors)
      ? list(raw.auth_doors, (d) => ({ source: str(d.source, 'autre'), count: num(d.count), visits: num(d.visits), anon: num(d.anon) }))
      : undefined,
    avis_diagnostics: Array.isArray(raw.avis_diagnostics)
      ? list(raw.avis_diagnostics, (a) => ({ sujet: str(a.sujet, 'autre'), oui: num(a.oui), non: num(a.non), total: num(a.total),
        accord: a.accord === null || a.accord === undefined ? null : num(a.accord) }))
      : undefined,
    nouveautes: Array.isArray(raw.nouveautes)
      ? list(raw.nouveautes, (n) => ({ id: str(n.id, '?'), depuis: str(n.depuis, ''), comptes: num(n.comptes), vue: num(n.vue),
        finie: num(n.finie), cta: num(n.cta), passee: num(n.passee) }))
      : undefined,
  };
}

const METRICS: {
  key: MetricKey; label: string; hint: string; unit: [string, string]; short: [string, string]; color: string; icon: LucideIcon;
}[] = [
  { key: 'views', label: 'Vues des contenus', unit: ['vue', 'vues'], short: ['vue', 'vues'], color: '#1a1a1a', icon: Eye,
    hint: 'Visiteurs compris : une vue par personne et par contenu sur 24 h. Robots et comptes maison exclus.' },
  { key: 'active', label: 'Membres actifs', unit: ['membre actif', 'membres actifs'], short: ['membre', 'membres'], color: '#1a7a4a', icon: Activity,
    hint: 'Inscrits ayant fait au moins une action : consultation, exercice, commentaire, test…' },
  { key: 'signups', label: 'Inscriptions', unit: ['inscription', 'inscriptions'], short: ['compte', 'comptes'], color: '#b8872b', icon: UserPlus,
    hint: 'Nouveaux comptes créés.' },
  { key: 'work', label: 'Travail des élèves', unit: ['action', 'actions'], short: ['action', 'actions'], color: '#6b6862', icon: PenLine,
    hint: 'Questions auto-évaluées et contenus terminés.' },
];

const TYPE_LABEL: Record<string, string> = { exercise: 'Exercice', exam: 'Examen', lesson: 'Leçon' };

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString('fr-FR');
const plural = (n: number, [one, many]: [string, string]) => `${fmt(n)} ${n > 1 ? many : one}`;
const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', opts);

function ago(iso: string | null): string {
  if (!iso) return 'jamais';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  if (d < 31) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ───────────────────────────── Aperçu ───────────────────────────── */

const ANON_COLOR = '#c0892f';
const card = 'rounded-2xl border border-line bg-white';

/** Contenus les plus vus sur la période : rang, titre, vues (barre), membres lecteurs. */
const TopContents: React.FC<{ items: Overview['top_contents']; days: number }> = ({ items, days }) => {
  const [all, setAll] = useState(false);
  const max = Math.max(1, ...items.map((c) => c.views));
  const shown = all ? items : items.slice(0, 6);
  return (
    <section className={`${card} flex h-full flex-col p-4 sm:p-5`} aria-labelledby="pilotage-top">
      <h2 id="pilotage-top" className="fd-display text-[16px] text-ink">Contenus les plus vus</h2>
      <p className="mt-0.5 text-[12px] text-ink-faint">Sur {days} j, visiteurs compris.</p>
      {items.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-faint">Aucune vue enregistrée sur la période.</p>
      ) : (
        <ol className="-mx-2 mt-3 flex flex-col gap-0.5">
          {shown.map((c, i) => (
            <li key={c.id}>
              <Link to={c.url} className="group block rounded-xl px-2 py-2 transition-colors hover:bg-[#faf9f7]">
                <span className="flex items-baseline gap-2">
                  <span className="fd-nums w-4 shrink-0 text-[11.5px] text-ink-faint">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink group-hover:text-brand" title={c.title}>{c.title}</span>
                  <span className="fd-nums shrink-0 text-[13px] font-semibold text-ink">{fmt(c.views)}</span>
                </span>
                <span className="ml-6 mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]" aria-hidden>
                  <span className="block h-full rounded-full bg-ink/70" style={{ width: `${Math.max((c.views / max) * 100, 2)}%` }} />
                </span>
                <span className="fd-nums ml-6 mt-1 block text-[11.5px] text-ink-faint">
                  {TYPE_LABEL[c.type] ?? c.type}{c.readers ? ` · ${plural(c.readers, ['membre', 'membres'])}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {items.length > 6 && (
        <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all}
          className="mt-auto inline-flex items-center gap-1 self-start pt-3 text-[12.5px] font-semibold text-ink-soft hover:text-ink">
          <ChevronDown className={`h-4 w-4 transition-transform ${all ? 'rotate-180' : ''}`} aria-hidden />
          {all ? 'Replier' : `Tout voir (${items.length})`}
        </button>
      )}
    </section>
  );
};

/** Pied d'une tuile sans série : lien vers l'onglet concerné. */
const TileLink: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-ink-soft group-hover:text-ink">
    {children} <ChevronRight className="h-3.5 w-3.5" aria-hidden />
  </span>
);

const OverviewTab: React.FC<{
  data: Overview; live: LiveData | null; liveStatus: LiveStatus; reportsOpen: number; verifyLeft: number; onGo: (tab: TabKey) => void;
}> = ({ data, live, liveStatus, reportsOpen, verifyLeft, onGo }) => {
  const [metric, setMetric] = useState<MetricKey>('views');
  const def = METRICS.find((m) => m.key === metric)!;
  const m = data.metrics[metric];
  const headline = metric === 'active'
    ? `${plural(m.value, def.unit)} différents sur ${data.days} j`
    : `${plural(m.value, def.unit)} sur ${data.days} j`;
  const dates = data.series.map((d) => d.date);
  const today = live?.today ?? null;
  // Le direct est plus frais que l'aperçu : ses compteurs l'emportent dès qu'il a répondu.
  const reports = live ? live.todo.reports_open : reportsOpen;
  const verify = live ? live.todo.a_verifier : verifyLeft;
  const gaps = data.todo.difficulty_gaps ? data.todo.difficulty_gaps.length : null;
  const anon = data.anonymes;
  const funnel = data.funnel;
  const d7 = funnel && funnel.d7_eligible ? Math.round((funnel.back_d7 / funnel.d7_eligible) * 100) : null;

  const pills: StatusPillDef[] = [
    { key: 'reports', count: reports, one: 'signalement ouvert', many: 'signalements ouverts', icon: Flag, tone: 'red',
      onClick: () => onGo('a-traiter'), title: 'Erreurs signalées par les élèves' },
    { key: 'verify', count: verify, one: 'contenu à vérifier', many: 'contenus à vérifier', icon: ShieldCheck, tone: 'gold',
      onClick: () => onGo('a-traiter'), title: 'Corrections affichées avec le bandeau «\u00a0à vérifier\u00a0»' },
    { key: 'brouillons', count: live ? live.todo.brouillons : null, one: 'contenu à valider', many: 'contenus à valider',
      icon: Inbox, tone: 'gold', onClick: () => onGo('validation'), title: 'Exercices, cours et devoirs préparés par Claude' },
    { key: 'ia-run', count: live ? live.todo.ia_en_cours : null, one: 'travail IA en cours', many: 'travaux IA en cours', icon: Sparkles,
      tone: 'brand', running: true, onClick: () => onGo('ia') },
    { key: 'ia-read', count: live ? live.todo.ia_a_relire : null, one: 'à relire (IA)', many: 'à relire (IA)', icon: ClipboardCheck,
      tone: 'ink', onClick: () => onGo('ia'), title: 'Fiches préparées par l’IA, prêtes à être relues' },
    { key: 'gaps', count: gaps, one: 'ressenti à revoir', many: 'ressentis à revoir', icon: Gauge, tone: 'ink',
      onClick: () => onGo('a-traiter'), title: 'Difficulté affichée et ressenti des élèves trop éloignés' },
  ];

  const subFor = (key: MetricKey) => [
    today ? `aujourd’hui : ${fmt(today[key])}` : null,
    key === 'signups' ? `${fmt(data.members_total)} en tout` : null,
    key === 'views' && data.metrics.views.previous === null ? `depuis le ${dayLabel(data.views_since)}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-4">
      <ErrorBoundary variant="block" label="En ce moment" resetKey={`${data.generated_at}-${live?.generated_at ?? ''}`}>
        <StatusStrip pills={pills} today={today} yesterday={live?.yesterday ?? null} status={liveStatus}
          lastActivityAt={live?.activity[0]?.at ?? null} />
      </ErrorBoundary>

      <ErrorBoundary variant="block" label="Chiffres de la période" resetKey={data.generated_at}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Chiffres de la période (les quatre premiers choisissent la courbe)">
          {METRICS.map((d) => {
            const v = data.metrics[d.key];
            return (
              <KpiTile key={d.key} icon={d.icon} accent={d.color} label={d.label} hint={d.hint}
                value={v.value} unit={v.value > 1 ? d.short[1] : d.short[0]}
                delta={{ now: v.value, before: v.previous, days: data.days }} sub={subFor(d.key) || undefined}
                spark={{ values: data.series.map((s) => s[d.key]), dates, color: d.color, label: d.label, format: (n) => plural(n, d.unit) }}
                mode="toggle" selected={metric === d.key} onClick={() => setMetric(d.key)} />
            );
          })}
          <KpiTile icon={Users} accent={ANON_COLOR} label="Visiteurs" value={anon.current.visits} unit={anon.current.visits > 1 ? 'visites' : 'visite'}
            hint="Personnes non connectées, comptées une fois par jour. Ouvre l’onglet Visiteurs."
            delta={anon.previous ? { now: anon.current.visits, before: anon.previous.visits, days: data.days } : undefined}
            sub={today ? `aujourd’hui : ${fmt(today.visitors)}` : undefined}
            spark={{ values: anon.series.map((s) => s.anon), dates: anon.series.map((s) => s.date), color: ANON_COLOR, label: 'Visiteurs',
              format: (n) => plural(n, ['visiteur', 'visiteurs']) }}
            mode="link" onClick={() => onGo('visiteurs')} />
          <KpiTile icon={Repeat} accent="#1a7a4a" label="Retour après 7 jours" value={d7} unit="%"
            hint="Inscrits depuis 7 jours ou plus, revenus entre le 7e et le 13e jour après leur inscription."
            sub={!funnel ? undefined : funnel.d7_eligible
              ? `${fmt(funnel.back_d7)} sur ${plural(funnel.d7_eligible, ['inscrit', 'inscrits'])} depuis 7 j ou plus`
              : 'personne n’est inscrit depuis 7 j'}
            footer={(
              <span className="mb-1 block h-1.5 w-full overflow-hidden rounded-full bg-[#f2f1ee]" aria-hidden>
                <span className="block h-full rounded-full bg-brand" style={{ width: `${d7 ?? 0}%` }} />
              </span>
            )} />
          <KpiTile icon={Flag} accent="#a23b34" label="Signalements ouverts" value={reports} tone={reports ? 'alert' : 'neutral'}
            sub={reports ? 'erreurs signalées par les élèves' : 'aucun en attente'}
            footer={<TileLink>À traiter</TileLink>} mode="link" onClick={() => onGo('a-traiter')} />
          <KpiTile icon={ShieldCheck} accent="#c0892f" label="Contenus à vérifier" value={verify} tone={verify ? 'warn' : 'neutral'}
            sub={verify ? 'corrections avec le bandeau «\u00a0à vérifier\u00a0»' : 'tout est relu'}
            footer={<TileLink>À traiter</TileLink>} mode="link" onClick={() => onGo('a-traiter')} />
        </div>
      </ErrorBoundary>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${card} flex min-w-0 flex-col p-4 sm:p-5 lg:col-span-2`} aria-labelledby="pilotage-courbe">
          <div className="mb-3">
            <h2 id="pilotage-courbe" className="fd-display flex items-center gap-2 text-[16px] text-ink">
              <def.icon className="h-4 w-4 shrink-0" style={{ color: def.color }} aria-hidden /> {def.label}
            </h2>
            <p className="mt-0.5 text-[12px] text-ink-faint">Jour par jour. Un clic sur l’une des quatre premières tuiles change de chiffre.</p>
          </div>
          <ErrorBoundary variant="block" label={def.label} resetKey={`${metric}-${data.generated_at}`}>
            <DayChart key={`${metric}-${data.days}`} series={data.series.map((d) => ({ date: d.date, value: d[metric] }))}
              color={def.color} unit={def.unit} headline={headline} hint={def.hint}
              measuredSince={metric === 'views' ? data.views_since : undefined} />
          </ErrorBoundary>
        </section>
        <div className="min-w-0">
          <ErrorBoundary variant="block" label="Membres" resetKey={data.generated_at}>
            <MembersCard active={data.metrics.active.value} total={data.members_total} days={data.days} funnel={funnel} />
          </ErrorBoundary>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <ErrorBoundary variant="block" label="Activité en direct" resetKey={live?.generated_at ?? liveStatus}>
            <LiveActivity events={live?.activity ?? null} status={liveStatus} />
          </ErrorBoundary>
        </div>
        <div className="min-w-0">
          <ErrorBoundary variant="block" label="Contenus les plus vus" resetKey={data.generated_at}>
            <TopContents items={data.top_contents} days={data.days} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────────── Usage ───────────────────────────── */

/** Un segment « Trier par » / « Regrouper par » : deux ou trois choix, un seul actif. */
function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { key: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-[#faf9f7] p-0.5">
      {options.map((o) => (
        <button key={o.key} type="button" role="radio" aria-checked={value === o.key} onClick={() => onChange(o.key)}
          className={`rounded-[10px] px-2.5 py-1 text-[12px] font-medium transition-colors ${value === o.key ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const Trend: React.FC<{ now: number; before: number | null }> = ({ now, before }) => {
  if (before === null || (now === 0 && before === 0)) return null;
  if (before === 0) return <span className="text-brand">nouveau</span>;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="text-ink-faint">stable</span>;
  return <span className={pct > 0 ? 'text-brand' : 'text-[#a23b34]'}>{pct > 0 ? '↑' : '↓'} {Math.abs(pct)} %</span>;
};

const TOP_PAGES = 15;

/** Libellé d'une ligne d'usage : un clic ouvre sa courbe (jour par jour, semaine par semaine). */
const SerieLabel: React.FC<{ label: string; onOpen: () => void }> = ({ label, onOpen }) => (
  <button type="button" onClick={onOpen} title="Voir l’évolution"
    className="group inline-flex min-w-0 items-center gap-1 text-left text-ink hover:text-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded">
    <span className="truncate underline decoration-ink/20 decoration-dotted underline-offset-[3px] group-hover:decoration-brand">{label}</span>
    <LineChart className="h-3.5 w-3.5 shrink-0 text-ink-faint group-hover:text-brand" aria-hidden />
  </button>
);

const UsageTab: React.FC<{ data: Overview }> = ({ data }) => {
  const [serie, setSerie] = useState<SerieTarget | null>(null);
  const [featSort, setFeatSort] = useState<'membres' | 'fois'>('membres');
  const [pageView, setPageView] = useState<'page' | 'rubrique'>('page');
  const [allPages, setAllPages] = useState(false);
  const active = Math.max(data.metrics.active.value, 1);
  const since = dayLabel(data.usage_since, { day: 'numeric', month: 'long' });

  const base = data.features.filter((f) => f.source === 'base')
    .sort((a, b) => (featSort === 'membres' ? (b.users ?? 0) - (a.users ?? 0) : 0) || b.actions - a.actions);
  const tracked = data.features.filter((f) => f.source === 'navigateur').sort((a, b) => b.actions - a.actions);
  const maxActions = Math.max(1, ...data.features.map((f) => f.actions));
  const maxTracked = Math.max(1, ...tracked.map((f) => f.actions));
  const filters = data.features.filter((f) => f.source === 'filtre');
  const maxFilter = Math.max(1, ...filters.map((f) => f.actions));
  const filterUses = filters.filter((f) => f.key !== 'tri' && f.key !== 'filtre-effacer').reduce((n, f) => n + f.actions, 0);
  const unusedFilters = filters.filter((f) => !f.actions).map((f) => f.label);
  const unused = base.filter((f) => !f.users).map((f) => f.label);

  const rows = pageView === 'page'
    ? data.pages.map((p) => ({ key: p.page, label: pageInfo(p.page).label, sub: pageInfo(p.page).group, views: p.views, visits: p.visits }))
    : Object.values(data.pages.reduce<Record<string, { key: string; label: string; sub: string; views: number; visits: number }>>((acc, p) => {
      const g = pageInfo(p.page).group;
      acc[g] ??= { key: g, label: g, sub: '', views: 0, visits: 0 };
      acc[g].views += p.views;
      acc[g].visits += p.visits;
      return acc;
    }, {})).sort((a, b) => b.views - a.views);
  const maxViews = Math.max(1, ...rows.map((r) => r.views));
  // Le serveur renvoie toutes les pages vues : les 15 premières, le reste replié. Avant, il s'arrêtait
  // à 15 et une page peu vue (« Mes statistiques ») paraissait absente.
  const shownRows = allPages ? rows : rows.slice(0, TOP_PAGES);
  const visited = new Set(data.pages.map((p) => p.page));
  const neverVisited = PAGES.filter((p) => !visited.has(p.pattern)).map((p) => p.label);

  return (
    <div className="space-y-4">
    <p className="rounded-xl border border-line bg-[#faf9f7] px-4 py-2.5 text-[12.5px] text-ink-soft">
      Tes clics d’administrateur ne sont pas comptés : pour tester une mesure, ouvre une fenêtre de navigation privée.
    </p>
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      <div className="flex min-w-0 flex-col gap-4">
      <section className="fd-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="fd-display text-[16px] text-ink">Fonctionnalités</h2>
            <p className="mt-0.5 text-[12px] text-ink-faint">
              Membres qui s’en sont servis sur {data.days} j, sur {plural(data.metrics.active.value, ['membre actif', 'membres actifs'])}.
            </p>
          </div>
          <Segmented label="Trier" value={featSort} onChange={setFeatSort}
            options={[{ key: 'membres', label: 'Par membres' }, { key: 'fois', label: 'Par utilisations' }]} />
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {base.map((f) => {
            const users = f.users ?? 0;
            const share = Math.round((users / active) * 100);
            const width = featSort === 'membres' ? share : (f.actions / maxActions) * 100;
            return (
              <li key={`${f.source}:${f.key}`} className={users ? '' : 'opacity-60'}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <SerieLabel label={f.label} onOpen={() => setSerie({ source: 'base', cle: f.key, label: f.label })} />
                  <span className="fd-nums shrink-0 text-ink-faint">
                    <b className="text-ink">{fmt(users)}</b> {users > 1 ? 'membres' : 'membre'} · {fmt(f.actions)} fois
                    <span className="ml-2 text-[11.5px]"><Trend now={f.actions} before={f.previous} /></span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[#f2f1ee]" title={`${share} % des membres actifs`}>
                  <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${users || f.actions ? Math.max(width, 2) : 0}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        {unused.length > 0 && (
          <p className="mt-4 rounded-xl border border-[#ecdcb6] bg-gold-soft px-3.5 py-2.5 text-[12.5px] text-ink-soft">
            <b className="text-ink">Personne ne s’en est servi :</b> {unused.join(', ')}. À rendre plus visible, ou à revoir.
          </p>
        )}

        <h3 className="mt-6 text-[13px] font-semibold text-ink">Gestes mesurés dans le navigateur</h3>
        <p className="mt-0.5 text-[12px] text-ink-faint">Depuis le {since}. « Visites » = une personne comptée une fois par jour.</p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {tracked.map((f) => (
            <li key={`${f.source}:${f.key}`} className={f.actions ? '' : 'opacity-60'}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <SerieLabel label={f.label} onOpen={() => setSerie({ source: 'navigateur', cle: f.key, label: f.label })} />
                <span className="fd-nums shrink-0 text-ink-faint"><b className="text-ink">{fmt(f.actions)}</b> fois · {fmt(f.visits ?? 0)} visites</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#f2f1ee]">
                <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${f.actions ? Math.max((f.actions / maxTracked) * 100, 2) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
      <section className="fd-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="fd-display text-[16px] text-ink">Pages visitées</h2>
            <p className="mt-0.5 text-[12px] text-ink-faint">Sur {data.days} j, visiteurs compris, mesuré depuis le {since}.</p>
          </div>
          <Segmented label="Regrouper" value={pageView} onChange={setPageView}
            options={[{ key: 'page', label: 'Par page' }, { key: 'rubrique', label: 'Par rubrique' }]} />
        </div>
        {rows.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink-faint">Pas encore de visite enregistrée : la mesure a commencé le {since}.</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-3">
            {shownRows.map((r, i) => (
              <li key={r.key}>
                <div className="flex items-baseline gap-2 text-[13px]">
                  <span className="fd-nums w-5 shrink-0 text-[11.5px] text-ink-faint">{i + 1}</span>
                  {/* Par page : un clic ouvre sa courbe ; une rubrique (regroupement) n'en a pas. */}
                  {pageView === 'page'
                    ? <span className="min-w-0 flex-1"><SerieLabel label={r.label} onOpen={() => setSerie({ source: 'page', cle: r.key, label: r.label })} /></span>
                    : <span className="min-w-0 flex-1 truncate text-ink">{r.label}</span>}
                  {r.sub && <span className="hidden shrink-0 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11px] text-ink-soft sm:inline">{r.sub}</span>}
                  <span className="fd-nums shrink-0 text-right text-ink-faint"><b className="text-ink">{fmt(r.views)}</b> vues · {fmt(r.visits)} visites</span>
                </div>
                <div className="ml-7 mt-1 h-1.5 rounded-full bg-[#f2f1ee]">
                  <div className="h-full rounded-full bg-ink/70 transition-[width] duration-500" style={{ width: `${Math.max((r.views / maxViews) * 100, 2)}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
        {rows.length > TOP_PAGES && (
          <button type="button" className="fd-btn-ghost mt-3 text-[12.5px]" onClick={() => setAllPages((v) => !v)}>
            {allPages ? 'Replier' : `Voir les ${rows.length - TOP_PAGES} autres`}
          </button>
        )}
        {rows.length > 0 && neverVisited.length > 0 && (
          <p className="mt-4 rounded-xl border border-[#ecdcb6] bg-gold-soft px-3.5 py-2.5 text-[12.5px] text-ink-soft">
            <b className="text-ink">Aucune visite sur {data.days} j :</b> {neverVisited.join(', ')}.
          </p>
        )}
      </section>

      {data.auth_doors && <ErrorBoundary variant="block" label="Portes d’inscription" resetKey={data.generated_at}><AuthDoorsCard doors={data.auth_doors} days={data.days} /></ErrorBoundary>}
      {data.avis_diagnostics && <ErrorBoundary variant="block" label="Avis sur les diagnostics" resetKey={data.generated_at}><AvisDiagnosticsCard avis={data.avis_diagnostics} days={data.days} /></ErrorBoundary>}
      {data.nouveautes && <ErrorBoundary variant="block" label="Fenêtres Nouveautés" resetKey={data.generated_at}><NouveautesCard nouveautes={data.nouveautes} days={data.days} /></ErrorBoundary>}

      </div>
    </div>
    <ErrorBoundary variant="block" label="Ce que les élèves choisissent dans les listes" resetKey={data.generated_at}>
      <FiltersCard filters={filters} values={data.filter_values} days={data.days} filterUses={filterUses} unusedFilters={unusedFilters} maxFilter={maxFilter}
        onOpenSerie={(f) => setSerie({ source: 'filtre', cle: f.key, label: f.label })} />
    </ErrorBoundary>
    {serie && <SerieModal target={serie} onClose={() => setSerie(null)} />}
    </div>
  );
};

type Feature = Overview['features'][number];
type ListKind = 'tout' | FilterValue['type'];
const LIST_KINDS: { key: ListKind; label: string }[] = [
  { key: 'tout', label: 'Toutes les listes' }, { key: 'exercise', label: 'Exercices' }, { key: 'exam', label: 'Examens' }, { key: 'lesson', label: 'Leçons' },
];
// Ordre et libellés des groupes de valeurs (clé = filtre côté serveur).
const FILTER_GROUPS: { key: string; label: string }[] = [
  { key: 'filtre-niveau', label: 'Niveau' }, { key: 'filtre-chapitre', label: 'Chapitre' },
  { key: 'filtre-difficulte', label: 'Difficulté' }, { key: 'filtre-statut', label: 'Statut (vus, réussis, à revoir)' },
  { key: 'filtre-matiere', label: 'Matière' }, { key: 'filtre-sous-domaine', label: 'Sous-domaine' },
  { key: 'filtre-theoreme', label: 'Théorème' }, { key: 'filtre-national', label: 'Examen national' },
  { key: 'filtre-date', label: 'Année' }, { key: 'tri', label: 'Tri' },
];
const VALUES_SHOWN = 5;

/** Une métadonnée : ses valeurs, de la plus choisie à la moins choisie. */
const ValueGroup: React.FC<{ label: string; values: FilterValue[] }> = ({ label, values }) => {
  const [all, setAll] = useState(false);
  const total = values.reduce((n, v) => n + v.count, 0);
  const max = Math.max(1, ...values.map((v) => v.count));
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[13.5px] font-semibold text-ink">{label}</h3>
        <span className="fd-nums text-[12px] text-ink-faint">{plural(total, ['choix', 'choix'])}</span>
      </div>
      <ol className="mt-2.5 flex flex-col gap-2">
        {(all ? values : values.slice(0, VALUES_SHOWN)).map((v, i) => (
          <li key={v.value} title={v.anon ? `dont ${v.anon} par des visiteurs non connectés` : undefined}>
            <div className="flex items-baseline gap-2 text-[12.5px]">
              <span className="fd-nums w-4 shrink-0 text-[11px] text-ink-faint">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{v.label}</span>
              <span className="fd-nums shrink-0 text-ink-faint"><b className="text-ink">{fmt(v.count)}</b> · {Math.round((v.count / Math.max(total, 1)) * 100)} %</span>
            </div>
            <div className="ml-6 mt-1 h-1.5 rounded-full bg-[#f2f1ee]">
              <div className="h-full rounded-full bg-brand/70" style={{ width: `${Math.max((v.count / max) * 100, 2)}%` }} />
            </div>
          </li>
        ))}
      </ol>
      {values.length > VALUES_SHOWN && (
        <button type="button" onClick={() => setAll((x) => !x)} className="mt-2 text-[12px] font-semibold text-brand-hover hover:underline">
          {all ? 'Replier' : `Voir les ${values.length - VALUES_SHOWN} autres`}
        </button>
      )}
    </div>
  );
};

/** Ce que les élèves choisissent dans les listes : pour chaque métadonnée (niveau, chapitre, difficulté…), ses
 *  valeurs les plus choisies, par liste (09/10/2026). En dessous, repliés : les anciens compteurs par filtre. */
const FiltersCard: React.FC<{
  filters: Feature[]; values: FilterValue[]; days: number; filterUses: number; unusedFilters: string[]; maxFilter: number;
  onOpenSerie: (f: Feature) => void;
}> = ({ filters, values, days, filterUses, unusedFilters, maxFilter, onOpenSerie }) => {
  const [kind, setKind] = useState<ListKind>('tout');
  const [showOld, setShowOld] = useState(false);
  // Valeurs de la liste choisie, regroupées par filtre (additionnées sur les listes si « Toutes »).
  const byFilter = values.filter((v) => kind === 'tout' || v.type === kind).reduce<Record<string, FilterValue[]>>((acc, v) => {
    const list = (acc[v.filter] ??= []);
    const same = list.find((x) => x.value === v.value);
    if (same) { same.count += v.count; same.anon += v.anon; same.visits += v.visits; } else list.push({ ...v });
    return acc;
  }, {});
  Object.values(byFilter).forEach((l) => l.sort((a, b) => b.count - a.count));
  const totalChoices = Object.values(byFilter).flat().reduce((n, v) => n + v.count, 0);
  const groups = FILTER_GROUPS.filter((g) => byFilter[g.key]?.length);
  const empty = FILTER_GROUPS.filter((g) => !byFilter[g.key]?.length).map((g) => g.label);
  const perKind = (k: ListKind) => values.filter((v) => k === 'tout' || v.type === k).reduce((n, v) => n + v.count, 0);

  return (
    <section className="fd-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="fd-display text-[16px] text-ink">Ce que les élèves choisissent dans les listes</h2>
          <p className="mt-0.5 text-[12px] text-ink-faint">
            Sur {days} j : chaque valeur ajoutée à un filtre, chaque tri, et chaque page de niveau ou de chapitre ouverte depuis le site. Mesuré depuis le 9 octobre.
          </p>
        </div>
        <div role="radiogroup" aria-label="Liste" className="inline-flex flex-wrap rounded-xl border border-line bg-[#faf9f7] p-0.5">
          {LIST_KINDS.map((o) => (
            <button key={o.key} type="button" role="radio" aria-checked={kind === o.key} onClick={() => setKind(o.key)}
              className={`rounded-[10px] px-2.5 py-1 text-[12px] font-medium transition-colors ${kind === o.key ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
              {o.label} <span className="fd-nums text-ink-faint">{fmt(perKind(o.key))}</span>
            </button>
          ))}
        </div>
      </div>

      {totalChoices === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-[#faf9f7] px-4 py-3 text-[13px] text-ink-soft">
          {values.length === 0
            ? 'Aucun choix enregistré pour l’instant : la mesure des valeurs a commencé à la mise en ligne. Les premiers chiffres apparaissent dès qu’un élève filtre une liste ou ouvre la page d’un chapitre.'
            : 'Aucun choix enregistré dans cette liste sur la période.'}
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => <ValueGroup key={`${kind}-${g.key}`} label={g.label} values={byFilter[g.key]} />)}
          </div>
          {empty.length > 0 && (
            <p className="mt-3 text-[12.5px] text-ink-faint"><b className="font-semibold text-ink-soft">Jamais choisis ici :</b> {empty.join(', ')}.</p>
          )}
        </>
      )}

      <button type="button" onClick={() => setShowOld((v) => !v)} aria-expanded={showOld}
        className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-soft hover:text-ink">
        <ChevronDown className={`h-4 w-4 transition-transform ${showOld ? 'rotate-180' : ''}`} />
        Nombre de fois où chaque filtre a été ajouté ({plural(filterUses, ['fois', 'fois'])}, toutes listes, depuis le 7 octobre)
      </button>
      {showOld && (
        <>
          <ul className="mt-3 grid gap-x-8 gap-y-2.5 md:grid-cols-2">
            {[...filters].sort((a, b) => b.actions - a.actions).map((f) => (
              <li key={`${f.source}:${f.key}`} className={f.actions ? '' : 'opacity-60'}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <SerieLabel label={f.label} onOpen={() => onOpenSerie(f)} />
                  <span className="fd-nums shrink-0 text-ink-faint">
                    <b className="text-ink">{fmt(f.actions)}</b> fois · {fmt(f.visits ?? 0)} visites
                    <span className="ml-2 text-[11.5px]"><Trend now={f.actions} before={f.previous} /></span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[#f2f1ee]">
                  <div className="h-full rounded-full bg-ink/40" style={{ width: `${f.actions ? Math.max((f.actions / maxFilter) * 100, 2) : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {unusedFilters.length > 0 && filterUses > 0 && (
            <p className="mt-3 text-[12.5px] text-ink-faint"><b className="font-semibold text-ink-soft">Jamais utilisés :</b> {unusedFilters.join(', ')}.</p>
          )}
        </>
      )}
    </section>
  );
};

/* ───────────────────────────── À traiter ───────────────────────────── */

const VerifyPanel: React.FC<{ items: ContentRef[]; validated: Set<number>; onToggle: (id: number, verifie: boolean) => Promise<void> }> = ({ items, validated, onToggle }) => {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (id: number, verifie: boolean) => {
    setBusy(id);
    setError(null);
    try { await onToggle(id, verifie); } catch { setError('La mise à jour a échoué. Réessaie.'); } finally { setBusy(null); }
  };
  const left = items.filter((c) => !validated.has(c.id)).length;
  return (
    <section className="fd-card p-5" aria-labelledby="pilotage-verifier">
      <h2 id="pilotage-verifier" className="fd-display flex items-center gap-2 text-[16px] text-ink">
        <ShieldCheck className="h-4 w-4 text-ink-soft" /> Corrections à vérifier
        {left > 0 && <span className="fd-nums rounded-full bg-gold-soft px-2 py-0.5 text-[12px] font-semibold text-gold-strong">{left} en attente</span>}
      </h2>
      <p className="mt-0.5 text-[12px] text-ink-faint">Solutions rédigées par Fidni, affichées avec le bandeau « à vérifier ». Valide après relecture : le bandeau disparaît du site.</p>
      {error && <p role="alert" className="mt-3 text-[13px] text-[#9c3b2e]">{error}</p>}
      {items.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-faint">Aucune correction en attente de relecture.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#f2f1ee]">
          {items.map((c) => {
            const done = validated.has(c.id);
            return (
              <li key={c.id} className={`flex flex-wrap items-center gap-2 py-2.5 ${busy === c.id ? 'opacity-50' : ''}`}>
                <span className="shrink-0 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11px] text-ink-soft">{TYPE_LABEL[c.type] ?? c.type}</span>
                <Link to={c.url} className={`min-w-0 flex-1 truncate text-[13.5px] hover:text-brand ${done ? 'text-ink-faint line-through' : 'font-medium text-ink'}`}>{c.title}</Link>
                {done ? (
                  <span className="flex shrink-0 items-center gap-2 text-[12.5px] text-brand">
                    <Check className="h-3.5 w-3.5" /> Validée
                    <button type="button" disabled={busy === c.id} onClick={() => run(c.id, false)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-[12px] font-medium text-ink-soft hover:border-ink">
                      <RotateCcw className="h-3 w-3" /> Annuler
                    </button>
                  </span>
                ) : (
                  <button type="button" disabled={busy === c.id} onClick={() => run(c.id, true)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-line bg-brand-soft px-2.5 py-1.5 text-[12.5px] font-medium text-brand-hover hover:bg-[#dcefe3]">
                    <Check className="h-3.5 w-3.5" /> Valider
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

/* ───────────────────────────── Membres ───────────────────────────── */

const FILTERS: { key: string; label: string; hint?: string }[] = [
  { key: '', label: 'Tous' },
  { key: 'actifs', label: 'Actifs', hint: 'Au moins une action sur la période' },
  { key: 'nouveaux', label: 'Nouveaux', hint: 'Inscrits sur la période' },
  { key: 'jamais', label: 'Jamais actifs', hint: 'Aucune action depuis l’inscription' },
  { key: 'enseignants', label: 'Enseignants' },
];

const MemberDetail: React.FC<{ row: UserRow }> = ({ row }) => {
  const stats: [string, string][] = [
    ['Consultations', fmt(row.stats.views)], ['Contenus terminés', fmt(row.stats.completions)],
    ['Questions évaluées', fmt(row.stats.questions)], ['Commentaires', fmt(row.stats.comments)],
    ['Temps d’étude', row.stats.study_minutes ? `${fmt(row.stats.study_minutes)} min` : '—'],
  ];
  return (
    <div className="grid gap-5 border-t border-[#f2f1ee] bg-[#faf9f7] px-4 py-4 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
      <div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-2">
          {stats.map(([k, v]) => (
            <div key={k}><dt className="text-[11.5px] text-ink-faint">{k}</dt><dd className="fd-nums text-[16px] font-semibold text-ink">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-soft">
          {[row.full_name, row.email].filter(Boolean).join(' · ')}<br />
          Inscrit le {new Date(row.date_joined).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          {!row.email_verified && ' · e-mail non vérifié'}
        </p>
        <Link to={`/profile/${row.username}`} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:underline">
          Ouvrir le profil <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="min-w-0">
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[.06em] text-ink-faint">Journal d’activité</h3>
        <MemberJournal userId={row.id} />
      </div>
    </div>
  );
};

const MembersTab: React.FC<{ days: number }> = ({ days }) => {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('activite');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  // Recherche : on attend que la frappe se calme.
  useEffect(() => { const t = window.setTimeout(() => { setQuery(q.trim()); setPage(1); }, 300); return () => window.clearTimeout(t); }, [q]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/pilotage/utilisateurs/', { params: { q: query || undefined, filtre: filter || undefined, jours: days, tri: sort, page } })
      .then((r) => { if (!cancelled) { setData(r.data); setOpen(null); } })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, filter, days, sort, page]);

  return (
    <section className="fd-card overflow-hidden">
      <div className="space-y-3 p-5 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1">
            <span className="sr-only">Rechercher un membre</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Pseudo, nom, e-mail, établissement…"
              className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </label>
          <select aria-label="Trier" value={sort} onChange={(ev) => { setSort(ev.target.value); setPage(1); }}
            className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink">
            <option value="activite">Actifs récemment</option><option value="recent">Inscrits récemment</option><option value="nom">Pseudo (A → Z)</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer les membres">
          {FILTERS.map((f) => {
            const n = data?.counts?.[f.key || 'tous'];
            const on = filter === f.key;
            return (
              <button key={f.key || 'tous'} type="button" aria-pressed={on} title={f.hint}
                onClick={() => { setFilter(f.key); setPage(1); }}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink hover:text-ink'}`}>
                {f.label}{n !== undefined && <span className={`fd-nums ml-1.5 ${on ? 'text-white/70' : 'text-ink-faint'}`}>{n}</span>}
              </button>
            );
          })}
        </div>
        {(filter === 'actifs' || filter === 'nouveaux') && (
          <p className="text-[12px] text-ink-faint">Sur les {days} derniers jours (période choisie en haut de la page). Comptes maison exclus.</p>
        )}
      </div>

      <ul className={`border-t border-line ${loading ? 'opacity-50' : ''}`}>
        {data?.results.map((r) => {
          const expanded = open === r.id;
          return (
            <li key={r.id} className="border-b border-[#f2f1ee] last:border-b-0">
              <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : r.id)}
                className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[#faf9f7] focus:outline-none focus-visible:bg-[#faf9f7] ${expanded ? 'bg-[#faf9f7]' : ''}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f1ee] text-[13px] font-semibold uppercase text-ink-soft" aria-hidden>
                  {r.username.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[14px] font-semibold text-ink">{r.username}</span>
                    {r.user_type === 'teacher' && <span className="rounded-full bg-gold-soft px-1.5 text-[10.5px] font-semibold text-gold-strong">Enseignant</span>}
                    {r.is_admin && <span className="rounded-full bg-ink px-1.5 text-[10.5px] font-semibold text-white">Admin</span>}
                    {r.is_house && !r.is_admin && <span className="rounded-full bg-[#f2f1ee] px-1.5 text-[10.5px] text-ink-soft" title="Compte éditorial ou de test, exclu des chiffres">Hors statistiques</span>}
                    {!r.onboarding_completed && !r.is_house && <span className="rounded-full bg-[#f2f1ee] px-1.5 text-[10.5px] text-ink-soft">Inscription incomplète</span>}
                  </span>
                  <span className="block truncate text-[12px] text-ink-faint">{[r.class_level, r.school].filter(Boolean).join(' · ') || 'Niveau non renseigné'}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block text-[12.5px] ${r.last_activity ? 'text-ink-soft' : 'text-ink-faint'}`}>{r.last_activity ? ago(r.last_activity) : 'jamais actif'}</span>
                  <span className="hidden text-[11px] text-ink-faint sm:block">inscrit {ago(r.date_joined)}</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {expanded && <MemberDetail row={r} />}
            </li>
          );
        })}
      </ul>
      {!data && loading && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-ink-faint" /></div>}
      {data && data.results.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-ink-faint">Aucun membre ne correspond.</p>}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" className="fd-btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Précédents</button>
          <span className="fd-nums text-[12.5px] text-ink-soft">{page} / {data.pages}</span>
          <button type="button" className="fd-btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Suivants <ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </section>
  );
};

/* ───────────────────────────── Page ───────────────────────────── */

export default function Pilotage() {
  const { user, isLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (['apercu', 'a-traiter', 'validation', 'membres', 'usage', 'visiteurs', 'quiz', 'ia'].includes(params.get('onglet') ?? '') ? params.get('onglet') : 'apercu') as TabKey;
  const days = PERIODS.includes(Number(params.get('periode'))) ? Number(params.get('periode')) : 30;
  const setParam = (key: string, value: string) => setParams((p) => { const n = new URLSearchParams(p); n.set(key, value); return n; }, { replace: true });

  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsOpen, setReportsOpen] = useState<number | null>(null);
  const [validated, setValidated] = useState<Set<number>>(new Set());
  // Le direct (/api/pilotage/direct/) : relu toutes les 30 s tant que la page est visible.
  const live = useLivePilotage(!!user?.is_superuser);
  const refreshLive = live.refresh;

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await api.get('/pilotage/', { params: { jours: days } });
      // Mis en forme AVANT d'être gardé : une réponse inattendue donne le message d'erreur, pas une page blanche.
      const next = normalizeOverview(r.data, days);
      setData(next);
      setReportsOpen(next.todo.reports_open);
      setValidated(new Set());
      setError(null);
    } catch {
      setError('Impossible de charger le tableau de bord.');
    } finally {
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { if (user?.is_superuser) load(); }, [user?.is_superuser, load]);
  // De retour sur l'Aperçu (après avoir traité un signalement, par exemple) : relire le direct tout de suite.
  const prevTab = useRef(tab);
  useEffect(() => {
    if (tab === 'apercu' && prevTab.current !== 'apercu') refreshLive();
    prevTab.current = tab;
  }, [tab, refreshLive]);

  const toggleVerified = async (id: number, verifie: boolean) => {
    await api.post(`/contents/${id}/verification/`, { verifie });
    setValidated((prev) => { const n = new Set(prev); if (verifie) n.add(id); else n.delete(id); return n; });
  };

  if (isLoading) return null;
  if (!user?.is_superuser) return <Navigate to="/" replace />;

  const verifyLeft = data ? data.todo.a_verifier.filter((c) => !validated.has(c.id)).length : 0;
  const todoCount = (reportsOpen ?? 0) + verifyLeft;
  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'apercu', label: 'Aperçu' },
    { key: 'a-traiter', label: 'À traiter', badge: todoCount },
    { key: 'validation', label: 'À valider', badge: live.data?.todo.brouillons },
    { key: 'membres', label: 'Membres', badge: undefined },
    { key: 'usage', label: 'Usage' },
    { key: 'visiteurs', label: 'Visiteurs' },
    { key: 'quiz', label: 'Quiz' },
    { key: 'ia', label: 'IA', badge: live.data?.todo.ia_a_relire },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint"><ShieldCheck className="h-3.5 w-3.5" /> Administration</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="fd-display text-[28px] leading-tight text-ink md:text-[32px]">Pilotage</h1>
            <LivePill status={live.status} updatedAt={live.updatedAt} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label="Période" className="inline-flex rounded-xl border border-line bg-[#faf9f7] p-0.5">
            {PERIODS.map((p) => (
              <button key={p} type="button" role="radio" aria-checked={days === p} onClick={() => setParam('periode', String(p))}
                className={`fd-nums rounded-[10px] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${days === p ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
                {p} j
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { load(); refreshLive(); }} disabled={refreshing}
            title={data ? `Chiffres de la période mis à jour ${ago(data.generated_at)}` : 'Actualiser'}
            aria-label="Actualiser" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-ink-soft hover:border-ink hover:text-ink">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <nav role="tablist" aria-label="Sections du pilotage" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button key={t.key} role="tab" type="button" aria-selected={tab === t.key} onClick={() => setParam('onglet', t.key)}
            className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[14px] font-medium transition-colors ${tab === t.key ? 'border-brand text-ink' : 'border-transparent text-ink-faint hover:text-ink'}`}>
            {t.label}
            {!!t.badge && <span className="fd-nums rounded-full bg-gold-soft px-1.5 text-[11.5px] font-semibold text-gold-strong">{t.badge}</span>}
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="mb-5 rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3 text-sm text-[#9c3b2e]">{error}</p>}

      {/* Chaque onglet et chaque carte dans son filet (ErrorBoundary) : un bloc qui plante affiche son erreur,
          le reste du Pilotage reste utilisable (avant le 10/10/2026, toute la page devenait blanche). */}
      <ErrorBoundary variant="block" label="Cet onglet" resetKey={`${tab}-${days}-${data?.generated_at ?? ''}`}>
      {tab === 'membres' ? (
        <>
          <ErrorBoundary variant="block" label="Un membre n’arrive pas à se connecter ?" resetKey={days}><LoginDiagnostic /></ErrorBoundary>
          <ErrorBoundary variant="block" label="Comptes bannis" resetKey={days}><BansCard /></ErrorBoundary>
          <ErrorBoundary variant="block" label="Membres" resetKey={days}><MembersTab days={days} /></ErrorBoundary>
        </>
      ) : tab === 'quiz' ? (
        <QuizAdminTab />
      ) : tab === 'ia' ? (
        <IATab />
      ) : tab === 'validation' ? (
        <ValidationTab />
      ) : !data ? (
        error ? null : <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-ink-faint" /></div>
      ) : tab === 'usage' ? (
        <UsageTab data={data} />
      ) : tab === 'visiteurs' ? (
        <VisitorsTab data={data.anonymes} days={data.days}
          signupSeries={{ values: data.series.map((d) => d.signups), dates: data.series.map((d) => d.date) }} />
      ) : tab === 'a-traiter' ? (
        <div>
          <ErrorBoundary variant="block" label="Signalements" resetKey={data.generated_at}><ReportsPanel onOpenCountChange={setReportsOpen} /></ErrorBoundary>
          <ErrorBoundary variant="block" label="À vérifier" resetKey={data.generated_at}><VerifyPanel items={data.todo.a_verifier} validated={validated} onToggle={toggleVerified} /></ErrorBoundary>
          {data.todo.difficulty_gaps && (
            <ErrorBoundary variant="block" label="Écarts de difficulté" resetKey={data.generated_at}><DifficultyGapsPanel items={data.todo.difficulty_gaps} /></ErrorBoundary>
          )}
        </div>
      ) : (
        <OverviewTab data={data} live={live.data} liveStatus={live.status} reportsOpen={reportsOpen ?? 0} verifyLeft={verifyLeft}
          onGo={(t) => setParam('onglet', t)} />
      )}
      </ErrorBoundary>
    </div>
  );
}
