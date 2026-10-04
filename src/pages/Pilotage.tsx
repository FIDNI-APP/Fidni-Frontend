/**
 * Pilotage — tableau de bord des administrateurs : qui est inscrit, qui est actif, ce qui est utilisé.
 * Données : /api/pilotage/ et /api/pilotage/utilisateurs/ (backend apps/users/admin_dashboard.py).
 * Uniquement des faits enregistrés ; les comptes maison (admins, compte éditorial) sont exclus des chiffres.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Activity, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, GraduationCap, Loader2,
  MessageSquare, RefreshCw, Search, ShieldCheck, UserPlus, Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/apiClient';
import { ReportsPanel } from '@/components/pilotage/ReportsPanel';

interface ContentRef { id: number; type: string; title: string; url: string }
interface Overview {
  generated_at: string;
  users: Record<string, number>;
  content: { exercises: number; lessons: number; exams: number; new_30d: number; total_views: number; by_level: { name: string; count: number }[] };
  engagement_30d: Record<string, number>;
  series: { date: string; signups: number; active: number; work: number }[];
  top_contents: (ContentRef & { readers: number; completions: number })[];
  levels: { name: string; count: number }[];
  schools: { name: string; count: number }[];
  genders: { name: string; count: number }[];
  recent_activity: { at: string; kind: string; username: string | null; label: string; content?: ContentRef }[];
}
interface UserRow {
  id: number; username: string; email: string; full_name: string; user_type: string | null;
  class_level: string | null; school: string | null; date_joined: string; last_login: string | null;
  last_activity: string | null; onboarding_completed: boolean; email_verified: boolean; is_admin: boolean; is_house: boolean;
  stats: { views: number; completions: number; questions: number; comments: number; study_minutes: number };
}

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('fr-FR');
const pct = (part: number, whole: number) => (whole ? Math.round((part * 100) / whole) : 0);

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
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });

const Card: React.FC<{ title?: string; hint?: string; className?: string; children: React.ReactNode }> = ({ title, hint, className = '', children }) => (
  <section className={`fd-card p-5 ${className}`}>
    {title && (
      <div className="mb-4">
        <h2 className="fd-display text-[16px] text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-[12px] text-ink-faint">{hint}</p>}
      </div>
    )}
    {children}
  </section>
);

const Kpi: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string; tone?: 'brand' | 'gold' | 'ink' }> = ({ icon: Icon, label, value, sub, tone = 'ink' }) => (
  <div className="fd-card p-4">
    <div className="flex items-center gap-2 text-[12px] font-medium text-ink-soft">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone === 'brand' ? 'bg-brand-soft text-brand' : tone === 'gold' ? 'bg-gold-soft text-gold-strong' : 'bg-[#f2f1ee] text-ink'}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      {label}
    </div>
    <div className="fd-nums mt-2 text-[28px] font-bold leading-none text-ink">{value}</div>
    {sub && <div className="mt-1.5 text-[12px] text-ink-faint">{sub}</div>}
  </div>
);

/** Barres jour par jour, avec la valeur au survol et au toucher. */
const DayBars: React.FC<{ series: Overview['series']; field: 'active' | 'signups' | 'work'; color: string; unit: string }> = ({ series, field, color, unit }) => {
  const max = Math.max(1, ...series.map((d) => d[field]));
  const [hover, setHover] = useState<number | null>(null);
  const total = series.reduce((s, d) => s + d[field], 0);
  const shown = hover !== null ? series[hover] : null;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-[12px] text-ink-faint">
        <span>{shown ? new Date(shown.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : '30 derniers jours'}</span>
        <span className="fd-nums font-semibold text-ink">{shown ? `${shown[field]} ${unit}` : `${fmt(total)} au total`}</span>
      </div>
      <div className="flex h-28 items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
        {series.map((d, i) => (
          <button key={d.date} type="button" aria-label={`${d.date} : ${d[field]} ${unit}`}
            onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)}
            className="flex h-full flex-1 items-end rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <span className="block w-full rounded-t-[3px] transition-opacity" style={{
              height: d[field] ? `${Math.max(4, (d[field] / max) * 100)}%` : '2px',
              background: d[field] ? color : '#e7e3dc', opacity: hover === null || hover === i ? 1 : 0.45,
            }} />
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-faint">
        <span>{new Date(series[0]?.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
        <span>aujourd’hui</span>
      </div>
    </div>
  );
};

const HBars: React.FC<{ rows: { name: string; count: number }[]; total?: number }> = ({ rows, total }) => {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <p className="text-[13px] text-ink-faint">Aucune donnée pour l’instant.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.name}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-ink">{r.name}</span>
            <span className="fd-nums shrink-0 text-ink-soft">{r.count}{total ? <span className="text-ink-faint"> · {pct(r.count, total)} %</span> : null}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[#f2f1ee]"><div className="h-full rounded-full bg-ink/70" style={{ width: `${(r.count / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
};

const HealthRow: React.FC<{ label: string; value: number; total: number; good?: boolean; hint?: string }> = ({ label, value, total, good = true, hint }) => (
  <li className="flex items-center justify-between gap-3 py-2">
    <span className="text-[13px] text-ink-soft">{label}{hint && <span className="block text-[11.5px] text-ink-faint">{hint}</span>}</span>
    <span className={`fd-nums shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${good ? 'bg-brand-soft text-brand' : value ? 'bg-gold-soft text-gold-strong' : 'bg-[#f2f1ee] text-ink-soft'}`}>
      {value} / {total}
    </span>
  </li>
);

const KIND_ICON: Record<string, React.ElementType> = {
  signup: UserPlus, view: Eye, complete: CheckCircle2, comment: MessageSquare, solution: BookOpen, skilliq: GraduationCap,
};

export default function Pilotage() {
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('activite');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<{ count: number; pages: number; results: UserRow[] } | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setData((await api.get('/pilotage/')).data);
      setError(null);
    } catch {
      setError('Impossible de charger le tableau de bord.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (user?.is_superuser) load(); }, [user?.is_superuser, load]);

  // Recherche : on attend que la frappe se calme.
  useEffect(() => { const t = window.setTimeout(() => { setQuery(q.trim()); setPage(1); }, 300); return () => window.clearTimeout(t); }, [q]);
  useEffect(() => {
    if (!user?.is_superuser) return;
    let cancelled = false;
    setUsersLoading(true);
    api.get('/pilotage/utilisateurs/', { params: { q: query || undefined, type: type || undefined, tri: sort, page } })
      .then((r) => { if (!cancelled) setUsers(r.data); })
      .catch(() => { if (!cancelled) setUsers(null); })
      .finally(() => { if (!cancelled) setUsersLoading(false); });
    return () => { cancelled = true; };
  }, [user?.is_superuser, query, type, sort, page]);

  const u = data?.users;
  const e = data?.engagement_30d;
  const retention = useMemo(() => (u ? pct(u.active_30d, u.total) : 0), [u]);

  if (isLoading) return null;
  if (!user?.is_superuser) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint"><ShieldCheck className="h-3.5 w-3.5" /> Administration</p>
          <h1 className="fd-display mt-1 text-[28px] leading-tight text-ink md:text-[32px]">Pilotage</h1>
          <p className="mt-1 text-sm text-ink-soft">Inscrits, activité et usage de Fidni. Les comptes d’administration et le compte éditorial ne sont pas comptés.</p>
        </div>
        <button type="button" onClick={load} disabled={refreshing} className="fd-btn-ghost">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {data ? `Mis à jour ${ago(data.generated_at)}` : 'Actualiser'}
        </button>
      </header>

      {/* Signalements d'erreurs : en premier, c'est ce qui demande une action. */}
      <ReportsPanel />

      {error && <p role="alert" className="mb-5 rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3 text-sm text-[#9c3b2e]">{error}</p>}

      {!data ? (
        <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-ink-faint" /></div>
      ) : (
        <>
          {/* ── Chiffres clés */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={Users} label="Inscrits" value={fmt(u!.total)} sub={`${u!.students} élèves · ${u!.teachers} enseignants`} />
            <Kpi icon={UserPlus} label="Nouveaux (7 j)" value={`+${fmt(u!.new_7d)}`} sub={`+${fmt(u!.new_30d)} sur 30 jours`} tone="gold" />
            <Kpi icon={Activity} label="Actifs (7 j)" value={fmt(u!.active_7d)} sub={`${u!.active_1d} sur 24 h · ${pct(u!.active_7d, u!.total)} % des inscrits`} tone="brand" />
            <Kpi icon={Clock} label="Temps d’étude (30 j)" value={`${fmt(Math.round((e!.study_minutes ?? 0) / 6) / 10)} h`} sub={`${fmt(e!.questions_assessed)} questions auto-évaluées`} />
          </div>

          {/* ── Courbes */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card title="Membres actifs par jour" hint="Au moins une action enregistrée ce jour-là.">
              <DayBars series={data.series} field="active" color="#1a7a4a" unit="actifs" />
            </Card>
            <Card title="Inscriptions par jour">
              <DayBars series={data.series} field="signups" color="#b8872b" unit="inscriptions" />
            </Card>
            <Card title="Travail par jour" hint="Questions auto-évaluées et contenus terminés.">
              <DayBars series={data.series} field="work" color="#1a1a1a" unit="actions" />
            </Card>
          </div>

          {/* ── Usage et contenus */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card title="Usage sur 30 jours" className="lg:col-span-1">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                {[
                  ['Consultations', e!.views], ['Contenus terminés', e!.completions], ['dont réussis', e!.completions_success],
                  ['Questions évaluées', e!.questions_assessed], ['Commentaires', e!.comments], ['Solutions proposées', e!.proposed_solutions],
                  ['Tests Skill IQ', e!.skill_assessments], ['Listes de révision', e!.revision_lists], ['Cahiers créés', e!.notebooks],
                  ['Corrections IA', e!.ai_corrections],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-[12px] text-ink-faint">{label}</dt>
                    <dd className="fd-nums text-[18px] font-bold text-ink">{fmt(value as number)}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card title="Contenus les plus lus (30 j)" hint="Nombre d’élèves différents." className="lg:col-span-2">
              {data.top_contents.length === 0 ? <p className="text-[13px] text-ink-faint">Aucune consultation enregistrée ce mois-ci.</p> : (
                <ol className="divide-y divide-[#f2f1ee]">
                  {data.top_contents.map((c, i) => (
                    <li key={c.id} className="flex items-center gap-3 py-2.5">
                      <span className="fd-nums w-5 shrink-0 text-[13px] text-ink-faint">{i + 1}</span>
                      <Link to={c.url} className="min-w-0 flex-1 truncate text-[13.5px] text-ink hover:text-brand">{c.title}</Link>
                      <span className="shrink-0 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11px] text-ink-soft">{c.type === 'lesson' ? 'Leçon' : c.type === 'exam' ? 'Examen' : 'Exercice'}</span>
                      <span className="fd-nums w-24 shrink-0 text-right text-[12.5px] text-ink-soft">{c.readers} élève{c.readers > 1 ? 's' : ''}</span>
                      <span className="fd-nums hidden w-24 shrink-0 text-right text-[12.5px] text-ink-faint sm:block">{c.completions} terminé{c.completions > 1 ? 's' : ''}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-4 border-t border-[#f2f1ee] pt-3 text-[12px] text-ink-faint">
                Catalogue : {data.content.exercises} exercices · {data.content.lessons} leçons · {data.content.exams} examens
                ({data.content.new_30d} ajoutés en 30 jours) · {fmt(data.content.total_views)} vues au total (visiteurs compris).
              </p>
            </Card>
          </div>

          {/* ── Qui sont les inscrits */}
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card title="Niveaux"><HBars rows={data.levels} total={u!.total} /></Card>
            <Card title="Établissements" hint="Les 8 plus représentés."><HBars rows={data.schools} /></Card>
            <Card title="Civilité"><HBars rows={data.genders} total={u!.total} /></Card>
            <Card title="Santé des comptes">
              <ul className="divide-y divide-[#f2f1ee]">
                <HealthRow label="Inscription terminée" value={u!.onboarding_done} total={u!.total} />
                <HealthRow label="E-mail vérifié" value={u!.email_verified} total={u!.total} />
                <HealthRow label="Actifs sur 30 jours" value={u!.active_30d} total={u!.total} hint={`${retention} % des inscrits`} />
                <HealthRow label="Jamais actifs" value={u!.never_active} total={u!.total} good={false} />
                <HealthRow label="Conditions à ré-accepter" value={u!.terms_outdated} total={u!.total} good={false} />
                <HealthRow label="Moins de 15 ans" value={u!.under_15} total={u!.total} good={false} hint="Accord parental requis" />
              </ul>
            </Card>
          </div>

          {/* ── Fil d'activité */}
          <Card title="Dernières activités" className="mt-4">
            {data.recent_activity.length === 0 ? <p className="text-[13px] text-ink-faint">Rien pour l’instant.</p> : (
              <ul className="grid gap-x-8 md:grid-cols-2">
                {data.recent_activity.map((ev, i) => {
                  const Icon = KIND_ICON[ev.kind] ?? Activity;
                  return (
                    <li key={i} className="flex items-start gap-3 border-b border-[#f2f1ee] py-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f2f1ee] text-ink-soft"><Icon className="h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1 text-[13px] leading-snug text-ink-soft">
                        {ev.username ? <Link to={`/profile/${ev.username}`} className="font-semibold text-ink hover:text-brand">{ev.username}</Link> : 'Un membre'}{' '}
                        {ev.label.toLowerCase()}
                        {ev.content && <> <Link to={ev.content.url} className="text-ink hover:text-brand">« {ev.content.title} »</Link></>}
                      </span>
                      <span className="shrink-0 text-[11.5px] text-ink-faint">{ago(ev.at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* ── Inscrits */}
      <Card title="Inscrits" className="mt-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Pseudo, nom, e-mail, établissement…"
              className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </label>
          <select value={type} onChange={(ev) => { setType(ev.target.value); setPage(1); }} className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink">
            <option value="">Tous</option><option value="student">Élèves</option><option value="teacher">Enseignants</option><option value="admin">Administrateurs</option>
          </select>
          <select value={sort} onChange={(ev) => { setSort(ev.target.value); setPage(1); }} className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink">
            <option value="activite">Actifs récemment</option><option value="recent">Inscrits récemment</option><option value="ancien">Plus anciens</option><option value="nom">Pseudo (A → Z)</option>
          </select>
          {users && <span className="fd-nums text-[12.5px] text-ink-faint">{users.count} compte{users.count > 1 ? 's' : ''}</span>}
        </div>

        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-[.06em] text-ink-faint">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-semibold">Membre</th>
                <th className="py-2 pr-3 font-semibold">Niveau · établissement</th>
                <th className="py-2 pr-3 font-semibold">Inscrit</th>
                <th className="py-2 pr-3 font-semibold">Dernière activité</th>
                <th className="py-2 pr-3 text-right font-semibold" title="Consultations · terminés · questions · commentaires">Activité</th>
                <th className="py-2 text-right font-semibold">Étude</th>
              </tr>
            </thead>
            <tbody className={usersLoading ? 'opacity-50' : ''}>
              {users?.results.map((r) => (
                <tr key={r.id} className="border-b border-[#f2f1ee] align-top">
                  <td className="py-2.5 pr-3">
                    <Link to={`/profile/${r.username}`} className="font-semibold text-ink hover:text-brand">{r.username}</Link>
                    <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
                      {r.user_type === 'teacher' && <span className="rounded-full bg-gold-soft px-1.5 text-[10.5px] font-semibold text-gold-strong">Enseignant</span>}
                      {r.is_admin && <span className="rounded-full bg-ink px-1.5 text-[10.5px] font-semibold text-white">Admin</span>}
                      {r.is_house && !r.is_admin && <span className="rounded-full bg-[#f2f1ee] px-1.5 text-[10.5px] text-ink-soft" title="Compte éditorial ou de test, exclu des chiffres">Hors statistiques</span>}
                      {!r.onboarding_completed && !r.is_house &&<span className="rounded-full bg-[#f2f1ee] px-1.5 text-[10.5px] text-ink-soft">Inscription incomplète</span>}
                    </span>
                    <span className="block text-[12px] text-ink-faint">{[r.full_name, r.email].filter(Boolean).join(' · ')}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-ink-soft">{r.class_level ?? '—'}<span className="block text-[12px] text-ink-faint">{r.school ?? ''}</span></td>
                  <td className="py-2.5 pr-3 text-ink-soft">{shortDate(r.date_joined)}</td>
                  <td className={`py-2.5 pr-3 ${r.last_activity ? 'text-ink-soft' : 'text-ink-faint'}`}>{ago(r.last_activity)}</td>
                  <td className="fd-nums py-2.5 pr-3 text-right text-ink-soft">
                    {r.stats.views} · {r.stats.completions} · {r.stats.questions} · {r.stats.comments}
                  </td>
                  <td className="fd-nums py-2.5 text-right text-ink-soft">{r.stats.study_minutes ? `${r.stats.study_minutes} min` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users && users.results.length === 0 && <p className="py-6 text-center text-[13px] text-ink-faint">Aucun compte ne correspond.</p>}
        </div>
        <p className="mt-2 text-[11.5px] text-ink-faint">Activité : consultations · contenus terminés · questions auto-évaluées · commentaires (depuis l’inscription).</p>

        {users && users.pages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" className="fd-btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Précédents</button>
            <span className="fd-nums text-[12.5px] text-ink-soft">{page} / {users.pages}</span>
            <button type="button" className="fd-btn-ghost" disabled={page >= users.pages} onClick={() => setPage((p) => p + 1)}>Suivants <ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </Card>
    </div>
  );
}
