import React from 'react';
import type { ListSort } from '@/types/content';
import { useAuth } from '@/contexts/AuthContext';

interface SortDropdownProps {
  value: ListSort;
  onChange: (value: ListSort) => void;
  className?: string;
  /** « Du plus facile au plus difficile » : pas pour les leçons (sans difficulté). */
  easiest?: boolean;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({ value, onChange, className = '', easiest = true }) => {
  const { isAuthenticated } = useAuth();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ListSort)}
      aria-label="Trier"
      className={`h-10 pl-3 pr-8 text-sm bg-white border border-[#e7e3dc] rounded-xl text-[#1a1a1a] truncate focus:outline-none focus:border-[#1a7a4a] focus:ring-2 focus:ring-[#1a7a4a]/20 ${className}`}
    >
      {/* « Pour toi » : selon ce que l'élève a ouvert, réussi, raté, aimé (backend things/for_you.py).
          Pour un visiteur, rien n'est personnalisé : « Recommandés ». */}
      <option value="recommended">{isAuthenticated ? 'Pour toi' : 'Recommandés'}</option>
      {easiest && <option value="easiest">Du plus facile au plus difficile</option>}
      <option value="most_upvoted">Plus aimés</option>
      <option value="newest">Plus récents</option>
      <option value="oldest">Plus anciens</option>
      {/* « Plus commentés » retiré : le serveur ne sait pas trier ainsi et renvoyait les plus récents. */}
    </select>
  );
};
