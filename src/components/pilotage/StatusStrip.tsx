/**
 * Pilotage › Aperçu — bandeau « En ce moment » (12/10/2026) : ce qui attend une action, en pastilles cliquables
 * (chacune ouvre son onglet), puis l'activité du jour comparée à celle d'hier. Données : /api/pilotage/direct/.
 */
import React from 'react';
import { CheckCircle2, Loader2, type LucideIcon } from 'lucide-react';
import { agoShort, useNow, type LiveDay, type LiveStatus } from './livePilotage';

export interface StatusPillDef {
  key: string;
  /** null = pas encore connu (le direct n'a pas répondu) : la pastille n'est pas affichée. */
  count: number | null;
  one: string;
  many: string;
  icon: LucideIcon;
  tone: 'red' | 'gold' | 'brand' | 'ink';
  onClick: () => void;
  /** Travail en cours (IA) : une roue tourne, et il ne compte pas dans « à traiter ». */
  running?: boolean;
  title?: string;
}

const TONES: Record<StatusPillDef['tone'], string> = {
  red: 'border-[#f0d4cf] bg-[#fbecea] text-[#a23b34] hover:border-[#a23b34]',
  gold: 'border-gold-line bg-gold-soft text-gold-strong hover:border-gold-strong',
  brand: 'border-brand-line bg-brand-soft text-brand-hover hover:border-brand',
  ink: 'border-[#e2ded6] bg-[#f2f1ee] text-ink hover:border-ink',
};
const MUTED = 'border-line bg-white text-ink-faint hover:border-[#d8d4cc] hover:text-ink-soft';

const fmt = (n: number) => n.toLocaleString('fr-FR');
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n > 1 ? many : one}`;

interface StatusStripProps {
  pills: StatusPillDef[];
  today: LiveDay | null;
  yesterday: LiveDay | null;
  lastActivityAt: string | null;
  status: LiveStatus;
}

export const StatusStrip: React.FC<StatusStripProps> = ({ pills, today, yesterday, lastActivityAt, status }) => {
  const now = useNow(15000);
  const shown = pills.filter((p) => p.count !== null);
  const waiting = shown.filter((p) => !p.running).reduce((n, p) => n + (p.count ?? 0), 0);
  const running = shown.filter((p) => p.running).reduce((n, p) => n + (p.count ?? 0), 0);
  const ratio = today && yesterday ? (yesterday.active ? Math.min(1, today.active / yesterday.active) : today.active ? 1 : 0) : 0;

  return (
    <section className="rounded-2xl border border-line bg-white p-4 sm:p-5" aria-labelledby="pilotage-maintenant">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="pilotage-maintenant" className="fd-display text-[16px] text-ink">En ce moment</h2>
        <span className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium ${waiting ? 'text-gold-strong' : 'text-brand'}`}>
          {waiting ? <><b className="fd-nums">{fmt(waiting)}</b> {waiting > 1 ? 'éléments' : 'élément'} à traiter</>
            : <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Rien à traiter</>}
          {running > 0 && <span className="text-ink-faint">· IA au travail</span>}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {shown.map((p) => {
          const n = p.count ?? 0;
          const Icon = p.running && n ? Loader2 : p.icon;
          return (
            <button key={p.key} type="button" onClick={p.onClick} title={p.title}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${n ? TONES[p.tone] : MUTED}`}>
              <Icon className={`h-3.5 w-3.5 shrink-0 ${p.running && n ? 'animate-spin' : ''}`} aria-hidden />
              <span className="truncate"><b className="fd-nums font-semibold">{fmt(n)}</b> {n > 1 ? p.many : p.one}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-[#f2f1ee] pt-4">
        {today && yesterday ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-[13.5px] text-ink">
                <span className="font-semibold">Aujourd’hui :</span>{' '}
                <b className="fd-nums">{plural(today.active, 'membre actif', 'membres actifs')}</b>
                <span className="text-ink-faint"> · {fmt(yesterday.active)} hier</span>
              </p>
              <span className="fd-nums text-[12px] text-ink-faint">
                {yesterday.active ? `${fmt(Math.round((today.active / yesterday.active) * 100))} % d’hier` : today.active ? 'personne hier' : ''}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f2f1ee]" role="progressbar" aria-label="Membres actifs aujourd’hui, par rapport à hier"
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
              <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${ratio * 100}%` }} />
            </div>
            <p className="fd-nums mt-2 text-[12px] leading-relaxed text-ink-faint">
              {plural(today.views, 'vue', 'vues')} · {plural(today.signups, 'inscription', 'inscriptions')} · {plural(today.work, 'action de travail', 'actions de travail')} · {plural(today.visitors, 'visiteur', 'visiteurs')}
              {lastActivityAt && <> · dernière action {agoShort(lastActivityAt, now)}</>}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-ink-faint">
            {status === 'error' ? 'Le direct ne répond pas pour l’instant : nouvel essai dans quelques secondes.' : 'Chargement de l’activité du jour…'}
          </p>
        )}
      </div>
    </section>
  );
};

export default StatusStrip;
