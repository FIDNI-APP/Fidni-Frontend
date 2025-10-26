/**
 * Custom Hook: useContentUI
 *
 * Manages UI state for content detail pages
 * Extracts complex UI logic (fullscreen, sticky headers, toolbars, etc.)
 */

import { useState, useEffect } from 'react';

export interface UseContentUIProps {
  contentType: 'exercise' | 'exam' | 'lesson';
}

/**
 * Manages all UI state for content pages
 */
export function useContentUI({ contentType }: UseContentUIProps) {
  // UI State
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(contentType);
  const [difficultyRating, setDifficultyRating] = useState<number | null>(null);

  // Scroll handling for sticky header
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Show/hide toolbar based on scroll direction
          if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setShowToolbar(false);
          } else {
            setShowToolbar(true);
          }

          // Sticky header at top
          setIsSticky(currentScrollY > 400);

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fullscreen mode
  const toggleFullscreen = () => {
    setFullscreenMode(prev => !prev);
  };

  // Print mode
  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setShowPrint(false), 300);
    }, 100);
  };

  // Rate difficulty
  const rateDifficulty = (rating: number) => {
    setDifficultyRating(rating);
    // TODO: Send to API if needed
  };

  return {
    // State
    fullscreenMode,
    showToolbar,
    isSticky,
    showPrint,
    activeSection,
    difficultyRating,

    // Actions
    toggleFullscreen,
    setShowToolbar,
    handlePrint,
    setActiveSection,
    rateDifficulty,
  };
}
