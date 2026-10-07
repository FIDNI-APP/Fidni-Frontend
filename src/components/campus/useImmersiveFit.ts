import { RefObject, useLayoutEffect } from 'react';
import { useHomeView } from '@/stores/homeViewStore';

/**
 * Tant que le campus est affiché : il occupe exactement l'espace visible sous la barre du haut
 * (le cartable reste toujours à l'écran) et l'AppShell masque le pied de page.
 */
export function useImmersiveFit(rootRef: RefObject<HTMLElement | null>, active: boolean) {
  const setImmersive = useHomeView((s) => s.setImmersive);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!active || !root) return;
    window.scrollTo(0, 0);
    const fit = () => {
      const top = root.getBoundingClientRect().top + window.scrollY;
      root.style.height = `${Math.max(420, window.innerHeight - top)}px`;
    };
    fit();
    setImmersive(true);
    window.addEventListener('resize', fit);
    return () => { window.removeEventListener('resize', fit); setImmersive(false); };
  }, [rootRef, active, setImmersive]);
}
