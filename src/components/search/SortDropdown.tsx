import React from 'react';
import type { SortOption } from '@/types';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({ value, onChange }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      aria-label="Trier"
      className="pl-3 pr-8 py-2 text-sm bg-white border border-[#e7e3dc] rounded-xl text-[#1a1a1a] focus:outline-none focus:border-[#1a7a4a] focus:ring-2 focus:ring-[#1a7a4a]/20"
    >
      <option value="most_upvoted">Plus aimés</option>
      <option value="newest">Plus récents</option>
      <option value="oldest">Plus anciens</option>
      {/* « Plus commentés » retiré : le serveur ne sait pas trier ainsi et renvoyait les plus récents. */}
    </select>
  );
};