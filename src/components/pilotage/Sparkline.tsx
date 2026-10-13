/**
 * Pilotage — petite courbe (ligne + aire légère) en SVG, sans bibliothèque (12/10/2026).
 * Largeur fluide (viewBox étiré, trait non déformé grâce à vector-effect), valeurs nulles = trous,
 * dernier point marqué, valeur du jour le plus proche au survol (souris, stylet ou doigt).
 * Les points sont des <span> HTML posés par-dessus : un cercle SVG serait étiré avec le viewBox.
 */
import React, { useId, useMemo, useRef, useState } from 'react';

export interface SparklineProps {
  values: (number | null)[];
  /** Jours ISO (AAAA-MM-JJ), même longueur que `values` : affichés au survol. */
  dates?: string[];
  color: string;
  height?: number;
  /** Valeur au survol : « 12 vues » plutôt que « 12 ». */
  format?: (v: number) => string;
  /** Nom de la série, pour les lecteurs d'écran. */
  label?: string;
}

const TOP = 4;
const BOTTOM = 2;
const fmtNum = (n: number) => n.toLocaleString('fr-FR');
const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export const Sparkline: React.FC<SparklineProps> = ({ values, dates, color, height = 36, format = fmtNum, label }) => {
  const gid = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const box = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = values.length;

  const geo = useMemo(() => {
    const known = values.filter((v): v is number => v !== null);
    const max = Math.max(0, ...known);
    const x = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
    const y = (v: number) => (max > 0 ? TOP + (1 - v / max) * (height - TOP - BOTTOM) : height - BOTTOM);
    // Suites de valeurs connues : une ligne et une aire par suite, un trou entre deux.
    const runs: number[][] = [];
    values.forEach((v, i) => {
      if (v === null) return;
      const last = runs[runs.length - 1];
      if (last && last[last.length - 1] === i - 1) last.push(i); else runs.push([i]);
    });
    const line = (run: number[]) => run.map((i, k) => `${k ? 'L' : 'M'}${x(i).toFixed(2)} ${y(values[i] as number).toFixed(2)}`).join(' ');
    const paths = runs.filter((r) => r.length > 1).map((run) => ({
      line: line(run),
      area: `${line(run)} L${x(run[run.length - 1]).toFixed(2)} ${height} L${x(run[0]).toFixed(2)} ${height} Z`,
    }));
    const lonely = runs.filter((r) => r.length === 1).map((r) => r[0]);
    let lastIdx = -1;
    for (let i = n - 1; i >= 0; i -= 1) if (values[i] !== null) { lastIdx = i; break; }
    return { known, max, x, y, paths, lonely, lastIdx };
  }, [values, n, height]);

  const pick = (clientX: number) => {
    const el = box.current;
    if (!el || n === 0) return;
    const r = el.getBoundingClientRect();
    const ratio = r.width ? Math.min(1, Math.max(0, (clientX - r.left) / r.width)) : 0;
    setHover(n <= 1 ? 0 : Math.round(ratio * (n - 1)));
  };

  const last = geo.lastIdx >= 0 ? (values[geo.lastIdx] as number) : null;
  const aria = label
    ? `${label} : ${n} jours${last !== null ? `, dernier jour ${format(last)}` : ''}${geo.known.length ? `, au plus ${format(geo.max)}` : ''}`
    : undefined;
  const dot = (i: number, size: number, ring = true): React.CSSProperties => ({
    left: `${geo.x(i)}%`, top: geo.y(values[i] as number), width: size, height: size,
    marginLeft: -size / 2, marginTop: -size / 2, background: color, boxShadow: ring ? '0 0 0 2px #fff' : undefined,
  });
  const hv = hover !== null ? values[hover] : null;

  return (
    <span ref={box} role={aria ? 'img' : undefined} aria-label={aria}
      className="relative block w-full touch-pan-y select-none" style={{ height }}
      onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}>
      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={color} stopOpacity={0.24} />
            <stop offset="1" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* Ligne de base discrète : une série vide ou nulle reste lisible. */}
        <line x1="0" x2="100" y1={height - 0.5} y2={height - 0.5} stroke="#efece6" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {geo.paths.map((p, i) => (
          <g key={i}>
            <path d={p.area} fill={`url(#${gid})`} stroke="none" />
            <path d={p.line} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>
      {geo.lonely.filter((i) => i !== geo.lastIdx).map((i) => (
        <span key={i} aria-hidden className="pointer-events-none absolute rounded-full" style={dot(i, 4, false)} />
      ))}
      {geo.lastIdx >= 0 && hover === null && (
        <span aria-hidden className="pointer-events-none absolute rounded-full" style={dot(geo.lastIdx, 6)} />
      )}
      {hover !== null && (
        <>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-ink/15" style={{ left: `${geo.x(hover)}%` }} />
          {hv !== null && <span aria-hidden className="pointer-events-none absolute rounded-full" style={dot(hover, 7)} />}
          {/* Bulle collée au point, sans sortir de la tuile : décalage proportionnel à la position. */}
          <span aria-hidden
            className="fd-nums pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-medium text-white shadow-sm"
            style={{ left: `${geo.x(hover)}%`, transform: `translateX(-${geo.x(hover)}%)` }}>
            {dates?.[hover] ? `${dayLabel(dates[hover])} · ` : ''}{hv === null ? 'pas mesuré' : format(hv)}
          </span>
        </>
      )}
    </span>
  );
};

export default Sparkline;
