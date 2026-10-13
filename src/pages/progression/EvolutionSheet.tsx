// « Évolution sur 30 jours » (13/10/2026) : le chiffre, sa portée (chapitres comparés, chapitres exclus), ses mises
// en garde, la courbe sur 8 semaines et le détail avant → maintenant. Pas assez de résultats : on le dit, sans chiffre.
import { Sheet } from '@/components/space/Sheet';
import { Sparkline } from '@/components/pilotage/Sparkline';
import { shortDate } from './format';
import type { Evolution } from './types';

export function EvolutionSheet({ open, onClose, evolution, serie }: {
  open: boolean; onClose: () => void; evolution: Evolution; serie: { date: string; pct: number | null }[];
}) {
  const e = evolution;
  const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`;
  return (
    <Sheet open={open} onClose={onClose} labelId="evolution-titre" title="Évolution sur 30 jours"
      subtitle={e.mesurable && e.delta !== null
        ? <><b className="fd-nums text-ink">{signed(e.delta)} points</b> en 30 jours, calculé sur {e.chapitres_compares} chapitres évalués aux deux dates. Les autres ne sont pas comptés.</>
        : 'Pas encore assez de résultats pour mesurer ta progression.'}>
      {!e.mesurable && (
        <div className="rounded-xl bg-paper px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">
          <p>Pour comparer, il faut au moins 2 chapitres évalués il y a 30 jours et aujourd’hui, et 6 questions évaluées pendant la période.</p>
          {e.disponible_le && <p className="mt-1.5">Ta première évaluation est récente : la comparaison sera possible à partir du <b className="text-ink">{shortDate(e.disponible_le)}</b>.</p>}
          <p className="mt-1.5">Termine une courte évaluation (3 exercices, en disant pour chaque question si tu l’as réussie) pour établir ton point de départ.</p>
        </div>
      )}
      {e.mises_en_garde.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {e.mises_en_garde.map((m) => <li key={m.cle} className="rounded-xl border border-gold-line bg-gold-soft px-3.5 py-2 text-[13px] leading-relaxed text-[#7a560f]">{m.texte}</li>)}
        </ul>
      )}
      {serie.some((p) => p.pct !== null) && (
        <div className="mb-5 rounded-xl border border-line px-4 pb-3 pt-4">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[.08em] text-ink-faint">Maîtrise estimée, semaine par semaine</p>
          <Sparkline values={serie.map((p) => p.pct)} dates={serie.map((p) => p.date)} color="#1a7a4a" height={96}
            format={(v) => `${v} %`} label="Maîtrise estimée par semaine" />
          <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">La courbe compte tous tes chapitres évalués à chaque date ; le chiffre en haut ne compare que les mêmes chapitres.</p>
        </div>
      )}
      {(e.detail?.length ?? 0) > 0 && (
        <>
          <p className="text-[12px] font-semibold uppercase tracking-[.08em] text-ink-faint">Chapitres comparés</p>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
            {e.detail!.map((d) => {
              const diff = d.maintenant - d.avant;
              return (
                <li key={d.id} className="flex items-center gap-3 px-3.5 py-2.5 text-[13.5px]">
                  <span className="min-w-0 flex-1 truncate text-ink">{d.name}</span>
                  <span className="fd-nums text-ink-faint">{d.avant} % → <b className="text-ink">{d.maintenant} %</b></span>
                  <span className={`fd-nums w-12 text-right font-semibold ${diff > 0 ? 'text-brand-hover' : diff < 0 ? 'text-[#8a6318]' : 'text-ink-faint'}`}>{signed(diff)}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {e.chapitres_exclus.length > 0 && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">Pas comptés (pas encore évalués il y a 30 jours) : {e.chapitres_exclus.join(', ')}.</p>
      )}
    </Sheet>
  );
}
