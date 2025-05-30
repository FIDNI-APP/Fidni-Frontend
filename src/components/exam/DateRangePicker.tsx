import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DateRangePickerProps {
  onChange: (range: { start: string | null, end: string | null } | null) => void;
  value: { start: string | null, end: string | null } | null;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ onChange, value }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(value?.start || null);
  const [endDate, setEndDate] = useState<string | null>(value?.end || null);
  const ref = useRef<HTMLDivElement>(null);

  // Format display date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  // Get display text
  const getDisplayText = (): string => {
    if (!startDate && !endDate) return 'Sélectionner une période';
    
    if (startDate && !endDate) return `À partir du ${formatDate(startDate)}`;
    if (!startDate && endDate) return `Jusqu'au ${formatDate(endDate)}`;
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Apply date range filter
  const applyFilter = () => {
    onChange({ start: startDate, end: endDate });
    setIsOpen(false);
  };

  // Clear date range filter
  const clearFilter = () => {
    setStartDate(null);
    setEndDate(null);
    onChange(null);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update internal state when props change
  useEffect(() => {
    setStartDate(value?.start || null);
    setEndDate(value?.end || null);
  }, [value]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
          value ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span className="max-w-[180px] truncate">{getDisplayText()}</span>
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearFilter();
            }}
            className="p-0.5 rounded-full hover:bg-white/20"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 w-[300px]">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => setStartDate(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => setEndDate(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex justify-between">
            <Button
              onClick={clearFilter}
              variant="outline"
              size="sm"
              className="text-gray-700"
            >
              Effacer
            </Button>
            
            <Button
              onClick={applyFilter}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Appliquer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};