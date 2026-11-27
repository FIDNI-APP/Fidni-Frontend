/**
 * Visualisations de géométrie (28/11/2026) : vecteurs (somme, produit par un réel), barycentre, nombres complexes
 * (point image, module, argument, conjugué, multiplication par i).
 */
import React, { useState } from 'react';
import { Cadre, Case, Curseur, ENCRE, GRIS, K, OR, Poignee, Repere, VERT, echelle, fmt, useGlisser, useLargeur, type Vue } from './outils';

const nb = (v: number, d = 2) => fmt(v, d).replace(',', '{,}');
type P = { x: number; y: number };

const Fleche: React.FC<{ de: P; a: P; couleur: string; X: (x: number) => number; Y: (y: number) => number; id: string; epais?: number; tirets?: boolean }> = ({ de, a, couleur, X, Y, id, epais = 2.4, tirets }) => (
  <g>
    <defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill={couleur} /></marker></defs>
    <line x1={X(de.x)} y1={Y(de.y)} x2={X(a.x)} y2={Y(a.y)} stroke={couleur} strokeWidth={epais} markerEnd={`url(#${id})`} strokeDasharray={tirets ? '6 4' : undefined} />
  </g>
);

// ───────────────────────────── Vecteurs : somme (parallélogramme) et produit par k

const VUE_V: Vue = { x0: -5, x1: 6, y0: -3.5, y1: 4.5 };

export const VisuVecteurs: React.FC = () => {
  const [u, setU] = useState<P>({ x: 3, y: 1 });
  const [v, setV] = useState<P>({ x: 1, y: 2.5 });
  const [k, setK] = useState(1);
  const [ref, w] = useLargeur();
  const h = Math.round(Math.min(340, Math.max(240, w * 0.58)));
  const e = echelle(VUE_V, w, h);
  const { X, Y } = e;
  const O = { x: -2, y: -1.5 };
  const ku = { x: k * u.x, y: k * u.y };
  const s = { x: ku.x + v.x, y: ku.y + v.y };
  const { svgProps, surDown, prise } = useGlisser((id, x, y) => {
    const p = { x: Math.round((x - O.x) * 2) / 2, y: Math.round((y - O.y) * 2) / 2 };
    if (id === 'u') setU({ x: p.x / (k || 1), y: p.y / (k || 1) }); else setV(p);
  }, e);
  const plus = (p: P, q: P) => ({ x: p.x + q.x, y: p.y + q.y });
  return (
    <Cadre titre="Somme de deux vecteurs" consigne="Déplace les extrémités de u et de v ; k multiplie u."
      reglages={<Curseur label={<K t="k" />} min={-2} max={2} pas={0.1} valeur={k} onChange={setK} />}
      message={<><K t={`k\\vec u+\\vec v`} /> est la diagonale du parallélogramme construit sur <K t="k\vec u" /> et <K t="\vec v" /> (relation de Chasles : on met les flèches bout à bout).
        Coordonnées : <K t={`(${nb(s.x)}\\,;\\,${nb(s.y)})`} />.{k < 0 && <> Avec <K t="k<0" />, <K t="k\vec u" /> change de sens.</>}</>}>
      <div ref={ref}>
        <svg width={w} height={h} {...svgProps} className="block select-none">
          <Repere vue={VUE_V} w={w} h={h} etiquettes={false} />
          <line x1={X(O.x + ku.x)} y1={Y(O.y + ku.y)} x2={X(O.x + s.x)} y2={Y(O.y + s.y)} stroke={GRIS} strokeDasharray="5 4" />
          <line x1={X(O.x + v.x)} y1={Y(O.y + v.y)} x2={X(O.x + s.x)} y2={Y(O.y + s.y)} stroke={GRIS} strokeDasharray="5 4" />
          <Fleche id="fd-vs" de={O} a={plus(O, s)} couleur={OR} X={X} Y={Y} epais={2.8} />
          <Fleche id="fd-vu" de={O} a={plus(O, ku)} couleur={VERT} X={X} Y={Y} />
          <Fleche id="fd-vv" de={O} a={plus(O, v)} couleur={ENCRE} X={X} Y={Y} />
          <text x={X(O.x + ku.x / 2) + 6} y={Y(O.y + ku.y / 2) + 16} fontSize={14} fill={VERT} fontStyle="italic">{k === 1 ? 'u' : 'k·u'}</text>
          <text x={X(O.x + v.x / 2) - 16} y={Y(O.y + v.y / 2)} fontSize={14} fill={ENCRE} fontStyle="italic">v</text>
          <Poignee cx={X(O.x + ku.x)} cy={Y(O.y + ku.y)} prise={prise === 'u'} couleur={VERT} onPointerDown={surDown('u')} label="u" />
          <Poignee cx={X(O.x + v.x)} cy={Y(O.y + v.y)} prise={prise === 'v'} onPointerDown={surDown('v')} label="v" />
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Barycentre

const VUE_B: Vue = { x0: -5, x1: 5, y0: -3, y1: 4 };

export const VisuBarycentre: React.FC = () => {
  const [pts, setPts] = useState<P[]>([{ x: -3, y: -1.5 }, { x: 3, y: -1 }, { x: 0.5, y: 3 }]);
  const [poids, setPoids] = useState([1, 2, 1]);
  const [ref, w] = useLargeur();
  const h = Math.round(Math.min(330, Math.max(240, w * 0.55)));
  const e = echelle(VUE_B, w, h);
  const { X, Y } = e;
  const { svgProps, surDown, prise } = useGlisser((id, x, y) => setPts((p) => p.map((q, i) => (String(i) === id ? { x, y } : q))), e);
  const somme = poids[0] + poids[1] + poids[2];
  const G = Math.abs(somme) > 1e-9 ? {
    x: (poids[0] * pts[0].x + poids[1] * pts[1].x + poids[2] * pts[2].x) / somme,
    y: (poids[0] * pts[0].y + poids[1] * pts[1].y + poids[2] * pts[2].y) / somme,
  } : null;
  const noms = ['A', 'B', 'C'];
  return (
    <Cadre titre="Barycentre de trois points pondérés" consigne="Déplace A, B, C et change leurs poids : G est « attiré » par les points les plus lourds."
      reglages={<>{noms.map((n, i) => <Curseur key={n} label={<K t={['a', 'b', 'c'][i]} />} min={-3} max={5} pas={0.5} valeur={poids[i]} onChange={(v) => setPoids((p) => p.map((q, j) => (j === i ? v : q)))} />)}</>}
      message={G ? <><K t={`G=\\mathrm{bar}\\{(A,${nb(poids[0])}),(B,${nb(poids[1])}),(C,${nb(poids[2])})\\}`} /> : <K t={`a\\overrightarrow{GA}+b\\overrightarrow{GB}+c\\overrightarrow{GC}=\\vec 0`} />.
        Coordonnées <K t={`G(${nb(G.x)}\\,;\\,${nb(G.y)})`} /> = moyenne des coordonnées pondérée par les poids.{poids.every((p) => p === poids[0]) && <> Poids égaux : G est le <b>centre de gravité</b> du triangle.</>}</>
        : <>La somme des poids est nulle : <b>pas de barycentre</b>.</>}>
      <div ref={ref}>
        <svg width={w} height={h} {...svgProps} className="block select-none">
          <Repere vue={VUE_B} w={w} h={h} etiquettes={false} />
          <path d={`M${X(pts[0].x)},${Y(pts[0].y)}L${X(pts[1].x)},${Y(pts[1].y)}L${X(pts[2].x)},${Y(pts[2].y)}Z`} fill={VERT} opacity={0.06} stroke={GRIS} />
          {G && pts.map((p, i) => <line key={i} x1={X(G.x)} y1={Y(G.y)} x2={X(p.x)} y2={Y(p.y)} stroke={OR} strokeDasharray="3 3" opacity={0.6} />)}
          {G && <><circle cx={X(G.x)} cy={Y(G.y)} r={6} fill={OR} /><text x={X(G.x) + 9} y={Y(G.y) - 7} fontSize={14} fill={OR}>G</text></>}
          {pts.map((p, i) => (
            <g key={i}>
              <text x={X(p.x) + 10} y={Y(p.y) - 9} fontSize={14}>{noms[i]} ({fmt(poids[i], 1)})</text>
              <Poignee cx={X(p.x)} cy={Y(p.y)} prise={prise === String(i)} couleur={VERT} onPointerDown={surDown(String(i))} label={noms[i]} />
            </g>
          ))}
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Nombres complexes

const VUE_C: Vue = { x0: -4.5, x1: 4.5, y0: -3.5, y1: 3.5 };

export const VisuComplexe: React.FC = () => {
  const [z, setZ] = useState<P>({ x: 2, y: 1.5 });
  const [conj, setConj] = useState(true);
  const [foisI, setFoisI] = useState(false);
  const [ref, w] = useLargeur();
  const h = Math.round(Math.min(340, Math.max(250, w * 0.58)));
  const e = echelle(VUE_C, w, h);
  const { X, Y } = e;
  const { svgProps, surDown, prise } = useGlisser((_id, x, y) => setZ({ x: Math.round(x * 4) / 4, y: Math.round(y * 4) / 4 }), e);
  const mod = Math.hypot(z.x, z.y);
  const arg = Math.atan2(z.y, z.x);
  const iz = { x: -z.y, y: z.x };
  const O = { x: 0, y: 0 };
  const rArc = 0.8;
  const arc = `M${X(rArc)},${Y(0)} A${X(rArc) - X(0)},${Y(0) - Y(rArc)} 0 ${Math.abs(arg) > Math.PI ? 1 : 0} ${arg > 0 ? 0 : 1} ${X(rArc * Math.cos(arg))},${Y(rArc * Math.sin(arg))}`;
  const deg = Math.round((arg * 180) / Math.PI);
  return (
    <Cadre titre="Point image d'un nombre complexe" consigne="Déplace le point M d'affixe z = a + ib."
      reglages={<><Case label="Conjugué" coche={conj} onChange={setConj} /><Case label="Multiplier par i" coche={foisI} onChange={setFoisI} /></>}
      message={<><K t={`z=${nb(z.x)}${z.y < 0 ? '-' : '+'}${nb(Math.abs(z.y))}\\,i`} /> : <K t={`|z|=OM=\\sqrt{a^2+b^2}\\approx${nb(mod)}`} /> (une <b>distance</b>),
        <K t={`\\arg z\\approx${deg}^\\circ`} /> (un <b>angle</b>).{conj && <> Le conjugué <K t="\bar z" /> est le symétrique par rapport à l'axe réel.</>}
        {foisI && <> Multiplier par <K t="i" /> fait <b>tourner de</b> <K t="90^\circ" /> autour de O.</>}</>}>
      <div ref={ref}>
        <svg width={w} height={h} {...svgProps} className="block select-none">
          <Repere vue={VUE_C} w={w} h={h} />
          {mod > 0.2 && <path d={arc} fill="none" stroke={OR} strokeWidth={1.6} />}
          <line x1={X(z.x)} x2={X(z.x)} y1={Y(0)} y2={Y(z.y)} stroke={GRIS} strokeDasharray="3 3" />
          <line x1={X(0)} x2={X(z.x)} y1={Y(z.y)} y2={Y(z.y)} stroke={GRIS} strokeDasharray="3 3" />
          <Fleche id="fd-cz" de={O} a={z} couleur={VERT} X={X} Y={Y} />
          {conj && <><Fleche id="fd-cc" de={O} a={{ x: z.x, y: -z.y }} couleur={GRIS} X={X} Y={Y} tirets /><text x={X(z.x) + 8} y={Y(-z.y) + 14} fontSize={13} fill={GRIS}>M′ ( z̄ )</text></>}
          {foisI && <><Fleche id="fd-ci" de={O} a={iz} couleur={OR} X={X} Y={Y} /><text x={X(iz.x) - 8} y={Y(iz.y) - 8} fontSize={13} fill={OR} textAnchor="end">iz</text></>}
          <text x={X(z.x) + 10} y={Y(z.y) - 8} fontSize={14} fill={ENCRE}>M (z)</text>
          <Poignee cx={X(z.x)} cy={Y(z.y)} prise={prise === 'z'} couleur={VERT} onPointerDown={surDown('z')} label="z" />
        </svg>
      </div>
    </Cadre>
  );
};
