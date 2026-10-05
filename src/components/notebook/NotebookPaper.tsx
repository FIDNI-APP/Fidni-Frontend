/**
 * La « feuille de cahier » : papier blanc, ligne de marge, trous de reliure.
 * Partagée par le cahier (NotebookContent) et la page d'une leçon, pour qu'une leçon se lise
 * partout de la même façon, calme et aérée.
 */
import React, { useEffect, useRef, useState } from 'react';

export interface NotebookTheme {
  bgColor: string;
  lineColor: string;
  marginLineColor: string;
  isGrid: boolean;
  lineSpacing: number;
  marginLeft: number;
}

/** Thème du cahier de cours (repris par la page leçon). */
export const NOTEBOOK_THEME: NotebookTheme = {
  bgColor: '#ffffff',
  lineColor: '#eceae5',
  marginLineColor: '#e2c4c4',
  isGrid: false,
  lineSpacing: 1.5,
  marginLeft: 3,
};

const TEXTURE = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='53' cy='53' r='1'/%3E%3Ccircle cx='23' cy='45' r='1'/%3E%3Ccircle cx='37' cy='15' r='1'/%3E%3C/g%3E%3C/svg%3E")`;

interface NotebookPaperProps {
  theme?: NotebookTheme;
  className?: string;
  children: React.ReactNode;
}

export const NotebookPaper: React.FC<NotebookPaperProps> = ({ theme = NOTEBOOK_THEME, className = '', children }) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const [holeCount, setHoleCount] = useState(20);

  // Autant de trous que la feuille est haute (un trou + son espace = 40 px).
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    const update = () => setHoleCount(Math.ceil(paper.scrollHeight / 40) + 2);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(paper);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={paperRef}
      className={`relative ${className}`}
      style={{
        backgroundColor: theme.bgColor,
        backgroundImage: `linear-gradient(90deg, ${theme.marginLineColor} 1px, transparent 1px)`,
        backgroundSize: '100% 100%',
        backgroundPosition: `${theme.marginLeft}rem 0`,
      }}
    >
      {/* Grain du papier */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: TEXTURE }} />

      {/* Trous de reliure */}
      <div className="absolute left-3 top-0 bottom-0 overflow-hidden flex flex-col justify-start pt-6 gap-8 pointer-events-none" aria-hidden>
        {Array.from({ length: holeCount }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-white border border-gray-300 rounded-full flex-shrink-0"
            style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}
          />
        ))}
      </div>

      {children}
    </div>
  );
};

/** Marges du texte sur la feuille : à droite de la ligne de marge, interligne du cahier. */
export const paperTextStyle = (theme: NotebookTheme = NOTEBOOK_THEME): React.CSSProperties => ({
  marginLeft: `${theme.marginLeft + 0.5}rem`,
  paddingLeft: '1rem',
  lineHeight: `${theme.lineSpacing}rem`,
});
