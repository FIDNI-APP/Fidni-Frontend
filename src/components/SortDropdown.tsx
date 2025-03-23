import React from 'react';
import { SortOption } from '../types';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({ value, onChange }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="newest">Newest First</option>
      <option value="oldest">Oldest First</option>
      <option value="most_upvoted">Most Upvoted</option>
      <option value="most_commented">Most Discussed</option>
    </select>
  );
};