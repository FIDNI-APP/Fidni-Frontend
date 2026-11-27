/**
 * Trois théorèmes vus sur une courbe qu'on déforme à la main (27/11/2026, Natsu : « comprendre graphiquement et
 * interpréter graphiquement le théorème de Rolle, le TVI, les accroissements finis »).
 *
 * La courbe passe par cinq points qu'on attrape (de a à b). Chaque visualisation montre ce que le théorème promet
 * (les points c), et ce qui se passe quand on casse une hypothèse (continuité, f(a) = f(b)).
 */
import React, { useMemo, useState } from 'react';
import {
  Cadre, Case, ENCRE, GRIS, K, OR, Poignee, Repere, VERT, chemin, echelle, fmt, spline, useGlisser, useLargeur, zeros,
  type Vue,
} from './outils';

const A = -3, B = 3;
const XS = [-3, -1.5, 0, 1.5, 3];
const VUE: Vue = { x0: -4, x1: 4, y0: -3, y1: 3.6 };
const borne = (y: number) => Math.max(VUE.y0 + 0.3, Math.min(VUE.y1 - 0.3, y));
const liste = (cs: number[]) => cs.map((c) => fmt(c)).join(' ; ');

/** Dessin commun : repère, courbe, points a et b sur l'axe, poignées. */
function useFigure() {
  const [ref, w] = useLargeur();
  const h = Math.round(Math.min(360, Math.max(250, w * 0.6)));
  const e = echelle(VUE, w, h);
  return { ref, w, h, ...e };
}

const Graduation: React.FC<{ x: number; label: string; X: (x: number) => number; Y: (y: number) => number; couleur?: string }> = ({ x, label, X, Y, couleur = ENCRE }) => (
  <text x={X(x)} y={Y(0) + 15} fontSize={13} fill={couleur} textAnchor="middle" fontStyle="italic">{label}</text>
);

// ───────────────────────────── TVI

export const VisuTVI: React.FC = () => {
  const [ys, setYs] = useState([-1.6, 1.4, -0.4, 0.9, 2.2]);
  const [k, setK] = useState(0.5);
  const [discontinue, setDiscontinue] = useState(false);
  const fig = useFigure();
  const { X, Y } = fig;
  const SAUT = 1.8, M = 0.75;
  const f = useMemo(() => {
    const s = spline(XS, ys.map((y, i) => (discontinue && XS[i] > M ? y - SAUT : y))).f;
    return (x: number) => s(x) + (discontinue && x > M ? SAUT : 0);
  }, [ys, discontinue]);
  const sols = zeros((x) => f(x) - k, A, B, 600).filter((c) => Math.abs(f(c) - k) < 0.05);
  const fa = f(A), fb = f(B);
  const entre = (k - fa) * (k - fb) <= 0;
  const { svgProps, surDown, prise } = useGlisser((id, _x, y) => {
    if (id === 'k') setK(borne(y));
    else setYs((v) => v.map((yy, i) => (String(i) === id ? borne(y) : yy)));
  }, fig);

  let message: React.ReactNode;
  if (entre && sols.length) {
    message = <>
      <K t="k" /> est entre <K t="f(a)" /> et <K t="f(b)" /> {discontinue ? '' : <>et <K t="f" /> est continue </>}: la droite <K t="y=k" /> coupe la courbe{' '}
      <b>{sols.length > 1 ? `en ${sols.length} points` : 'en un point'}</b> (<K t="c" /> ≈ {liste(sols)}).
      {discontinue && <> Ici <K t="f" /> n'est pas continue : ces solutions sont là par chance.</>}
      {!discontinue && sols.length > 1 && <> Pour une seule solution, il faut <K t="f" /> strictement monotone.</>}
    </>;
  } else if (entre) {
    message = <><K t="k" /> est entre <K t="f(a)" /> et <K t="f(b)" />, mais <K t="f" /> n'est pas continue : elle <b>saute par-dessus</b> la droite, aucune solution. C'est pour ça que le TVI exige la continuité.</>;
  } else {
    message = <><K t="k" /> n'est pas entre <K t="f(a)" /> et <K t="f(b)" /> : le TVI ne promet rien (ici {sols.length ? `${sols.length} solution${sols.length > 1 ? 's' : ''}, par hasard` : 'aucune solution'}).</>;
  }

  return (
    <Cadre titre="Théorème des valeurs intermédiaires"
      consigne="Déplace les points de la courbe et la droite y = k (point or à gauche)."
      reglages={<Case label="Rendre f non continue" coche={discontinue} onChange={(v) => {
        setDiscontinue(v);
        // Non continue : une courbe qui monte et saute par-dessus y = k (aucune solution), le cas qui fait comprendre.
        if (v) { setYs([-2, -1.4, -0.9, 1.6, 2.4]); setK(0.2); } else { setYs([-1.6, 1.4, -0.4, 0.9, 2.2]); setK(0.5); }
      }} />}
      message={message}>
      <div ref={fig.ref}>
        <svg width={fig.w} height={fig.h} {...svgProps} className="block select-none">
          <Repere vue={VUE} w={fig.w} h={fig.h} sauf={[A, B]} />
          {/* Bande entre f(a) et f(b) : là où k doit être. */}
          <rect x={0} width={X(A) - 2} y={Y(Math.max(fa, fb))} height={Math.abs(Y(fa) - Y(fb))} fill={VERT} opacity={0.12} />
          <line x1={X(A) - 26} x2={X(B) + 10} y1={Y(k)} y2={Y(k)} stroke={OR} strokeWidth={1.8} strokeDasharray="6 4" />
          <text x={X(B) + 14} y={Y(k) + 4} fontSize={13} fill={OR} fontStyle="italic">y = k</text>
          <line x1={X(A)} x2={X(A)} y1={Y(0)} y2={Y(fa)} stroke={GRIS} strokeDasharray="3 3" />
          <line x1={X(B)} x2={X(B)} y1={Y(0)} y2={Y(fb)} stroke={GRIS} strokeDasharray="3 3" />
          <path d={chemin(f, VUE, fig.w, fig.h, A, B, discontinue ? M : undefined)} fill="none" stroke={VERT} strokeWidth={2.6} />
          {discontinue && <><circle cx={X(M)} cy={Y(f(M))} r={4} fill={VERT} /><circle cx={X(M)} cy={Y(f(M + 1e-6))} r={4} fill="#fff" stroke={VERT} strokeWidth={2} /></>}
          {sols.map((c) => (
            <g key={c}>
              <line x1={X(c)} x2={X(c)} y1={Y(k)} y2={Y(0)} stroke={OR} strokeDasharray="3 3" />
              <circle cx={X(c)} cy={Y(k)} r={5.5} fill={OR} />
              <text x={X(c)} y={Y(0) + 15} fontSize={13} fill={OR} textAnchor="middle" fontStyle="italic">c</text>
            </g>
          ))}
          <Graduation x={A} label="a" X={X} Y={Y} />
          <Graduation x={B} label="b" X={X} Y={Y} />
          {ys.map((y, i) => <Poignee key={i} cx={X(XS[i])} cy={Y(y)} prise={prise === String(i)} couleur={VERT} onPointerDown={surDown(String(i))} label={`point ${i + 1}`} />)}
          <Poignee cx={X(A) - 26} cy={Y(k)} prise={prise === 'k'} couleur={OR} onPointerDown={surDown('k')} label="k" />
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Rolle

export const VisuRolle: React.FC = () => {
  const [ys, setYs] = useState([0.6, 2.2, 0.2, -1.4, 0.6]);
  const [casse, setCasse] = useState(false);
  const fig = useFigure();
  const { X, Y } = fig;
  const { f, df } = useMemo(() => spline(XS, ys), [ys]);
  const cs = zeros(df, A + 0.01, B - 0.01, 600);
  const { svgProps, surDown, prise } = useGlisser((id, _x, y) => {
    const i = Number(id), v = borne(y);
    setYs((old) => old.map((yy, j) => (j === i || (!casse && (i === 0 || i === 4) && (j === 0 || j === 4)) ? v : yy)));
  }, fig);
  const egaux = Math.abs(ys[0] - ys[4]) < 1e-9;

  const message = egaux ? (
    <><K t="f(a)=f(b)" /> : la courbe part et revient <b>à la même hauteur</b>, elle doit faire demi-tour. Au sommet du demi-tour, la tangente est horizontale :{' '}
      <K t="f'(c)=0" /> (ici {cs.length > 1 ? `${cs.length} points` : 'un point'}, <K t="c" /> ≈ {liste(cs)}).</>
  ) : cs.length ? (
    <><K t="f(a)\neq f(b)" /> : il reste {cs.length > 1 ? `${cs.length} tangentes horizontales` : 'une tangente horizontale'}, mais <b>par hasard</b> : Rolle ne le garantit plus.</>
  ) : (
    <><K t="f(a)\neq f(b)" /> : <b>aucune tangente horizontale</b>. Sans <K t="f(a)=f(b)" />, Rolle ne promet rien.</>
  );

  return (
    <Cadre titre="Théorème de Rolle" consigne="Déforme la courbe : les extrémités A et B restent à la même hauteur."
      reglages={<Case label="Casser l'hypothèse f(a) = f(b)" coche={casse} onChange={(v) => { setCasse(v); if (!v) setYs((o) => [o[0], o[1], o[2], o[3], o[0]]); else setYs((o) => [o[0], o[1], o[2], o[3], borne(o[4] + 1.4)]); }} />}
      message={message}>
      <div ref={fig.ref}>
        <svg width={fig.w} height={fig.h} {...svgProps} className="block select-none">
          <Repere vue={VUE} w={fig.w} h={fig.h} sauf={[A, B]} />
          <line x1={X(A)} x2={X(B)} y1={Y(ys[0])} y2={Y(ys[4])} stroke={OR} strokeWidth={1.6} strokeDasharray="6 4" />
          <path d={chemin(f, VUE, fig.w, fig.h, A, B)} fill="none" stroke={VERT} strokeWidth={2.6} />
          {cs.map((c) => (
            <g key={c}>
              <line x1={X(c - 0.9)} x2={X(c + 0.9)} y1={Y(f(c))} y2={Y(f(c))} stroke={egaux ? OR : GRIS} strokeWidth={2.4} />
              <line x1={X(c)} x2={X(c)} y1={Y(f(c))} y2={Y(0)} stroke={GRIS} strokeDasharray="3 3" />
              <circle cx={X(c)} cy={Y(f(c))} r={5} fill={egaux ? OR : GRIS} />
              <text x={X(c)} y={Y(0) + 15} fontSize={13} fill={egaux ? OR : GRIS} textAnchor="middle" fontStyle="italic">c</text>
            </g>
          ))}
          <Graduation x={A} label="a" X={X} Y={Y} />
          <Graduation x={B} label="b" X={X} Y={Y} />
          <text x={X(A) - 14} y={Y(ys[0]) - 10} fontSize={13} fill={ENCRE}>A</text>
          <text x={X(B) + 8} y={Y(ys[4]) - 10} fontSize={13} fill={ENCRE}>B</text>
          {ys.map((y, i) => <Poignee key={i} cx={X(XS[i])} cy={Y(y)} prise={prise === String(i)} couleur={i === 0 || i === 4 ? ENCRE : VERT} onPointerDown={surDown(String(i))} label={`point ${i + 1}`} />)}
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Accroissements finis

export const VisuTAF: React.FC = () => {
  const [ys, setYs] = useState([-1.8, 0.8, 0.6, 0.4, 1.9]);
  const fig = useFigure();
  const { X, Y } = fig;
  const { f, df } = useMemo(() => spline(XS, ys), [ys]);
  const pente = (ys[4] - ys[0]) / (B - A);
  const cs = zeros((x) => df(x) - pente, A + 0.01, B - 0.01, 600);
  const { svgProps, surDown, prise } = useGlisser((id, _x, y) => {
    setYs((v) => v.map((yy, i) => (String(i) === id ? borne(y) : yy)));
  }, fig);

  const message = (
    <>La pente de la corde <K t="[AB]" /> vaut <K t={`\\dfrac{f(b)-f(a)}{b-a}\\approx ${fmt(pente).replace(',', '{,}')}`} />. En <K t="c" /> ≈ {liste(cs) || '—'},
      la tangente est <b>parallèle à la corde</b> : <K t="f'(c)=\dfrac{f(b)-f(a)}{b-a}" />.
      {Math.abs(pente) < 0.03 && <> Corde horizontale : c'est le théorème de Rolle.</>}</>
  );

  return (
    <Cadre titre="Théorème des accroissements finis" consigne="Déforme la courbe ou déplace A et B : regarde les tangentes parallèles à la corde."
      message={message}>
      <div ref={fig.ref}>
        <svg width={fig.w} height={fig.h} {...svgProps} className="block select-none">
          <Repere vue={VUE} w={fig.w} h={fig.h} sauf={[A, B]} />
          {/* La corde, prolongée un peu. */}
          <line x1={X(A - 0.6)} x2={X(B + 0.6)} y1={Y(ys[0] - 0.6 * pente)} y2={Y(ys[4] + 0.6 * pente)} stroke={OR} strokeWidth={1.8} strokeDasharray="6 4" />
          <path d={chemin(f, VUE, fig.w, fig.h, A, B)} fill="none" stroke={VERT} strokeWidth={2.6} />
          {cs.map((c) => (
            <g key={c}>
              <line x1={X(c - 1.1)} x2={X(c + 1.1)} y1={Y(f(c) - 1.1 * pente)} y2={Y(f(c) + 1.1 * pente)} stroke={OR} strokeWidth={2.4} />
              <line x1={X(c)} x2={X(c)} y1={Y(f(c))} y2={Y(0)} stroke={GRIS} strokeDasharray="3 3" />
              <circle cx={X(c)} cy={Y(f(c))} r={5} fill={OR} />
              <text x={X(c)} y={Y(0) + 15} fontSize={13} fill={OR} textAnchor="middle" fontStyle="italic">c</text>
            </g>
          ))}
          <Graduation x={A} label="a" X={X} Y={Y} />
          <Graduation x={B} label="b" X={X} Y={Y} />
          <text x={X(A) - 14} y={Y(ys[0]) - 10} fontSize={13} fill={ENCRE}>A</text>
          <text x={X(B) + 8} y={Y(ys[4]) - 10} fontSize={13} fill={ENCRE}>B</text>
          {ys.map((y, i) => <Poignee key={i} cx={X(XS[i])} cy={Y(y)} prise={prise === String(i)} couleur={i === 0 || i === 4 ? ENCRE : VERT} onPointerDown={surDown(String(i))} label={`point ${i + 1}`} />)}
        </svg>
      </div>
    </Cadre>
  );
};
