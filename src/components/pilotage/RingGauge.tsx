/**
 * Pilotage — jauge en anneau (12/10/2026). Le contenu du centre est libre (pourcentage, « 34 / 120 »…).
 * Extrémités `butt` : index.css repeint en vert tout `circle[stroke-linecap="round"]` placé dans une .fd-card.
 */
import React from 'react';

interface RingGaugeProps {
  /** Part remplie, de 0 à 1 ; null = inconnu (anneau vide). */
  value: number | null;
  size?: number;
  thickness?: number;
  color?: string;
  track?: string;
  /** Texte lu par les lecteurs d'écran. */
  label: string;
  children?: React.ReactNode;
}

export const RingGauge: React.FC<RingGaugeProps> = ({
  value, size = 132, thickness = 12, color = '#1a7a4a', track = '#f2f1ee', label, children,
}) => {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const v = value === null || !Number.isFinite(value) ? 0 : Math.min(1, Math.max(0, value));
  const mid = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={mid} cy={mid} r={r} fill="none" stroke={track} strokeWidth={thickness} strokeLinecap="butt" />
        {v > 0 && (
          <circle cx={mid} cy={mid} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="butt"
            strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${mid} ${mid})`}
            style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.25,.46,.45,.94)' }} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
};

export default RingGauge;
