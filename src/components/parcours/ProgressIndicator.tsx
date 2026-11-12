/** Parcours : barre d'avancement (or) et « 3 chapitres terminés sur 7 ». */
import React from 'react';
import { t } from '@/i18n';

export const ProgressIndicator: React.FC<{ done: number; total: number; percent: number; className?: string }> = ({
  done, total, percent, className = '',
}) => (
  <div className={className}>
    <div className="flex items-baseline justify-between gap-3 text-[13px] fd-nums">
      <span className="text-ink-soft">
        {total === 0 ? t('Aucun chapitre pour l’instant')
          : done > 1 ? t('{n} chapitres terminés sur {total}', { n: done, total })
            : t('{n} chapitre terminé sur {total}', { n: done, total })}
      </span>
      <span className="font-semibold text-ink">{percent} %</span>
    </div>
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#efece6]" role="progressbar" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={percent} aria-label={t('Progression du parcours')}>
      <div className="fd-parcours-barre h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
    </div>
  </div>
);

export default ProgressIndicator;
