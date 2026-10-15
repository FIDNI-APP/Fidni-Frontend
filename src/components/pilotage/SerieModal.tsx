// Pilotage › Usage : courbe d'une ligne (fonctionnalité, geste, filtre, page), jour par jour ou semaine par
// semaine sur 13 semaines, avec la comparaison à la période d'avant (11/10/2026 : « au lieu du cumulatif »).
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { api } from '@/lib/api/apiClient';

export type SerieSource = 'base' | 'navigateur' | 'filtre' | 'page';
export interface SerieTarget { source: SerieSource; cle: string; label: string }

interface Point { debut: string; valeur: number; personnes: number | null; mesure: boolean; partiel: boolean }
interface Serie { libelle: string; pas: 'jour' | 'semaine'; mesure_depuis: string; points: Point[] }

const fmt = (n: number) => n.toLocaleString('fr-FR');
const label = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', opts);

/** « +3 (+25 %) » / « −2 » / « autant » ; null si la période d'avant n'était pas mesurée. */
function evolution(now: number, before: number | null) {
  if (before === null) return null;
  const d = now - before;
  if (d === 0) return { text: 'autant', tone: 'text-ink-faint' };
  const pct = before ? ` (${d > 0 ? '+' : '−'}${Math.abs(Math.round((d / before) * 100))} %)` : '';
  return { text: `${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}${pct}`, tone: d > 0 ? 'text-brand' : 'text-[#a23b34]' };
}

export const SerieModal: React.FC<{ target: SerieTarget; onClose: () => void }> = ({ target, onClose }) => {
  const [pas, setPas] = useState<'jour' | 'semaine'>('semaine');
  const [data, setData] = useState<Serie | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let off = false;
    setData(null); setError(null); setHover(null);
    api.get('/pilotage/serie/', { params: { source: target.source, cle: target.cle, pas } })
      .then((r) => { if (!off) setData(r.data); })
      .catch(() => { if (!off) setError('La courbe n’a pas pu être chargée.'); });
    return () => { off = true; };
  }, [target.source, target.cle, pas]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // La courbe commence au premier jour mesuré (les gestes du navigateur ne le sont que depuis octobre) :
  // sinon, une longue zone « pas encore mesuré » écrase les barres. Elle s'allonge seule avec le temps.
  const all = data?.points ?? [];
  const firstMeasured = all.findIndex((p) => p.mesure);
  const pts = firstMeasured > 0 ? all.slice(firstMeasured) : all;
  const max = Math.max(1, ...pts.map((p) => p.valeur));
  // Comparaison : la dernière période complète et celle d'avant (semaine : la semaine en cours n'est pas finie).
  const done = pts.filter((p) => p.mesure && !p.partiel);
  const cur = pts[pts.length - 1];
  const last = pas === 'jour' ? cur : done[done.length - 1];
  const prevIdx = last ? pts.indexOf(last) - 1 : -1;
  const prev = prevIdx >= 0 && pts[prevIdx].mesure ? pts[prevIdx] : null;
  const evo = last ? evolution(last.valeur, prev ? prev.valeur : null) : null;
  const shown = hover !== null ? pts[hover] : null;
  const unit = target.source === 'page' ? ['vue', 'vues'] : ['fois', 'fois'];
  const plural = (n: number) => `${fmt(n)} ${n > 1 ? unit[1] : unit[0]}`;
  const periodName = (p: Point) => (pas === 'jour'
    ? label(p.debut, { weekday: 'long', day: 'numeric', month: 'long' })
    : `semaine du ${label(p.debut, { day: 'numeric', month: 'long' })}`);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="serie-titre" onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.1em] text-ink-faint">Évolution</p>
            <h2 id="serie-titre" className="fd-display mt-0.5 text-[19px] leading-tight text-ink">{data?.libelle || target.label}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-[#f2f1ee] p-1" role="group" aria-label="Pas">
            {(['jour', 'semaine'] as const).map((p) => (
              <button key={p} type="button" aria-pressed={pas === p} onClick={() => setPas(p)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${pas === p ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'}`}>
                {p === 'jour' ? 'Jour par jour' : 'Semaine par semaine'}
              </button>
            ))}
          </div>
          {last && (
            <p className="text-[13px] text-ink-soft">
              {pas === 'jour' ? 'Aujourd’hui' : 'Semaine dernière'} : <b className="fd-nums text-ink">{plural(last.valeur)}</b>
              {evo && <> · <span className={`fd-nums font-semibold ${evo.tone}`}>{evo.text}</span> <span className="text-ink-faint">vs {pas === 'jour' ? 'hier' : 'la semaine d’avant'}</span></>}
            </p>
          )}
        </div>

        {error && <p className="mt-6 text-[13px] text-[#9c3b2e]">{error}</p>}
        {!data && !error && <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-ink-faint" /></div>}
        {data && (
          <>
            <div className="mt-5 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="text-ink-soft">{shown ? periodName(shown) : pts.length < all.length ? `Depuis le début des mesures (${label(pts[0].debut, { day: 'numeric', month: 'long' })})` : pas === 'jour' ? '13 dernières semaines, jour par jour' : '13 dernières semaines'}</span>
              <span className="fd-nums font-semibold text-ink">
                {shown ? (!shown.mesure ? 'pas encore mesuré' : `${plural(shown.valeur)}${shown.personnes !== null ? ` · ${fmt(shown.personnes)} pers.` : ''}${shown.partiel ? ' (en cours)' : ''}`) : ''}
              </span>
            </div>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden />
              <span className="fd-nums pointer-events-none absolute -top-2 end-0 bg-white ps-1 text-[10.5px] text-ink-faint" aria-hidden>{fmt(max)}</span>
              <div className={`flex h-44 items-end ${pts.length > 40 ? 'gap-px' : 'gap-1'}`} onMouseLeave={() => setHover(null)}>
                {pts.map((p, i) => (
                  <button key={p.debut} type="button" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)}
                    aria-label={`${periodName(p)} : ${p.mesure ? plural(p.valeur) : 'pas encore mesuré'}`}
                    className="flex h-full flex-1 items-end rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                    {!p.mesure ? (
                      <span className="block h-full w-full rounded-t-[3px]" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #ebe8e2 0 3px, transparent 3px 6px)' }} />
                    ) : (
                      <span className="block w-full rounded-t-[3px]" style={{
                        height: p.valeur ? `${Math.max(3, (p.valeur / max) * 100)}%` : '2px',
                        background: p.valeur ? '#1a7a4a' : '#e7e3dc',
                        opacity: (hover === null || hover === i ? 1 : 0.4) * (p.partiel ? 0.45 : 1),
                      }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-ink-faint">
              <span>{pts[0] ? label(pts[0].debut) : ''}</span>
              <span>{pas === 'jour' ? 'aujourd’hui' : 'cette semaine'}</span>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-ink-faint">
              {pas === 'semaine' && 'Semaines du lundi au dimanche ; la semaine en cours est plus claire (pas finie). '}
              {target.source !== 'base' && `Mesuré depuis le ${label(data.mesure_depuis, { day: 'numeric', month: 'long' })} (zone hachurée : avant). `}
              {target.source === 'navigateur' || target.source === 'filtre'
                ? 'Visiteurs non connectés compris.'
                : target.source === 'page' ? 'Visiteurs compris.' : 'Membres seulement (comptes maison exclus).'}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SerieModal;
