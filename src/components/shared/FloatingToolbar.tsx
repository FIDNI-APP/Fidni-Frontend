/**
 * Generic Floating Toolbar Component
 * Consolidated from exam/FloatingToolbar and exercise/FloatingToolbar (100% identical)
 *
 * This component provides floating action buttons for timer, fullscreen, and save actions.
 */

import React from 'react';
import { Pause, Play, Minimize2, Maximize2, Bookmark, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingToolbarProps {
  showToolbar: boolean;
  toggleToolbar: () => void;
  timerActive: boolean;
  toggleTimer: () => void;
  timer: number;
  fullscreenMode: boolean;
  toggleFullscreen: () => void;
  savedForLater: boolean;
  toggleSavedForLater: () => Promise<void>;
  formatTime: (seconds: number) => string;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  showToolbar,
  toggleToolbar,
  timerActive,
  toggleTimer,
  timer,
  fullscreenMode,
  toggleFullscreen,
  savedForLater,
  toggleSavedForLater,
  formatTime
}) => {
  return (
    <div className={`fixed right-6 z-50 bg-white rounded-full shadow-lg transition-all duration-300 ${showToolbar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'} bottom-20 lg:bottom-6`}>
      {/* Push up on mobile to avoid the mobile sidebar */}
      <div className="flex items-center p-2">
        <Button
          onClick={toggleTimer}
          variant="ghost"
          className="rounded-full p-2.5 hover:bg-indigo-50"
          title={timerActive ? "Pause" : "Start timer"}
        >
          {timerActive ? <Pause className="w-4 h-4 text-red-500" /> : <Play className="w-4 h-4 text-indigo-600" />}
        </Button>

        <div className="px-3 font-mono text-sm font-medium text-indigo-900">
          {formatTime(timer)}
        </div>

        <div className="h-8 w-px bg-gray-200 mx-0.5"></div>

        <Button
          onClick={toggleFullscreen}
          variant="ghost"
          className={`rounded-full p-2.5 ${fullscreenMode ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-indigo-50 text-gray-600'}`}
          title={fullscreenMode ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {fullscreenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>

        <Button
          onClick={toggleSavedForLater}
          variant="ghost"
          className={`rounded-full p-2.5 ${savedForLater ? 'bg-amber-100 text-amber-600' : 'hover:bg-indigo-50 text-gray-600'}`}
          title={savedForLater ? "Saved" : "Save for later"}
        >
          <Bookmark className={`w-4 h-4 ${savedForLater ? 'fill-amber-500' : ''}`} />
        </Button>

        <div className="h-8 w-px bg-gray-200 mx-0.5"></div>

        <Button
          onClick={toggleToolbar}
          variant="ghost"
          className="rounded-full p-2.5 hover:bg-indigo-50 text-gray-600"
          title="Hide toolbar"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
