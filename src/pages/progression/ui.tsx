// Briques communes de « Ma progression » (les en-têtes, sections et états vides viennent de components/space/Page).
import type { ChapterStatus } from './types';
import { STATUS } from './status';

/**
 * Jauge fine (piste un cran plus clair que le remplissage). Un `span` affiché en bloc : elle peut se
 * placer dans un lien ou un bouton (plan de DS, lignes du programme).
 */
export function Meter({ pct, status, className = '' }: { pct: number; status: ChapterStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={`block h-1.5 overflow-hidden rounded-full ${s.track} ${className}`} role="img" aria-label={`${pct} %`}>
      <span className={`block h-full rounded-full ${s.fill}`} style={{ width: `${Math.max(pct, 3)}%` }} />
    </span>
  );
}
