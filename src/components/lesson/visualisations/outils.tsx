/**
 * Outils communs des visualisations de notions (leçons, 27/11/2026) : repère sur papier quadrillé, points qu'on attrape
 * à la souris ou au doigt, courbe lisse qui passe par des points (spline cubique naturelle), recherche des zéros.
 * Palette Fidni : encre, vert (la courbe, ce qui est juste), or (ce qu'on cherche : c, k, la sécante).
 */
import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import katex from 'katex';
import { trackAction } from '@/lib/usage';

export const ENCRE = '#1a1a1a';
export const VERT = '#1a7a4a';
export const OR = '#c0892f';
export const GRIS = '#9a958c';
export const GRILLE = '#ece8e0';
export const ROUGE = '#a23b34';

export const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 }) : '—');

export interface Vue { x0: number; x1: number; y0: number; y1: number }

/** Coordonnées : repère → pixels et retour. */
export function echelle(vue: Vue, w: number, h: number) {
  const X = (x: number) => ((x - vue.x0) / (vue.x1 - vue.x0)) * w;
  const Y = (y: number) => h - ((y - vue.y0) / (vue.y1 - vue.y0)) * h;
  const xDe = (px: number) => vue.x0 + (px / w) * (vue.x1 - vue.x0);
  const yDe = (py: number) => vue.y0 + ((h - py) / h) * (vue.y1 - vue.y0);
  return { X, Y, xDe, yDe };
}

/**
 * Largeur disponible pour le dessin. Ref « callback » : la mesure suit l'élément même s'il est remplacé (la leçon
 * replace parfois ses emplacements) ; une largeur nulle (élément retiré de la page) est ignorée.
 */
export function useLargeur(min = 280): [(el: HTMLDivElement | null) => void, number] {
  const [w, setW] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!el) return;
    const maj = () => { const cw = el.clientWidth; if (cw > 0) setW(Math.max(min, cw)); };
    maj();
    ro.current = new ResizeObserver(maj);
    ro.current.observe(el);
  }, [min]);
  return [ref, w || 560];
}

/** Spline cubique naturelle par des points (xs croissants) : valeur et dérivée. */
export function spline(xs: number[], ys: number[]) {
  const n = xs.length - 1;
  const h = xs.slice(1).map((x, i) => x - xs[i]);
  const al = [0];
  for (let i = 1; i < n; i++) al[i] = (3 / h[i]) * (ys[i + 1] - ys[i]) - (3 / h[i - 1]) * (ys[i] - ys[i - 1]);
  const l = [1], mu = [0], z = [0];
  for (let i = 1; i < n; i++) {
    l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (al[i] - h[i - 1] * z[i - 1]) / l[i];
  }
  const c = new Array(n + 1).fill(0), b = new Array(n).fill(0), d = new Array(n).fill(0);
  for (let j = n - 1; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (ys[j + 1] - ys[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }
  const seg = (x: number) => { let i = 0; while (i < n - 1 && x > xs[i + 1]) i++; return i; };
  const f = (x: number) => { const i = seg(x), t = x - xs[i]; return ys[i] + b[i] * t + c[i] * t * t + d[i] * t * t * t; };
  const df = (x: number) => { const i = seg(x), t = x - xs[i]; return b[i] + 2 * c[i] * t + 3 * d[i] * t * t; };
  return { f, df };
}

/** Zéros de g sur [a ; b] (changements de signe sur une grille fine, puis dichotomie). */
export function zeros(g: (x: number) => number, a: number, b: number, pas = 400): number[] {
  const out: number[] = [];
  let x0 = a, g0 = g(a);
  for (let i = 1; i <= pas; i++) {
    const x1 = a + ((b - a) * i) / pas, g1 = g(x1);
    if (g0 === 0) out.push(x0);
    else if (g0 * g1 < 0) {
      let lo = x0, hi = x1;
      for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (g(lo) * g(m) <= 0) hi = m; else lo = m; }
      out.push((lo + hi) / 2);
    }
    x0 = x1; g0 = g1;
  }
  return out.filter((x, i) => i === 0 || x - out[i - 1] > (b - a) / 200);
}

export function chemin(f: (x: number) => number, vue: Vue, w: number, h: number, de = vue.x0, a = vue.x1, rupture?: number): string {
  const { X, Y } = echelle(vue, w, h);
  const N = Math.max(120, Math.round(w));
  let d = '', ouvert = false;
  for (let i = 0; i <= N; i++) {
    const x = de + ((a - de) * i) / N;
    if (rupture !== undefined && i > 0 && (de + ((a - de) * (i - 1)) / N) <= rupture && x > rupture) ouvert = false;
    const y = f(x);
    if (!Number.isFinite(y)) { ouvert = false; continue; }
    d += `${ouvert ? 'L' : 'M'}${X(x).toFixed(1)},${Math.max(-h, Math.min(2 * h, Y(y))).toFixed(1)}`;
    ouvert = true;
  }
  return d;
}

/** Repère : quadrillage d'unité (cahier), axes, graduations. */
export const Repere: React.FC<{ vue: Vue; w: number; h: number; pas?: number; etiquettes?: boolean; sauf?: number[] }> = ({ vue, w, h, pas = 1, etiquettes = true, sauf = [] }) => {
  const { X, Y } = echelle(vue, w, h);
  const els: React.ReactNode[] = [];
  for (let x = Math.ceil(vue.x0 / pas) * pas; x <= vue.x1 + 1e-9; x += pas) {
    els.push(<line key={`gx${x}`} x1={X(x)} x2={X(x)} y1={0} y2={h} stroke={GRILLE} />);
    if (etiquettes && Math.abs(x) > 1e-9 && X(x) > 14 && X(x) < w - 14 && !sauf.includes(x) && vue.y0 <= 0 && vue.y1 >= 0) els.push(<text key={`tx${x}`} x={X(x)} y={Math.min(h - 3, Y(0) + 13)} fontSize={10.5} fill={GRIS} textAnchor="middle">{fmt(x)}</text>);
  }
  for (let y = Math.ceil(vue.y0 / pas) * pas; y <= vue.y1 + 1e-9; y += pas) {
    els.push(<line key={`gy${y}`} y1={Y(y)} y2={Y(y)} x1={0} x2={w} stroke={GRILLE} />);
    if (etiquettes && Math.abs(y) > 1e-9 && Y(y) > 10 && Y(y) < h - 8 && vue.x0 <= 0 && vue.x1 >= 0) els.push(<text key={`ty${y}`} x={X(0) - 5} y={Y(y) + 3.5} fontSize={10.5} fill={GRIS} textAnchor="end">{fmt(y)}</text>);
  }
  return (
    <g>
      {els}
      {vue.y0 <= 0 && vue.y1 >= 0 && <line x1={0} x2={w} y1={Y(0)} y2={Y(0)} stroke={ENCRE} strokeWidth={1.1} />}
      {vue.x0 <= 0 && vue.x1 >= 0 && <line y1={0} y2={h} x1={X(0)} x2={X(0)} stroke={ENCRE} strokeWidth={1.1} />}
    </g>
  );
};

/**
 * Surface de dessin : gère le glisser des poignées. `poignees` = [{id, x, y}] en coordonnées du repère ; `onDeplacer`
 * reçoit l'id et la position voulue (le composant contraint). Une poignée attrapée se dessine plus grosse.
 */
export function useGlisser(onDeplacer: (id: string, x: number, y: number) => void, conv: { xDe: (px: number) => number; yDe: (py: number) => number }) {
  const [prise, setPrise] = useState<string | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const convRef = useRef(conv);
  convRef.current = conv;
  const depl = useRef(onDeplacer);
  depl.current = onDeplacer;
  const surDown = useCallback((id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    ref.current?.setPointerCapture(e.pointerId);
    setPrise(id);
  }, []);
  const surMove = (e: React.PointerEvent) => {
    if (!prise || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    depl.current(prise, convRef.current.xDe(e.clientX - r.left), convRef.current.yDe(e.clientY - r.top));
  };
  const surUp = () => setPrise(null);
  return { ref, prise, surDown, svgProps: { ref, onPointerMove: surMove, onPointerUp: surUp, onPointerCancel: surUp, style: { touchAction: 'none' as const } } };
}

export const Poignee: React.FC<{ cx: number; cy: number; prise: boolean; couleur?: string; onPointerDown: (e: React.PointerEvent) => void; label?: string }> = ({
  cx, cy, prise, couleur = ENCRE, onPointerDown, label,
}) => (
  <g style={{ cursor: 'grab' }} onPointerDown={onPointerDown} role="slider" aria-label={label}>
    <circle cx={cx} cy={cy} r={16} fill="transparent" />
    <circle cx={cx} cy={cy} r={prise ? 8 : 6.5} fill="#fff" stroke={couleur} strokeWidth={2.4} />
  </g>
);

/** Cadre d'une visualisation : titre, ce qu'il faut regarder, le dessin, les réglages, et la phrase qui suit le geste. */
export const Cadre: React.FC<{ titre: string; consigne: string; message: React.ReactNode; reglages?: React.ReactNode; children: React.ReactNode }> = ({
  titre, consigne, message, reglages, children,
}) => {
  // Mesure : la visualisation a-t-elle été manipulée (une fois par visualisation affichée) ?
  const vu = useRef(false);
  return (
  <figure className="fd-visu fd-fixe my-4 overflow-hidden rounded-xl border border-[#e2ded6] bg-[#fbfaf8]" style={{ fontFamily: 'var(--fd-sans)' }}
    onPointerDownCapture={() => { if (!vu.current) { vu.current = true; trackAction('lecon-interactive'); } }}>
    <div className="border-b border-[#e2ded6] px-4 py-2.5">
      <div className="text-[13px] font-semibold text-[#15633c]">{titre}</div>
      <div className="text-[13px] text-[#5b564d]">{consigne}</div>
    </div>
    <div className="p-3 sm:p-4">
      <div className="overflow-hidden rounded-lg border border-[#ece8e0] bg-white">{children}</div>
      {reglages && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#3a362f]">{reglages}</div>}
      <div className="mt-3 rounded-lg bg-[#eef5f0] px-3 py-2 text-[13.5px] leading-snug text-[#1f3a2b]" aria-live="polite">{message}</div>
    </div>
  </figure>
  );
};

export const Curseur: React.FC<{ label: React.ReactNode; min: number; max: number; pas: number; valeur: number; onChange: (v: number) => void; affichage?: string }> = ({
  label, min, max, pas, valeur, onChange, affichage,
}) => (
  <label className="flex min-w-[220px] flex-1 items-center gap-2">
    <span className="shrink-0">{label}</span>
    <input type="range" min={min} max={max} step={pas} value={valeur} onChange={(e) => onChange(Number(e.target.value))} className="min-w-0 flex-1 accent-[#1a7a4a]" />
    <span className="w-12 shrink-0 text-end font-semibold tabular-nums">{affichage ?? fmt(valeur)}</span>
  </label>
);

export const Case: React.FC<{ label: string; coche: boolean; onChange: (v: boolean) => void }> = ({ label, coche, onChange }) => (
  <label className="inline-flex items-center gap-2">
    <input type="checkbox" checked={coche} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#1a7a4a]" />
    {label}
  </label>
);

export const Choix: React.FC<{ options: { id: string; label: string }[]; valeur: string; onChange: (v: string) => void }> = ({ options, valeur, onChange }) => (
  <div className="inline-flex flex-wrap rounded-full bg-[#f2f1ee] p-0.5">
    {options.map((o) => (
      <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={valeur === o.id}
        className={`h-8 rounded-full px-3 text-[12.5px] font-medium ${valeur === o.id ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-[#6b665d] hover:text-[#1a1a1a]'}`}>
        {o.label}
      </button>
    ))}
  </div>
);

/** Rend `enfant` à l'emplacement `hote` (inséré dans le texte de la leçon). */
export const Dans: React.FC<{ hote: HTMLElement; children: React.ReactNode }> = ({ hote, children }) => createPortal(children, hote);

/** Petite formule KaTeX dans une phrase. */
export const K: React.FC<{ t: string }> = ({ t: tex }) => (
  <span dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { throwOnError: false, strict: false }) }} />
);
