/**
 * Parcours : la carte des chapitres. Un chemin légèrement sinueux (SVG, courbes de Bézier) relie les checkpoints ;
 * la part parcourue (jusqu'au chapitre en cours) est en or et se trace à l'ouverture, le reste en gris neutre.
 * Mise en page calculée sur la largeur réelle (ResizeObserver) : vague centrée sur ordinateur, libellés du côté libre ;
 * sur téléphone (< 520 px), zigzag serré à gauche et libellés tous à droite — jamais de chevauchement.
 * Fond « cahier quadrillé » discret, l'univers de Fidni.
 */
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Id } from '@/lib/api/parcoursApi';
import { ChapterCheckpoint } from './ChapterCheckpoint';
import { type ChapterStep, sameId } from './progression';

const GRID: React.CSSProperties = {
  backgroundImage: 'linear-gradient(rgba(26,26,26,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,26,.04) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
};

export const ChapterMap: React.FC<{
  steps: ChapterStep[];
  selectedId: Id | null;
  justDone: ReadonlySet<string>;
  onSelect: (id: Id) => void;
}> = ({ steps, selectedId, justDone, onSelect }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    if (!width) return null;
    const compact = width < 520;
    const row = compact ? 156 : 148;
    const size = compact ? 44 : 52;
    const top = size / 2 + 28;
    const pts = steps.map((_, i) => {
      if (compact) {
        const x = i % 2 === 0 ? Math.round(width * 0.14) + 8 : Math.round(width * 0.14) + 8 + Math.round(Math.min(width * 0.2, 80));
        return { x, y: top + i * row, side: 'right' as const };
      }
      const amp = Math.min(width * 0.24, 190);
      const x = Math.round(width / 2 + amp * Math.sin((i * Math.PI) / 2));
      // Centre : côté gauche pour le premier quart de vague, droit pour le troisième ; sinon le côté libre.
      const side: 'left' | 'right' = x > width / 2 + 1 ? 'left' : x < width / 2 - 1 ? 'right' : i % 4 === 0 ? 'left' : 'right';
      return { x, y: top + i * row, side };
    });
    const labelWidth = (p: { x: number; side: 'left' | 'right' }) =>
      Math.max(0, Math.min(compact ? 260 : 250, p.side === 'right' ? width - p.x - size / 2 - 20 : p.x - size / 2 - 20));
    const curve = (upto: number) => pts.slice(0, upto + 1).map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const q = pts[i - 1];
      return `C ${q.x} ${q.y + row * 0.55} ${p.x} ${p.y - row * 0.55} ${p.x} ${p.y}`;
    }).join(' ');
    return { compact, row, size, pts, labelWidth, curve, height: top * 2 + (steps.length - 1) * row };
  }, [width, steps]);

  // Jusqu'où l'élève est arrivé : le chapitre en cours, sinon le dernier terminé.
  const reach = useMemo(() => {
    const cur = steps.findIndex((s) => s.state === 'current');
    if (cur >= 0) return cur;
    let last = -1;
    steps.forEach((s, i) => { if (s.state === 'completed') last = i; });
    return last;
  }, [steps]);

  return (
    // Disposition calculée en coordonnées physiques : la carte reste de gauche à droite, même en arabe.
    <div ref={ref} dir="ltr" className="relative w-full" style={{ ...GRID, minHeight: layout?.height ?? steps.length * 110 }}>
      {layout && (
        <>
          <svg className="pointer-events-none absolute inset-0" width={width} height={layout.height} aria-hidden>
            <path d={layout.curve(steps.length - 1)} fill="none" stroke="#dcd7cd" strokeWidth={3} strokeLinecap="round" />
            {reach > 0 && (
              <path key={reach} d={layout.curve(reach)} fill="none" stroke="rgb(var(--c-gold))" strokeWidth={3.5} strokeLinecap="round"
                pathLength={1} strokeDasharray="1 1" className="fd-parcours-trace" />
            )}
          </svg>
          <ol className="contents">
            {steps.map((s, i) => (
              <li key={String(s.chapter.id)} className="contents">
                <ChapterCheckpoint step={s} x={layout.pts[i].x} y={layout.pts[i].y} size={layout.size} side={layout.pts[i].side}
                  labelWidth={layout.labelWidth(layout.pts[i])} selected={sameId(selectedId, s.chapter.id)}
                  justDone={justDone.has(`c${String(s.chapter.id)}`)} onSelect={() => onSelect(s.chapter.id)} />
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
};

export default ChapterMap;
