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
}

interface Measure { heights: number[] }

export const PagedSheet: React.FC<Props> = ({ blocks, version, density, footer, landscape, onLayout, className = '' }) => {
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

  /** Mesure des blocs au palier donné (réglages posés directement sur la zone de mesure). */
  const measureAt = useCallback((d: Density): Measure | null => {
    const box = measureRef.current;
    if (!box) return null;
    box.style.width = `${(W - d.margins.left - d.margins.right) * MM}px`;
    const vars = densityVars(d) as Record<string, string>;
    Object.entries(vars).forEach(([k, v]) => box.style.setProperty(k, v));
    const els = Array.from(box.children) as HTMLElement[];
    return { heights: els.map((el) => el.getBoundingClientRect().height) };
  }, [W]);

  useLayoutEffect(() => {
    const levels = density === 'fit' ? DENSITIES.map((_, i) => i) : [Math.max(0, Math.min(DENSITIES.length - 1, density))];
    let best: { level: number; pageOf: number[]; pages: number; subjectPages: number } | null = null;
    for (const level of levels) {
      const d = DENSITIES[level];
      const m = measureAt(d);
      if (!m) return;
      const measured: MeasuredBlock[] = blocks.map((b, i) => ({ height: m.heights[i] ?? 0, keepWithNext: b.keepWithNext, breakBefore: b.breakBefore }));
      const pageH = contentHeight({ width: W, height: H, ...d.margins }) - 2; // marge de sécurité (arrondis)
      const { pageOf, pages } = paginate(measured, pageH);
      const subjectPages = subjectEnd > 0 ? (pageOf[subjectEnd - 1] ?? 0) + 1 : 1;
      const candidate = { level, pageOf, pages, subjectPages };
      if (!best || subjectPages < best.subjectPages) best = candidate;
      if (subjectPages <= 1) break;
    }
    if (best) {
      setState(best);
      onLayoutRef.current?.({ pages: best.pages, subjectPages: best.subjectPages, density: DENSITIES[best.level], densityIndex: best.level });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, density, landscape, tick, subjectEnd, blocks.length]);

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
      <div ref={pagesRef} className={`fp-pages ${className}`} style={{ zoom }}>
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
      </div>
    </>
  );
};

export default PagedSheet;
