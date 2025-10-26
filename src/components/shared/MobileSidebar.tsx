/**
 * Generic Mobile Sidebar Component
 * Consolidated from exam/MobileSidebar and exercise/MobileSidebar (100% identical)
 *
 * This component provides a collapsible mobile sidebar that shows timer controls
 * and can expand to show full sidebar content.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileSidebarProps {
  timer: number;
  timerActive: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  difficultyRating: number | null;
  rateDifficulty: (rating: number) => void;
  formatTime: (seconds: number) => string;
  viewCount: number;
  voteCount: number;
  commentsCount: number;
  // Render prop for sidebar content
  sidebarContent: React.ReactNode;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  timer,
  timerActive,
  toggleTimer,
  resetTimer,
  formatTime,
  sidebarContent,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
      {/* Collapsed view - just show timer */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white p-2 rounded-lg">
            <Timer className="w-5 h-5" />
          </div>
          <div className="font-mono text-lg font-medium">{formatTime(timer)}</div>

          <div className="flex space-x-2">
            <Button
              onClick={toggleTimer}
              className={`h-9 px-3 ${
                timerActive
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
              }`}
              size="sm"
            >
              {timerActive ? 'Pause' : 'Start'}
            </Button>

            <Button
              onClick={resetTimer}
              variant="outline"
              className="h-9 px-3 border-gray-300"
              size="sm"
            >
              Reset
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-full p-1"
        >
          {isExpanded ?
            <ChevronDown className="w-5 h-5 text-gray-500" /> :
            <ChevronUp className="w-5 h-5 text-gray-500" />
          }
        </Button>
      </div>

      {/* Expandable full sidebar */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 max-h-[70vh] overflow-y-auto">
          {sidebarContent}
        </div>
      )}
    </div>
  );
};
