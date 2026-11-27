/**
 * Visualisations d'algèbre (28/11/2026, Natsu : « des visualisations pour toutes les leçons ») : logique, division
 * euclidienne, ensembles, applications, valeur absolue, identités remarquables, second degré, polynômes.
 */
import React, { useState } from 'react';
import { Cadre, Choix, Curseur, ENCRE, GRIS, K, OR, Poignee, Repere, VERT, chemin, echelle, fmt, useGlisser, useLargeur, zeros, type Vue } from './outils';

const nb = (v: number, d = 2) => fmt(v, d).replace(',', '{,}');
const V = (b: boolean) => (b ? 'V' : 'F');

// ───────────────────────────── Logique : table de vérité

export const VisuLogique: React.FC = () => {
  const [p, setP] = useState(true);
  const [q, setQ] = useState(false);
  const lignes: [boolean, boolean][] = [[true, true], [true, false], [false, true], [false, false]];
  const cols: { tex: string; f: (a: boolean, b: boolean) => boolean }[] = [
    { tex: '\\neg P', f: (a) => !a }, { tex: 'P\\wedge Q', f: (a, b) => a && b }, { tex: 'P\\vee Q', f: (a, b) => a || b },
    { tex: 'P\\Rightarrow Q', f: (a, b) => !a || b }, { tex: 'P\\Leftrightarrow Q', f: (a, b) => a === b },
  ];
  const bouton = (val: boolean, set: (v: boolean) => void, nom: string) => (
    <button type="button" onClick={() => set(!val)} className={`h-8 rounded-full px-3 text-[13px] font-semibold ${val ? 'bg-[#e6f2ea] text-[#15633c]' : 'bg-[#f4ecdf] text-[#8a5f17]'}`}>
      {nom} : {val ? 'vraie' : 'fausse'}
    </button>
  );
  return (
    <Cadre titre="Table de vérité" consigne="Change la valeur de P et de Q : la ligne correspondante s'allume."
      reglages={<>{bouton(p, setP, 'P')}{bouton(q, setQ, 'Q')}</>}
      message={!p ? <><K t="P" /> est fausse : <K t="P\Rightarrow Q" /> est <b>vraie quoi que dise Q</b>. Une implication n'est fausse que dans un cas : <K t="P" /> vraie et <K t="Q" /> fausse.</>
        : q ? <><K t="P" /> et <K t="Q" /> sont vraies : toutes les combinaisons sont vraies sauf <K t="\neg P" />.</>
          : <><K t="P" /> vraie et <K t="Q" /> fausse : c'est <b>le seul cas</b> où <K t="P\Rightarrow Q" /> est fausse. Pour la nier : <K t="P\wedge\neg Q" />.</>}>
      <table className="w-full text-center text-[14px]">
        <thead><tr className="border-b border-[#ece8e0] text-[#5b564d]">
          <th className="py-2"><K t="P" /></th><th><K t="Q" /></th>{cols.map((c) => <th key={c.tex}><K t={c.tex} /></th>)}
        </tr></thead>
        <tbody>{lignes.map(([a, b]) => {
          const actif = a === p && b === q;
          return (
            <tr key={`${a}${b}`} className={actif ? 'bg-[#eef5f0] font-semibold' : ''}>
              <td className="py-1.5">{V(a)}</td><td>{V(b)}</td>
              {cols.map((c) => <td key={c.tex} style={{ color: c.f(a, b) ? VERT : OR }}>{V(c.f(a, b))}</td>)}
            </tr>
          );
        })}</tbody>
      </table>
    </Cadre>
  );
};

// ───────────────────────────── Division euclidienne

export const VisuDivision: React.FC = () => {
  const [a, setA] = useState(23);
  const [b, setB] = useState(5);
  const q = Math.floor(a / b), r = a % b;
  const [ref, w] = useLargeur();
  const u = Math.min(28, (w - 20) / Math.max(a, 1));
  return (
    <Cadre titre="Division euclidienne" consigne="On range a cases par paquets de b : q paquets complets, et il reste r < b cases."
      reglages={<><Curseur label={<K t="a" />} min={1} max={60} pas={1} valeur={a} onChange={setA} affichage={String(a)} />
        <Curseur label={<K t="b" />} min={1} max={12} pas={1} valeur={b} onChange={setB} affichage={String(b)} /></>}
      message={<><K t={`${a}=${b}\\times ${q}+${r}`} /> avec <K t={`0\\leq ${r}<${b}`} /> : quotient <K t={`q=${q}`} />, reste <K t={`r=${r}`} />.
        {r === 0 && <> Le reste est nul : <b><K t={`${b}`} /> divise <K t={`${a}`} /></b>.</>}</>}>
      <div ref={ref} className="p-3">
        <svg width={w - 24} height={56} className="block">
          {Array.from({ length: a }, (_, i) => {
            const paquet = Math.floor(i / b);
            const reste = i >= q * b;
            return <rect key={i} x={i * u + paquet * 3} y={10} width={u - 2} height={30} rx={3}
              fill={reste ? OR : paquet % 2 ? '#3f9a68' : VERT} opacity={reste ? 0.85 : 1} />;
          })}
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Ensembles (diagramme de Venn)

const OPS = {
  inter: { label: 'A ∩ B', tex: 'A\\cap B', dans: (a: boolean, b: boolean) => a && b, texte: 'les éléments qui sont dans A ET dans B' },
  union: { label: 'A ∪ B', tex: 'A\\cup B', dans: (a: boolean, b: boolean) => a || b, texte: 'les éléments qui sont dans A OU dans B (ou les deux)' },
  diff: { label: 'A \\ B', tex: 'A\\setminus B', dans: (a: boolean, b: boolean) => a && !b, texte: 'les éléments de A qui ne sont pas dans B' },
  comp: { label: 'complémentaire de A', tex: '\\overline{A}', dans: (a: boolean) => !a, texte: 'les éléments de E qui ne sont pas dans A' },
} as const;
type Op = keyof typeof OPS;

export const VisuEnsembles: React.FC = () => {
  const [op, setOp] = useState<Op>('inter');
  const [ref, w] = useLargeur();
  const h = 230, cx = w / 2, r = Math.min(90, w / 5);
  const ca = { x: cx - r * 0.55, y: h / 2 }, cb = { x: cx + r * 0.55, y: h / 2 };
  // Zone coloriée : découpe exacte des disques (masques SVG), pas de quadrillage.
  const disque = (c: { x: number; y: number }, couleur: string) => <circle cx={c.x} cy={c.y} r={r} fill={couleur} />;
  const fond = <rect x={8} y={8} width={w - 16} height={h - 16} rx={10} fill="white" />;
  const masques: Record<Op, React.ReactNode> = {
    inter: <>{disque(ca, 'white')}</>,
    union: <>{disque(ca, 'white')}{disque(cb, 'white')}</>,
    diff: <>{disque(ca, 'white')}{disque(cb, 'black')}</>,
    comp: <>{fond}{disque(ca, 'black')}</>,
  };
  const zone = op === 'inter'
    ? <g mask="url(#fd-venn-m)"><circle cx={cb.x} cy={cb.y} r={r} fill={VERT} opacity={0.3} /></g>
    : <rect x={8} y={8} width={w - 16} height={h - 16} rx={10} fill={VERT} opacity={0.3} mask="url(#fd-venn-m)" />;
  return (
    <Cadre titre="Opérations sur les ensembles" consigne="Choisis une opération : la partie coloriée est l'ensemble obtenu."
      reglages={<Choix options={Object.entries(OPS).map(([id, o]) => ({ id, label: o.label }))} valeur={op} onChange={(v) => setOp(v as Op)} />}
      message={<><K t={OPS[op].tex} /> : {OPS[op].texte}.</>}>
      <div ref={ref}>
        <svg width={w} height={h} className="block">
          <defs><mask id="fd-venn-m">{masques[op]}</mask></defs>
          {zone}
          <rect x={8} y={8} width={w - 16} height={h - 16} fill="none" stroke={GRIS} rx={10} />
          <text x={18} y={28} fontSize={14} fontStyle="italic" fill={GRIS}>E</text>
          <circle cx={ca.x} cy={ca.y} r={r} fill="none" stroke={ENCRE} strokeWidth={1.8} />
          <circle cx={cb.x} cy={cb.y} r={r} fill="none" stroke={OR} strokeWidth={1.8} />
          <text x={ca.x - r * 0.75} y={ca.y - r * 0.75} fontSize={15} fontStyle="italic" fill={ENCRE}>A</text>
          <text x={cb.x + r * 0.62} y={cb.y - r * 0.75} fontSize={15} fontStyle="italic" fill={OR}>B</text>
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Applications : injective, surjective, bijective

export const VisuApplications: React.FC = () => {
  const E = ['1', '2', '3', '4'], F = ['a', 'b', 'c', 'd'];
  const [img, setImg] = useState([0, 1, 1, 3]);
  const [ref, w] = useLargeur();
  const h = 230;
  const yE = (i: number) => 40 + i * 48, xE = w * 0.25, xF = w * 0.75;
  const injective = new Set(img).size === img.length;
  const surjective = F.every((_, j) => img.includes(j));
  const nature = injective && surjective ? 'bijective' : injective ? 'injective mais pas surjective' : surjective ? 'surjective mais pas injective' : 'ni injective ni surjective';
  return (
    <Cadre titre="Injective, surjective, bijective" consigne="Clique sur un élément de E pour changer son image dans F."
      message={<>L'application est <b>{nature}</b>.{' '}
        {!injective && <>Deux éléments de E ont <b>la même image</b> : pas injective. </>}
        {!surjective && <>Un élément de F <b>n'est atteint par aucune flèche</b> : pas surjective. </>}
        {injective && surjective && <>Chaque élément de F reçoit <b>exactement une</b> flèche : on peut remonter les flèches, c'est la bijection réciproque.</>}</>}>
      <div ref={ref}>
        <svg width={w} height={h} className="block select-none">
          <defs><marker id="fd-fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill={VERT} /></marker></defs>
          <ellipse cx={xE} cy={h / 2 - 3} rx={46} ry={h / 2 - 12} fill="#fbfaf8" stroke={GRIS} />
          <ellipse cx={xF} cy={h / 2 - 3} rx={46} ry={h / 2 - 12} fill="#fbfaf8" stroke={GRIS} />
          <text x={xE - 60} y={22} fontSize={15} fontStyle="italic">E</text>
          <text x={xF + 50} y={22} fontSize={15} fontStyle="italic">F</text>
          {img.map((j, i) => <line key={i} x1={xE + 10} y1={yE(i)} x2={xF - 14} y2={yE(j)} stroke={VERT} strokeWidth={1.8} markerEnd="url(#fd-fl)" />)}
          {E.map((e, i) => (
            <g key={e} style={{ cursor: 'pointer' }} onClick={() => setImg((v) => v.map((x, k) => (k === i ? (x + 1) % F.length : x)))}>
              <circle cx={xE} cy={yE(i)} r={13} fill="#fff" stroke={ENCRE} strokeWidth={1.6} />
              <text x={xE} y={yE(i) + 5} fontSize={14} textAnchor="middle">{e}</text>
            </g>
          ))}
          {F.map((f, j) => {
            const atteint = img.includes(j);
            return (
              <g key={f}>
                <circle cx={xF} cy={yE(j)} r={13} fill={atteint ? '#fff' : '#f4ecdf'} stroke={atteint ? ENCRE : OR} strokeWidth={1.6} />
                <text x={xF} y={yE(j) + 5} fontSize={14} textAnchor="middle" fontStyle="italic">{f}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Valeur absolue : une distance

const VUE_ABS: Vue = { x0: -6.5, x1: 6.5, y0: -1, y1: 1 };

export const VisuValeurAbsolue: React.FC = () => {
  const [a, setA] = useState(1);
  const [r, setR] = useState(2);
  const [x, setX] = useState(-2.5);
  const [ref, w] = useLargeur();
  const h = 120;
  const e = echelle(VUE_ABS, w, h);
  const { X } = e;
  const y0 = 62;
  const { svgProps, surDown, prise } = useGlisser((id, px) => {
    const v = Math.round(Math.max(-6, Math.min(6, px)) * 10) / 10;
    if (id === 'a') setA(v); else setX(v);
  }, e);
  const d = Math.abs(x - a);
  const dedans = d <= r;
  return (
    <Cadre titre="Valeur absolue et distance" consigne="Déplace x et a sur la droite ; la zone verte est l'ensemble des x tels que |x − a| ≤ r."
      reglages={<Curseur label={<K t="r" />} min={0.5} max={5} pas={0.1} valeur={r} onChange={setR} />}
      message={<><K t={`|x-a|=|${nb(x)}-${nb(a)}|=${nb(d)}`} /> : c'est <b>la distance</b> entre <K t="x" /> et <K t="a" />.{' '}
        {dedans ? <><K t="x" /> est à moins de <K t="r" /> de <K t="a" /> : <K t={`x\\in[a-r\\,;\\,a+r]=[${nb(a - r)}\\,;\\,${nb(a + r)}]`} />.</>
          : <><K t="x" /> est trop loin : <K t="|x-a|>r" />.</>}</>}>
      <div ref={ref}>
        <svg width={w} height={h} {...svgProps} className="block select-none">
          <line x1={0} x2={w} y1={y0} y2={y0} stroke={ENCRE} strokeWidth={1.2} />
          {Array.from({ length: 13 }, (_, i) => i - 6).map((t) => (
            <g key={t}><line x1={X(t)} x2={X(t)} y1={y0 - 4} y2={y0 + 4} stroke={GRIS} /><text x={X(t)} y={y0 + 20} fontSize={11} fill={GRIS} textAnchor="middle">{t}</text></g>
          ))}
          <rect x={X(a - r)} width={X(a + r) - X(a - r)} y={y0 - 9} height={18} fill={VERT} opacity={0.18} />
          <path d={`M${X(Math.min(a, x))},${y0 - 26}L${X(Math.max(a, x))},${y0 - 26}`} stroke={dedans ? VERT : OR} strokeWidth={2.4} />
          <text x={(X(a) + X(x)) / 2} y={y0 - 33} fontSize={12.5} fill={dedans ? VERT : OR} textAnchor="middle">{fmt(d)}</text>
          <text x={X(a)} y={y0 - 12} fontSize={13} fontStyle="italic" textAnchor="middle">a</text>
          <text x={X(x)} y={y0 + 36} fontSize={13} fontStyle="italic" textAnchor="middle" fill={OR}>x</text>
          <Poignee cx={X(a)} cy={y0} prise={prise === 'a'} onPointerDown={surDown('a')} label="a" />
          <Poignee cx={X(x)} cy={y0} prise={prise === 'x'} couleur={OR} onPointerDown={surDown('x')} label="x" />
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Identités remarquables : (a + b)²

export const VisuIdentites: React.FC = () => {
  const [a, setA] = useState(3);
  const [b, setB] = useState(1.5);
  const [ref, w] = useLargeur();
  const cote = Math.min(220, w * 0.45);
  const u = cote / (a + b);
  const x0 = (w - cote) / 2, y0 = 12;
  return (
    <Cadre titre="Identité remarquable (a + b)²" consigne="Le grand carré de côté a + b se découpe en quatre morceaux."
      reglages={<><Curseur label={<K t="a" />} min={0.5} max={5} pas={0.1} valeur={a} onChange={setA} /><Curseur label={<K t="b" />} min={0.5} max={5} pas={0.1} valeur={b} onChange={setB} /></>}
      message={<><K t={`(a+b)^2=a^2+2ab+b^2`} /> : un carré <K t="a^2" />, un carré <K t="b^2" />, et <b>deux</b> rectangles <K t="ab" />.
        Ici <K t={`${nb((a + b) ** 2)}=${nb(a * a)}+2\\times${nb(a * b)}+${nb(b * b)}`} />.</>}>
      <div ref={ref}>
        <svg width={w} height={cote + 24} className="block">
          <rect x={x0} y={y0} width={a * u} height={a * u} fill={VERT} opacity={0.25} stroke={VERT} />
          <rect x={x0 + a * u} y={y0} width={b * u} height={a * u} fill={OR} opacity={0.22} stroke={OR} />
          <rect x={x0} y={y0 + a * u} width={a * u} height={b * u} fill={OR} opacity={0.22} stroke={OR} />
          <rect x={x0 + a * u} y={y0 + a * u} width={b * u} height={b * u} fill={GRIS} opacity={0.3} stroke={GRIS} />
          <text x={x0 + (a * u) / 2} y={y0 + (a * u) / 2 + 5} fontSize={15} textAnchor="middle" fontStyle="italic">a²</text>
          <text x={x0 + a * u + (b * u) / 2} y={y0 + (a * u) / 2 + 5} fontSize={13} textAnchor="middle" fontStyle="italic">ab</text>
          <text x={x0 + (a * u) / 2} y={y0 + a * u + (b * u) / 2 + 5} fontSize={13} textAnchor="middle" fontStyle="italic">ab</text>
          <text x={x0 + a * u + (b * u) / 2} y={y0 + a * u + (b * u) / 2 + 5} fontSize={13} textAnchor="middle" fontStyle="italic">b²</text>
        </svg>
      </div>
    </Cadre>
  );
};

// ───────────────────────────── Second degré : discriminant, racines, signe

const VUE_T: Vue = { x0: -5, x1: 5, y0: -5, y1: 6 };

export const VisuTrinome: React.FC = () => {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-1);
  const [c, setC] = useState(-2);
  const [ref, w] = useLargeur();
  const h = Math.round(Math.min(340, Math.max(240, w * 0.55)));
  const { X, Y } = echelle(VUE_T, w, h);
  const f = (x: number) => a * x * x + b * x + c;
  const delta = b * b - 4 * a * c;
  const rac = Math.abs(a) < 1e-9 ? [] : delta < 0 ? [] : delta === 0 ? [-b / (2 * a)] : [(-b - Math.sqrt(delta)) / (2 * a), (-b + Math.sqrt(delta)) / (2 * a)].sort((p, q) => p - q);
  const al = -b / (2 * a), be = f(al);
  return (
    <Cadre titre="Trinôme du second degré" consigne="Fais varier a, b, c : le signe de Δ dit combien de fois la parabole coupe l'axe."
      reglages={<>
        <Curseur label={<K t="a" />} min={-3} max={3} pas={0.1} valeur={a} onChange={(v) => setA(Math.abs(v) < 0.05 ? 0.1 : v)} />
        <Curseur label={<K t="b" />} min={-5} max={5} pas={0.1} valeur={b} onChange={setB} />
        <Curseur label={<K t="c" />} min={-5} max={5} pas={0.1} valeur={c} onChange={setC} />
      </>}
      message={<><K t={`\\Delta=b^2-4ac=${nb(delta)}`} />.{' '}
        {delta > 0 ? <>Deux racines <K t={`x_1\\approx${nb(rac[0])}`} />, <K t={`x_2\\approx${nb(rac[1])}`} /> : le trinôme est du signe de <K t="a" /> <b>à l'extérieur</b> des racines, du signe contraire entre elles.</>
          : delta === 0 ? <>Une racine double : la parabole <b>touche</b> l'axe en son sommet.</>
            : <>Pas de racine : la parabole ne coupe pas l'axe, le trinôme a <b>toujours le signe de</b> <K t="a" />.</>}
        {' '}Sommet <K t={`S(${nb(al)}\\,;\\,${nb(be)})`} /> (forme canonique <K t="a(x-\alpha)^2+\beta" />).</>}>
      <div ref={ref}>
        <svg width={w} height={h} className="block select-none">
          <Repere vue={VUE_T} w={w} h={h} />
          <path d={chemin((x) => (f(x) > 0 ? f(x) : NaN), VUE_T, w, h)} fill="none" stroke={a > 0 ? VERT : VERT} strokeWidth={3} />
          <path d={chemin((x) => (f(x) <= 0 ? f(x) : NaN), VUE_T, w, h)} fill="none" stroke={OR} strokeWidth={3} />
          <line x1={X(al)} x2={X(al)} y1={0} y2={h} stroke={GRIS} strokeDasharray="4 4" />
          <circle cx={X(al)} cy={Y(be)} r={4.5} fill={ENCRE} />
          {rac.map((r0) => <circle key={r0} cx={X(r0)} cy={Y(0)} r={5.5} fill="#fff" stroke={ENCRE} strokeWidth={2} />)}
        </svg>
      </div>
      <p className="mt-2 text-[12.5px] text-[#5b564d]"><span style={{ color: VERT }}>━</span> trinôme positif · <span style={{ color: OR }}>━</span> trinôme négatif ou nul</p>
    </Cadre>
  );
};

// ───────────────────────────── Polynômes : racines et factorisation

const VUE_P: Vue = { x0: -4, x1: 4, y0: -6, y1: 6 };

export const VisuPolynome: React.FC = () => {
  const [r, setR] = useState([-2, 0.5, 2.5]);
  const [ref, w] = useLargeur();
  const h = Math.round(Math.min(330, Math.max(240, w * 0.55)));
  const e = echelle(VUE_P, w, h);
  const { X, Y } = e;
  const P = (x: number) => 0.5 * (x - r[0]) * (x - r[1]) * (x - r[2]);
  const { svgProps, surDown, prise } = useGlisser((id, x) => setR((v) => v.map((t, i) => (String(i) === id ? Math.round(Math.max(-3.8, Math.min(3.8, x)) * 10) / 10 : t))), e);
  const tex = (t: number) => (t === 0 ? 'x' : t > 0 ? `(x-${nb(t)})` : `(x+${nb(-t)})`);
  const racines = zeros(P, VUE_P.x0, VUE_P.x1, 800);
  return (
    <Cadre titre="Racines d'un polynôme" consigne="Glisse les racines sur l'axe : la courbe de P passe toujours par elles."
      message={<><K t={`P(${nb(r[0])})=0`} /> : <K t={`${nb(r[0])}`} /> est une racine, donc <K t="P(x)" /> se factorise par <K t={tex(r[0])} />.
        Ici <K t={`P(x)=\\tfrac12${tex(r[0])}${tex(r[1])}${tex(r[2])}`} /> ({racines.length} racine{racines.length > 1 ? 's' : ''} distincte{racines.length > 1 ? 's' : ''}).</>}>
      <div ref={ref}>
        <svg width={w} height={h} {...svgProps} className="block select-none">
          <Repere vue={VUE_P} w={w} h={h} pas={1} />
          <path d={chemin(P, VUE_P, w, h)} fill="none" stroke={VERT} strokeWidth={2.6} />
          {r.map((t, i) => <Poignee key={i} cx={X(t)} cy={Y(0)} prise={prise === String(i)} couleur={OR} onPointerDown={surDown(String(i))} label={`racine ${i + 1}`} />)}
        </svg>
      </div>
    </Cadre>
  );
};

