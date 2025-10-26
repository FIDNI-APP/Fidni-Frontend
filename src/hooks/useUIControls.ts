import { useState, useEffect } from 'react';
import { setupScrollEffects } from '@/lib/utils/component-helpers/scrollHelpers';

interface UseUIControlsOptions {
  enableScrollEffects?: boolean;
  stickyThreshold?: number;
  toolbarThreshold?: number;
}

export function useUIControls(options: UseUIControlsOptions = {}) {
  const {
    enableScrollEffects = true,
    stickyThreshold = 300,
    toolbarThreshold = 600
  } = options;

  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    if (!enableScrollEffects) return;

    const cleanup = setupScrollEffects({
      onSticky: setIsSticky,
      onToolbarVisibility: (show) => {
        // Don't auto-hide if already scrolling or if showToolbar is manually controlled
        if (show || window.scrollY < stickyThreshold) {
          setShowToolbar(show);
        }
      },
      stickyThreshold,
      toolbarThreshold
    });

    return cleanup;
  }, [enableScrollEffects, stickyThreshold, toolbarThreshold]);

  const toggleFullscreen = () => setFullscreenMode(prev => !prev);
  const toggleToolbar = () => setShowToolbar(prev => !prev);

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => {
      window.print();
      setShowPrint(false);
    }, 300);
  };

  return {
    fullscreenMode,
    showToolbar,
    isSticky,
    showPrint,
    toggleFullscreen,
    toggleToolbar,
    handlePrint,
    setShowPrint,
    setFullscreenMode,
    setShowToolbar,
    setIsSticky
  };
}
