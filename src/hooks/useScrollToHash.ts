import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Lien avec une ancre (« …#commentaires », venu d'une notification) : une fois la page chargée
 * (`ready`), on fait défiler jusqu'à l'élément visé. React Router ne le fait pas tout seul.
 */
export function useScrollToHash(ready: boolean) {
  const { hash } = useLocation();
  const done = useRef<string | null>(null);
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (!ready || !id || done.current === id) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      done.current = id;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(t);
  }, [hash, ready]);
}
