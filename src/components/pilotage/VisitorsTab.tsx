/**
 * Pilotage › Visiteurs (09/10/2026) : les visiteurs NON connectés, à part des membres.
 * Données : bloc `anonymes` de /api/pilotage/ (backend apps/users/admin_dashboard._anonymous).
 * « Visites » = personnes distinctes chaque jour, additionnées sur la période (venir 3 jours = 3 visites).
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { pageInfo } from '@/lib/usage';

export interface AnonDay { date: string; anon: number | null; members: number | null; anon_pages: number | null; anon_contents: number | null }
interface AnonTotals { visits: number; member_visits: number; pages: number; contents: number; contents_all: number }
export interface AnonymousStats {
  since: string;
  current: AnonTotals;
  previous: AnonTotals | null;
  signups: number;
  series: AnonDay[];
  pages: { page: string; views: number; visits: number }[];
  top_contents: { id: number; type: string; title: string; url: string; views: number; total: number }[];
  actions: { key: string; label: string; count: number; total: number; visits: number }[];
}

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString('fr-FR');
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', opts);
const TYPE_LABEL: Record<string, string> = { exercise: 'Exercice', exam: 'Examen', lesson: 'Leçon' };
const ANON = '#c0892f';
const MEMBER = '#1a1a1a';

const Trend: React.FC<{ now: number; before: number | undefined }> = ({ now, before }) => {
  if (before === undefined) return null;
  if (before === 0) return now ? <span className="text-brand">nouveau</span> : null;
  const p = Math.round(((now - before) / before) * 100);
  if (p === 0) return <span className="text-ink-faint">stable</span>;
  return <span className={p > 0 ? 'text-brand' : 'text-[#a23b34]'}>{p > 0 ? '↑' : '↓'} {Math.abs(p)} % vs avant</span>;
};

const Tile: React.FC<{ label: string; value: string; sub?: React.ReactNode; dot?: string }> = ({ label, value, sub, dot }) => (
  <div className="fd-card p-4">
    <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-soft">
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} aria-hidden />}
      {label}
    </span>
    <span className="fd-nums mt-2 block text-[28px] font-bold leading-none text-ink">{value}</span>
    {sub && <span className="mt-1.5 block text-[12px] leading-snug text-ink-faint">{sub}</span>}
  </div>
);

/** Une barre par jour : visiteurs (or) empilés sur les membres (encre). */
const SplitChart: React.FC<{ series: AnonDay[]; since: string }> = ({ series, since }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((d) => (d.anon ?? 0) + (d.members ?? 0)));
  const shown = hover !== null ? series[hover] : null;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
        <span className="text-ink-soft">{shown ? dayLabel(shown.date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Personnes distinctes, jour par jour'}</span>
        <span className="flex items-center gap-3">
          {shown && shown.anon === null ? <span className="text-ink-faint">pas encore mesuré</span> : <>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: ANON }} />
              Visiteurs{shown && <b className="fd-nums text-ink">{fmt(shown.anon)}</b>}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: MEMBER }} />
              Membres{shown && <b className="fd-nums text-ink">{fmt(shown.members)}</b>}</span>
          </>}
        </span>
      </div>
      <div className={`flex h-40 items-end ${series.length > 40 ? 'gap-px' : 'gap-[3px]'}`} onMouseLeave={() => setHover(null)}>
        {series.map((d, i) => {
          const a = d.anon ?? 0;
          const m = d.members ?? 0;
          return (
            <button key={d.date} type="button" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)}
              aria-label={`${dayLabel(d.date)} : ${d.anon === null ? 'pas encore mesuré' : `${a} visiteurs, ${m} membres`}`}
              className="flex h-full flex-1 flex-col justify-end rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
              {d.anon === null ? (
                <span className="block h-full w-full rounded-t-[3px]" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #ebe8e2 0 3px, transparent 3px 6px)' }} />
              ) : a + m === 0 ? (
                <span className="block h-[2px] w-full bg-[#e7e3dc]" />
              ) : (
                <span className="flex w-full flex-col overflow-hidden rounded-t-[3px] transition-opacity"
                  style={{ height: `${Math.max(3, ((a + m) / max) * 100)}%`, opacity: hover === null || hover === i ? 1 : 0.4 }}>
                  <span style={{ flexGrow: a, background: ANON }} />
                  <span style={{ flexGrow: m, background: MEMBER }} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-faint">
        <span>{series[0] ? dayLabel(series[0].date) : ''}</span>
        <span>aujourd’hui</span>
      </div>
      {series.some((d) => d.anon === null) && (
        <p className="mt-3 text-[12px] text-ink-faint">Mesuré depuis le {dayLabel(since, { day: 'numeric', month: 'long' })} (zone hachurée : avant).</p>
      )}
    </div>
  );
};

const Bar: React.FC<{ value: number; max: number; color?: string }> = ({ value, max, color = ANON }) => (
  <div className="mt-1 h-1.5 rounded-full bg-[#f2f1ee]">
    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${value ? Math.max((value / max) * 100, 2) : 0}%`, background: color }} />
  </div>
);

const TOP = 12;

export const VisitorsTab: React.FC<{ data: AnonymousStats; days: number }> = ({ data, days }) => {
  const [allPages, setAllPages] = useState(false);
  const c = data.current;
  const p = data.previous ?? undefined;
  const sinceLabel = dayLabel(data.since, { day: 'numeric', month: 'long' });
  const totalVisits = c.visits + c.member_visits;
  const maxPage = Math.max(1, ...data.pages.map((x) => x.views));
  const maxContent = Math.max(1, ...data.top_contents.map((x) => x.views));
  const maxAction = Math.max(1, ...data.actions.map((x) => x.count));
  const signupPage = data.pages.find((x) => x.page === '/signup');

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-ink-faint">
        Personnes qui utilisent Fidni sans être connectées, sur {days} j (mesuré depuis le {sinceLabel}). Robots et comptes maison exclus.
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Visites de visiteurs" dot={ANON} value={fmt(c.visits)}
          sub={<>{totalVisits ? `${pct(c.visits, totalVisits)} % des visites du site` : 'aucune visite'}{p && <> · <Trend now={c.visits} before={p.visits} /></>}</>} />
        <Tile label="Pages vues par les visiteurs" value={fmt(c.pages)}
          sub={c.visits ? `${(c.pages / c.visits).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} pages par visite` : undefined} />
        <Tile label="Contenus ouverts par les visiteurs" value={fmt(c.contents)}
          sub={c.contents_all ? `${pct(c.contents, c.contents_all)} % de toutes les vues de contenus` : undefined} />
        <Tile label="Inscriptions" dot="#b8872b" value={fmt(data.signups)}
          sub={c.visits ? `${(data.signups / c.visits * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % des visites anonymes${signupPage ? ` · page Inscription vue ${fmt(signupPage.views)} fois` : ''}` : undefined} />
      </div>

      <section className="fd-card p-5">
        <h2 className="fd-display mb-3 text-[16px] text-ink">Visiteurs et membres</h2>
        <SplitChart series={data.series} since={data.since} />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="fd-card p-5">
          <h2 className="fd-display text-[16px] text-ink">Pages vues par les visiteurs</h2>
          <p className="mt-0.5 text-[12px] text-ink-faint">« Visites » = une personne comptée une fois par jour.</p>
          {data.pages.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-faint">Pas encore de visite anonyme enregistrée.</p>
          ) : (
            <ol className="mt-4 flex flex-col gap-3">
              {(allPages ? data.pages : data.pages.slice(0, TOP)).map((r, i) => (
                <li key={r.page}>
                  <div className="flex items-baseline gap-2 text-[13px]">
                    <span className="fd-nums w-5 shrink-0 text-[11.5px] text-ink-faint">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{pageInfo(r.page).label}</span>
                    <span className="fd-nums shrink-0 text-ink-faint"><b className="text-ink">{fmt(r.views)}</b> vues · {fmt(r.visits)} visites</span>
                  </div>
                  <div className="ml-7"><Bar value={r.views} max={maxPage} /></div>
                </li>
              ))}
            </ol>
          )}
          {data.pages.length > TOP && (
            <button type="button" className="fd-btn-ghost mt-3 text-[12.5px]" onClick={() => setAllPages((v) => !v)}>
              {allPages ? 'Replier' : `Voir les ${data.pages.length - TOP} autres`}
            </button>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="fd-card p-5">
            <h2 className="fd-display text-[16px] text-ink">Contenus les plus vus par les visiteurs</h2>
            <p className="mt-0.5 text-[12px] text-ink-faint">Entre parenthèses : toutes les vues, membres compris.</p>
            {data.top_contents.length === 0 ? (
              <p className="mt-4 text-[13px] text-ink-faint">Aucune vue anonyme sur la période.</p>
            ) : (
              <ol className="mt-3 divide-y divide-[#f2f1ee]">
                {data.top_contents.map((x) => (
                  <li key={x.id}>
                    <Link to={x.url} className="group block py-2.5">
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink group-hover:text-brand">{x.title}</span>
                        <span className="hidden shrink-0 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11px] text-ink-soft sm:inline">{TYPE_LABEL[x.type] ?? x.type}</span>
                        <span className="fd-nums shrink-0 text-right text-[13px] text-ink-faint"><b className="text-ink">{fmt(x.views)}</b> ({fmt(x.total)})</span>
                      </span>
                      <Bar value={x.views} max={maxContent} />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="fd-card p-5">
            <h2 className="fd-display text-[16px] text-ink">Ce que font les visiteurs</h2>
            <p className="mt-0.5 text-[12px] text-ink-faint">Gestes mesurés dans le navigateur ; la part donne le poids des visiteurs dans chaque geste.</p>
            {data.actions.every((a) => !a.count) ? (
              <p className="mt-4 text-[13px] text-ink-faint">Aucun geste anonyme enregistré sur la période.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2.5">
                {data.actions.filter((a) => a.total > 0).map((a) => (
                  <li key={a.key} className={a.count ? '' : 'opacity-60'}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="min-w-0 truncate text-ink">{a.label}</span>
                      <span className="fd-nums shrink-0 text-ink-faint">
                        <b className="text-ink">{fmt(a.count)}</b> fois · {pct(a.count, a.total)} % du total
                      </span>
                    </div>
                    <Bar value={a.count} max={maxAction} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
