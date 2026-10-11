// Étiquette « Nouveau » des cartes de contenu (demande de Natsu, 05/10/2026) : posée à cheval sur le bord
// haut de la carte (NewBadge) ; dans les cartes de liste refaites le 11/10/2026, un point d'or et un mot (NewTag). « Nouveau pour toi » : contenu ajouté depuis moins de NEW_DAYS jours ET pas encore
// ouvert dans ce navigateur (clé `fidni:vue:<id>` posée par la page du contenu).
import React from 'react';
import { Sparkles } from 'lucide-react';

export const NEW_DAYS = 7;

export function isNewContent(content: { id: string | number; created_at?: string | null }): boolean {
  if (!content.created_at) return false;
  const age = Date.now() - new Date(content.created_at).getTime();
  if (!(age >= 0 && age < NEW_DAYS * 86400000)) return false;
  try {
    if (localStorage.getItem(`fidni:vue:${content.id}`)) return false;
  } catch {
    /* stockage indisponible : on garde l'étiquette */
  }
  return true;
}

export const NewBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`pointer-events-none absolute -top-3 left-4 z-20 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-[3px] text-[10.5px] font-bold uppercase tracking-[.08em] text-white shadow-[0_6px_14px_-4px_rgba(154,110,28,.55)] ring-[3px] ring-[#faf9f7] ${className}`}
    title={`Ajouté il y a moins de ${NEW_DAYS} jours`}
  >
    <Sparkles className="h-3 w-3" aria-hidden />
    Nouveau
  </span>
);

/** « • Nouveau » dans une ligne de la carte : plus calme que l'étiquette à cheval sur le bord. */
export const NewTag: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-gold-strong ${className}`}
    title={`Ajouté il y a moins de ${NEW_DAYS} jours`}>
    <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
    Nouveau
  </span>
);

export default NewBadge;
