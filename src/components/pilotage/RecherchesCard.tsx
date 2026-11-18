// Pilotage › Usage : « Recherches et filtre Déjà vu » (18/11/2026, Natsu : « le top des recherches faites, et si les
// gens utilisent vu ou pas encore vus »). Données : `recherches` de GET /api/pilotage/ (apps/users/admin_dashboard.py
// `_recherches`) et les valeurs « statut » du filtre (filter_values). Comptes de l'équipe exclus, comme partout.
import React from 'react';
import { Eye, Search } from 'lucide-react';

export interface RechercheTerme {
  terme: string; count: number; visits: number; liste: number; site: number; vides: number; numero: boolean;
}
export interface Recherches {
  total: number; liste: number; site: number; numero: number; vides: number; termes: number;
  top: RechercheTerme[]; top_vides: RechercheTerme[];
}
interface ValeurFiltre { filter: string; value: string; count: number; visits: number }

type Raw = Record<string, unknown>;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const terme = (r: unknown): RechercheTerme | null => {
  if (!r || typeof r !== 'object') return null;
  const o = r as Raw;
  return typeof o.terme === 'string' ? {
    terme: o.terme, count: num(o.count), visits: num(o.visits), liste: num(o.liste), site: num(o.site),
    vides: num(o.vides), numero: o.numero === true,
  } : null;
};

/** Réponse du serveur lue sans confiance (absente d'un serveur plus ancien : null, le bloc garde le filtre seul). */
export function lireRecherches(raw: unknown): Recherches | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Raw;
  const list = (v: unknown) => (Array.isArray(v) ? v.map(terme).filter((x): x is RechercheTerme => !!x) : []);
  return {
    total: num(o.total), liste: num(o.liste), site: num(o.site), numero: num(o.numero), vides: num(o.vides),
    termes: num(o.termes), top: list(o.top), top_vides: list(o.top_vides),
  };
}

const fr = (n: number) => n.toLocaleString('fr-FR');
const pct = (n: number, total: number) => `${Math.round((n / Math.max(total, 1)) * 100)} %`;

export const RecherchesCard: React.FC<{ recherches: Recherches | null; valeurs: ValeurFiltre[]; days: number }> = ({ recherches, valeurs, days }) => {
  const vu = (value: string) => valeurs.filter((v) => v.filter === 'filtre-statut' && v.value === value)
    .reduce((acc, v) => ({ count: acc.count + v.count, visits: acc.visits + v.visits }), { count: 0, visits: 0 });
  const vus = vu('showViewed');
  const nonVus = vu('hideViewed');
  const maxVu = Math.max(1, vus.count, nonVus.count);
  const r = recherches;
  const max = Math.max(1, ...(r?.top ?? []).map((t) => t.count));

  return (
    <section className="fd-card p-5" aria-labelledby="pilotage-recherches">
      <h2 id="pilotage-recherches" className="fd-display flex items-center gap-2 text-[16px] text-ink">
        <Search className="h-4 w-4 text-ink-soft" /> Recherches et filtre « Déjà vu »
      </h2>
      <p className="mt-0.5 text-[12px] text-ink-faint">
        Sur {days} j, visiteurs compris, sans les comptes de l’équipe. Mesuré depuis le 18 novembre.
      </p>

      <h3 className="mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-ink"><Eye className="h-3.5 w-3.5 text-ink-soft" /> Filtre « Déjà vu »</h3>
      <ul className="mt-2 flex flex-col gap-2.5">
        {([['Vus', vus], ['Pas encore vus', nonVus]] as const).map(([label, v]) => (
          <li key={label} title={`Élèves distincts chaque jour, additionnés sur la période : ${v.visits}`}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-ink">{label}</span>
              <span className="fd-nums text-ink-faint"><b className="text-ink">{fr(v.count)}</b> fois</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-[#f2f1ee]">
              <div className="h-full rounded-full bg-brand/70" style={{ width: `${v.count ? Math.max((v.count / maxVu) * 100, 2) : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>

      <h3 className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold text-ink"><Search className="h-3.5 w-3.5 text-ink-soft" /> Les plus cherchés</h3>
      {!r || r.total === 0 ? (
        <p className="mt-2 text-[13px] text-ink-faint">Aucune recherche enregistrée sur la période.</p>
      ) : (
        <>
          <p className="fd-nums mt-1 text-[12.5px] text-ink-soft">
            <b className="text-ink">{fr(r.total)}</b> recherches ({fr(r.termes)} différentes) · par numéro {pct(r.numero, r.total)}
            {' '}· sans résultat {pct(r.vides, r.total)} · dans une liste {fr(r.liste)}, page de recherche {fr(r.site)}
          </p>
          <ol className="mt-3 flex flex-col gap-2.5">
            {r.top.map((t) => (
              <li key={t.terme} title={`${t.liste} dans une liste, ${t.site} sur la page de recherche`}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-ink">{t.terme}</span>
                    {t.numero && <span className="shrink-0 rounded-md bg-[#f2f1ee] px-1.5 text-[11px] font-medium text-ink-soft">numéro</span>}
                    {t.vides > 0 && <span className="fd-nums shrink-0 rounded-md bg-gold-soft px-1.5 text-[11px] font-medium text-gold-strong">sans résultat ×{t.vides}</span>}
                  </span>
                  <b className="fd-nums shrink-0 text-ink">{fr(t.count)}</b>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[#f2f1ee]">
                  <div className="h-full rounded-full bg-brand/70" style={{ width: `${Math.max((t.count / max) * 100, 2)}%` }} />
                </div>
              </li>
            ))}
          </ol>
          {r.top_vides.length > 0 && (
            <p className="mt-4 rounded-xl border border-[#ecdcb6] bg-gold-soft px-3.5 py-2.5 text-[12.5px] text-ink-soft">
              <b className="text-ink">Cherchés sans résultat :</b> {r.top_vides.map((t) => `${t.terme} (${t.vides})`).join(', ')}.
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default RecherchesCard;
