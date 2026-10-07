/**
 * Pilotage — tableau de bord des administrateurs, en quatre onglets :
 *  - Aperçu : quatre chiffres sur la période choisie (cliquer sur l'un affiche sa courbe), les contenus les plus vus ;
 *  - À traiter : signalements d'erreurs, corrections « à vérifier » à valider ;
 *  - Membres : recherche, filtres rapides, fiche dépliable avec les dernières actions ;
 *  - Usage (06/10/2026) : membres qui se servent de chaque fonctionnalité, pages les plus visitées ;
 *  - IA : un document (PDF, Word, photos) → fiches préparées par l'IA, relues puis publiées (components/pilotage/IATab).
 * Données : /api/pilotage/?jours=7|30|90, /api/pilotage/utilisateurs/ (+ /<id>/) — backend apps/users/admin_dashboard.py.
 * Les comptes maison (admins, compte éditorial, compte de test) sont exclus des chiffres.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  Activity, BookOpen, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Eye, GraduationCap, Loader2,
  MessageSquare, PenLine, RefreshCw, RotateCcw, Search, ShieldCheck, UserPlus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/apiClient';
import { ReportsPanel } from '@/components/pilotage/ReportsPanel';
import { IATab } from '@/components/pilotage/IATab';
import { PAGES, pageInfo } from '@/lib/usage';

interface ContentRef { id: number; type: string; title: string; url: string }
type MetricKey = 'views' | 'active' | 'signups' | 'work';
interface Metric { value: number; previous: number | null }
type Day = { date: string } & Record<MetricKey, number | null>;
interface Overview {
  generated_at: string;
  days: number;
  views_since: string;
  members_total: number;
  todo: { reports_open: number; a_verifier: ContentRef[] };
  metrics: Record<MetricKey, Metric>;
  series: Day[];
  top_contents: (ContentRef & { views: number; readers: number })[];
  usage_since: string;
  features: { key: string; label: string; source: 'base' | 'navigateur' | 'filtre'; actions: number; users: number | null; visits?: number; previous: number | null }[];
  pages: { page: string; views: number; visits: number }[];
}
interface UserRow {
  id: number; username: string; email: string; full_name: string; user_type: string | null;
  class_level: string | null; school: string | null; date_joined: string; last_login: string | null;
  last_activity: string | null; onboarding_completed: boolean; email_verified: boolean; is_admin: boolean; is_house: boolean;
  stats: { views: number; completions: number; questions: number; comments: number; study_minutes: number };
}
interface UsersPage { count: number; pages: number; results: UserRow[]; counts: Record<string, number> }
interface ActivityEvent { at: string; kind: string; username: string | null; label: string; content?: ContentRef }

const PERIODS = [7, 30, 90];
type TabKey = 'apercu' | 'a-traiter' | 'membres' | 'usage' | 'ia';

const METRICS: { key: MetricKey; label: string; hint: string; unit: [string, string]; color: string; icon: React.ElementType }[] = [
  { key: 'views', label: 'Vues des contenus', unit: ['vue', 'vues'], color: '#1a1a1a', icon: Eye,
    hint: 'Visiteurs compris : une vue par personne et par contenu sur 24 h. Robots et comptes maison exclus.' },
  { key: 'active', label: 'Membres actifs', unit: ['membre actif', 'membres actifs'], color: '#1a7a4a', icon: Activity,
    hint: 'Inscrits ayant fait au moins une action : consultation, exercice, commentaire, test…' },
  { key: 'signups', label: 'Inscriptions', unit: ['inscription', 'inscriptions'], color: '#b8872b', icon: UserPlus,
    hint: 'Nouveaux comptes créés.' },
  { key: 'work', label: 'Travail des élèves', unit: ['action', 'actions'], color: '#6b6862', icon: PenLine,
    hint: 'Questions auto-évaluées et contenus terminés.' },
];

const TYPE_LABEL: Record<string, string> = { exercise: 'Exercice', exam: 'Examen', lesson: 'Leçon' };
const KIND_ICON: Record<string, React.ElementType> = {
  signup: UserPlus, view: Eye, complete: CheckCircle2, comment: MessageSquare, solution: BookOpen, skilliq: GraduationCap,
};

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

const Delta: React.FC<{ m: Metric; days: number }> = ({ m, days }) => {
  if (m.previous === null) return null;
  const d = m.value - m.previous;
  return (
    <span className={`fd-nums ${d > 0 ? 'text-brand' : 'text-ink-faint'}`}>
      {d === 0 ? 'autant' : `${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}`} vs les {days} j d’avant
    </span>
  );
};

const MetricTile: React.FC<{
  def: typeof METRICS[number]; m: Metric; days: number; selected: boolean; onSelect: () => void; extra?: string;
}> = ({ def, m, days, selected, onSelect, extra }) => (
  <button type="button" onClick={onSelect} aria-pressed={selected}
    className={`fd-card w-full p-4 text-left transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${selected ? 'ring-2 ring-ink/80' : 'hover:shadow-md'}`}>
    <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-soft">
      <span className="h-2 w-2 rounded-full" style={{ background: def.color }} aria-hidden />
      {def.label}
    </span>
    <span className="fd-nums mt-2 block text-[28px] font-bold leading-none text-ink">{fmt(m.value)}</span>
    <span className="mt-1.5 block text-[12px] leading-snug text-ink-faint">
      <Delta m={m} days={days} />{extra ? <>{m.previous !== null ? ' · ' : ''}{extra}</> : null}
    </span>
  </button>
);

/** Une barre par jour ; la valeur s'affiche au survol, au clavier et au toucher. */
const DayChart: React.FC<{ series: Day[]; def: typeof METRICS[number]; headline: string; viewsSince: string }> = ({ series, def, headline, viewsSince }) => {
  const [hover, setHover] = useState<number | null>(null);
  const values = series.map((d) => d[def.key]);
  const max = Math.max(1, ...values.map((v) => v ?? 0));
  const shown = hover !== null ? series[hover] : null;
  const shownValue = shown ? shown[def.key] : null;
  const hasGap = values.some((v) => v === null);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] text-ink-soft">
          {shown ? dayLabel(shown.date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Jour par jour'}
        </span>
        <span className="fd-nums text-[13px] font-semibold text-ink">
          {shown ? (shownValue === null ? 'pas encore mesuré' : plural(shownValue, def.unit)) : headline}
        </span>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden />
        <span className="fd-nums pointer-events-none absolute -top-2 right-0 bg-white pl-1 text-[10.5px] text-ink-faint" aria-hidden>{fmt(max)}</span>
        <div className={`flex h-40 items-end ${series.length > 40 ? 'gap-px' : 'gap-[3px]'}`} onMouseLeave={() => setHover(null)}>
          {series.map((d, i) => {
            const v = d[def.key];
            return (
              <button key={d.date} type="button" aria-label={`${dayLabel(d.date)} : ${v === null ? 'pas encore mesuré' : plural(v, def.unit)}`}
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)}
                className="flex h-full flex-1 items-end rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                {v === null ? (
                  <span className="block h-full w-full rounded-t-[3px]" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #ebe8e2 0 3px, transparent 3px 6px)' }} />
                ) : (
                  <span className="block w-full rounded-t-[3px] transition-opacity" style={{
                    height: v ? `${Math.max(3, (v / max) * 100)}%` : '2px',
                    background: v ? def.color : '#e7e3dc',
                    opacity: hover === null || hover === i ? 1 : 0.4,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-faint">
        <span>{series[0] ? dayLabel(series[0].date) : ''}</span>
        <span>aujourd’hui</span>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
        {def.hint}
        {hasGap && <> Les vues sont comptées jour par jour depuis le {dayLabel(viewsSince, { day: 'numeric', month: 'long' })} (zone hachurée : avant).</>}
      </p>
    </div>
  );
};

const OverviewTab: React.FC<{ data: Overview; onOpenTodo: () => void; todoCount: number }> = ({ data, onOpenTodo, todoCount }) => {
  const [metric, setMetric] = useState<MetricKey>('views');
  const def = METRICS.find((m) => m.key === metric)!;
  const m = data.metrics[metric];
  const headline = metric === 'active'
    ? `${plural(m.value, def.unit)} différents sur ${data.days} j`
    : `${plural(m.value, def.unit)} sur ${data.days} j`;
  const maxViews = Math.max(1, ...data.top_contents.map((c) => c.views));

  return (
    <div className="space-y-4">
      {todoCount > 0 && (
        <button type="button" onClick={onOpenTodo}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#ecdcb6] bg-gold-soft px-4 py-3 text-left text-[13.5px] text-ink hover:border-gold-strong">
          <span><strong className="fd-nums">{todoCount}</strong> élément{todoCount > 1 ? 's' : ''} à traiter : signalements d’erreurs ou corrections à valider.</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-gold-strong">Voir <ChevronRight className="h-4 w-4" /></span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Choisir le chiffre à afficher">
        {METRICS.map((d) => (
          <MetricTile key={d.key} def={d} m={data.metrics[d.key]} days={data.days} selected={metric === d.key} onSelect={() => setMetric(d.key)}
            extra={d.key === 'signups' ? `${fmt(data.members_total)} inscrits en tout`
              : d.key === 'views' && data.metrics.views.previous === null ? `depuis le ${dayLabel(data.views_since)}` : undefined} />
        ))}
      </div>

      <section className="fd-card p-5" aria-label={def.label}>
        <h2 className="fd-display mb-3 text-[16px] text-ink">{def.label}</h2>
        <DayChart key={`${metric}-${data.days}`} series={data.series} def={def} headline={headline} viewsSince={data.views_since} />
      </section>

      <section className="fd-card p-5">
        <h2 className="fd-display text-[16px] text-ink">Contenus les plus vus</h2>
        <p className="mt-0.5 text-[12px] text-ink-faint">Sur les {data.days} derniers jours, visiteurs compris.</p>
        {data.top_contents.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink-faint">Aucune vue enregistrée sur la période.</p>
        ) : (
          <ol className="mt-3 divide-y divide-[#f2f1ee]">
            {data.top_contents.map((c) => (
              <li key={c.id}>
                <Link to={c.url} className="group block py-2.5">
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink group-hover:text-brand">{c.title}</span>
                    <span className="hidden shrink-0 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11px] text-ink-soft sm:inline">{TYPE_LABEL[c.type] ?? c.type}</span>
                    <span className="fd-nums w-16 shrink-0 text-right text-[13px] font-semibold text-ink">{fmt(c.views)}</span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 flex-1 rounded-full bg-[#f2f1ee]">
                      <span className="block h-full rounded-full bg-ink/70" style={{ width: `${(c.views / maxViews) * 100}%` }} />
                    </span>
                    <span className="fd-nums w-16 shrink-0 text-right text-[11.5px] text-ink-faint">{c.readers ? plural(c.readers, ['membre', 'membres']) : ''}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
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

const UsageTab: React.FC<{ data: Overview }> = ({ data }) => {
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
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      <div className="flex flex-col gap-4">
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
              <li key={f.key} className={users ? '' : 'opacity-60'}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate text-ink">{f.label}</span>
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
            <li key={f.key} className={f.actions ? '' : 'opacity-60'}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate text-ink">{f.label}</span>
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

      <div className="flex flex-col gap-4">
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
                  <span className="min-w-0 flex-1 truncate text-ink">{r.label}</span>
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

      <section className="fd-card p-5">
        <h2 className="fd-display text-[16px] text-ink">Filtres et tri</h2>
        <p className="mt-0.5 text-[12px] text-ink-faint">
          Listes d’exercices, d’examens et de leçons, sur {data.days} j : {plural(filterUses, ['filtre ajouté', 'filtres ajoutés'])}. Mesuré depuis le 7 octobre.
        </p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {[...filters].sort((a, b) => b.actions - a.actions).map((f) => (
            <li key={f.key} className={f.actions ? '' : 'opacity-60'}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate text-ink">{f.label}</span>
                <span className="fd-nums shrink-0 text-ink-faint">
                  <b className="text-ink">{fmt(f.actions)}</b> fois · {fmt(f.visits ?? 0)} visites
                  <span className="ml-2 text-[11.5px]"><Trend now={f.actions} before={f.previous} /></span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#f2f1ee]">
                <div className="h-full rounded-full bg-brand/70 transition-[width] duration-500" style={{ width: `${f.actions ? Math.max((f.actions / maxFilter) * 100, 2) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
        {unusedFilters.length > 0 && filterUses > 0 && (
          <p className="mt-4 rounded-xl border border-[#ecdcb6] bg-gold-soft px-3.5 py-2.5 text-[12.5px] text-ink-soft">
            <b className="text-ink">Jamais utilisés :</b> {unusedFilters.join(', ')}.
          </p>
        )}
      </section>
      </div>
    </div>
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
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.get(`/pilotage/utilisateurs/${row.id}/`)
      .then((r) => { if (!cancelled) setEvents(r.data.activity); })
      .catch(() => { if (!cancelled) setEvents([]); });
    return () => { cancelled = true; };
  }, [row.id]);
  const stats: [string, string][] = [
    ['Consultations', fmt(row.stats.views)], ['Contenus terminés', fmt(row.stats.completions)],
    ['Questions évaluées', fmt(row.stats.questions)], ['Commentaires', fmt(row.stats.comments)],
    ['Temps d’étude', row.stats.study_minutes ? `${fmt(row.stats.study_minutes)} min` : '—'],
  ];
  return (
    <div className="grid gap-5 border-t border-[#f2f1ee] bg-[#faf9f7] px-4 py-4 md:grid-cols-[1fr_1.3fr]">
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
      <div>
        <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-[.06em] text-ink-faint">Dernières actions</h3>
        {!events ? (
          <Loader2 className="mt-2 h-4 w-4 animate-spin text-ink-faint" />
        ) : events.length === 0 ? (
          <p className="text-[12.5px] text-ink-faint">Aucune action enregistrée.</p>
        ) : (
          <ul>
            {events.slice(0, 8).map((ev, i) => {
              const Icon = KIND_ICON[ev.kind] ?? Activity;
              return (
                <li key={i} className="flex items-start gap-2.5 py-1.5 text-[12.5px] leading-snug text-ink-soft">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
                  <span className="min-w-0 flex-1">
                    {ev.label}
                    {ev.content && <> <Link to={ev.content.url} className="text-ink hover:text-brand">« {ev.content.title} »</Link></>}
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-faint">{ago(ev.at)}</span>
                </li>
              );
            })}
          </ul>
        )}
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
  const tab = (['apercu', 'a-traiter', 'membres', 'usage', 'ia'].includes(params.get('onglet') ?? '') ? params.get('onglet') : 'apercu') as TabKey;
  const days = PERIODS.includes(Number(params.get('periode'))) ? Number(params.get('periode')) : 30;
  const setParam = (key: string, value: string) => setParams((p) => { const n = new URLSearchParams(p); n.set(key, value); return n; }, { replace: true });

  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsOpen, setReportsOpen] = useState<number | null>(null);
  const [validated, setValidated] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await api.get('/pilotage/', { params: { jours: days } });
      setData(r.data);
      setReportsOpen(r.data.todo.reports_open);
      setValidated(new Set());
      setError(null);
    } catch {
      setError('Impossible de charger le tableau de bord.');
    } finally {
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { if (user?.is_superuser) load(); }, [user?.is_superuser, load]);

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
    { key: 'membres', label: 'Membres', badge: undefined },
    { key: 'usage', label: 'Usage' },
    { key: 'ia', label: 'IA' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint"><ShieldCheck className="h-3.5 w-3.5" /> Administration</p>
          <h1 className="fd-display mt-1 text-[28px] leading-tight text-ink md:text-[32px]">Pilotage</h1>
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
          <button type="button" onClick={load} disabled={refreshing} title={data ? `Mis à jour ${ago(data.generated_at)}` : 'Actualiser'}
            aria-label="Actualiser" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-ink-soft hover:border-ink hover:text-ink">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <nav role="tablist" aria-label="Sections du pilotage" className="mb-5 flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button key={t.key} role="tab" type="button" aria-selected={tab === t.key} onClick={() => setParam('onglet', t.key)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[14px] font-medium transition-colors ${tab === t.key ? 'border-brand text-ink' : 'border-transparent text-ink-faint hover:text-ink'}`}>
            {t.label}
            {!!t.badge && <span className="fd-nums rounded-full bg-gold-soft px-1.5 text-[11.5px] font-semibold text-gold-strong">{t.badge}</span>}
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="mb-5 rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3 text-sm text-[#9c3b2e]">{error}</p>}

      {tab === 'membres' ? (
        <MembersTab days={days} />
      ) : tab === 'ia' ? (
        <IATab />
      ) : !data ? (
        <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-ink-faint" /></div>
      ) : tab === 'usage' ? (
        <UsageTab data={data} />
      ) : tab === 'a-traiter' ? (
        <div>
          <ReportsPanel onOpenCountChange={setReportsOpen} />
          <VerifyPanel items={data.todo.a_verifier} validated={validated} onToggle={toggleVerified} />
        </div>
      ) : (
        <OverviewTab data={data} todoCount={todoCount} onOpenTodo={() => setParam('onglet', 'a-traiter')} />
      )}
    </div>
  );
}
