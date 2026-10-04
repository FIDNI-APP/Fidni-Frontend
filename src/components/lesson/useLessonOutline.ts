/**
 * Sommaire d'une leçon, construit à partir de ce qui est affiché : parties et sous-parties marquées
 * par LessonRenderer (data-outline-*), ou, pour une leçon en texte libre (cahier), ses titres h1–h3.
 *
 * Donne la liste des parties, celle en cours de lecture (suivie au défilement), la progression de
 * lecture, une durée de lecture estimée et une fonction pour aller à une partie.
 * Fonctionne quand la page défile (page leçon : scrollRoot = null) comme quand un cadre défile
 * (cahier : scrollRoot = ce cadre).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface OutlineItem {
  id: string;
  level: 1 | 2;
  num: string;
  title: string;
}

interface Options {
  containerRef: React.RefObject<HTMLElement>;
  /** Élément qui défile ; null = la fenêtre. */
  scrollRoot?: HTMLElement | null;
  /** Hauteur cachée en haut (barre du site collante) : une partie est « en cours » sous cette ligne. */
  topOffset?: number;
  /** Préfixe des ancres (#partie-2-1). */
  idPrefix?: string;
  /** Reconstruire quand le contenu change (autre leçon…). */
  deps?: unknown[];
}

const WORDS_PER_MINUTE = 150; // texte mathématique : lecture lente

export function useLessonOutline({ containerRef, scrollRoot = null, topOffset = 96, idPrefix = 'partie', deps = [] }: Options) {
  const [items, setItems] = useState<OutlineItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const elements = useRef<Map<string, HTMLElement>>(new Map());

  // Lecture des titres (et à nouveau quand le contenu se complète : formules, chargement différé…).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timer = 0;
    const scan = () => {
      let nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-outline-level]'));
      const marked = nodes.length > 0;
      if (!marked) nodes = Array.from(container.querySelectorAll<HTMLElement>('h1, h2, h3'));
      const map = new Map<string, HTMLElement>();
      const counters = [0, 0];
      const next: OutlineItem[] = nodes.map((el) => {
        const level: 1 | 2 = marked ? (el.dataset.outlineLevel === '2' ? 2 : 1) : (el.tagName === 'H3' ? 2 : 1);
        if (level === 1) { counters[0] += 1; counters[1] = 0; } else { counters[1] += 1; }
        const num = el.dataset.outlineNum || (level === 1 ? `${counters[0]}` : `${counters[0]}.${counters[1]}`);
        const title = (el.dataset.outlineTitle || el.textContent || '').trim();
        const id = `${idPrefix}-${num.replace(/\./g, '-')}`;
        el.id = id;
        el.style.scrollMarginTop = `${topOffset}px`;
        map.set(id, el);
        return { id, level, num, title };
      }).filter((it) => it.title);
      elements.current = map;
      setItems((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      const words = (container.innerText || '').split(/\s+/).filter(Boolean).length;
      setMinutes(words ? Math.max(1, Math.round(words / WORDS_PER_MINUTE)) : 0);
    };
    scan();
    const observer = new MutationObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(scan, 200); });
    observer.observe(container, { childList: true, subtree: true });
    return () => { observer.disconnect(); window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, idPrefix, topOffset, ...deps]);

  // Partie en cours et progression, au défilement.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;
    const target: HTMLElement | Window = scrollRoot ?? window;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rootTop = scrollRoot ? scrollRoot.getBoundingClientRect().top : 0;
      const viewBottom = scrollRoot ? scrollRoot.getBoundingClientRect().bottom : window.innerHeight;
      const line = rootTop + topOffset + 8;
      let current: string | null = items[0]?.id ?? null;
      for (const it of items) {
        const el = elements.current.get(it.id);
        if (el && el.getBoundingClientRect().top <= line) current = it.id;
      }
      // Tout en bas : la dernière partie, même courte, devient la partie en cours.
      const rect = container.getBoundingClientRect();
      if (rect.bottom <= viewBottom + 4) current = items[items.length - 1].id;
      setActiveId(current);
      const read = rect.height > 0 ? (viewBottom - rect.top) / rect.height : 0;
      setProgress(Math.min(1, Math.max(0, read)));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [containerRef, scrollRoot, items, topOffset]);

  const scrollTo = useCallback((id: string, behavior: ScrollBehavior = 'smooth') => {
    const el = elements.current.get(id);
    if (!el) return;
    if (scrollRoot) {
      const top = el.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top + scrollRoot.scrollTop - topOffset;
      scrollRoot.scrollTo({ top, behavior });
    } else {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - topOffset, behavior });
    }
    setActiveId(id);
  }, [scrollRoot, topOffset]);

  const scrollToTop = useCallback(() => {
    if (scrollRoot) scrollRoot.scrollTo({ top: 0, behavior: 'smooth' });
    else {
      const top = (containerRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - topOffset - 24;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }, [scrollRoot, topOffset, containerRef]);

  return { items, activeId, progress, minutes, scrollTo, scrollToTop };
}
