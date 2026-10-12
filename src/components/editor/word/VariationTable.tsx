/**
 * Tableaux de variations et de signes (12/10/2026) : l'outil qui manquait le plus aux profs de maths.
 * On donne les valeurs de x, puis des lignes de signe (+, −, 0, double barre) et de variation (valeurs en
 * haut, au milieu ou en bas ; les flèches s'en déduisent). Le résultat est un tableau KaTeX (`array`),
 * enregistré comme une formule centrée ordinaire : il s'affiche partout (site, PDF, éditeurs).
 *
 * Ses réglages sont gardés en tête de la formule dans un commentaire LaTeX (`%TV{…}`, ignoré à
 * l'affichage) : un clic sur le tableau rouvre cette fenêtre, comme un objet MathType.
 */
import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Minus, Plus, Trash2, X } from 'lucide-react';
import { Tex } from './RibbonParts';
import { TV_MARK } from './tvMark';

export type Pos = 'haut' | 'milieu' | 'bas';
export type TVRow =
  | { kind: 'signe'; label: string; signs: string[]; points: string[] }
  | { kind: 'variation'; label: string; values: string[]; pos: Pos[] };
export interface TVSpec { v: 1; x: string; xs: string[]; rows: TVRow[] }

export { TV_MARK };

export const defaultSpec = (): TVSpec => ({
  v: 1,
  x: 'x',
  xs: ['-\\infty', 'x_0', '+\\infty'],
  rows: [
    { kind: 'signe', label: "f'(x)", signs: ['-', '+'], points: ['', '0', ''] },
    { kind: 'variation', label: 'f(x)', values: ['+\\infty', 'f(x_0)', '+\\infty'], pos: ['haut', 'bas', 'haut'] },
  ],
});

/** Écriture rapide : « -inf », « +inf », « inf » → ∞ ; pas de `$` (délimiteurs des formules). */
const clean = (s: string) => s.replace(/\$/g, '').trim()
  .replace(/^([+-]?)\s*(inf|infini|∞|\\infty)$/i, (_m, sign: string) => `${sign}\\infty`);

const LEVEL: Record<Pos, number> = { bas: 0, milieu: 1, haut: 2 };

/** Le tableau en LaTeX (KaTeX), précédé de ses réglages en commentaire. */
export function tvToLatex(spec: TVSpec): string {
  const n = Math.max(2, spec.xs.length);
  const cols = 2 * n - 1;
  const cell = (s: string) => (s ? ` ${s} ` : ' ');
  const lines: string[] = [];
  // Ligne des x : valeurs aux points, rien entre.
  lines.push([cell(spec.x || 'x'), ...Array.from({ length: cols }, (_, c) => (c % 2 === 0 ? cell(spec.xs[c / 2] ?? '') : ' '))].join('&'));
  const body: string[] = [];
  spec.rows.forEach((row) => {
    if (row.kind === 'signe') {
      body.push([cell(row.label), ...Array.from({ length: cols }, (_, c) => {
        if (c % 2 === 0) {
          const p = row.points[c / 2] ?? '';
          return cell(p === '||' ? '\\|' : p === '0' ? '0' : '');
        }
        const s = row.signs[(c - 1) / 2] ?? '';
        return cell(s === '+' ? '+' : s === '-' ? '-' : '');
      })].join('&'));
      return;
    }
    // Variation : trois lignes (haut, milieu avec les flèches, bas).
    const at = (level: Pos) => Array.from({ length: cols }, (_, c) => {
      if (c % 2 === 0) {
        const i = c / 2;
        return (row.pos[i] ?? 'milieu') === level ? cell(row.values[i] ?? '') : ' ';
      }
      if (level !== 'milieu') return ' ';
      const i = (c - 1) / 2;
      const a = LEVEL[row.pos[i] ?? 'milieu'];
      const b = LEVEL[row.pos[i + 1] ?? 'milieu'];
      return cell(b > a ? '\\nearrow' : b < a ? '\\searrow' : '\\rightarrow');
    });
    body.push([' ', ...at('haut')].join('&'));
    body.push([cell(row.label), ...at('milieu')].join('&'));
    body.push([' ', ...at('bas')].join('&'));
  });
  const json = JSON.stringify(spec);
  const table = `\\begin{array}{c|${'c'.repeat(cols)}}${lines[0]}\\\\ \\hline ${body
    .map((l, i) => {
      // Trait horizontal entre deux lignes du tableau (pas entre les trois lignes d'une variation).
      const r = rowStarts(spec);
      return `${l}\\\\${r.includes(i + 1) ? ' \\hline' : ''}`;
    })
    .join(' ')}\\end{array}`;
  return `${TV_MARK}${json}\n${table}`;
}

/** Indices (dans les lignes LaTeX du corps) où commence chaque ligne du tableau, sauf la première. */
function rowStarts(spec: TVSpec) {
  const out: number[] = [];
  let k = 0;
  spec.rows.forEach((r, i) => {
    if (i > 0) out.push(k);
    k += r.kind === 'signe' ? 1 : 3;
  });
  return out;
}

/** Réglages relus depuis la formule (null : ce n'est pas un tableau de variations). */
export function tvFromLatex(latex: string): TVSpec | null {
  if (!latex.startsWith(TV_MARK)) return null;
  const end = latex.indexOf('\n');
  try {
    const spec = JSON.parse(latex.slice(TV_MARK.length, end < 0 ? undefined : end)) as TVSpec;
    if (!spec || !Array.isArray(spec.xs) || !Array.isArray(spec.rows)) return null;
    return normalize(spec);
  } catch {
    return null;
  }
}

/** Lignes ajustées au nombre de valeurs de x (on peut en ajouter ou en retirer). */
function normalize(spec: TVSpec): TVSpec {
  const n = Math.max(2, Math.min(12, spec.xs.length));
  const xs = spec.xs.slice(0, n);
  const fit = <T,>(a: T[] | undefined, len: number, fill: T) => Array.from({ length: len }, (_, i) => (a?.[i] ?? fill));
  return {
    v: 1,
    x: String(spec.x || 'x').slice(0, 40),
    xs,
    rows: spec.rows.slice(0, 8).map((r) => (r.kind === 'signe'
      ? { kind: 'signe', label: String(r.label ?? '').slice(0, 60), signs: fit(r.signs, n - 1, ''), points: fit(r.points, n, '') }
      : { kind: 'variation', label: String(r.label ?? '').slice(0, 60), values: fit(r.values, n, ''), pos: fit(r.pos, n, 'milieu' as Pos) })),
  };
}

// ─────────────────────────────── Fenêtre

const SIGN_CYCLE = ['+', '-', ''];
const POINT_CYCLE = ['', '0', '||'];
const POS_CYCLE: Pos[] = ['haut', 'milieu', 'bas'];
const next = <T,>(cycle: T[], v: T) => cycle[(cycle.indexOf(v) + 1) % cycle.length];

const Cyc: React.FC<{ value: string; label: string; onClick: () => void; tex?: string }> = ({ value, label, onClick, tex }) => (
  <button type="button" onClick={onClick} title={label} aria-label={label}
    className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-md border border-line bg-white px-1.5 text-[13px] hover:border-brand hover:bg-brand-soft">
    {tex ? <Tex tex={tex} /> : value || <span className="text-ink-faint">·</span>}
  </button>
);

export const VariationTableDialog: React.FC<{ initial?: TVSpec | null; onSubmit: (latex: string) => void; onClose: () => void }> = ({ initial, onSubmit, onClose }) => {
  const [spec, setSpec] = useState<TVSpec>(() => normalize(initial ?? defaultSpec()));
  const [xsText, setXsText] = useState(() => spec.xs.join(' ; '));
  const latex = useMemo(() => tvToLatex(spec), [spec]);
  const preview = latex.slice(latex.indexOf('\n') + 1);
  const n = spec.xs.length;

  const setXs = (text: string) => {
    setXsText(text);
    const xs = text.split(/[;|]/).map(clean).filter((v, i, a) => v || i < a.length - 1).slice(0, 12);
    if (xs.length >= 2) setSpec((s) => normalize({ ...s, xs }));
  };
  const setRow = (i: number, row: TVRow) => setSpec((s) => ({ ...s, rows: s.rows.map((r, j) => (j === i ? row : r)) }));
  const moveRow = (i: number, d: -1 | 1) => setSpec((s) => { const r = [...s.rows]; [r[i], r[i + d]] = [r[i + d], r[i]]; return { ...s, rows: r }; });
  const addRow = (kind: TVRow['kind']) => setSpec((s) => normalize({
    ...s,
    rows: [...s.rows, kind === 'signe'
      ? { kind, label: 'f(x)', signs: Array(n - 1).fill('+'), points: Array(n).fill('') }
      : { kind, label: 'f(x)', values: Array(n).fill(''), pos: Array(n).fill('milieu') }],
  }));

  return (
    <div className="wd-overlay wd-menu-host" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wd-dialog flex max-h-[88vh] flex-col" style={{ width: 'min(860px, 100%)', padding: 0 }} role="dialog" aria-label="Tableau de variations">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h2 className="flex-1 text-[15px] font-semibold text-ink">Tableau de variations / de signes</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="wd-small"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
            <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-ink-soft">
              Variable
              <input className="wd-input font-normal" value={spec.x} onChange={(e) => setSpec((s) => ({ ...s, x: clean(e.target.value) }))} />
            </label>
            <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-ink-soft">
              Valeurs de la variable, séparées par « ; » (LaTeX ; « -inf » et « +inf » pour ∓∞)
              <input className="wd-input font-mono font-normal" value={xsText} onChange={(e) => setXs(e.target.value)} placeholder="-inf ; 0 ; 1 ; +inf" />
            </label>
          </div>

          <div className="mt-4 space-y-3">
            {spec.rows.map((row, i) => (
              <section key={i} className="rounded-xl border border-line bg-[#fbfaf8] p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11.5px] font-bold text-ink-soft">{row.kind === 'signe' ? 'Signe' : 'Variation'}</span>
                  <input className="wd-input w-40 font-mono" value={row.label} aria-label="Nom de la ligne"
                    onChange={(e) => setRow(i, { ...row, label: e.target.value.replace(/\$/g, '') })} />
                  <span className="text-[12px] text-ink-faint">{row.kind === 'signe' ? 'Clique pour changer : + / − / vide ; aux valeurs : 0 / ‖ (interdite) / vide' : 'Valeur à chaque point et sa place (haut, milieu, bas) : les flèches suivent'}</span>
                  <span className="ml-auto flex">
                    <button type="button" className="wd-small" aria-label="Monter" disabled={i === 0} onClick={() => moveRow(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" className="wd-small" aria-label="Descendre" disabled={i === spec.rows.length - 1} onClick={() => moveRow(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" className="wd-small" aria-label="Supprimer la ligne" onClick={() => setSpec((s) => ({ ...s, rows: s.rows.filter((_, j) => j !== i) }))}><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {spec.xs.map((xv, k) => (
                    <React.Fragment key={k}>
                      {row.kind === 'signe' ? (
                        <Cyc value={row.points[k]} label={`En ${xv}`} tex={row.points[k] === '||' ? '\\|' : row.points[k] || undefined}
                          onClick={() => setRow(i, { ...row, points: row.points.map((p, j) => (j === k ? next(POINT_CYCLE, p) : p)) })} />
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-md border border-line bg-white p-0.5">
                          <input className="w-[88px] rounded px-1 font-mono text-[12px] outline-none" value={row.values[k]} placeholder={xv ? `f(${xv})` : ''}
                            aria-label={`Valeur en ${xv}`} onChange={(e) => setRow(i, { ...row, values: row.values.map((v, j) => (j === k ? clean(e.target.value) : v)) })} />
                          <button type="button" className="rounded px-1 text-[11px] font-semibold text-ink-soft hover:bg-brand-soft" title="Place : haut, milieu, bas"
                            onClick={() => setRow(i, { ...row, pos: row.pos.map((p, j) => (j === k ? next(POS_CYCLE, p) : p)) })}>
                            {row.pos[k] === 'haut' ? '↑ haut' : row.pos[k] === 'bas' ? '↓ bas' : '→ milieu'}
                          </button>
                        </span>
                      )}
                      {k < n - 1 && row.kind === 'signe' && (
                        <Cyc value={row.signs[k] === '-' ? '−' : row.signs[k]} label={`Entre ${xv} et ${spec.xs[k + 1]}`}
                          onClick={() => setRow(i, { ...row, signs: row.signs.map((s, j) => (j === k ? next(SIGN_CYCLE, s) : s)) })} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="wd-text-btn border border-line bg-white" onClick={() => addRow('signe')}><Plus className="mr-1 inline h-3.5 w-3.5" />Ligne de signe</button>
            <button type="button" className="wd-text-btn border border-line bg-white" onClick={() => addRow('variation')}><Plus className="mr-1 inline h-3.5 w-3.5" />Ligne de variation</button>
            <button type="button" className="wd-text-btn border border-line bg-white" disabled={n <= 2}
              onClick={() => setXs(spec.xs.slice(0, -1).join(' ; '))}><Minus className="mr-1 inline h-3.5 w-3.5" />Retirer une valeur</button>
          </div>

          <p className="mt-4 mb-1 text-[12px] font-semibold text-ink-faint">Aperçu</p>
          <div className="overflow-x-auto rounded-xl border border-dashed border-line bg-white px-3 py-2"><Tex tex={preview} display /></div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <button type="button" onClick={onClose} className="wd-text-btn">Annuler</button>
          <button type="button" onClick={() => onSubmit(latex)} className="rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-hover">
            {initial ? 'Mettre à jour' : 'Insérer le tableau'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariationTableDialog;
