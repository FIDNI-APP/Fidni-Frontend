/**
 * Concours › Mon historique (/concours/sessions), refonte du 11/10/2026 : mes simulations chronométrées,
 * score en tête de ligne (vert réussi, or moyen, rouge sobre à retravailler), celles à reprendre en or.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, History, RotateCcw } from 'lucide-react';
import {
  listMySessions, CONCOURS_TYPES,
  type SimulationSessionListItem, type ConcoursType,
} from '@/lib/api/concoursApi';
import { SEO } from '@/components/layout/SEO';
import { Page, Section, EmptyState, StatTile, CardsSkeleton } from '@/components/space/Page';
import { ConcoursHeader } from './ConcoursHeader';

/** Couleur du score : vert ≥ 75 %, or ≥ 50 %, rouge sobre en dessous ; simulation non rendue : encre pâle. */
const scoreTone = (pct: number, submitted: boolean) => {
  if (!submitted) return 'bg-[#f7f6f3] text-ink-faint';
  if (pct >= 75) return 'bg-brand-soft text-brand-hover';
  if (pct >= 50) return 'bg-gold-soft text-gold-strong';
  return 'bg-[#fbecea] text-[#a23b34]';
};

const SessionRow: React.FC<{ s: SimulationSessionListItem }> = ({ s }) => {
  const pct = Math.round(s.score_percentage);
  const submitted = s.status === 'submitted';
  return (
    <li>
      <Link to={submitted ? `/concours/sessions/${s.id}/recap` : `/concours/simulate/${s.id}`}
        className="group flex items-stretch overflow-hidden rounded-2xl border border-line bg-white transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <span className={`flex w-[76px] shrink-0 flex-col items-center justify-center border-r border-line sm:w-[88px] ${scoreTone(pct, submitted)}`}>
          <span className="fd-nums text-[20px] font-bold leading-none sm:text-[22px]">{submitted ? `${pct} %` : '—'}</span>
          <span className="fd-nums mt-1 text-[11px] opacity-80">{s.correct_count}/{s.total_questions}</span>
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-[14.5px] font-semibold text-ink">{s.concours_type_display}</span>
              <span className="rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11.5px] font-medium text-ink-soft">{s.mode_display}</span>
              {!submitted && (
                <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11.5px] font-semibold text-gold-strong">À reprendre</span>
              )}
            </span>
            {s.exam_title && <span className="mt-0.5 block truncate text-[12.5px] text-ink-soft">{s.exam_title}</span>}
            <span className="mt-1 flex items-center gap-2 text-[12px] text-ink-faint">
              <span>{new Date(s.started_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden /> {s.duration_minutes} min</span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </li>
  );
};

export default function ConcoursHistoryPage() {
  const [sessions, setSessions] = useState<SimulationSessionListItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filterType, setFilterType] = useState<ConcoursType | null>(null);

  const load = useCallback(() => {
    let alive = true;
    setFailed(false);
    setSessions(null);
    listMySessions(filterType ? { concours_type: filterType } : {})
      .then((data) => { if (alive) setSessions(data); })
      .catch((e) => { console.error(e); if (alive) { setSessions([]); setFailed(true); } });
    return () => { alive = false; };
  }, [filterType]);
  useEffect(() => load(), [load]);

  const stats = useMemo(() => {
    const done = (sessions ?? []).filter((s) => s.status === 'submitted');
    const count = done.length;
    const avg = count ? Math.round(done.reduce((a, s) => a + s.score_percentage, 0) / count) : 0;
    const best = count ? Math.round(Math.max(...done.map((s) => s.score_percentage))) : 0;
    return { count, avg, best };
  }, [sessions]);

  const list = sessions ?? [];
  const chip = (active: boolean) => `inline-flex min-h-10 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-faint hover:border-[#cfc9bf] hover:text-ink'}`;

  return (
    <Page>
      <SEO title="Historique de simulations - Fidni" description="Historique des simulations de concours" />
      <ConcoursHeader />

      {failed && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
          <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Ton historique n’a pas pu se charger. Vérifie ta connexion.</p>
          <button type="button" onClick={load} className="fd-btn-ghost min-h-9"><RotateCcw className="h-4 w-4" /> Réessayer</button>
        </div>
      )}

      <Section id="simulations" title="Mes simulations" count={list.length}
        hint={list.length ? 'Ouvre une simulation pour revoir ta copie et la correction.' : undefined}>
        {stats.count > 0 && (
          <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
            <StatTile label="Simulations" value={stats.count} />
            <StatTile label="Moyenne" value={`${stats.avg} %`} />
            <StatTile label="Meilleur" value={`${stats.best} %`} />
          </div>
        )}

        {(list.length > 0 || filterType) && (
          <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par concours">
            <button type="button" aria-pressed={!filterType} className={chip(!filterType)} onClick={() => setFilterType(null)}>Tous</button>
            {CONCOURS_TYPES.map((c) => (
              <button key={c.id} type="button" aria-pressed={filterType === c.id} className={chip(filterType === c.id)} onClick={() => setFilterType(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        )}

        {sessions === null ? <CardsSkeleton n={3} />
          : list.length === 0 ? (
            filterType ? (
              <EmptyState compact icon={History} tone="ink" title="Aucune simulation pour ce concours"
                action={<button type="button" className="fd-btn-ghost min-h-10" onClick={() => setFilterType(null)}>Tout afficher</button>} />
            ) : !failed && (
              <EmptyState icon={History} tone="ink" title="Pas encore de simulation"
                text="Tes simulations chronométrées s’afficheront ici, avec ton score et la correction."
                action={<Link to="/concours" className="fd-btn-ghost min-h-10">Voir les concours</Link>} />
            )
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((s) => <SessionRow key={s.id} s={s} />)}
            </ul>
          )}
      </Section>
    </Page>
  );
}
