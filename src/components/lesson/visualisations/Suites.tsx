/**
 * Suites, vues sur un dessin (27/11/2026).
 * - u_{n+1} = f(u_n) : l'escalier (ou l'escargot) entre C_f et y = x ; la limite est un point d'intersection.
 * - Limite d'une suite : une bande ]ℓ − ε ; ℓ + ε[ ; à partir d'un rang, tous les termes y restent.
 * - Suites adjacentes : l'une monte, l'autre descend, l'écart tend vers 0.
 */
import React, { useState } from 'react';
import { Cadre, Choix, Curseur, ENCRE, GRIS, K, OR, Poignee, Repere, VERT, chemin, echelle, fmt, useGlisser, useLargeur, type Vue } from './outils';

const nb = (v: number, d = 2) => fmt(v, d).replace(',', '{,}');

// ───────────────────────────── u_{n+1} = f(u_n)

const MODELES = {
  croissante: { label: 'f croissante', f: (x: number) => Math.sqrt(2 + x), vue: { x0: -0.4, x1: 3.2, y0: -0.4, y1: 3.2 }, u0: 0.2, l: 2 },
  decroissante: { label: 'f décroissante', f: (x: number) => 2 / (1 + x), vue: { x0: -0.4, x1: 3.2, y0: -0.4, y1: 3.2 }, u0: 2.8, l: 1 },
  diverge: { label: 'pas de point fixe', f: (x: number) => (x * x) / 2 + 0.7, vue: { x0: -0.4, x1: 3.4, y0: -0.4, y1: 3.4 }, u0: 0.1, l: NaN },
} as const;
type Modele = keyof typeof MODELES;

export const VisuSuiteRecurrente: React.FC = () => {
  const [modele, setModele] = useState<Modele>('croissante');
  const M = MODELES[modele];
  const vue: Vue = M.vue;
  const [u0, setU0] = useState<number>(M.u0);
  const [ref, w] = useLargeur();
  const h = Math.round(Math.min(380, Math.max(260, w * 0.62)));
  const e = echelle(vue, w, h);
  const { X, Y } = e;
  const { svgProps, surDown, prise } = useGlisser((_id, x) => setU0(Math.max(0, Math.min(vue.x1 - 0.2, x))), e);
  const u: number[] = [u0];
  for (let k = 0; k < 14; k++) u.push(M.f(u[k]));
  let escalier = `M${X(u[0])},${Y(0)}`;
  for (let k = 0; k < u.length - 1; k++) {
    if (u[k + 1] > vue.y1 + 1) break;
    escalier += `L${X(u[k])},${Y(u[k + 1])}L${X(Math.min(u[k + 1], vue.x1 + 1))},${Y(u[k + 1])}`;
  }
  const message = modele === 'croissante'
    ? <><K t="f" /> est croissante : la suite avance <b>en escalier</b>, toujours dans le même sens, vers <K t="\ell=2" />, l'abscisse du point où <K t="C_f" /> coupe <K t="y=x" /> (<K t="f(\ell)=\ell" />).</>
    : modele === 'decroissante'
      ? <><K t="f" /> est décroissante : la suite <b>tourne autour</b> de <K t="\ell=1" /> (un terme au-dessus, un en dessous) en se rapprochant. Les termes de rang pair et de rang impair vont chacun de leur côté.</>
      : <><K t="C_f" /> ne coupe jamais <K t="y=x" /> : aucun <K t="\ell" /> ne vérifie <K t="f(\ell)=\ell" />, la suite ne peut pas converger. Ici elle part vers <K t="+\infty" />.</>;

  return (
    <Cadre titre="Suite définie par uₙ₊₁ = f(uₙ)" consigne="Déplace u₀ sur l'axe : on monte à la courbe, on revient sur y = x, et on recommence."
      reglages={<Choix options={Object.entries(MODELES).map(([id, m]) => ({ id, label: m.label }))} valeur={modele}
        onChange={(v) => { setModele(v as Modele); setU0(MODELES[v as Modele].u0); }} />}
      message={<>{message} <span className="text-[#5b564d]">(<K t={`u_5\\approx ${nb(u[5], 3)}`} />)</span></>}>
      <div ref={ref}>
        <svg width={w} height={h} {...svgProps} className="block select-none">
          <Repere vue={vue} w={w} h={h} />
          <line x1={X(vue.x0)} y1={Y(vue.x0)} x2={X(vue.x1)} y2={Y(vue.x1)} stroke={GRIS} strokeDasharray="6 4" />
          <text x={X(vue.x1 - 0.45)} y={Y(vue.x1 - 0.25)} fontSize={12.5} fill={GRIS} fontStyle="italic">y = x</text>
          <path d={chemin(M.f, vue, w, h, Math.max(vue.x0, -0.39))} fill="none" stroke={VERT} strokeWidth={2.6} />
          <path d={escalier} fill="none" stroke={OR} strokeWidth={1.8} />
          {u.slice(0, 4).map((v, k) => v < vue.x1 && (
            <g key={k}>
              <line x1={X(v)} x2={X(v)} y1={Y(0)} y2={Y(Math.min(v, vue.y1))} stroke={GRIS} strokeDasharray="2 3" opacity={k ? 0.8 : 0} />
              <text x={X(v)} y={Y(0) + 15 + (k % 2) * 12} fontSize={12} fill={OR} textAnchor="middle" fontStyle="italic">u{String.fromCharCode(0x2080 + k)}</text>
            </g>
          ))}
          {Number.isFinite(M.l) && <circle cx={X(M.l)} cy={Y(M.l)} r={4.5} fill={ENCRE} />}
          <Poignee cx={X(u0)} cy={Y(0)} prise={prise === 'u0'} couleur={OR} onPointerDown={surDown('u0')} label="u0" />
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Limite d'une suite (bande)

const L = 1;
const uL = (n: number) => L + ((n % 2 ? -1 : 1) * 2.4) / (n + 2);

export const VisuLimiteSuite: React.FC = () => {
  const [eps, setEps] = useState(0.3);
  const NMAX = 40;
  const vue: Vue = { x0: -1.5, x1: NMAX + 1, y0: -0.4, y1: 2.4 };
  const [ref, w] = useLargeur();
  const h = Math.round(Math.min(320, Math.max(230, w * 0.5)));
  const { X, Y } = echelle(vue, w, h);
  // Rang à partir duquel TOUS les termes restent dans la bande (|u_n − ℓ| = 2,4/(n+2) décroît).
  let N = 0;
  while (2.4 / (N + 2) >= eps) N++;
  return (
    <Cadre titre="Suite convergente : la bande autour de la limite" consigne="Rétrécis la bande : il faut aller plus loin, mais on trouve toujours un rang N."
      reglages={<Curseur label={<K t="\varepsilon" />} min={0.06} max={1} pas={0.01} valeur={eps} onChange={setEps} />}
      message={<>Avec <K t={`\\varepsilon=${nb(eps)}`} />, à partir du rang <K t={`N=${N}`} /> <b>tous</b> les termes restent dans <K t={`]\\ell-\\varepsilon\\,;\\,\\ell+\\varepsilon[`} />.
        Quel que soit <K t="\varepsilon" />, un tel rang existe : c'est le sens de <K t="\lim u_n=\ell" />.</>}>
      <div ref={ref}>
        <svg width={w} height={h} className="block select-none">
          <Repere vue={vue} w={w} h={h} pas={5} etiquettes={false} />
          <rect x={X(vue.x0)} width={w} y={Y(L + eps)} height={Y(L - eps) - Y(L + eps)} fill={VERT} opacity={0.12} />
          <line x1={0} x2={w} y1={Y(L)} y2={Y(L)} stroke={VERT} strokeDasharray="6 4" />
          <text x={6} y={Y(L) - 6} fontSize={12.5} fill={VERT} fontStyle="italic">ℓ</text>
          <line x1={X(N)} x2={X(N)} y1={0} y2={h} stroke={ENCRE} strokeDasharray="3 3" />
          <text x={X(N) + 5} y={14} fontSize={12.5} fill={ENCRE} fontStyle="italic">N = {N}</text>
          {Array.from({ length: NMAX + 1 }, (_, n) => {
            const v = uL(n);
            const dedans = Math.abs(v - L) < eps;
            return <circle key={n} cx={X(n)} cy={Y(v)} r={3.6} fill={dedans ? VERT : OR} />;
          })}
          {[0, 10, 20, 30, 40].map((n) => <text key={n} x={X(n)} y={h - 4} fontSize={10.5} fill={GRIS} textAnchor="middle">{n}</text>)}
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Suites adjacentes

const LA = 1.5;
const uA = (n: number) => LA - 1.2 / (n + 1);
const vA = (n: number) => LA + 1.6 / (n + 1) ** 1.3;

export const VisuAdjacentes: React.FC = () => {
  const [n, setN] = useState(8);
  const vue: Vue = { x0: -1, x1: 31, y0: -0.1, y1: 3.4 };
  const [ref, w] = useLargeur();
  const h = Math.round(Math.min(320, Math.max(230, w * 0.5)));
  const { X, Y } = echelle(vue, w, h);
  return (
    <Cadre titre="Suites adjacentes" consigne="Avance n : (uₙ) monte, (vₙ) descend, et l'écart entre les deux se referme."
      reglages={<Curseur label={<K t="n" />} min={1} max={30} pas={1} valeur={n} onChange={setN} affichage={String(n)} />}
      message={<><K t="(u_n)" /> est croissante, <K t="(v_n)" /> est décroissante, et <K t={`v_{${n}}-u_{${n}}\\approx ${nb(vA(n) - uA(n), 3)}`} /> tend vers 0 :
        elles se <b>resserrent sur une même limite</b> <K t="\ell" />, coincée entre les deux.</>}>
      <div ref={ref}>
        <svg width={w} height={h} className="block select-none">
          <Repere vue={vue} w={w} h={h} pas={5} etiquettes={false} />
          <line x1={0} x2={w} y1={Y(LA)} y2={Y(LA)} stroke={GRIS} strokeDasharray="6 4" />
          <text x={6} y={Y(LA) - 6} fontSize={12.5} fill={GRIS} fontStyle="italic">ℓ</text>
          {Array.from({ length: n + 1 }, (_, k) => (
            <g key={k}>
              <line x1={X(k)} x2={X(k)} y1={Y(uA(k))} y2={Y(vA(k))} stroke={OR} strokeWidth={k === n ? 2.4 : 1.2} opacity={k === n ? 1 : 0.5} />
              <circle cx={X(k)} cy={Y(uA(k))} r={3.6} fill={VERT} />
              <circle cx={X(k)} cy={Y(vA(k))} r={3.6} fill={ENCRE} />
            </g>
          ))}
          <text x={X(n) + 6} y={Y(uA(n)) + 14} fontSize={12.5} fill={VERT} fontStyle="italic">uₙ</text>
          <text x={X(n) + 6} y={Y(vA(n)) - 6} fontSize={12.5} fill={ENCRE} fontStyle="italic">vₙ</text>
          {[0, 10, 20, 30].map((k) => <text key={k} x={X(k)} y={h - 4} fontSize={10.5} fill={GRIS} textAnchor="middle">{k}</text>)}
        </svg>
      </div>
    </Cadre>
  );
};

