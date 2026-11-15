/**
 * Feuille paginée (12/10/2026) : les blocs sont mesurés une fois, hors écran, puis répartis dans de
 * vraies pages A4. L'impression reprend ces pages telles quelles (@page sans marge, une feuille par page) :
 * ce qu'on voit est exactement ce qui sort de l'imprimante.
 *
 * `fit` : « Tenir sur une page ». On essaie les paliers de DENSITIES (texte, interligne, espacements,
 * marges), du plus aéré au plus serré, et on garde le premier où la partie « sujet » (avant un éventuel
 * corrigé sur page à part) tient sur une page. Si même le plus serré ne suffit pas, on garde le palier qui
 * donne le moins de pages.
 */
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MM, contentHeight, paginate, type MeasuredBlock } from './paginate';
import { DENSITIES, SHEET_CONTENT_CSS, SHEET_PAGES_CSS, densityVars, type Density } from './sheetStyles';

export interface SheetBlock {
  key: string;
  node: React.ReactNode;
  keepWithNext?: boolean;
  /** Nouvelle page avant ce bloc (corrigé). Ce qui suit ne compte pas pour « tenir sur une page ». */
  breakBefore?: boolean;
}

export interface SheetLayout {
  pages: number;
  /** Pages du sujet (avant le premier saut imposé). */
  subjectPages: number;
  density: Density;
  densityIndex: number;
}

interface Props {
  blocks: SheetBlock[];
  /** Change quand le contenu change (re-mesure). */
  version: string;
  /** Palier imposé, ou « auto » pour tenir sur une page. */
  density: number | 'fit';
  /** Pied de page, à gauche (le numéro « 1 / 2 » est à droite). */
  footer?: string;
  landscape?: boolean;
  onLayout?: (layout: SheetLayout) => void;
  className?: string;
  /** Seulement mesurer (palier et nombre de pages), sans dessiner les pages : l'écriture sur la feuille. */
  measureOnly?: boolean;
}

export const PagedSheet: React.FC<Props> = ({ blocks, version, density, footer, landscape, onLayout, className = '', measureOnly = false }) => {
  const measureRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ level: number; pageOf: number[]; pages: number; subjectPages: number } | null>(null);
  const [tick, setTick] = useState(0);
  const onLayoutRef = useRef(onLayout);
  onLayoutRef.current = onLayout;
  const W = landscape ? 297 : 210;
  const H = landscape ? 210 : 297;

  const subjectEnd = useMemo(() => {
    const i = blocks.findIndex((b) => b.breakBefore);
    return i < 0 ? blocks.length : i;
  }, [blocks]);

  /**
   * Réglages du palier posés sur la zone de mesure. Changer de palier fait recalculer TOUTE la zone (long pour
   * une série de 20 pages) ; rester au même palier ne recalcule que ce qui a changé. On évite donc d'en changer.
   */
  const boxLevel = useRef(-1);
  const applyLevel = useCallback((level: number) => {
    const box = measureRef.current;
    if (!box || boxLevel.current === level) return;
    const d = DENSITIES[level];
    box.style.width = `${(W - d.margins.left - d.margins.right) * MM}px`;
    Object.entries(densityVars(d) as Record<string, string>).forEach(([k, v]) => box.style.setProperty(k, v));
    boxLevel.current = level;
  }, [W]);
  useLayoutEffect(() => { boxLevel.current = -1; }, [W]);

  type Result = { level: number; pageOf: number[]; pages: number; subjectPages: number };
  /** Mesure et pagination au palier donné. */
  const layoutAt = useCallback((level: number): Result | null => {
    const box = measureRef.current;
    if (!box) return null;
    applyLevel(level);
    const d = DENSITIES[level];
    const heights = Array.from(box.children).map((el) => el.getBoundingClientRect().height);
    const measured: MeasuredBlock[] = blocks.map((b, i) => ({ height: heights[i] ?? 0, keepWithNext: b.keepWithNext, breakBefore: b.breakBefore }));
    const pageH = contentHeight({ width: W, height: H, ...d.margins }) - 2; // marge de sécurité (arrondis)
    const { pageOf, pages } = paginate(measured, pageH);
    const subjectPages = subjectEnd > 0 ? (pageOf[subjectEnd - 1] ?? 0) + 1 : 1;
    return { level, pageOf, pages, subjectPages };
  }, [blocks, applyLevel, W, H, subjectEnd]);

  const last = DENSITIES.length - 1;
  /** « Tenir sur une page » : le palier le plus aéré qui tient, sinon le plus serré. Plus serré = jamais plus long. */
  const fitLayout = useCallback((): Result | null => {
    // On part du palier où est déjà la zone de mesure (souvent le bon) : une seule mesure, sans tout recalculer.
    const start = boxLevel.current >= 0 ? boxLevel.current : 0;
    const r = layoutAt(start);
    if (!r) return null;
    const fits = (x: Result | null) => !!x && x.subjectPages <= 1;
    if (!fits(r)) {
      if (start === last) return r; // même le plus serré ne suffit pas
      const tight = layoutAt(last);
      if (!fits(tight)) return tight && tight.subjectPages < r.subjectPages ? tight : r;
      let lo = start + 1;
      let hi = last;
      let best = tight as Result;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const m = layoutAt(mid);
        if (fits(m)) { hi = mid; best = m as Result; } else lo = mid + 1;
      }
      return best;
    }
    // Ça tient : un palier plus aéré tiendrait-il aussi ?
    let best = r;
    let lo = 0;
    let hi = start - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const m = layoutAt(mid);
      if (fits(m)) { best = m as Result; hi = mid - 1; } else lo = mid + 1;
    }
    return best;
  }, [layoutAt, last]);

  const lastRun = useRef('');
  const runKey = `${version}|${density}|${landscape}|${tick}|${blocks.length}`;
  const runLayout = useCallback(() => {
    lastRun.current = runKey;
    const best = density === 'fit' ? fitLayout() : layoutAt(Math.max(0, Math.min(last, density)));
    if (!best) return;
    // Zone de mesure laissée au palier retenu : la prochaine mesure partira de là.
    applyLevel(best.level);
    const b = best;
    setState((prev) => (prev && prev.level === b.level && prev.pages === b.pages && prev.subjectPages === b.subjectPages
      && prev.pageOf.length === b.pageOf.length && prev.pageOf.every((p, i) => p === b.pageOf[i]) ? prev : b));
    onLayoutRef.current?.({ pages: b.pages, subjectPages: b.subjectPages, density: DENSITIES[b.level], densityIndex: b.level });
  }, [density, fitLayout, layoutAt, applyLevel, last, runKey]);
  const runRef = useRef(runLayout);
  runRef.current = runLayout;

  // Première mise en page, changement de palier, d'orientation ou de blocs : tout de suite.
  useLayoutEffect(() => { runRef.current(); }, [density, landscape, subjectEnd, blocks.length]);
  // Texte modifié (frappe dans « Personnaliser »), police ou image chargée : on attend que ça se calme,
  // pour ne pas remesurer une longue feuille à chaque lettre (rien à faire si c'est déjà mesuré).
  useLayoutEffect(() => {
    if (lastRun.current === runKey) return undefined;
    const t = window.setTimeout(() => { if (lastRun.current !== runKey) runRef.current(); }, 250);
    return () => window.clearTimeout(t);
  }, [runKey]);

  // Polices et images chargées plus tard : les hauteurs changent, on re-mesure.
  useLayoutEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) setTick((t) => t + 1); });
    const box = measureRef.current;
    const onLoad = () => setTick((t) => t + 1);
    box?.addEventListener('load', onLoad, true);
    return () => { alive = false; box?.removeEventListener('load', onLoad, true); };
  }, [version]);

  // Téléphone : les feuilles tiennent dans la largeur de l'écran (à l'impression, taille réelle).
  const pagesRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const el = pagesRef.current?.parentElement;
    if (!el) return;
    const fit = () => setZoom(Math.min(1, Math.max(0.3, (el.clientWidth - 8) / (W * MM))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);

  const d = DENSITIES[state?.level ?? (density === 'fit' ? 0 : density)] ?? DENSITIES[0];
  const pages: SheetBlock[][] = [];
  if (state) blocks.forEach((b, i) => { const p = state.pageOf[i] ?? 0; (pages[p] ||= []).push(b); });

  return (
    <>
      <style>{SHEET_CONTENT_CSS + SHEET_PAGES_CSS + `@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 0; }`}</style>
      {/* Zone de mesure : mêmes blocs, même largeur que la zone de texte, hors écran. */}
      <div ref={measureRef} className="fp-content fp-measure" aria-hidden>
        {blocks.map((b) => <div key={b.key} className="fp-blk">{b.node}</div>)}
      </div>
      {!measureOnly && <div ref={pagesRef} className={`fp-pages ${className}`} style={{ zoom }}>
        {(state ? pages : [blocks]).map((pageBlocks, p) => (
          <div key={p} className="fp-page" style={{ width: `${W}mm`, height: `${H}mm`, padding: `${d.margins.top}mm ${d.margins.right}mm ${d.margins.bottom}mm ${d.margins.left}mm` }}
            aria-label={`Page ${p + 1}`}>
            <div className="fp-content" style={densityVars(d)}>
              {(pageBlocks || []).map((b) => <div key={b.key} className="fp-blk">{b.node}</div>)}
            </div>
            <div className="fp-page-foot" style={{ left: `${d.margins.left}mm`, right: `${d.margins.right}mm`, bottom: `${Math.max(4, d.margins.bottom / 2 - 2)}mm` }}>
              <span>{footer ?? ''}</span>
              <span>{p + 1} / {state ? Math.max(1, pages.length) : 1}</span>
            </div>
          </div>
        ))}
      </div>}
    </>
  );
};

export default PagedSheet;
