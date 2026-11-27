/**
 * Visualisations d'analyse (28/11/2026) : continuité en un point, convexité et point d'inflexion, asymptote oblique,
 * symétries d'une courbe, primitives (famille F + C), logarithme (aire sous 1/t), exponentielle (exp' = exp),
 * suites arithmétiques et géométriques, fonctions usuelles (homographique).
 */
import React, { useState } from 'react';
import { Cadre, Case, Choix, Curseur, ENCRE, GRIS, K, OR, Poignee, Repere, VERT, chemin, echelle, fmt, useGlisser, useLargeur, type Vue } from './outils';

const nb = (v: number, d = 2) => fmt(v, d).replace(',', '{,}');
function useDessin(vue: Vue, ratio = 0.58) {
  const [ref, w] = useLargeur();
  const h = Math.round(Math.min(340, Math.max(240, w * ratio)));
  return { ref, w, h, ...echelle(vue, w, h) };
}

// ───────────────────────────── Continuité en un point

const VUE_CO: Vue = { x0: -3, x1: 4, y0: -1.5, y1: 4 };

export const VisuContinuite: React.FC = () => {
  const [saut, setSaut] = useState(1.2);
  const [valeur, setValeur] = useState(0);
  const d = useDessin(VUE_CO);
  const a = 1;
  const g = (x: number) => 0.4 * x * x - 0.3 * x + 1;
  const f = (x: number) => (x < a ? g(x) : g(x) + saut);
  const fa = g(a) + valeur;
  const continue_ = Math.abs(saut) < 0.05 && Math.abs(valeur) < 0.05;
  return (
    <Cadre titre="Continuité en un point" consigne="Règle le saut et la valeur f(a) : f est continue en a quand tout se recolle."
      reglages={<><Curseur label="saut" min={-2} max={2} pas={0.05} valeur={saut} onChange={setSaut} /><Curseur label={<K t="f(a)" />} min={-1.5} max={1.5} pas={0.05} valeur={valeur} onChange={setValeur} affichage={fmt(fa)} /></>}
      message={continue_ ? <><K t={`\\lim_{x\\to a^-}f(x)=\\lim_{x\\to a^+}f(x)=f(a)`} /> : on trace la courbe <b>sans lever le crayon</b>, <K t="f" /> est continue en <K t="a" />.</>
        : <>Limite à gauche <K t={`\\approx${nb(g(a))}`} />, à droite <K t={`\\approx${nb(g(a) + saut)}`} />, <K t={`f(a)\\approx${nb(fa)}`} /> :{' '}
          {Math.abs(saut) >= 0.05 ? 'les deux morceaux ne se rejoignent pas' : 'la valeur en a est à côté'}, <K t="f" /> <b>n'est pas continue</b> en <K t="a" />.</>}>
      <div ref={d.ref}>
        <svg width={d.w} height={d.h} className="block">
          <Repere vue={VUE_CO} w={d.w} h={d.h} sauf={[a]} />
          <path d={chemin(f, VUE_CO, d.w, d.h, VUE_CO.x0, VUE_CO.x1, a)} fill="none" stroke={VERT} strokeWidth={2.6} />
          <circle cx={d.X(a)} cy={d.Y(g(a))} r={4.5} fill="#fff" stroke={VERT} strokeWidth={2} />
          <circle cx={d.X(a)} cy={d.Y(g(a) + saut)} r={4.5} fill="#fff" stroke={VERT} strokeWidth={2} />
          <circle cx={d.X(a)} cy={d.Y(fa)} r={5.5} fill={continue_ ? VERT : OR} />
          <line x1={d.X(a)} x2={d.X(a)} y1={d.Y(0)} y2={d.Y(fa)} stroke={GRIS} strokeDasharray="3 3" />
          <text x={d.X(a)} y={d.Y(0) + 16} fontSize={13} fontStyle="italic" textAnchor="middle">a</text>
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Convexité et point d'inflexion

const VUE_CV: Vue = { x0: -3.2, x1: 3.2, y0: -2.5, y1: 3 };
const fCv = (x: number) => (x * x * x) / 6 - x / 2 + 0.3;
const dfCv = (x: number) => (x * x) / 2 - 0.5;

export const VisuConvexite: React.FC = () => {
  const [a, setA] = useState(-1.6);
  const d = useDessin(VUE_CV);
  const { svgProps, surDown, prise } = useGlisser((_id, x) => setA(Math.max(-3, Math.min(3, x))), d);
  const tg = (x: number) => fCv(a) + dfCv(a) * (x - a);
  const zone = a < -0.02 ? 'concave' : a > 0.02 ? 'convexe' : 'inflexion';
  return (
    <Cadre titre="Concavité, convexité, point d'inflexion" consigne="Déplace le point sur la courbe et regarde où est la tangente."
      message={zone === 'concave' ? <>Ici <K t="f''(x)<0" /> : <K t="f" /> est <b>concave</b>, la courbe est <b>en dessous</b> de ses tangentes.</>
        : zone === 'convexe' ? <>Ici <K t="f''(x)>0" /> : <K t="f" /> est <b>convexe</b>, la courbe est <b>au-dessus</b> de ses tangentes.</>
          : <>En <K t="x=0" />, <K t="f''" /> s'annule et change de signe : c'est un <b>point d'inflexion</b>, la courbe <b>traverse</b> sa tangente.</>}>
      <div ref={d.ref}>
        <svg width={d.w} height={d.h} {...svgProps} className="block select-none">
          <Repere vue={VUE_CV} w={d.w} h={d.h} />
          <rect x={0} width={d.X(0)} y={0} height={d.h} fill={OR} opacity={0.05} />
          <rect x={d.X(0)} width={d.w - d.X(0)} y={0} height={d.h} fill={VERT} opacity={0.05} />
          <text x={8} y={16} fontSize={12} fill={OR}>concave</text>
          <text x={d.w - 8} y={16} fontSize={12} fill={VERT} textAnchor="end">convexe</text>
          <line x1={d.X(VUE_CV.x0)} y1={d.Y(tg(VUE_CV.x0))} x2={d.X(VUE_CV.x1)} y2={d.Y(tg(VUE_CV.x1))} stroke={OR} strokeWidth={1.8} />
          <path d={chemin(fCv, VUE_CV, d.w, d.h)} fill="none" stroke={VERT} strokeWidth={2.6} />
          <circle cx={d.X(0)} cy={d.Y(fCv(0))} r={4} fill={ENCRE} />
          <Poignee cx={d.X(a)} cy={d.Y(fCv(a))} prise={prise === 'a'} couleur={OR} onPointerDown={surDown('a')} label="point" />
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Asymptote oblique

const VUE_AS: Vue = { x0: -1, x1: 12, y0: -1, y1: 9 };
const fAs = (x: number) => 0.5 * x + 1 + 3 / (x + 0.6);
const dAs = (x: number) => 0.5 * x + 1;

export const VisuAsymptote: React.FC = () => {
  const [x, setX] = useState(2);
  const d = useDessin(VUE_AS);
  const ecart = fAs(x) - dAs(x);
  return (
    <Cadre titre="Asymptote oblique" consigne="Fais avancer x vers +∞ : l'écart entre la courbe et la droite se referme."
      reglages={<Curseur label={<K t="x" />} min={0.5} max={11.5} pas={0.1} valeur={x} onChange={setX} />}
      message={<><K t={`f(x)-\\left(\\tfrac12x+1\\right)\\approx${nb(ecart, 3)}`} /> tend vers 0 quand <K t="x\to+\infty" /> : la droite <K t="y=\tfrac12x+1" /> est <b>asymptote oblique</b>.
        Pour la trouver : <K t="a=\lim\tfrac{f(x)}{x}" />, puis <K t="b=\lim(f(x)-ax)" />.</>}>
      <div ref={d.ref}>
        <svg width={d.w} height={d.h} className="block">
          <Repere vue={VUE_AS} w={d.w} h={d.h} pas={1} />
          <path d={chemin(dAs, VUE_AS, d.w, d.h)} fill="none" stroke={OR} strokeWidth={1.8} strokeDasharray="6 4" />
          <path d={chemin(fAs, VUE_AS, d.w, d.h, -0.5)} fill="none" stroke={VERT} strokeWidth={2.6} />
          <line x1={d.X(x)} x2={d.X(x)} y1={d.Y(fAs(x))} y2={d.Y(dAs(x))} stroke={ENCRE} strokeWidth={2.4} />
          <circle cx={d.X(x)} cy={d.Y(fAs(x))} r={4.5} fill={VERT} /><circle cx={d.X(x)} cy={d.Y(dAs(x))} r={4.5} fill={OR} />
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Symétries d'une courbe

const VUE_SY: Vue = { x0: -4, x1: 4, y0: -3, y1: 4 };

export const VisuSymetrie: React.FC = () => {
  const [genre, setGenre] = useState<'axe' | 'centre'>('axe');
  const [x, setX] = useState(2.4);
  const d = useDessin(VUE_SY);
  const a = 0.8, b = 0.6;
  const f = genre === 'axe' ? (t: number) => 0.35 * (t - a) ** 2 - 1.5 + 0.08 * (t - a) ** 4 / 4 : (t: number) => 0.18 * (t - a) ** 3 - 0.9 * (t - a) + b;
  const xs = 2 * a - x;
  const { svgProps, surDown, prise } = useGlisser((_id, px) => setX(Math.max(-3.6, Math.min(3.6, px))), d);
  const M = { x, y: f(x) }, Mp = { x: xs, y: f(xs) };
  return (
    <Cadre titre="Axe et centre de symétrie" consigne="Déplace M : son symétrique M′ reste sur la courbe."
      reglages={<Choix options={[{ id: 'axe', label: 'axe x = a' }, { id: 'centre', label: 'centre Ω(a ; b)' }]} valeur={genre} onChange={(v) => setGenre(v as 'axe' | 'centre')} />}
      message={genre === 'axe' ? <>La droite <K t="x=a" /> est un axe de symétrie : pour tout <K t="x" />, <K t="2a-x\in D_f" /> et <K t="f(2a-x)=f(x)" /> (M et M′ <b>à la même hauteur</b>).</>
        : <><K t="\Omega(a\,;\,b)" /> est un centre de symétrie : <K t="f(2a-x)+f(x)=2b" /> (<b>Ω est le milieu</b> de [MM′]).</>}>
      <div ref={d.ref}>
        <svg width={d.w} height={d.h} {...svgProps} className="block select-none">
          <Repere vue={VUE_SY} w={d.w} h={d.h} />
          {genre === 'axe' ? <line x1={d.X(a)} x2={d.X(a)} y1={0} y2={d.h} stroke={OR} strokeDasharray="6 4" strokeWidth={1.6} />
            : <circle cx={d.X(a)} cy={d.Y(b)} r={5} fill={OR} />}
          <path d={chemin(f, VUE_SY, d.w, d.h)} fill="none" stroke={VERT} strokeWidth={2.6} />
          <line x1={d.X(M.x)} y1={d.Y(M.y)} x2={d.X(Mp.x)} y2={d.Y(Mp.y)} stroke={GRIS} strokeDasharray="3 3" />
          <circle cx={d.X(Mp.x)} cy={d.Y(Mp.y)} r={5.5} fill={OR} />
          <text x={d.X(Mp.x) - 8} y={d.Y(Mp.y) - 9} fontSize={13} textAnchor="end" fill={OR}>M′</text>
          <text x={d.X(M.x) + 9} y={d.Y(M.y) - 9} fontSize={13}>M</text>
          <Poignee cx={d.X(M.x)} cy={d.Y(M.y)} prise={prise === 'm'} couleur={VERT} onPointerDown={surDown('m')} label="M" />
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Primitives : la famille F + C

const VUE_PR: Vue = { x0: -3, x1: 3.5, y0: -3, y1: 4 };
const fPr = (x: number) => x * x - 1;
const FPr = (x: number) => (x * x * x) / 3 - x;

export const VisuPrimitives: React.FC = () => {
  const [C, setC] = useState(0.5);
  const [x, setX] = useState(1.6);
  const d = useDessin(VUE_PR);
  const F = (t: number) => FPr(t) + C;
  const { svgProps, surDown, prise } = useGlisser((_id, px) => setX(Math.max(-2.8, Math.min(3.2, px))), d);
  return (
    <Cadre titre="Primitives d'une fonction" consigne="Change la constante C : toutes ces courbes ont la même pente au même x."
      reglages={<Curseur label={<K t="C" />} min={-2} max={2} pas={0.05} valeur={C} onChange={setC} />}
      message={<><K t="F(x)=\tfrac{x^3}{3}-x+C" /> est une primitive de <K t="f(x)=x^2-1" /> pour <b>tout</b> réel <K t="C" /> : la pente de la tangente à <K t="C_F" /> en <K t="x" /> vaut <K t={`f(x)=${nb(fPr(x))}`} />.
        Imposer <K t="F(0)=y_0" /> choisit <b>une seule</b> courbe (ici <K t={`F(0)=${nb(C)}`} />).</>}>
      <div ref={d.ref}>
        <svg width={d.w} height={d.h} {...svgProps} className="block select-none">
          <Repere vue={VUE_PR} w={d.w} h={d.h} />
          {[-2, -1, 0, 1, 2].map((c) => <path key={c} d={chemin((t) => FPr(t) + c, VUE_PR, d.w, d.h)} fill="none" stroke={GRIS} strokeWidth={1} opacity={0.5} />)}
          <path d={chemin(fPr, VUE_PR, d.w, d.h)} fill="none" stroke={OR} strokeWidth={1.8} strokeDasharray="6 4" />
          <path d={chemin(F, VUE_PR, d.w, d.h)} fill="none" stroke={VERT} strokeWidth={2.8} />
          <line x1={d.X(x - 0.9)} y1={d.Y(F(x) - 0.9 * fPr(x))} x2={d.X(x + 0.9)} y2={d.Y(F(x) + 0.9 * fPr(x))} stroke={ENCRE} strokeWidth={2} />
          <circle cx={d.X(0)} cy={d.Y(C)} r={4} fill={VERT} />
          <text x={d.w - 8} y={16} fontSize={12} textAnchor="end"><tspan fill={VERT}>━ F</tspan>  <tspan fill={OR}>┅ f</tspan></text>
          <Poignee cx={d.X(x)} cy={d.Y(F(x))} prise={prise === 'x'} couleur={VERT} onPointerDown={surDown('x')} label="x" />
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Logarithme : l'aire sous 1/t

const VUE_LN: Vue = { x0: -0.3, x1: 6.3, y0: -2.2, y1: 3 };

export const VisuLn: React.FC = () => {
  const [x, setX] = useState(3);
  const d = useDessin(VUE_LN);
  const { svgProps, surDown, prise } = useGlisser((_id, px) => setX(Math.max(0.15, Math.min(6, px))), d);
  let aire = `M${d.X(1)},${d.Y(0)}`;
  const n = 60;
  for (let i = 0; i <= n; i++) { const t = 1 + ((x - 1) * i) / n; aire += `L${d.X(t)},${d.Y(1 / t)}`; }
  aire += `L${d.X(x)},${d.Y(0)}Z`;
  return (
    <Cadre titre="Fonction logarithme népérien" consigne="Déplace x : ln x est l'aire sous la courbe de 1/t entre 1 et x (comptée négativement si x < 1)."
      message={<><K t={`\\ln(${nb(x)})\\approx${nb(Math.log(x), 3)}`} /> : <K t="\ln" /> est la primitive de <K t="\tfrac1x" /> sur <K t="]0\,;+\infty[" /> qui s'annule en 1.
        {x < 1 ? <> Pour <K t="0<x<1" />, <K t="\ln x<0" />.</> : <> Elle croît, mais de plus en plus lentement : <K t="\lim_{x\to+\infty}\tfrac{\ln x}{x}=0" />.</>}</>}>
      <div ref={d.ref}>
        <svg width={d.w} height={d.h} {...svgProps} className="block select-none">
          <Repere vue={VUE_LN} w={d.w} h={d.h} />
          <path d={aire} fill={x >= 1 ? VERT : OR} opacity={0.18} />
          <path d={chemin((t) => (t > 0.05 ? 1 / t : NaN), VUE_LN, d.w, d.h, 0.3)} fill="none" stroke={GRIS} strokeWidth={1.8} />
          <path d={chemin((t) => (t > 0.02 ? Math.log(t) : NaN), VUE_LN, d.w, d.h, 0.1)} fill="none" stroke={VERT} strokeWidth={2.6} />
          <line x1={d.X(x)} x2={d.X(x)} y1={d.Y(0)} y2={d.Y(Math.log(x))} stroke={ENCRE} strokeDasharray="3 3" />
          <circle cx={d.X(x)} cy={d.Y(Math.log(x))} r={5} fill={VERT} />
          <text x={d.X(5.6)} y={d.Y(1 / 5.6) - 8} fontSize={12.5} fill={GRIS} fontStyle="italic">y = 1/t</text>
          <text x={d.X(5.6)} y={d.Y(Math.log(5.6)) - 8} fontSize={12.5} fill={VERT} fontStyle="italic">y = ln x</text>
          <Poignee cx={d.X(x)} cy={d.Y(0)} prise={prise === 'x'} couleur={ENCRE} onPointerDown={surDown('x')} label="x" />
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Exponentielle : exp' = exp

const VUE_EX: Vue = { x0: -4, x1: 2.6, y0: -1.5, y1: 8 };

export const VisuExp: React.FC = () => {
  const [a, setA] = useState(1);
  const [tg0, setTg0] = useState(true);
  const d = useDessin(VUE_EX);
  const { svgProps, surDown, prise } = useGlisser((_id, px) => setA(Math.max(-3.8, Math.min(2, px))), d);
  const ea = Math.exp(a);
  return (
    <Cadre titre="Fonction exponentielle" consigne="Déplace le point : la pente de la tangente est égale à la hauteur du point."
      reglages={<Case label="Tangente en 0 : y = x + 1" coche={tg0} onChange={setTg0} />}
      message={<>En <K t={`a=${nb(a)}`} /> : hauteur <K t={`e^a\\approx${nb(ea)}`} /> et pente <K t={`\\exp'(a)=e^a\\approx${nb(ea)}`} /> : <b>c'est le même nombre</b> (<K t="\exp'=\exp" />).
        {tg0 && <> La courbe est toujours au-dessus de sa tangente en 0 : <K t="e^x\geq x+1" />.</>}</>}>
      <div ref={d.ref}>
        <svg width={d.w} height={d.h} {...svgProps} className="block select-none">
          <Repere vue={VUE_EX} w={d.w} h={d.h} />
          {tg0 && <path d={chemin((x) => x + 1, VUE_EX, d.w, d.h)} fill="none" stroke={GRIS} strokeDasharray="6 4" />}
          <path d={chemin((x) => ea + ea * (x - a), VUE_EX, d.w, d.h)} fill="none" stroke={OR} strokeWidth={1.8} />
          <path d={chemin(Math.exp, VUE_EX, d.w, d.h)} fill="none" stroke={VERT} strokeWidth={2.6} />
          <line x1={d.X(a)} x2={d.X(a)} y1={d.Y(0)} y2={d.Y(ea)} stroke={ENCRE} strokeWidth={2} />
          {/* Le triangle de pente : 1 vers la droite, e^a vers le haut. */}
          <path d={`M${d.X(a - 1)},${d.Y(0)}L${d.X(a)},${d.Y(0)}`} stroke={OR} strokeWidth={2} />
          <text x={d.X(a - 0.5)} y={d.Y(0) + 15} fontSize={12.5} fill={OR} textAnchor="middle">1</text>
          <Poignee cx={d.X(a)} cy={d.Y(ea)} prise={prise === 'a'} couleur={VERT} onPointerDown={surDown('a')} label="point" />
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Suites arithmétiques et géométriques

export const VisuArithGeo: React.FC = () => {
  const [genre, setGenre] = useState<'arith' | 'geo'>('geo');
  const [u0, setU0] = useState(1);
  const [r, setR] = useState(0.5);
  const [q, setQ] = useState(0.8);
  const N = 14;
  const u = Array.from({ length: N + 1 }, (_, n) => (genre === 'arith' ? u0 + n * r : u0 * q ** n));
  const fin = u.filter(Number.isFinite);
  const lo = Math.min(0, ...fin), hi = Math.max(0.5, ...fin);
  const vue: Vue = { x0: -0.8, x1: N + 0.8, y0: lo - (hi - lo) * 0.12, y1: hi + (hi - lo) * 0.12 };
  const d = useDessin(vue, 0.5);
  const comportement = genre === 'arith'
    ? (r > 0 ? <>raison <K t="r>0" /> : la suite <b>croît</b> d'un pas constant et tend vers <K t="+\infty" />.</> : r < 0 ? <>raison <K t="r<0" /> : elle <b>décroît</b> d'un pas constant vers <K t="-\infty" />.</> : <>raison nulle : suite constante.</>)
    : (Math.abs(q) < 1 ? <><K t="-1<q<1" /> : <K t="q^n\to0" />, la suite <b>tend vers 0</b>{q < 0 ? ' en changeant de signe' : ''}.</>
      : q === 1 ? <><K t="q=1" /> : suite constante.</> : q > 1 ? <><K t="q>1" /> : <K t="q^n\to+\infty" />, la suite <b>explose</b>.</> : <><K t="q\leq-1" /> : la suite <b>n'a pas de limite</b> (elle oscille).</>);
  return (
    <Cadre titre="Suites arithmétiques et géométriques" consigne="Arithmétique : on AJOUTE r à chaque pas. Géométrique : on MULTIPLIE par q."
      reglages={<>
        <Choix options={[{ id: 'arith', label: 'arithmétique' }, { id: 'geo', label: 'géométrique' }]} valeur={genre} onChange={(v) => setGenre(v as 'arith' | 'geo')} />
        <Curseur label={<K t="u_0" />} min={-3} max={3} pas={0.1} valeur={u0} onChange={setU0} />
        {genre === 'arith' ? <Curseur label={<K t="r" />} min={-1} max={1} pas={0.05} valeur={r} onChange={setR} />
          : <Curseur label={<K t="q" />} min={-1.5} max={1.5} pas={0.05} valeur={q} onChange={setQ} />}
      </>}
      message={<>{genre === 'arith' ? <K t={`u_n=u_0+nr`} /> : <K t={`u_n=u_0\\times q^n`} />} — {comportement}</>}>
      <div ref={d.ref}>
        <svg width={d.w} height={d.h} className="block">
          <Repere vue={vue} w={d.w} h={d.h} etiquettes={false} pas={Math.max(1, Math.round((vue.y1 - vue.y0) / 6))} />
          {u.map((v, n) => Number.isFinite(v) && <circle key={n} cx={d.X(n)} cy={d.Y(v)} r={4.2} fill={VERT} />)}
          {u.slice(0, -1).map((v, n) => Number.isFinite(v) && Number.isFinite(u[n + 1]) && (
            <line key={`l${n}`} x1={d.X(n)} y1={d.Y(v)} x2={d.X(n + 1)} y2={d.Y(u[n + 1])} stroke={OR} opacity={0.45} />
          ))}
          {[0, 5, 10].map((n) => <text key={n} x={d.X(n)} y={d.h - 4} fontSize={10.5} fill={GRIS} textAnchor="middle">{n}</text>)}
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Fonctions usuelles : x ↦ (ax + b)/(cx + d)

const VUE_HO: Vue = { x0: -6, x1: 6, y0: -5, y1: 5 };

export const VisuHomographique: React.FC = () => {
  const [a, setA] = useState(2);
  const [b, setB] = useState(1);
  const [dd, setDd] = useState(-1);
  const c = 1;
  const d = useDessin(VUE_HO);
  const f = (x: number) => (a * x + b) / (c * x + dd);
  const xv = -dd / c, yh = a / c;
  const constante = Math.abs(a * dd - b * c) < 1e-6;
  return (
    <Cadre titre="Fonction homographique x ↦ (ax + b)/(x + d)" consigne="Change a, b, d : la courbe est une hyperbole qui tourne autour de ses deux asymptotes."
      reglages={<><Curseur label={<K t="a" />} min={-3} max={3} pas={0.1} valeur={a} onChange={setA} /><Curseur label={<K t="b" />} min={-4} max={4} pas={0.1} valeur={b} onChange={setB} /><Curseur label={<K t="d" />} min={-3} max={3} pas={0.1} valeur={dd} onChange={setDd} /></>}
      message={constante ? <><K t="ad-b=0" /> : la fonction est <b>constante</b> (une droite horizontale privée d'un point).</>
        : <>Asymptote verticale <K t={`x=${nb(xv)}`} /> (là où le dénominateur s'annule), asymptote horizontale <K t={`y=${nb(yh)}`} />. Le centre <K t={`\\Omega(${nb(xv)}\\,;\\,${nb(yh)})`} /> est un centre de symétrie.</>}>
      <div ref={d.ref}>
        <svg width={d.w} height={d.h} className="block">
          <Repere vue={VUE_HO} w={d.w} h={d.h} />
          <line x1={d.X(xv)} x2={d.X(xv)} y1={0} y2={d.h} stroke={OR} strokeDasharray="6 4" />
          <line x1={0} x2={d.w} y1={d.Y(yh)} y2={d.Y(yh)} stroke={OR} strokeDasharray="6 4" />
          <path d={chemin((x) => (Math.abs(x - xv) < 0.02 ? NaN : f(x)), VUE_HO, d.w, d.h, VUE_HO.x0, VUE_HO.x1, xv)} fill="none" stroke={VERT} strokeWidth={2.6} />
          <circle cx={d.X(xv)} cy={d.Y(yh)} r={4} fill={ENCRE} />
        </svg>
      </div>
    </Cadre>
  );
};
