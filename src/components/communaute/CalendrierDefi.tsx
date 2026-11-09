/**
 * Douze semaines de défis du jour (profil) : une case par jour, dorée quand le défi a été trouvé le jour même.
 * Colonnes = semaines (lundi en haut), la plus récente à droite (à gauche en arabe).
 */
import React from 'react';
import { dateLocale, t } from '@/i18n';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const CalendrierDefi: React.FC<{ debut: string; jours: string[] }> = ({ debut, jours }) => {
  const trouves = new Set(jours);
  const [y, m, d] = debut.split('-').map(Number);
  const premier = new Date(y, m - 1, d);
  const aujourdhui = iso(new Date());
  // On recule jusqu'au lundi pour aligner les semaines.
  const decalage = (premier.getDay() + 6) % 7;
  const cases: ({ jour: string; trouve: boolean; futur: boolean } | null)[] = Array.from({ length: decalage }, () => null);
  for (let i = 0; i < 84; i += 1) {
    const jour = new Date(premier.getFullYear(), premier.getMonth(), premier.getDate() + i);
    const cle = iso(jour);
    cases.push({ jour: cle, trouve: trouves.has(cle), futur: cle > aujourdhui });
  }
  const semaines: (typeof cases)[] = [];
  for (let i = 0; i < cases.length; i += 7) semaines.push(cases.slice(i, i + 7));
  const fmt = (cle: string) => {
    const [a, b, c] = cle.split('-').map(Number);
    return new Date(a, b - 1, c).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' });
  };
  return (
    <div>
      <div className="flex gap-[3px]" role="img" aria-label={t('{n} défis trouvés le jour même en 12 semaines', { n: jours.length })}>
        {semaines.map((s, i) => (
          <div key={i} className="flex flex-1 flex-col gap-[3px]">
            {Array.from({ length: 7 }, (_, j) => {
              const c = s[j];
              if (!c || c.futur) return <span key={j} className="aspect-square w-full rounded-[3px]" />;
              return (
                <span key={j} title={`${fmt(c.jour)}${c.trouve ? ` · ${t('trouvé')}` : ''}`}
                  className={`aspect-square w-full rounded-[3px] ${c.trouve ? 'bg-[#c0892f]' : 'bg-[#efece6]'} ${c.jour === aujourdhui ? 'ring-1 ring-ink/40' : ''}`} />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-faint">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-[#c0892f]" aria-hidden /> {t('Trouvé le jour même')}
      </p>
    </div>
  );
};

export default CalendrierDefi;
