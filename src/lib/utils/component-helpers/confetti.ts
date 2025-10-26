/**
 * Utility for showing confetti animations
 */

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

export function triggerConfetti(
  setShowConfetti: (show: boolean) => void,
  duration: number = 3000
) {
  setShowConfetti(true);
  setTimeout(() => setShowConfetti(false), duration);
}
