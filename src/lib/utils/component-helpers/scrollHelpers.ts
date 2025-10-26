/**
 * Scroll-related utility functions
 */

export function setupScrollEffects(options: {
  onSticky?: (isSticky: boolean) => void;
  onToolbarVisibility?: (show: boolean) => void;
  stickyThreshold?: number;
  toolbarThreshold?: number;
}) {
  const {
    onSticky,
    onToolbarVisibility,
    stickyThreshold = 300,
    toolbarThreshold = 600
  } = options;

  const handleScroll = () => {
    const scrollPosition = window.scrollY;

    if (onSticky) {
      onSticky(scrollPosition > stickyThreshold);
    }

    if (onToolbarVisibility) {
      if (scrollPosition > toolbarThreshold) {
        onToolbarVisibility(false);
      } else if (scrollPosition < stickyThreshold) {
        onToolbarVisibility(true);
      }
    }
  };

  window.addEventListener('scroll', handleScroll);

  return () => window.removeEventListener('scroll', handleScroll);
}

export function scrollToElement(elementId: string, behavior: ScrollBehavior = 'smooth') {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior });
  }
}

export function scrollToTop(behavior: ScrollBehavior = 'smooth') {
  window.scrollTo({ top: 0, behavior });
}
