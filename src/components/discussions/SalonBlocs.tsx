// Les salons du forum en blocs de couleur (09/11/2026) : le forum est fait de salons, on entre dans une pièce. Une étoile du
// zellige ton sur ton, comme les bannières des profils. Un salon choisi garde sa couleur, les autres se désaturent sans perdre
// le contraste de leur texte ; un nouveau clic le quitte. Téléphone : une seule rangée qui défile, la liste reste haute.
import React from 'react';
import type { Salon } from '@/lib/api/discussionsApi';
import { etoile } from '@/components/communaute/art';
import { SALONS } from './parts';
import { t } from '@/i18n';

export const SalonBlocs: React.FC<{ salon: Salon | null; onChange: (salon: Salon | null) => void }> = ({ salon, onChange }) => (
  <div role="group" aria-label={t('Salons')}
    className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
    {SALONS.map((s) => {
      const actif = salon === s.key;
      const Icone = s.icon;
      return (
        <button key={s.key} type="button" aria-pressed={actif} onClick={() => onChange(actif ? null : s.key)} style={{ backgroundColor: s.bloc }}
          className={`fd-fixe relative flex h-16 min-w-[148px] shrink-0 snap-start items-center gap-2.5 overflow-hidden rounded-2xl px-4 text-start text-[14px] font-semibold text-white transition-[filter,transform,box-shadow] duration-200 ease-out hover:brightness-110 active:scale-[.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper md:min-w-0 ${
            salon && !actif ? 'saturate-[.35] hover:saturate-100' : ''} ${actif ? 'shadow-[0_6px_18px_rgba(20,18,16,.22)]' : ''}`}>
          <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute -end-5 -top-5 h-[92px] w-[92px] opacity-[.16]">
            <polygon points={etoile(50, 48)} fill="#fff" />
            <polygon points={etoile(50, 26)} fill={s.bloc} />
          </svg>
          <Icone className="relative h-5 w-5 shrink-0" />
          <span className="relative leading-tight">{t(s.label)}</span>
        </button>
      );
    })}
  </div>
);

export default SalonBlocs;
