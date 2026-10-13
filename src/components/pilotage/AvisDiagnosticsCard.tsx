/**
 * Pilotage › Usage › « Avis sur les diagnostics » (13/10/2026) : « Ce diagnostic te semble juste ? » de Ma progression,
 * par état de chapitre et par type d'objectif. Un accord faible sur un état = seuil à revoir dans
 * backend apps/users/maitrise_seuils.py. Backend : `avis_diagnostics` de GET /api/pilotage/ (UsageDaily « prog:avis:… »).
 */
import React from 'react';
import { MessageSquareHeart } from 'lucide-react';

export interface AvisDiagnostic { sujet: string; oui: number; non: number; total: number; accord: number | null }

const SUJET: Record<string, string> = {
  maitrise: 'Chapitre « Maîtrisé »', bonne_voie: 'Chapitre « En bonne voie »', a_consolider: 'Chapitre « À consolider »',
  a_renforcer: 'Chapitre « À renforcer »', non_evalue: 'Chapitre « Pas encore évalué »',
  'objectif-consolider': 'Objectif « Consolider »', 'objectif-renforcer': 'Objectif « Reprendre les bases »',
  'objectif-verifier': 'Objectif « Vérifier »', 'objectif-continuer': 'Objectif « Continuer »',
  'objectif-evaluer': 'Objectif « S’évaluer »', 'objectif-approfondir': 'Objectif « Aller plus loin »',
  'objectif-ds_blanc': 'Objectif « DS blanc »', 'objectif-decouvrir': 'Objectif « Découvrir »',
};
const label = (s: string) => (Object.prototype.hasOwnProperty.call(SUJET, s) ? SUJET[s] : s.replace(/[-_]/g, ' '));

export const AvisDiagnosticsCard: React.FC<{ avis: AvisDiagnostic[]; days: number }> = ({ avis, days }) => {
  const total = avis.reduce((n, a) => n + a.total, 0);
  return (
    <section className="fd-card p-5" aria-labelledby="pilotage-avis">
      <h2 id="pilotage-avis" className="fd-display flex items-center gap-2 text-[16px] text-ink">
        <MessageSquareHeart className="h-4 w-4 text-ink-soft" /> Avis sur les diagnostics
      </h2>
      <p className="mt-0.5 text-[12px] text-ink-faint">
        « Ce diagnostic te semble juste ? » dans Ma progression, sur {days} j{total > 0 && <> : <b className="fd-nums text-ink-soft">{total}</b> avis</>}.
        Un accord faible sur un état : seuil à revoir (maitrise_seuils.py). Depuis le 13 octobre.
      </p>
      {avis.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-faint">Aucun avis sur la période.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-2.5">
          {avis.map((a) => (
            <li key={a.sujet}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate text-ink">{label(a.sujet)}</span>
                <span className="fd-nums shrink-0 text-ink-faint">
                  <b className="text-ink">{a.accord ?? '—'} %</b> d’accord · {a.total} avis
                </span>
              </div>
              <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]" role="img" aria-label={`${a.oui} oui, ${a.non} non`}>
                <div className="h-full bg-brand/70" style={{ width: `${a.total ? (a.oui / a.total) * 100 : 0}%` }} />
                <div className="h-full bg-gold/70" style={{ width: `${a.total ? (a.non / a.total) * 100 : 0}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
