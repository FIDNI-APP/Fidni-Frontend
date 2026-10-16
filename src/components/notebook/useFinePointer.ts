// Souris (survol + pointeur précis) : seul cas où l'on propose d'annoter une leçon (cahier et page de la leçon) ;
// les outils ne sont pas faits pour le doigt.
import { useEffect, useState } from 'react';

const QUERY = '(hover: hover) and (pointer: fine)';

export function useFinePointer(): boolean {
  const [fine, setFine] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return;
    const on = () => setFine(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return fine;
}
