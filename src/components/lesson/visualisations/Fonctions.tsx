/**
 * Dérivée et fonction réciproque, vues sur la courbe (27/11/2026).
 * - Nombre dérivé : la sécante (AM) tourne quand h → 0 et devient la tangente ; son coefficient directeur (le taux
 *   d'accroissement) tend vers f'(a).
 * - Réciproque : M(a ; f(a)) et M′(f(a) ; a) sont symétriques par rapport à la droite y = x.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Cadre, Case, Curseur, ENCRE, GRIS, K, OR, Poignee, Repere, VERT, chemin, echelle, fmt, useGlisser, useLargeur, type Vue } from './outils';

const nb = (v: number, d = 2) => fmt(v, d).replace(',', '{,}');

// ───────────────────────────── Nombre dérivé

const VUE_D: Vue = { x0: -3.5, x1: 3.5, y0: -1.5, y1: 4 };
const fD = (x: number) => (x * x * x) / 6 - x + 1.5;
const dfD = (x: number) => (x * x) / 2 - 1;

export const VisuDerivee: React.FC = () => {
  const [ref, w] = useLargeur();
  const h = Math.round(Math.min(360, Math.max(250, w * 0.6)));
  const e = echelle(VUE_D, w, h);
  const { X, Y } = e;
  const [a, setA] = useState(-1.6);
  const [pas, setPas] = useState(1.8);
  const [tangente, setTangente] = useState(true);
  const [anime, setAnime] = useState(false);
  const raf = useRef(0);
  const pasRef = useRef(pas);
  pasRef.current = pas;
  useEffect(() => {
    if (!anime) return;
    const tick = () => {
      const s = pasRef.current * 0.97;
      if (s <= 0.02) { setPas(0.02); setAnime(false); return; }
      setPas(s);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [anime]);
  const { svgProps, surDown, prise } = useGlisser((_id, x) => setA(Math.max(-3, Math.min(3 - pas, x))), e);

  const m = a + pas;
  const taux = (fD(m) - fD(a)) / pas;
  const ligne = (x0: number, y0: number, p: number) => ({ x1: X(VUE_D.x0), y1: Y(y0 + p * (VUE_D.x0 - x0)), x2: X(VUE_D.x1), y2: Y(y0 + p * (VUE_D.x1 - x0)) });

  return (
    <Cadre titre="Nombre dérivé et tangente" consigne="Fais tendre h vers 0 : la sécante (AM) tourne et devient la tangente en A."
      reglages={<>
        <Curseur label={<K t="h" />} min={0.02} max={2.5} pas={0.01} valeur={pas} onChange={(v) => { setAnime(false); setPas(v); }} />
        <button type="button" onClick={() => { if (pas <= 0.03) setPas(2); setAnime(!anime); }}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#e6f2ea] px-3 text-[12.5px] font-semibold text-[#15633c]">
          {anime ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} h → 0
        </button>
        <Case label="Afficher la tangente" coche={tangente} onChange={setTangente} />
      </>}
      message={<>Coefficient directeur de (AM) : <K t={`\\dfrac{f(a+h)-f(a)}{h}\\approx ${nb(taux, 3)}`} />.
        Quand <K t="h\to 0" />, il tend vers <K t={`f'(a)\\approx ${nb(dfD(a), 3)}`} />, la <b>pente de la tangente</b> en A.</>}>
      <div ref={ref}>
        <svg width={w} height={h} {...svgProps} className="block select-none">
          <Repere vue={VUE_D} w={w} h={h} />
          {tangente && <line {...ligne(a, fD(a), dfD(a))} stroke={VERT} strokeWidth={1.6} opacity={0.55} />}
          <line {...ligne(a, fD(a), taux)} stroke={OR} strokeWidth={2} />
          <path d={chemin(fD, VUE_D, w, h)} fill="none" stroke={VERT} strokeWidth={2.6} />
          {/* Triangle : h à l'horizontale, f(a+h) − f(a) à la verticale. */}
          <path d={`M${X(a)},${Y(fD(a))}L${X(m)},${Y(fD(a))}L${X(m)},${Y(fD(m))}`} fill="none" stroke={GRIS} strokeDasharray="4 3" />
          {pas > 0.35 && <text x={(X(a) + X(m)) / 2} y={Y(fD(a)) + 15} fontSize={12.5} fill={GRIS} textAnchor="middle" fontStyle="italic">h</text>}
          <circle cx={X(m)} cy={Y(fD(m))} r={5} fill={OR} />
          <text x={X(m) + 8} y={Y(fD(m)) - 8} fontSize={13} fill={OR}>M</text>
          <text x={X(a) - 6} y={Y(fD(a)) - 12} fontSize={13} fill={ENCRE} textAnchor="end">A</text>
          <Poignee cx={X(a)} cy={Y(fD(a))} prise={prise === 'a'} onPointerDown={surDown('a')} label="point A" />
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Fonction réciproque

const VUE_R: Vue = { x0: -3.2, x1: 3.2, y0: -3.2, y1: 3.2 };
const fR = (x: number) => (x * x * x) / 20 + x / 3;

export const VisuReciproque: React.FC = () => {
  const [ref, w] = useLargeur();
  const h = Math.round(Math.min(380, Math.max(260, w * 0.62)));
  const e = echelle(VUE_R, w, h);
  const { X, Y } = e;
  const [a, setA] = useState(2.4);
  const { svgProps, surDown, prise } = useGlisser((_id, x) => setA(Math.max(-2.9, Math.min(2.9, x))), e);
  const b = fR(a);
  // Courbe de f⁻¹ : les points (f(t) ; t).
  let inv = '';
  for (let i = 0; i <= 200; i++) {
    const t = -3.2 + (6.4 * i) / 200;
    const px = X(fR(t)), py = Y(t);
    inv += `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`;
  }
  return (
    <Cadre titre="Fonction réciproque" consigne="Déplace M sur la courbe de f : son symétrique M′ décrit la courbe de f⁻¹."
      message={<><K t={`M(${nb(a)}\\,;\\,${nb(b)})`} /> est sur <K t="C_f" />, <K t={`M'(${nb(b)}\\,;\\,${nb(a)})`} /> est sur <K t="C_{f^{-1}}" /> :
        on échange abscisse et ordonnée, c'est la <b>symétrie par rapport à</b> <K t="y=x" />. Ainsi <K t={`f^{-1}(${nb(b)})=${nb(a)}`} />.</>}>
      <div ref={ref}>
        <svg width={w} height={h} {...svgProps} className="block select-none">
          <Repere vue={VUE_R} w={w} h={h} />
          <line x1={X(-3.2)} y1={Y(-3.2)} x2={X(3.2)} y2={Y(3.2)} stroke={GRIS} strokeDasharray="6 4" />
          <text x={X(-2.9)} y={Y(-2.55)} fontSize={12.5} fill={GRIS} fontStyle="italic">y = x</text>
          <path d={chemin(fR, VUE_R, w, h)} fill="none" stroke={VERT} strokeWidth={2.6} />
          <path d={inv} fill="none" stroke={OR} strokeWidth={2.4} />
          <text x={X(3.0)} y={Y(fR(3.0)) + 18} fontSize={13} fill={VERT} fontStyle="italic" textAnchor="end">C<tspan fontSize={10} dy={3}>f</tspan></text>
          <text x={X(fR(3.0)) - 8} y={Y(3.0)} fontSize={13} fill={OR} fontStyle="italic" textAnchor="end">C<tspan fontSize={10} dy={3}>f</tspan><tspan fontSize={9} dy={-8}>−1</tspan></text>
          <line x1={X(a)} y1={Y(b)} x2={X(b)} y2={Y(a)} stroke={ENCRE} strokeDasharray="3 3" />
          <circle cx={X((a + b) / 2)} cy={Y((a + b) / 2)} r={3} fill={ENCRE} />
          <circle cx={X(b)} cy={Y(a)} r={5.5} fill={OR} />
          <text x={X(b) + 8} y={Y(a) + 4} fontSize={13} fill={OR}>M′</text>
          <text x={X(a) - 8} y={Y(b) - 9} fontSize={13} fill={ENCRE} textAnchor="end">M</text>
          <Poignee cx={X(a)} cy={Y(b)} prise={prise === 'm'} couleur={VERT} onPointerDown={surDown('m')} label="point M" />
        </svg>
      </div>
    </Cadre>
  );
};
