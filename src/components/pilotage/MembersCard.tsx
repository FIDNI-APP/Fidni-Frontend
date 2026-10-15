/**
 * Pilotage › Aperçu — carte « Membres » (12/10/2026) : anneau des membres actifs sur la période parmi tous les
 * inscrits, puis le parcours des inscrits de la période (ex-« Entonnoir ») en barres, la plus grosse perte en or.
 * Données : members_total, metrics.active et funnel de GET /api/pilotage/.
 */
import React from 'react';
import type { Funnel } from './FunnelCard';
import { RingGauge } from './RingGauge';

const fmt = (n: number) => n.toLocaleString('fr-FR');
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);

type Step = { key: keyof Funnel; label: string };
const STEPS: Step[] = [
  { key: 'verified', label: 'E-mail confirmé' },
  { key: 'onboarded', label: 'Profil complété' },
  { key: 'first_view', label: 'A ouvert un contenu' },
  { key: 'first_work', label: 'A travaillé' },
];

const Bar: React.FC<{ label: string; value: number; total: number; worst?: boolean; note?: string }> = ({ label, value, total, worst, note }) => {
  const share = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
        <span className="min-w-0 text-ink-soft">
          {label}
          {worst && <span className="ms-1.5 whitespace-nowrap rounded-full bg-gold-soft px-1.5 py-px text-[10.5px] font-semibold text-gold-strong">plus grosse perte</span>}
        </span>
        <span className="fd-nums shrink-0 text-ink-faint">
          {total > 0 ? <><b className="font-semibold text-ink">{fmt(value)}</b> / {fmt(total)}</> : '—'}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]" aria-hidden>
        <div className={`h-full rounded-full transition-[width] duration-700 ${worst ? 'bg-gold' : 'bg-brand'}`}
          style={{ width: `${value ? Math.max(share * 100, 2) : 0}%` }} />
      </div>
      {note && <p className="mt-1 text-[11.5px] leading-snug text-ink-faint">{note}</p>}
    </li>
  );
};

export const MembersCard: React.FC<{ active: number; total: number; days: number; funnel?: Funnel }> = ({ active, total, days, funnel }) => {
  const share = total > 0 ? Math.min(1, active / total) : null;
  // Passage d'une étape à la suivante : la plus faible (hors retour à 7 jours, mesuré à part) est signalée.
  let worst: keyof Funnel | null = null;
  if (funnel && funnel.signups > 0) {
    let lowest = 100;
    for (let i = 0; i < STEPS.length; i += 1) {
      const p = pct(funnel[STEPS[i].key], i === 0 ? funnel.signups : funnel[STEPS[i - 1].key]);
      if (p !== null && p < lowest) { lowest = p; worst = STEPS[i].key; }
    }
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-line bg-white p-4 sm:p-5" aria-labelledby="pilotage-membres">
      <h2 id="pilotage-membres" className="fd-display text-[16px] text-ink">Membres</h2>
      <p className="mt-0.5 text-[12px] text-ink-faint">Actifs sur {days} j, parmi tous les inscrits.</p>

      <div className="mt-4 flex items-center gap-5">
        <RingGauge value={share} size={124} thickness={12}
          label={share === null ? 'Aucun membre inscrit' : `${pct(active, total)} % des membres actifs sur ${days} jours (${active} sur ${total})`}>
          <span className="fd-nums text-[26px] font-bold leading-none text-ink">{share === null ? '—' : `${pct(active, total)} %`}</span>
          <span className="fd-nums mt-1 text-[12px] text-ink-faint">{fmt(active)} / {fmt(total)}</span>
        </RingGauge>
        <ul className="min-w-0 space-y-2 text-[12.5px] text-ink-soft">
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-brand" aria-hidden />
            <span><b className="fd-nums text-ink">{fmt(active)}</b> {active > 1 ? 'actifs' : 'actif'}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-[#e7e3dc]" aria-hidden />
            <span><b className="fd-nums text-ink">{fmt(Math.max(0, total - active))}</b> sans action</span>
          </li>
          <li className="text-[12px] text-ink-faint">{fmt(total)} inscrits en tout</li>
        </ul>
      </div>

      {funnel && (
        <div className="mt-5 border-t border-[#f2f1ee] pt-4">
          <h3 className="flex items-baseline justify-between gap-2 text-[12.5px] font-semibold text-ink">
            Inscrits des {days} derniers jours
            <span className="fd-nums font-semibold">{fmt(funnel.signups)}</span>
          </h3>
          {funnel.signups === 0 ? (
            <p className="mt-2 text-[12.5px] text-ink-faint">Aucune inscription sur la période.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {STEPS.map((s) => (
                <Bar key={s.key} label={s.label} value={funnel[s.key]} total={funnel.signups} worst={worst === s.key} />
              ))}
              <Bar label="Revenu après 7 jours" value={funnel.back_d7} total={funnel.d7_eligible}
                note={funnel.d7_eligible ? 'Parmi les inscrits depuis 7 jours ou plus.' : 'Personne n’est encore inscrit depuis 7 jours.'} />
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

export default MembersCard;
