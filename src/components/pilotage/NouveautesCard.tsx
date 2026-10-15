/**
 * Pilotage › Usage › « Fenêtres Nouveautés » (15/10/2026) : pour chaque fenêtre présentée à l'arrivée des membres
 * (components/nouveautes/registre.ts), les comptes réels qui l'ont vue (depuis toujours) et, sur la période, ce qu'ils
 * en ont fait. Backend : `nouveautes` de GET /api/pilotage/ (UsageDaily « nouveautes:<id>:<geste> »,
 * UserProfile.nouveautes_vues).
 */
import React from 'react';
import { Sparkles } from 'lucide-react';
import { NOUVEAUTES } from '@/components/nouveautes/registre';

export interface NouveauteStat { id: string; depuis: string; comptes: number; vue: number; finie: number; cta: number; passee: number }

const pct = (n: number, sur: number) => (sur ? `${Math.round((n * 100) / sur)} %` : '—');

export const NouveautesCard: React.FC<{ nouveautes: NouveauteStat[]; days: number }> = ({ nouveautes, days }) => (
  <section className="fd-card p-5" aria-labelledby="pilotage-nouveautes">
    <h2 id="pilotage-nouveautes" className="fd-display flex items-center gap-2 text-[16px] text-ink">
      <Sparkles className="h-4 w-4 text-ink-soft" /> Fenêtres Nouveautés
    </h2>
    <p className="mt-0.5 text-[12px] text-ink-faint">
      Montrées une fois par compte à l’arrivée (membres inscrits avant la nouveauté). Vues : depuis le début ; gestes : sur {days} j.
    </p>
    {nouveautes.length === 0 ? (
      <p className="mt-4 text-[13px] text-ink-faint">Aucune fenêtre en cours.</p>
    ) : (
      <ul className="mt-4 flex flex-col gap-3">
        {nouveautes.map((n) => {
          const cta = NOUVEAUTES[n.id]?.cta;
          return (
            <li key={n.id} className="rounded-xl border border-line px-3.5 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-[13.5px] font-semibold text-ink">{NOUVEAUTES[n.id]?.sujet ?? n.id}</span>
                <span className="fd-nums text-[12.5px] text-ink-faint"><b className="text-ink">{n.comptes}</b> compte{n.comptes > 1 ? 's' : ''} l’ont vue</span>
              </div>
              <dl className="fd-nums mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] sm:grid-cols-4">
                <div><dt className="text-ink-faint">Montrée</dt><dd className="font-semibold text-ink">{n.vue}</dd></div>
                <div><dt className="text-ink-faint">Jusqu’au bout</dt><dd className="font-semibold text-ink">{n.finie} <span className="font-normal text-ink-faint">· {pct(n.finie, n.vue)}</span></dd></div>
                <div><dt className="text-ink-faint" title={cta?.label}>« {cta?.label ?? 'Bouton'} »</dt><dd className="font-semibold text-ink">{n.cta} <span className="font-normal text-ink-faint">· {pct(n.cta, n.vue)}</span></dd></div>
                <div><dt className="text-ink-faint">Fermée avant la fin</dt><dd className="font-semibold text-ink">{n.passee}</dd></div>
              </dl>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);

export default NouveautesCard;
