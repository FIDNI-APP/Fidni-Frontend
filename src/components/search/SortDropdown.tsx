import React from 'react';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import type { ListSort } from '@/types/content';
import { useAuth } from '@/contexts/AuthContext';

interface SortDropdownProps {
  value: ListSort;
  onChange: (value: ListSort) => void;
  className?: string;
  /** « Du plus facile au plus difficile » : pas pour les leçons (sans difficulté). */
  easiest?: boolean;
}

/** Tri des listes : un vrai menu du navigateur (lisible au doigt), habillé comme les autres boutons de la barre. */
export const SortDropdown: React.FC<SortDropdownProps> = ({ value, onChange, className = '', easiest = true }) => {
  const { isAuthenticated } = useAuth();
  return (
    <span className={`relative inline-flex ${className}`}>
      <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ListSort)}
        aria-label="Trier"
        title="Trier"
        className="h-10 w-full min-w-0 cursor-pointer appearance-none truncate rounded-xl border border-line bg-white pl-9 pr-9 text-[13.5px] font-semibold text-ink-soft transition-colors hover:border-[#cfc9bf] hover:text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
    </span>
  );
};
