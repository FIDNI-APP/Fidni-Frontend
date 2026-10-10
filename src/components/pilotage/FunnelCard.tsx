/**
 * Pilotage › Aperçu › « Entonnoir » (10/10/2026) : la cohorte inscrite sur la période, étape par étape, jusqu'au
 * retour à J+7. Comptes maison exclus. Backend : `funnel` de GET /api/pilotage/ (admin_dashboard._funnel).
 */
import React from 'react';

export interface Funnel {
  signups: number; verified: number; onboarded: number; first_view: number; first_work: number;
  back_d7: number; d7_eligible: number;
}

type StepKey = Exclude<keyof Funnel, 'd7_eligible'>;
const STEPS: { key: StepKey; label: string }[] = [
  { key: 'signups', label: 'Inscrits' },
  { key: 'verified', label: 'E-mail confirmé' },
  { key: 'onboarded', label: 'Profil complété' },
  { key: 'first_view', label: '1er contenu ouvert' },
  { key: 'first_work', label: '1er travail' },
  { key: 'back_d7', label: 'Revenus à J+7' },
];

const fmt = (n: number) => n.toLocaleString('fr-FR');
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);

export const FunnelCard: React.FC<{ funnel: Funnel; days: number }> = ({ funnel, days }) => {
  // Passage d'une étape à la suivante ; le retour à J+7 se rapporte aux seuls inscrits depuis 7 jours ou plus.
  const steps = STEPS.map((s, i) => {
    const value = funnel[s.key] ?? 0;
    const base = s.key === 'back_d7' ? funnel.d7_eligible : i === 0 ? null : funnel[STEPS[i - 1].key];
    const width = s.key === 'back_d7' ? pct(value, funnel.d7_eligible) : pct(value, funnel.signups);
    return { ...s, value, passage: base === null ? null : pct(value, base), width: Math.min(width ?? 0, 100) };
  });
  // Plus grosse perte entre deux étapes (hors J+7, mesuré à part).
  const losses = steps.slice(1, 5).filter((s) => s.passage !== null && s.passage < 100);
  const worst = losses.length ? losses.reduce((a, b) => ((b.passage ?? 100) < (a.passage ?? 100) ? b : a)).key : null;

  return (
    <section className="fd-card p-5" aria-labelledby="pilotage-entonnoir">
      <h2 id="pilotage-entonnoir" className="fd-display text-[16px] text-ink">Entonnoir</h2>
      <p className="mt-0.5 text-[12px] text-ink-faint">
        Les inscrits des {days} derniers jours, de la création du compte au retour une semaine après. Comptes maison exclus.
      </p>

      {funnel.signups === 0 ? (
        <p className="mt-4 text-[13px] text-ink-faint">Aucune inscription sur les {days} derniers jours.</p>
      ) : (
        <ol className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {steps.map((s, i) => {
            const isWorst = s.key === worst;
            const isD7 = s.key === 'back_d7';
            return (
              <li key={s.key}
                className={`rounded-xl border p-3.5 ${isWorst ? 'border-gold-line bg-gold-soft' : isD7 ? 'border-dashed border-line bg-white' : 'border-line bg-white'}`}>
                <span className="flex items-baseline gap-1.5 text-[12px] font-medium text-ink-soft">
                  <span className="fd-nums text-ink-faint">{i + 1}</span>
                  <span className="min-w-0">{s.label}</span>
                </span>
                <span className="fd-nums mt-1.5 block text-[24px] font-bold leading-none text-ink">{fmt(s.value)}</span>
                <span className="mt-2 block h-1.5 rounded-full bg-[#f2f1ee]" aria-hidden>
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${s.value ? Math.max(s.width, 3) : 0}%` }} />
                </span>
                <span className="mt-1.5 block text-[11.5px] leading-snug text-ink-faint">
                  {i === 0 ? `sur ${days} j`
                    : isD7 ? (funnel.d7_eligible
                      ? <><b className="fd-nums text-ink-soft">{s.passage} %</b> des {fmt(funnel.d7_eligible)} inscrits depuis 7 j ou plus</>
                      : 'Personne n’est encore inscrit depuis 7 j : choisis 30 ou 90 j')
                      : s.passage === null ? '—'
                        // Étapes non emboîtées (contenu ouvert sans profil complété) : plus de 100 % ne dirait rien.
                        : s.passage > 100 ? <><b className="fd-nums text-ink-soft">{pct(s.value, funnel.signups)} %</b> des inscrits</>
                          : <><b className="fd-nums text-ink-soft">{s.passage} %</b> de l’étape d’avant</>}
                  {isWorst && <span className="block font-semibold text-gold-strong">Plus grosse perte</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
        Chaque étape est comptée à part (un élève peut ouvrir un contenu sans avoir complété son profil).
        1er travail : une question auto-évaluée ou un contenu terminé. Revenus à J+7 : actifs entre le 7e et le 13e jour
        après l’inscription.
      </p>
    </section>
  );
};

export default FunnelCard;
