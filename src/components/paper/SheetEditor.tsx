/**
 * Écrire sur la feuille FIDNI (12/10/2026) : l'assistant « Ajouter un contenu » montre directement la feuille
 * imprimée, en vraies pages A4, et on écrit dedans. Même en-tête, mêmes numéros, mêmes polices et mêmes
 * coupures de page que le PDF (styles et blocs partagés avec PaperExport) ; « Tenir sur une page » resserre
 * la feuille ici comme à l'impression.
 *
 * Les outils (monter, descendre, supprimer, sous-question, indication, solution) sont dans la marge de
 * droite, au survol : rien de ce qui n'est pas imprimé ne prend de place sur la feuille.
 */
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { ArrowDown, ArrowUp, CheckCircle2, Lightbulb, ListPlus, Trash2 } from 'lucide-react';
import CompactTipTapEditor from '@/components/editor/CompactTipTapEditor';
import type { ExerciseBlock, SubQuestionBlock } from '@/components/content/editor/FlexibleExerciseEditor';
import type { SectionBlock, SubSectionBlock } from '@/components/content/editor/FlexibleLessonEditor';
import type { ContentBlock } from '@/types/content';
import { ROMAN } from '@/lib/paperFont';
import PagedSheet, { type SheetLayout } from './PagedSheet';
import { DENSITIES, SHEET_CONTENT_CSS, densityVars } from './sheetStyles';
import { MM } from './paginate';
import { useLivePagination } from './livePagination';
import { exerciseBlocks, lessonBlocks, sheetHeaderBlocks, type PaperItem } from './paperBlocks';

const newId = () => Math.random().toString(36).slice(2, 9);
const letter = (i: number) => String.fromCharCode(97 + (i % 26));
const html = (b?: ContentBlock) => b?.html || '';
const text = (h: string): ContentBlock => ({ type: 'text', html: h });
const filled = (b?: ContentBlock) => !!b?.html && b.html.replace(/<[^>]*>/g, '').trim().length > 0;
const GAP = 24; // px entre deux feuilles à l'écran

export interface SheetEditorProps {
  type: 'exercise' | 'exam' | 'lesson';
  title: string;
  kindLabel: string;
  levels: string[];
  subjects: string[];
  difficultyLabel?: string;
  durationLabel?: string;
  blocks: ExerciseBlock[];
  onBlocks: (b: ExerciseBlock[]) => void;
  sections: SectionBlock[];
  onSections: (s: SectionBlock[]) => void;
  onePage: boolean;
  showSolutions: boolean;
  /** La feuille montre la solution de cette question (bouton « Solution » de la marge). */
  onShowSolutions: () => void;
  onLayout?: (l: { pages: number; printPages: number; density: number }) => void;
}

// ─────────────────────────────── Champ écrit sur la feuille

const PaperField: React.FC<{
  rowKey: string; value?: ContentBlock; onChange: (v: ContentBlock) => void; placeholder: string;
  register: (key: string, ed: Editor | null) => void; title?: string;
}> = ({ rowKey, value, onChange, placeholder, register, title }) => {
  const onEditor = useCallback((ed: Editor | null) => register(rowKey, ed), [register, rowKey]);
  return (
    <CompactTipTapEditor paper wordMath content={html(value)} onChange={(h) => onChange(text(h))}
      placeholder={placeholder} minHeight="0" onEditor={onEditor} fullscreenTitle={title} ariaLabel={title || placeholder} />
  );
};

/**
 * Barème : affiché exactement comme à l'impression (« (1,5 pt) ») ; un clic le modifie. Sans barème, rien
 * n'occupe la place : on l'ajoute avec l'outil « Barème » de la marge (`editing` piloté par la rangée).
 */
const Points: React.FC<{ value?: number; onChange: (v?: number) => void; editing?: boolean; onDone?: () => void }> = ({ value, onChange, editing: forced, onDone }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const open = editing || !!forced;
  const label = value ? `(${String(value).replace('.', ',')} pt${value > 1 ? 's' : ''})` : '';
  if (!open) {
    return value
      ? <button type="button" className="fp-pts se-pts-btn" title="Modifier le barème" onClick={() => { setDraft(String(value).replace('.', ',')); setEditing(true); }}>{label}</button>
      : <span />;
  }
  const close = () => { setEditing(false); onDone?.(); };
  return (
    <span className="fp-pts se-pts">(
      <input autoFocus value={draft} inputMode="decimal" placeholder="1" aria-label="Points" size={Math.max(2, draft.length + 1)}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = parseFloat(e.target.value.replace(',', '.'));
          onChange(Number.isFinite(v) && v > 0 ? Math.min(v, 100) : undefined);
        }}
        onBlur={close} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }} /> pts)
    </span>
  );
};

const Tool: React.FC<{ label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }> = ({ label, onClick, disabled, danger, children }) => (
  <button type="button" title={label} aria-label={label} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
    className={`se-tool ${danger ? 'is-danger' : ''}`}>{children}</button>
);

// ─────────────────────────────── Une rangée de la feuille (unité de pagination)

const RowContext = React.createContext<{ spacers: Record<string, number>; toolsRight: number }>({ spacers: {}, toolsRight: 0 });

const Row: React.FC<{ k: string; kwn?: boolean; split?: boolean; children: React.ReactNode; tools?: React.ReactNode; className?: string }> = ({
  k, kwn, split, children, tools, className = '',
}) => {
  const { spacers, toolsRight } = React.useContext(RowContext);
  return (
    <>
      {spacers[k] ? <div className="pg-spacer" style={{ height: spacers[k] }} aria-hidden /> : null}
      <div data-pg-row={k} data-pg-kwn={kwn ? '' : undefined} data-pg-split={split ? '' : undefined} className={`se-row ${className}`}>
        {children}
        {tools && <div className="se-tools" style={{ right: -toolsRight }}>{tools}</div>}
      </div>
    </>
  );
};

// ─────────────────────────────── La feuille

export const SheetEditor: React.FC<SheetEditorProps> = (p) => {
  const { type, blocks, onBlocks, sections, onSections, showSolutions } = p;
  const lesson = type === 'lesson';
  const flowRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const editors = useRef(new Map<string, Editor>());
  const register = useCallback((key: string, ed: Editor | null) => {
    if (ed) editors.current.set(key, ed); else editors.current.delete(key);
  }, []);

  // ── Palier de densité : celui que choisira l'impression (même mesure que l'aperçu PDF).
  const item: PaperItem = useMemo(() => ({
    key: 'draft', kind: type, title: p.title || 'Sans titre', blocks: blocks as PaperItem['blocks'], sections: sections as PaperItem['sections'],
  }), [type, p.title, blocks, sections]);
  const sectionCount = blocks.filter((b) => b.type === 'section').length;
  const points = blocks.filter((b) => b.type === 'question').reduce((s, b) => s + (b.subQuestions?.length
    ? b.subQuestions.reduce((t, sq) => t + (Number(sq.points) || 0), 0) : Number(b.points) || 0), 0);
  const today = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const facts = lesson
    ? [`${sections.length} partie${sections.length > 1 ? 's' : ''}`, today]
    : [`${Math.max(1, sectionCount)} exercice${sectionCount > 1 ? 's' : ''}`, points ? `${String(points).replace('.', ',')} points` : null,
      p.durationLabel ? `Durée : ${p.durationLabel}` : null, p.difficultyLabel || null, today];
  const header = sheetHeaderBlocks({
    kindLabel: p.kindLabel, subjects: p.subjects, levels: p.levels, title: p.title || 'Sans titre', facts,
    school: '', teacher: '', className: p.levels.length === 1 ? p.levels[0] : '', schoolYear: '', instructions: '', studentLine: !lesson,
  });
  const printBlocks = [...header, ...(lesson ? lessonBlocks(item) : exerciseBlocks(item, showSolutions))];
  const printVersion = JSON.stringify([type, p.title, facts, blocks, sections, showSolutions]);
  const [layout, setLayout] = useState<SheetLayout | null>(null);
  const d = DENSITIES[p.onePage ? (layout?.densityIndex ?? 0) : 0];

  // ── Géométrie (px) et zoom sur les petits écrans
  const pageW = 210 * MM;
  const pageH = 297 * MM;
  const zoneH = (297 - d.margins.top - d.margins.bottom) * MM;
  const stride = pageH + GAP;
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const el = wrapRef.current?.parentElement;
    if (!el) return;
    const fit = () => setZoom(Math.min(1, Math.max(0.35, el.clientWidth / (pageW + 64))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageW]);

  const { rowSpacers, pages } = useLivePagination(flowRef, { height: zoneH - 2, stride, editors: () => editors.current, zoom });
  const toolsRight = d.margins.right * MM + 6;
  const rowCtx = useMemo(() => ({ spacers: rowSpacers, toolsRight }), [rowSpacers, toolsRight]);
  const onLayoutRef = useRef(p.onLayout);
  onLayoutRef.current = p.onLayout;
  useLayoutEffect(() => {
    onLayoutRef.current?.({ pages, printPages: layout?.pages ?? pages, density: p.onePage ? (layout?.densityIndex ?? 0) : 0 });
  }, [pages, layout, p.onePage]);

  const [pointsFor, setPointsFor] = useState<string | null>(null);
  const pointsTool = (key: string, has: boolean) => (has ? null : (
    <Tool label="Ajouter un barème" onClick={() => setPointsFor(key)}><span className="text-[10px] font-bold">pt</span></Tool>
  ));
  const setBlock = (i: number, b: ExerciseBlock) => onBlocks(blocks.map((x, j) => (j === i ? b : x)));
  const moveBlock = (i: number, dir: -1 | 1) => { const n = [...blocks]; [n[i], n[i + dir]] = [n[i + dir], n[i]]; onBlocks(n); };
  const removeBlock = (i: number) => {
    const b = blocks[i];
    if ((filled(b.content) || b.subQuestions?.length) && b.type !== 'section' && !window.confirm('Supprimer cette question et tout ce qu’elle contient ?')) return;
    onBlocks(blocks.filter((_, j) => j !== i));
  };
  const blockTools = (i: number, extra?: React.ReactNode) => (
    <>
      <Tool label="Monter" onClick={() => moveBlock(i, -1)} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Tool>
      <Tool label="Descendre" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Tool>
      {extra}
      <Tool label="Supprimer" danger onClick={() => removeBlock(i)}><Trash2 className="h-3.5 w-3.5" /></Tool>
    </>
  );
  /** Indication et solution : sur la feuille quand le corrigé est affiché (comme « Sous chaque question »). */
  const extras = (k: string, q: { hint?: ContentBlock; solution?: ContentBlock }, set: (patch: { hint?: ContentBlock; solution?: ContentBlock }) => void, nested: boolean) => {
    if (!showSolutions) return null;
    const wrap = (node: React.ReactNode) => (nested ? <div className="fp-sq-sol">{node}</div> : node);
    return (
      <>
        {q.hint !== undefined && (
          <Row k={`${k}:hint`} split>{wrap(
            <div className="fp-sol se-hint"><span className="fp-sol-label">Indication (imprimée en tête de la solution)</span>
              <PaperField rowKey={`${k}:hint`} register={register} value={q.hint} onChange={(hint) => set({ hint })}
                placeholder="La méthode en une ou deux phrases, sans le calcul." /></div>,
          )}</Row>
        )}
        {q.solution !== undefined && (
          <Row k={`${k}:sol`} split>{wrap(
            <div className="fp-sol"><span className="fp-sol-label">Solution</span>
              <PaperField rowKey={`${k}:sol`} register={register} value={q.solution} onChange={(solution) => set({ solution })}
                placeholder="La solution rédigée, comme sur une copie." title="Solution" /></div>,
          )}</Row>
        )}
      </>
    );
  };
  const extraTools = (q: { hint?: ContentBlock; solution?: ContentBlock }, set: (patch: { hint?: ContentBlock; solution?: ContentBlock }) => void) => (
    <>
      <Tool label={q.hint !== undefined ? 'Retirer l’indication' : 'Ajouter une indication'} onClick={() => {
        if (q.hint !== undefined) { if (!filled(q.hint) || window.confirm('Retirer l’indication ?')) set({ hint: undefined }); return; }
        set({ hint: text('') }); if (!showSolutions) p.onShowSolutions();
      }}><Lightbulb className={`h-3.5 w-3.5 ${q.hint !== undefined ? 'text-gold-strong' : ''}`} /></Tool>
      <Tool label={q.solution !== undefined ? 'Retirer la solution' : 'Ajouter la solution'} onClick={() => {
        if (q.solution !== undefined) { if (!filled(q.solution) || window.confirm('Retirer la solution ?')) set({ solution: undefined }); return; }
        set({ solution: text('') }); if (!showSolutions) p.onShowSolutions();
      }}><CheckCircle2 className={`h-3.5 w-3.5 ${q.solution !== undefined ? 'text-brand' : ''}`} /></Tool>
    </>
  );

  const rows: React.ReactNode[] = header.map((h) => <Row key={h.key} k={`h:${h.key}`} kwn={h.keepWithNext}>{h.node}</Row>);

  if (!lesson) {
    let q = 0;
    blocks.forEach((b, i) => {
      if (b.type === 'section') {
        q = 0;
        rows.push(
          <Row key={b.id} k={b.id} kwn tools={blockTools(i, pointsTool(b.id, !!b.points))}>
            <div className="fp-part">
              <input className="se-input" value={(b.content?.html || '').replace(/<[^>]*>/g, '')} placeholder={`Exercice ${blocks.slice(0, i + 1).filter((x) => x.type === 'section').length}`}
                aria-label="Titre de la partie" onChange={(e) => setBlock(i, { ...b, content: text(e.target.value) })} />
              <Points value={b.points} onChange={(points) => setBlock(i, { ...b, points })} editing={pointsFor === b.id} onDone={() => setPointsFor(null)} />
            </div>
          </Row>,
        );
        return;
      }
      if (b.type === 'context') {
        rows.push(
          <Row key={b.id} k={b.id} split tools={blockTools(i)}>
            <div className="fp-context">
              <PaperField rowKey={b.id} register={register} value={b.content} onChange={(content) => setBlock(i, { ...b, content })}
                placeholder="Texte d’introduction. Ex. On considère la fonction f définie sur ℝ par…" title="Texte d’introduction" />
            </div>
          </Row>,
        );
        return;
      }
      q += 1;
      const n = q;
      const subs = b.subQuestions || [];
      const setSubs = (next: SubQuestionBlock[]) => setBlock(i, { ...b, subQuestions: next, ...(next.length ? { hint: undefined, solution: undefined, points: undefined } : {}) });
      rows.push(
        <Row key={b.id} k={b.id} split kwn={subs.length > 0} tools={blockTools(i, (
          <>
            <Tool label={subs.length ? 'Ajouter une sous-question' : 'Découper en sous-questions a), b)…'}
              onClick={() => setSubs([...subs, { id: newId(), content: text('') }])}><ListPlus className="h-3.5 w-3.5" /></Tool>
            {!subs.length && pointsTool(b.id, !!b.points)}
            {!subs.length && extraTools(b, (patch) => setBlock(i, { ...b, ...patch }))}
          </>
        ))}>
          <div className={`fp-q ${!subs.length && !showSolutions ? 'fp-q-last' : ''}`}>
            <span className="fp-num">{n}.</span>
            <PaperField rowKey={b.id} register={register} value={b.content} onChange={(content) => setBlock(i, { ...b, content })}
              placeholder={`Question ${n} : son énoncé (Alt+= pour une formule)`} title={`Question ${n}`} />
            {subs.length ? <span /> : <Points value={b.points} onChange={(points) => setBlock(i, { ...b, points })} editing={pointsFor === b.id} onDone={() => setPointsFor(null)} />}
          </div>
        </Row>,
      );
      if (!subs.length) rows.push(<React.Fragment key={`${b.id}:x`}>{extras(b.id, b, (patch) => setBlock(i, { ...b, ...patch }), false)}</React.Fragment>);
      subs.forEach((sq, k) => {
        const setSq = (patch: Partial<SubQuestionBlock>) => setSubs(subs.map((x, j) => (j === k ? { ...x, ...patch } : x)));
        rows.push(
          <Row key={sq.id} k={sq.id} split tools={(
            <>
              <Tool label="Monter" disabled={k === 0} onClick={() => { const nx = [...subs]; [nx[k], nx[k - 1]] = [nx[k - 1], nx[k]]; setSubs(nx); }}><ArrowUp className="h-3.5 w-3.5" /></Tool>
              <Tool label="Descendre" disabled={k === subs.length - 1} onClick={() => { const nx = [...subs]; [nx[k], nx[k + 1]] = [nx[k + 1], nx[k]]; setSubs(nx); }}><ArrowDown className="h-3.5 w-3.5" /></Tool>
              <Tool label="Ajouter une sous-question après" onClick={() => setSubs([...subs.slice(0, k + 1), { id: newId(), content: text('') }, ...subs.slice(k + 1)])}><ListPlus className="h-3.5 w-3.5" /></Tool>
              {pointsTool(sq.id, !!sq.points)}
              {extraTools(sq, setSq)}
              <Tool label="Supprimer la sous-question" danger onClick={() => { if (!filled(sq.content) || window.confirm('Supprimer cette sous-question ?')) setSubs(subs.filter((_, j) => j !== k)); }}><Trash2 className="h-3.5 w-3.5" /></Tool>
            </>
          )}>
            <div className={`fp-q fp-sq ${k === subs.length - 1 && !showSolutions ? 'fp-q-last' : ''}`}>
              <span className="fp-num">{letter(k)})</span>
              <PaperField rowKey={sq.id} register={register} value={sq.content} onChange={(content) => setSq({ content })}
                placeholder={`Sous-question ${letter(k)})`} title={`Question ${n}.${letter(k)})`} />
              <Points value={sq.points} onChange={(pts) => setSq({ points: pts })} editing={pointsFor === sq.id} onDone={() => setPointsFor(null)} />
            </div>
          </Row>,
        );
        rows.push(<React.Fragment key={`${sq.id}:x`}>{extras(sq.id, sq, setSq, true)}</React.Fragment>);
      });
    });
  } else {
    const setSec = (i: number, s: SectionBlock) => onSections(sections.map((x, j) => (j === i ? s : x)));
    sections.forEach((s, i) => {
      const subs = s.subSections || [];
      const setSubs = (next: SubSectionBlock[]) => setSec(i, { ...s, subSections: next });
      rows.push(
        <Row key={`${s.id}:t`} k={`${s.id}:t`} kwn tools={(
          <>
            <Tool label="Monter" disabled={i === 0} onClick={() => { const n = [...sections]; [n[i], n[i - 1]] = [n[i - 1], n[i]]; onSections(n); }}><ArrowUp className="h-3.5 w-3.5" /></Tool>
            <Tool label="Descendre" disabled={i === sections.length - 1} onClick={() => { const n = [...sections]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; onSections(n); }}><ArrowDown className="h-3.5 w-3.5" /></Tool>
            <Tool label="Ajouter une sous-partie" onClick={() => setSubs([...subs, { id: newId(), title: '', content: text('') }])}><ListPlus className="h-3.5 w-3.5" /></Tool>
            <Tool label="Supprimer la partie" danger onClick={() => { if (!filled(s.content) || window.confirm('Supprimer cette partie et son texte ?')) onSections(sections.filter((_, j) => j !== i)); }}><Trash2 className="h-3.5 w-3.5" /></Tool>
          </>
        )}>
          <h2 className="fp-l-h2"><span>{ROMAN[i] || i + 1}.</span>{' '}
            <input className="se-input" value={s.title} placeholder="Titre de la partie" aria-label={`Titre de la partie ${i + 1}`}
              onChange={(e) => setSec(i, { ...s, title: e.target.value })} />
          </h2>
        </Row>,
      );
      rows.push(
        <Row key={s.id} k={s.id} split>
          <PaperField rowKey={s.id} register={register} value={s.content} onChange={(content) => setSec(i, { ...s, content })}
            placeholder="Le texte de la partie. « Encarts » pour une définition, un théorème…" title={`Partie ${ROMAN[i] || i + 1}`} />
        </Row>,
      );
      subs.forEach((ss, k) => {
        const setSs = (patch: Partial<SubSectionBlock>) => setSubs(subs.map((x, j) => (j === k ? { ...x, ...patch } : x)));
        rows.push(
          <Row key={`${ss.id}:t`} k={`${ss.id}:t`} kwn tools={(
            <Tool label="Supprimer la sous-partie" danger onClick={() => { if (!filled(ss.content) || window.confirm('Supprimer cette sous-partie ?')) setSubs(subs.filter((_, j) => j !== k)); }}><Trash2 className="h-3.5 w-3.5" /></Tool>
          )}>
            <h3 className="fp-l-h3 fp-l-indent"><span>{k + 1}.</span>{' '}
              <input className="se-input" value={ss.title} placeholder="Titre de la sous-partie" aria-label={`Titre de la sous-partie ${k + 1}`}
                onChange={(e) => setSs({ title: e.target.value })} />
            </h3>
          </Row>,
        );
        rows.push(
          <Row key={ss.id} k={ss.id} split>
            <div className="fp-l-indent">
              <PaperField rowKey={ss.id} register={register} value={ss.content} onChange={(content) => setSs({ content })}
                placeholder="Texte de la sous-partie" title={`Sous-partie ${k + 1}`} />
            </div>
          </Row>,
        );
      });
    });
  }

  const totalH = pages * stride - GAP;
  return (
    <div ref={wrapRef} className="se-wrap" style={{ zoom }}>
      <style>{SHEET_CONTENT_CSS + SHEET_EDITOR_CSS}</style>
      {/* Mesure de l'impression (palier pour « Tenir sur une page », nombre de pages du PDF). */}
      <PagedSheet measureOnly blocks={printBlocks} version={printVersion} density={p.onePage ? 'fit' : 0} onLayout={setLayout} />
      <div className="se-pages" style={{ width: pageW, minHeight: totalH }}>
        {Array.from({ length: pages }, (_, i) => (
          <div key={i} className="se-page" style={{ top: i * stride, height: pageH }} aria-hidden>
            <div className="fp-page-foot" style={{ left: `${d.margins.left}mm`, right: `${d.margins.right}mm`, bottom: `${Math.max(4, d.margins.bottom / 2 - 2)}mm` }}>
              <span>Fidni · {p.title || 'Sans titre'}</span><span>{i + 1} / {pages}</span>
            </div>
          </div>
        ))}
        <div ref={flowRef} className="fp-content se-flow" style={{
          ...densityVars(d), position: 'relative', margin: `${d.margins.top}mm ${d.margins.right}mm 0 ${d.margins.left}mm`,
        }}>
          <RowContext.Provider value={rowCtx}>{rows}</RowContext.Provider>
        </div>
      </div>
    </div>
  );
};

const SHEET_EDITOR_CSS = `
  .se-wrap { display: flex; justify-content: center; padding: 4px 0 32px; }
  .se-pages { position: relative; flex-shrink: 0; }
  .se-page { position: absolute; left: 0; right: 0; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.06); }
  .se-flow { z-index: 1; }
  .se-row { position: relative; }
  .se-row:hover, .se-row:focus-within { background: linear-gradient(90deg, transparent, rgba(26,122,74,.035) 8%, rgba(26,122,74,.035) 92%, transparent); }
  .se-tools { position: absolute; top: 0; display: flex; flex-direction: column; gap: 2px; padding: 2px; border-radius: 8px;
    background: #fff; box-shadow: 0 4px 14px -6px rgba(20,18,16,.3); opacity: 0; pointer-events: none; transition: opacity .12s; z-index: 5;
    font-family: 'DM Sans', system-ui, sans-serif; }
  .se-row:hover > .se-tools, .se-row:focus-within > .se-tools { opacity: 1; pointer-events: auto; }
  .se-tool { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; color: #6b6862; }
  .se-tool:hover:not(:disabled) { background: #f2f1ee; color: #1a1a1a; }
  .se-tool.is-danger:hover:not(:disabled) { background: #fbecea; color: #a23b34; }
  .se-tool:disabled { opacity: .3; }
  .se-input { font: inherit; color: inherit; background: transparent; border: 0; outline: none; padding: 0; min-width: 6ch; width: 100%; }
  .fp-l-h2 .se-input, .fp-l-h3 .se-input { width: calc(100% - 3ch); }
  .se-input::placeholder { color: #b5b0a7; font-weight: 400; }
  .fp-part .se-input { flex: 1; font-weight: 700; }
  .se-pts-btn { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: text; border-radius: 3px; }
  .se-pts-btn:hover { background: #eaf3ed; }
  .se-pts { display: inline-flex; align-items: baseline; }
  .se-pts input { font: inherit; color: #1a1a1a; background: #eaf3ed; border: 0; outline: none; padding: 0 2px; border-radius: 3px; text-align: center; }
  .se-hint { border-left-color: #c0892f; background: #fbf6ea; }
  .se-hint .fp-sol-label { color: #9a6e1c; }
  /* Champ écrit sur la feuille : la typographie de la feuille, sans cadre. */
  .fd-editor.fd-editor-paper .fd-editor-body { padding: 0; font-size: inherit; line-height: inherit; color: inherit; min-height: 0 !important; }
  .fd-editor.fd-editor-paper .fd-editor-body p { margin: 0 0 calc(3pt * var(--fp-sp, 1)); }
  .fd-editor.fd-editor-paper .fd-editor-body > :last-child { margin-bottom: 0; }
  .fd-editor.fd-editor-paper .fd-editor-body h1, .fd-editor.fd-editor-paper .fd-editor-body h2 { font-size: calc(var(--fp-fs, 11pt) * 1.045); margin: calc(4pt * var(--fp-sp, 1)) 0; }
  .fd-editor.fd-editor-paper .fd-editor-body p.is-editor-empty:first-child::before { color: #b5b0a7; font-style: italic; }
  .fd-editor.fd-editor-paper .math-node-inline { display: inline; vertical-align: baseline; padding: 0; overflow: visible; }
  .fd-editor.fd-editor-paper .math-node-display { margin: calc(5pt * var(--fp-sp, 1)) 0; padding: 0; }
  .fd-editor.fd-editor-paper [data-callout-type] { color: inherit; }
  .fd-editor.fd-editor-paper [data-callout-type] > :last-child { margin-bottom: 0; }
  /* Formule centrée seule dans son paragraphe : ProseMirror ajoute une ligne vide technique après elle
     (curseur) ; l'impression n'en a pas, on la masque pour garder les mêmes hauteurs. */
  .fd-editor.fd-editor-paper p:has(> .math-node-display) > .ProseMirror-separator,
  .fd-editor.fd-editor-paper p:has(> .math-node-display) > .ProseMirror-trailingBreak { display: none !important; }
  .fd-editor.fd-editor-paper .math-node-display .katex-display { margin: 1em 0; }
  .pg-spacer { pointer-events: none; }
`;

export default SheetEditor;
