/**
 * Solution repliée : présente dans la page mais invisible (`hidden`) tant que l'élève ne l'ouvre pas.
 * Le corrigé fait la valeur d'un « exercice corrigé » : sans lui, les moteurs de recherche (et l'examen
 * AdSense) ne voyaient que l'énoncé. Texte filtré (sanitizeHtml), formules laissées en LaTeX (rien à
 * calculer), images différées (`loading="lazy"` : pas chargées tant que la solution est fermée).
 */
import React, { useMemo } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

export const FoldedSolution: React.FC<{ html?: string }> = ({ html }) => {
  const safe = useMemo(() => sanitizeHtml(html || '').replace(/<img\b/g, '<img loading="lazy"'), [html]);
  if (!safe) return null;
  return <div hidden data-solution-repliee="" dangerouslySetInnerHTML={{ __html: safe }} />;
};

export default FoldedSolution;
