/**
 * Éditeur de documents « façon Word » de FIDNI (12/10/2026), inspiré de wordcraft
 * (github.com/oussamahadder01/wordcraft) : ruban à onglets (+ onglets contextuels Tableau et Équation),
 * feuille A4 avec marges, zoom et numéro de page, barre d'état, rechercher/remplacer, recherche de
 * commandes (Alt+Q), impression en PDF. Toutes les actions passent par le registre de commandes.
 *
 * Équations : Alt+= (ou Insertion › Équation) ouvre un champ MathLive dans la ligne, où l'on tape comme
 * dans Word (`/` fraction, `^` exposant, `sqrt`, `alpha`…) ou l'on pique dans les galeries ; `$x^2$` tapé
 * dans le texte marche toujours. Le HTML produit est celui des contenus FIDNI (`$…$`, images S3 stables).
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { ChevronDown, ChevronUp, Loader2, Minus, Plus, Search, X } from 'lucide-react';

import { mathifyHtml, storedHtml, type MathAttrs } from '../MathNode';
import type { ActiveEquation } from './EquationNode';
import { wordExtensions, IMAGE_TYPES } from './extensions';
import { Ribbon, type TabId } from './Ribbon';
import { Tex } from './RibbonParts';
import { runCommand, searchableCommands, type Ctx, type EditorUi, type Marges, type Orientation, type Params } from './commands';
import { searchableEquations } from './mathGallery';
import './word.css';

export interface WordEditorProps {
  /** HTML enregistré (formules `$…$`). Lu à l'ouverture seulement (clé React pour changer de document). */
  initialContent: string;
  onChange: (html: string) => void;
  orientation?: Orientation;
  marges?: Marges;
  onLayoutChange?: (layout: { orientation: Orientation; marges: Marges }) => void;
  /** Barre de titre : nom du document (modifiable), état d'enregistrement… */
  titleBar?: React.ReactNode;
  file?: EditorUi['file'];
  placeholder?: string;
}

const MARGINS: Record<Marges, { x: number; y: number }> = {
  normale: { x: 2.5, y: 2.5 },
  etroite: { x: 1.27, y: 1.27 },
  large: { x: 3.5, y: 2.5 },
};
const MM = 96 / 25.4; // px par mm (CSS)

/** HTML de l'éditeur → HTML enregistré : formules en texte `$…$`, équations vides retirées. */
export const toStoredHtml = (html: string) =>
  storedHtml(html.replace(/<span data-math="(?:inline|display)">\$\$(?:\$\$)?<\/span>/g, ''));

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ─────────────────────────────── Rechercher / remplacer

interface Match { from: number; to: number }

function findAll(editor: Editor, query: string): Match[] {
  if (!query) return [];
  const q = fold(query);
  const out: Match[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = fold(node.text);
    let i = text.indexOf(q);
    while (i >= 0 && out.length < 2000) {
      out.push({ from: pos + i, to: pos + i + query.length });
      i = text.indexOf(q, i + Math.max(1, q.length));
    }
  });
  return out;
}

const FindPanel: React.FC<{ editor: Editor; replace: boolean; onClose: () => void }> = ({ editor, replace: initialReplace, onClose }) => {
  const [query, setQuery] = useState(() => {
    const { from, to, empty } = editor.state.selection;
    return empty ? '' : editor.state.doc.textBetween(from, to, ' ').slice(0, 100);
  });
  const [replaceWith, setReplaceWith] = useState('');
  const [showReplace, setShowReplace] = useState(initialReplace);
  const [index, setIndex] = useState(0);
  const [version, setVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matches = useMemo(() => findAll(editor, query), [editor, query, version]);
  useEffect(() => { inputRef.current?.select(); }, []);
  useEffect(() => { setShowReplace(initialReplace); }, [initialReplace]);

  const go = (i: number) => {
    if (!matches.length) return;
    const k = ((i % matches.length) + matches.length) % matches.length;
    setIndex(k);
    const m = matches[k];
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, m.from, m.to)).scrollIntoView());
  };
  const replaceOne = () => {
    const m = matches[index];
    if (!m) return;
    editor.chain().insertContentAt({ from: m.from, to: m.to }, replaceWith).run();
    setVersion((v) => v + 1);
  };
  const replaceAll = () => {
    if (!matches.length) return;
    // De la fin vers le début : les positions restent justes.
    const tr = editor.state.tr;
    [...matches].reverse().forEach((m) => { tr.insertText(replaceWith, m.from, m.to); });
    editor.view.dispatch(tr);
    setVersion((v) => v + 1);
  };

  return (
    <div className="wd-find" role="search">
      <div className="flex items-center gap-1">
        <Search className="h-4 w-4 shrink-0 text-ink-faint" />
        <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setIndex(0); }} placeholder="Rechercher dans le document"
          aria-label="Rechercher" onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); go(e.shiftKey ? index - 1 : index + (matches[index] && editor.state.selection.from === matches[index].from ? 1 : 0)); }
            if (e.key === 'Escape') { e.preventDefault(); onClose(); }
          }} className="wd-input min-w-0 flex-1" />
        <span className="w-14 shrink-0 text-center text-[12px] tabular-nums text-ink-faint">{query ? `${matches.length ? index + 1 : 0}/${matches.length}` : ''}</span>
        <button type="button" aria-label="Précédent" onClick={() => go(index - 1)} className="wd-small"><ChevronUp className="h-4 w-4" /></button>
        <button type="button" aria-label="Suivant" onClick={() => go(index + 1)} className="wd-small"><ChevronDown className="h-4 w-4" /></button>
        <button type="button" aria-label="Fermer" onClick={onClose} className="wd-small"><X className="h-4 w-4" /></button>
      </div>
      {showReplace ? (
        <div className="mt-1.5 flex items-center gap-1 pl-5">
          <input value={replaceWith} onChange={(e) => setReplaceWith(e.target.value)} placeholder="Remplacer par" aria-label="Remplacer par" className="wd-input min-w-0 flex-1" />
          <button type="button" onClick={replaceOne} disabled={!matches.length} className="wd-text-btn">Remplacer</button>
          <button type="button" onClick={replaceAll} disabled={!matches.length} className="wd-text-btn">Tout</button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowReplace(true)} className="mt-1 pl-5 text-[12px] font-semibold text-brand hover:underline">Remplacer…</button>
      )}
    </div>
  );
};

// ─────────────────────────────── Rechercher une commande (Alt+Q)

const CommandSearch: React.FC<{ run: (id: string, p?: Params) => void; onClose: () => void }> = ({ run, onClose }) => {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const results = useMemo(() => {
    const f = fold(q.trim());
    const cmds = searchableCommands().filter((c) => !f || fold(`${c.label} ${c.location}`).includes(f))
      .map((c) => ({ key: c.id, label: c.label, hint: c.keys ? `${c.location} · ${c.keys}` : c.location, tex: '', exec: () => run(c.id) }));
    const eqs = f.length < 2 ? [] : searchableEquations().filter((e) => fold(e.label).includes(f)).slice(0, 12)
      .map((e) => ({ key: e.id, label: e.label, hint: 'Équation', tex: e.tex,
        exec: () => (e.id.startsWith('builtin.') ? run('insert.equation', { builtin: e.id.slice(8) }) : run('equation.insertStructure', { id: e.id })) }));
    return [...cmds, ...eqs].slice(0, 40);
  }, [q, run]);
  const pick = (i: number) => { const r = results[i]; if (!r) return; onClose(); window.setTimeout(r.exec, 0); };
  return (
    <div className="wd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wd-palette" role="dialog" aria-label="Rechercher une commande">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <Search className="h-4 w-4 text-ink-faint" />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder="Que voulez-vous faire ? (ex. : gras, tableau, intégrale, matrice)"
            aria-label="Commande" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
              if (e.key === 'Escape') { e.preventDefault(); onClose(); }
            }} />
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-1.5" role="listbox">
          {results.map((r, i) => (
            <li key={r.key} role="option" aria-selected={i === sel}>
              <button type="button" onMouseEnter={() => setSel(i)} onClick={() => pick(i)} className={`wd-palette-row ${i === sel ? 'is-active' : ''}`}>
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                {r.tex && <Tex tex={r.tex} className="wd-palette-tex" />}
                <span className="shrink-0 text-[11.5px] text-ink-faint">{r.hint}</span>
              </button>
            </li>
          ))}
          {!results.length && <li className="px-3 py-6 text-center text-[13px] text-ink-faint">Aucune commande ne correspond.</li>}
        </ul>
      </div>
    </div>
  );
};

// ─────────────────────────────── Petite fenêtre de saisie (lien)

const LinkDialog: React.FC<{ initial: string; onSubmit: (url: string) => void; onClose: () => void }> = ({ initial, onSubmit, onClose }) => {
  const [url, setUrl] = useState(initial);
  return (
    <div className="wd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="wd-dialog" role="dialog" aria-label="Lien" onSubmit={(e) => { e.preventDefault(); onSubmit(url.trim()); }}>
        <h2 className="text-[15px] font-semibold text-ink">Lien</h2>
        <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" aria-label="Adresse" className="wd-input mt-3 w-full"
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} />
        <div className="mt-4 flex justify-end gap-2">
          {initial && <button type="button" onClick={() => onSubmit('')} className="wd-text-btn mr-auto">Retirer le lien</button>}
          <button type="button" onClick={onClose} className="wd-text-btn">Annuler</button>
          <button type="submit" className="rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-hover">OK</button>
        </div>
      </form>
    </div>
  );
};

// ─────────────────────────────── Raccourcis du ruban
// Seulement ceux que TipTap ne gère pas déjà : Ctrl+Alt+1/2/3 (titres) et Alt+= (équation, EquationNode)
// sont dans ses extensions ; les doubler les annulait (bascule appliquée deux fois).

const SHORTCUTS: { test: (e: KeyboardEvent) => boolean; id: string }[] = [
  { test: (e) => mod(e) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f', id: 'edit.find' },
  { test: (e) => mod(e) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'h', id: 'edit.replace' },
  { test: (e) => mod(e) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k', id: 'insert.link' },
  { test: (e) => mod(e) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'p', id: 'file.print' },
  { test: (e) => e.altKey && !mod(e) && (e.key.toLowerCase() === 'q' || e.code === 'KeyQ'), id: 'tools.commands' },
  { test: (e) => mod(e) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l', id: 'para.alignLeft' },
  { test: (e) => mod(e) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'e', id: 'para.alignCenter' },
  { test: (e) => mod(e) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'r', id: 'para.alignRight' },
  { test: (e) => mod(e) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'j', id: 'para.justify' },
  { test: (e) => mod(e) && e.shiftKey && e.key.toLowerCase() === 'n', id: 'style.normal' },
  { test: (e) => mod(e) && !e.shiftKey && !e.altKey && e.key === '=', id: 'format.subscript' },
  { test: (e) => mod(e) && e.shiftKey && (e.key === '+' || e.code === 'Equal'), id: 'format.superscript' },
  { test: (e) => mod(e) && e.shiftKey && (e.key === '>' || e.key === '.'), id: 'format.grow' },
  { test: (e) => mod(e) && e.shiftKey && (e.key === '<' || e.key === ','), id: 'format.shrink' },
];
function mod(e: KeyboardEvent) { return e.ctrlKey || e.metaKey; }

// ─────────────────────────────── Éditeur

export const WordEditor: React.FC<WordEditorProps> = ({
  initialContent, onChange, orientation: orientationProp = 'portrait', marges: margesProp = 'normale', onLayoutChange,
  titleBar, file, placeholder = 'Commence à écrire… (Alt+= pour une équation)',
}) => {
  const [eq, setEq] = useState<ActiveEquation | null>(null);
  const [tab, setTab] = useState<TabId>('accueil');
  const [zoom, setZoom] = useState(100);
  const [orientation, setOrientationState] = useState<Orientation>(orientationProp);
  const [marges, setMargesState] = useState<Marges>(margesProp);
  const [find, setFind] = useState<{ replace: boolean } | null>(null);
  const [palette, setPalette] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [imageNote, setImageNote] = useState<{ busy: boolean; text: string } | null>(null);
  const [pages, setPages] = useState({ count: 1, current: 1 });
  const fileRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const tabBeforeEq = useRef<TabId>('accueil');

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const uploadRef = useRef<(ed: Editor, files: File[], pos?: number) => void>(() => {});

  // L'onglet « Équation » s'affiche quand une équation s'ouvre, et rend la main à l'onglet d'avant.
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const eqRef = useRef<ActiveEquation | null>(null);
  const onActiveEquation = useCallback((next: ActiveEquation | null) => {
    const prev = eqRef.current;
    eqRef.current = next;
    setEq(next);
    if (next && !prev) {
      if (tabRef.current !== 'equation') tabBeforeEq.current = tabRef.current;
      setTab('equation');
    } else if (!next && prev && tabRef.current === 'equation') {
      setTab(tabBeforeEq.current);
    }
  }, []);

  const extensions = useMemo(() => wordExtensions({
    placeholder: () => placeholder,
    // MathLive indisponible : on corrige le code LaTeX à la main.
    onEditFormula: (attrs: MathAttrs, pos: number) => {
      const latex = window.prompt('Code LaTeX de l’équation', attrs.latex);
      if (latex !== null && editorRef.current) editorRef.current.chain().updateMathAt(pos, { ...attrs, latex: latex.replace(/\$/g, '') }).run();
    },
    onActiveEquation,
    onFiles: (ed, files, pos) => uploadRef.current(ed, files, pos),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const [initial] = useState(() => mathifyHtml(initialContent || ''));
  const editorRef = useRef<Editor | null>(null);
  const editor = useEditor({
    extensions,
    content: initial,
    editorProps: {
      attributes: { class: 'wd-doc', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Document', spellcheck: 'true', lang: 'fr' },
    },
    onUpdate: ({ editor: ed }) => onChangeRef.current(toStoredHtml(ed.getHTML())),
  });
  editorRef.current = editor;

  // Relit l'état à chaque transaction (boutons actifs, onglet Tableau, compteur de mots).
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? {
      inTable: e.isActive('table'),
      words: (e.storage as { characterCount?: { words: () => number } }).characterCount?.words() ?? 0,
      doc: e.state.doc,
      selection: e.state.selection,
      marks: e.state.storedMarks,
    } : null),
    equalityFn: (a, b) => a === b || (!!a && !!b && a.doc === b.doc && a.selection.eq(b.selection) && a.marks === b.marks && a.inTable === b.inTable),
  });

  uploadRef.current = async (ed, files, pos) => {
    setImageNote({ busy: true, text: files.length > 1 ? 'Envoi des images…' : 'Envoi de l’image…' });
    try {
      const { fileAPI } = await import('@/lib/api');
      let at = pos;
      for (const f of files) {
        const res = await fileAPI.upload(f, 'content');
        const image = { type: 'image', attrs: { src: res.download_url || res.url, alt: f.name } };
        if (ed.isDestroyed) return;
        if (at !== undefined) { ed.chain().insertContentAt(at, image).run(); at = ed.state.selection.to; }
        else ed.chain().focus().insertContent(image).run();
      }
      setImageNote(null);
    } catch {
      setImageNote({ busy: false, text: 'L’image n’a pas pu être envoyée. Réessaie.' });
    }
  };

  const setOrientation = useCallback((o: Orientation) => {
    setOrientationState(o);
    onLayoutChange?.({ orientation: o, marges });
  }, [marges, onLayoutChange]);
  const setMarges = useCallback((m: Marges) => {
    setMargesState(m);
    onLayoutChange?.({ orientation, marges: m });
  }, [orientation, onLayoutChange]);

  // Impression / PDF : une copie de la feuille, seule dans la page, en A4 (marges données par @page).
  const print = useCallback(() => {
    eq?.close('after');
    const sheet = sheetRef.current?.querySelector('.wd-doc');
    if (!sheet) return;
    const m = MARGINS[marges];
    const style = document.createElement('style');
    style.textContent = `@page { size: A4 ${orientation === 'paysage' ? 'landscape' : 'portrait'}; margin: ${m.y}cm ${m.x}cm; }`;
    const root = document.createElement('div');
    root.className = 'wd-print-root';
    const copy = sheet.cloneNode(true) as HTMLElement;
    copy.removeAttribute('contenteditable');
    root.appendChild(copy);
    document.head.appendChild(style);
    document.body.appendChild(root);
    document.body.classList.add('wd-printing');
    const done = () => {
      style.remove();
      root.remove();
      document.body.classList.remove('wd-printing');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.setTimeout(() => window.print(), 50);
  }, [eq, marges, orientation]);

  const ui: EditorUi = {
    openImage: () => fileRef.current?.click(),
    openLink: () => setLink(String(editor?.getAttributes('link').href || '')),
    openFind: (replace) => setFind({ replace }),
    openCommandSearch: () => setPalette(true),
    print,
    zoom,
    setZoom: (z) => setZoom(Math.max(25, Math.min(300, Math.round(z)))),
    orientation,
    setOrientation,
    marges,
    setMarges,
    file,
  };
  const ctx: Ctx | null = editor ? { editor, eq, ui } : null;
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const run = useCallback((id: string, params?: Params) => { if (ctxRef.current) runCommand(ctxRef.current, id, params); }, []);

  // Raccourcis du ruban : à l'échelle de la fenêtre tant que l'éditeur est affiché.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (palette || link) return;
      const target = e.target as HTMLElement | null;
      // Dans une équation ouverte, seules les commandes globales passent (MathLive garde ses touches).
      const inMath = !!target?.closest?.('math-field');
      const hit = SHORTCUTS.find((s) => s.test(e));
      if (!hit) return;
      if (inMath && !['tools.commands', 'file.print', 'edit.find'].includes(hit.id)) return;
      if (target && !inMath && !target.closest('.wd-root') && target !== document.body) return;
      e.preventDefault();
      run(hit.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run, palette, link]);

  // Écran étroit (téléphone) : la feuille A4 réduite serait illisible ; elle prend la largeur de l'écran
  // (comme la « disposition Web » de Word). L'impression reste en A4.
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const check = () => setNarrow(el.clientWidth < 640);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pages : la feuille grandit par pages entières ; page courante = celle du curseur.
  const pageH = (orientation === 'paysage' ? 210 : 297) * MM;
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || !editor) return;
    const measure = () => {
      const content = sheet.querySelector('.wd-doc') as HTMLElement | null;
      const m = MARGINS[marges];
      const used = (content?.scrollHeight ?? 0) + 2 * m.y * 10 * MM;
      const count = Math.max(1, Math.ceil(used / pageH));
      let current = 1;
      try {
        const coords = editor.view.coordsAtPos(editor.state.selection.from);
        const top = sheet.getBoundingClientRect().top;
        const scale = zoom / 100;
        current = Math.min(count, Math.max(1, Math.floor((coords.top - top) / scale / pageH) + 1));
      } catch { /* position hors vue */ }
      setPages((p) => (p.count === count && p.current === current ? p : { count, current }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sheet);
    editor.on('selectionUpdate', measure);
    return () => { ro.disconnect(); editor.off('selectionUpdate', measure); };
  }, [editor, pageH, marges, zoom]);

  if (!editor || !ctx) return null;

  const m = MARGINS[marges];
  const pageW = orientation === 'paysage' ? 297 : 210;
  const pageHmm = orientation === 'paysage' ? 210 : 297;

  return (
    <div className="wd-root">
      {titleBar && <div className="wd-titlebar">{titleBar}</div>}
      <Ribbon ctx={ctx} run={run} tab={tab} setTab={setTab} inTable={!!state?.inTable} />

      <div ref={canvasRef} className="wd-canvas" onMouseDown={(e) => {
        // Clic dans le gris autour de la feuille : le curseur va à la fin du document.
        if (e.target === e.currentTarget) { e.preventDefault(); editor.chain().focus('end').run(); }
      }}>
        {find && <FindPanel editor={editor} replace={find.replace} onClose={() => { setFind(null); editor.commands.focus(); }} />}
        <div className="wd-zoom" style={{ zoom: zoom / 100, width: narrow ? '100%' : undefined }}>
          <div ref={sheetRef} className={`wd-sheet ${narrow ? 'is-narrow' : ''}`} style={narrow ? undefined : {
            width: `${pageW}mm`,
            minHeight: `${pages.count * pageHmm}mm`,
            padding: `${m.y}cm ${m.x}cm`,
            ['--wd-page-h' as string]: `${pageHmm}mm`,
          }} onMouseDown={(e) => {
            // Clic dans une marge : curseur au plus près, comme sur une vraie page.
            if (e.target === e.currentTarget) { e.preventDefault(); editor.chain().focus(e.clientY > (e.currentTarget.getBoundingClientRect().top + 40) ? 'end' : 'start').run(); }
          }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <div className="wd-status" aria-live="polite">
        {!narrow && <span>Page {pages.current} sur {pages.count}</span>}
        <span>{state?.words ?? 0} mot{(state?.words ?? 0) > 1 ? 's' : ''}</span>
        <span className="hidden sm:inline">Français</span>
        {eq && <span className="font-semibold text-brand">Équation : Tab = case suivante · Échap = sortir</span>}
        {imageNote && (
          <span className={`inline-flex items-center gap-1 ${imageNote.busy ? '' : 'text-[#a23b34]'}`}>
            {imageNote.busy && <Loader2 className="h-3 w-3 animate-spin" />}{imageNote.text}
            {!imageNote.busy && <button type="button" aria-label="Fermer" onClick={() => setImageNote(null)}><X className="h-3 w-3" /></button>}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Zoom arrière" onClick={() => run('view.zoomOut')} className="wd-status-btn"><Minus className="h-3 w-3" /></button>
          <input type="range" min={25} max={200} step={5} value={zoom} aria-label="Zoom" onChange={(e) => setZoom(Number(e.target.value))} className="wd-zoom-range" />
          <button type="button" aria-label="Zoom avant" onClick={() => run('view.zoomIn')} className="wd-status-btn"><Plus className="h-3 w-3" /></button>
          <button type="button" onClick={() => setZoom(100)} className="w-11 text-right tabular-nums" title="Zoom 100 %">{zoom} %</button>
        </span>
      </div>

      <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} className="hidden" onChange={(e) => {
        const files = Array.from(e.target.files ?? []).filter((f) => IMAGE_TYPES.includes(f.type));
        e.target.value = '';
        if (files.length) uploadRef.current(editor, files);
      }} />
      {palette && <CommandSearch run={run} onClose={() => { setPalette(false); }} />}
      {link !== null && (
        <LinkDialog initial={link} onClose={() => { setLink(null); editor.commands.focus(); }} onSubmit={(url) => {
          setLink(null);
          if (!url) editor.chain().focus().extendMarkRange('link').unsetLink().run();
          else editor.chain().focus().extendMarkRange('link').setLink({ href: /^(https?:|mailto:)/i.test(url) ? url : `https://${url}` }).run();
        }} />
      )}
    </div>
  );
};

export default WordEditor;
