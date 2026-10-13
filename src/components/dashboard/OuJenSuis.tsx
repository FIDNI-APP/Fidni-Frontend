// « Où j'en suis » (13/10/2026) : la progression en bref sur l'accueil (la page la plus vue) et sur le profil.
// Trois chiffres avec leur portée (maîtrise estimée, évolution sur 30 jours, chapitres évalués), le chapitre
// prioritaire et la phrase de l'objectif, un bouton en contour (la carte « Reprendre » reste la seule action pleine)
// et « Ma progression ». Mêmes calculs que /progression (backend apps/users/maitrise.py, objectif.py).
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, RotateCcw } from 'lucide-react';
import { trackAction } from '@/lib/usage';
import { actionUrl } from '@/pages/progression/links';
import { EtatPill } from '@/pages/progression/Objectif';
import type { ApercuData } from '@/pages/progression/types';

export const OuJenSuis: React.FC<{
  data: ApercuData | null;
  failed?: boolean;
  onRetry?: () => void;
  /** L'action principale de l'accueil vise déjà le même chapitre ou le même DS : le bouton mène à la page. */
  sameAsHero?: boolean;
  variant?: 'home' | 'profile';
  className?: string;
}> = ({ data, failed, onRetry, sameAsHero = false, variant = 'home', className = '' }) => {
  if (!data) {
    return failed ? (
      <div role="alert" className={`flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 ${className}`}>
        <p className="flex-1 text-[13.5px] text-ink-soft">Ta progression n’a pas pu se charger.</p>
        {onRetry && <button type="button" onClick={onRetry} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> Réessayer</button>}
      </div>
    ) : <div className={`h-[178px] animate-pulse rounded-2xl border border-line bg-white sm:h-[150px] ${className}`} role="status" aria-label="Chargement" />;
  }
  const a = data.apercu;
  const o = data.objectif;
  const evo = a.evolution;
  const delta = evo.mesurable && evo.delta !== null ? `${evo.delta > 0 ? '+' : evo.delta < 0 ? '−' : ''}${Math.abs(evo.delta)} pts` : '—';
  const to = o && !sameAsHero ? actionUrl(o.action, o.chapitre) : '/progression';

  return (
    <section data-tour="home-stats" aria-labelledby={`oujensuis-${variant}`} className={`overflow-hidden rounded-2xl border border-line bg-white ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <h2 id={`oujensuis-${variant}`} className="text-[12px] font-bold uppercase tracking-[.1em] text-gold-strong">Où j’en suis</h2>
        {variant === 'home' && (
          <Link to="/progression" onClick={() => trackAction('accueil-progression')}
            className="inline-flex min-h-9 items-center gap-0.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
            Ma progression <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-2 px-4 pb-3 pt-2 sm:px-5">
        <Stat value={a.maitrise !== null ? `${a.maitrise} %` : '—'} label="maîtrise" scope={a.chapitres.evalues ? `sur ${a.chapitres.evalues} ch.` : 'à évaluer'} />
        <Stat value={delta} label="en 30 jours" scope={evo.mesurable ? `${evo.chapitres_compares} ch. comparés` : 'pas assez de recul'}
          tone={evo.mesurable && evo.delta ? (evo.delta > 0 ? 'up' : 'down') : undefined} />
        <Stat value={`${a.chapitres.evalues}/${a.chapitres.total}`} label="chapitres" scope="évalués" />
      </dl>
      {o && (
        <div className="flex flex-col gap-3 border-t border-line bg-[#fcfbf9] px-4 py-3.5 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-ink">
              {o.chapitre && <EtatPill etat={o.chapitre.etat} enProgres={o.chapitre.en_progres} size="sm" />}
              <span className="min-w-0">{o.titre}</span>
            </p>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-ink-faint">{o.phrase}</p>
          </div>
          <Link to={to} onClick={() => trackAction('accueil-objectif')}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-ink/80 bg-white px-4 text-[14px] font-semibold text-ink transition-colors hover:bg-ink hover:text-white">
            {sameAsHero ? 'Voir mon objectif' : 'S’y mettre'} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
};

function Stat({ value, label, scope, tone }: { value: string; label: string; scope: string; tone?: 'up' | 'down' }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="order-2 text-[12.5px] font-medium text-ink-soft">{label}</dt>
      <dd className={`fd-nums order-1 text-[22px] font-bold leading-tight sm:text-[24px] ${tone === 'up' ? 'text-brand-hover' : tone === 'down' ? 'text-[#8a6318]' : 'text-ink'}`}>{value}</dd>
      <dd className="order-3 truncate text-[11.5px] text-ink-faint">{scope}</dd>
    </div>
  );
}
