// Étiquette « Nouveau » des cartes de contenu (demande de Natsu, 05/10/2026) : posée à cheval sur le bord
// haut de la carte. « Nouveau pour toi » : contenu ajouté depuis moins de NEW_DAYS jours ET pas encore
// ouvert dans ce navigateur (clé `fidni:vue:<id>` posée par la page du contenu).
import React from 'react';
import { t } from '@/i18n';

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
    className={`pointer-events-none absolute -top-3 start-4 z-20 inline-flex items-center rounded-md border border-gold-line bg-gold-soft px-2 py-0.5 text-[12px] font-medium text-gold-strong ring-[3px] ring-[#faf9f7] ${className}`}
    title={t('Ajouté il y a moins de {n} jours', { n: NEW_DAYS })}
  >
    {t('Nouveau')}
  </span>
);

export default NewBadge;
