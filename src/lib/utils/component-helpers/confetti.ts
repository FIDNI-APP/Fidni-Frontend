/**
 * Utility for showing completion animations
 */

export type AnimationType = 'success' | 'failure';

export interface AnimationState {
  show: boolean;
  type: AnimationType;
}

export interface AnimationController {
  show: (type: AnimationType) => void;
  hide: () => void;
}

export function useAnimationTrigger(
  setShowAnimation: (state: AnimationState) => void,
  duration: number = 2000
): AnimationController {
  const show = (type: AnimationType) => {
    setShowAnimation({ show: true, type });
    setTimeout(() => setShowAnimation({ show: false, type }), duration);
  };

  const hide = () => {
    setShowAnimation({ show: false, type: 'success' });
  };

  return { show, hide };
}

export function triggerAnimation(
  setShowAnimation: (state: AnimationState) => void,
  type: AnimationType,
  duration: number = 800
) {
  setShowAnimation({ show: true, type });
  setTimeout(() => setShowAnimation({ show: false, type }), duration);
}

// Legacy confetti function - maps to success animation
export function triggerConfetti(
  setShowAnimation: (state: AnimationState | boolean) => void,
  duration: number = 2000
) {
  if (typeof setShowAnimation === 'function') {
    // Check if it's the new format or old format
    const testState = { show: true, type: 'success' as AnimationType };
    try {
      setShowAnimation(testState);
      setTimeout(() => setShowAnimation({ show: false, type: 'success' as AnimationType }), duration);
    } catch {
      // Fallback for old boolean format
      (setShowAnimation as any)(true);
      setTimeout(() => (setShowAnimation as any)(false), duration);
    }
  }
}

// Legacy exports for backward compatibility
export interface ConfettiController {
  show: () => void;
  hide: () => void;
}

export function useConfettiTrigger(
  setShowConfetti: (show: boolean) => void,
  duration: number = 3000
): ConfettiController {
  const show = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), duration);
  };

  const hide = () => {
    setShowConfetti(false);
  };

  return { show, hide };
}
