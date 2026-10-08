/**
 * Éditeur de texte compact qui grandit avec le contenu : contenus, solutions, concours et
 * commentaires (réécrit le 08/10/2026).
 *
 * - Formules : nœuds KaTeX indivisibles (MathNode.ts). Le HTML enregistré garde `$…$` / `$$…$$`.
 *   Taper `$x^2$` crée la formule ; le bouton « Formule » ouvre un panneau avec un champ LaTeX, un
 *   aperçu en direct, des symboles et des modèles qui s'ajoutent au curseur du champ.
 * - Un clic sur une formule (ou Entrée quand elle est sélectionnée) ouvre une bulle juste à côté :
 *   modifier, passer en centrée, supprimer.
 * - variant="comment" : barre réduite en bas (gras, italique, listes, formule), sans titres,
 *   couleurs ni images ; Ctrl/Cmd + Entrée envoie (onSubmit) ; `footer` accueille les boutons.
 * - Images (variant "full") : bouton, glisser-déposer ou coller ; elles partent sur S3 et le HTML
 *   garde l'URL stable (jamais de base64).
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import ImageResize from 'tiptap-extension-resize-image';
import { FileHandler } from '@tiptap/extension-file-handler';
import katex from 'katex';
import {
  AlignCenter, AlignLeft, Bold, ChevronDown, Heading1, Heading2, ImageIcon, Italic, List, ListOrdered,
  Loader2, MessageSquare, Palette, Redo, Sigma, Trash2, Undo, X,
} from 'lucide-react';

import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { MathNode, latexError, mathifyHtml, renderKatex, storedHtml, type MathAttrs } from './MathNode';
import { colorOptions, mathFormulaCategories, mathSymbolGroups } from './editorConfig';
import { CalloutExtension } from './extensions/CalloutExtension';
import { CALLOUT_CONFIGS, CalloutType } from '@/types/callout';

export interface CompactTipTapEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  /** "full" (par défaut) : contenus et solutions. "comment" : commentaires et réponses. */
  variant?: 'full' | 'comment';
  /** Ctrl/Cmd + Entrée. */
  onSubmit?: () => void;
  /** Curseur dans le champ dès l'affichage (à la fin du texte). */
  autoFocus?: boolean;
  /** À droite de la barre du bas (variante commentaire) : Annuler / Publier… */
  footer?: React.ReactNode;
  /** Nom du champ pour les lecteurs d'écran (sinon le texte d'exemple). */
  ariaLabel?: string;
  className?: string;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SHADOW = 'shadow-[0_18px_48px_-12px_rgba(20,18,16,.22)]';
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

// Aperçus KaTeX des modèles : calculés une fois.
const katexCache = new Map<string, string>();
function katexHtml(latex: string) {
  let html = katexCache.get(latex);
  if (html === undefined) {
    try {
      html = katex.renderToString(latex, { throwOnError: false, strict: false, trust: false, output: 'html' });
    } catch {
      html = latex;
    }
    katexCache.set(latex, html);
  }
  return html;
}

// ============================================
// Boutons
// ============================================
const ToolbarButton: React.FC<{
  label: string;
  onClick: () => void;
  /** Bouton bascule (gras, liste…) : état annoncé aux lecteurs d'écran. */
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  buttonRef?: React.Ref<HTMLButtonElement>;
  wide?: boolean;
}> = ({ label, onClick, active, disabled, children, buttonRef, wide }) => (
  <button
    ref={buttonRef}
    type="button"
    title={label}
    aria-label={wide ? undefined : label}
    aria-pressed={active}
    disabled={disabled}
    // Le clic ne doit pas retirer le curseur du texte : la mise en forme s'applique là où il était.
    onMouseDown={keepFocus}
    onClick={onClick}
    className={`inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md transition-colors disabled:pointer-events-none disabled:opacity-35 ${
      wide ? 'px-2 text-[12.5px] font-semibold' : 'w-8'} ${
      active ? 'bg-brand-soft text-brand-hover' : 'text-ink-soft hover:bg-[#f2f1ee] hover:text-ink'}`}
  >
    {children}
  </button>
);

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />;

/** Dans la ligne / Centrée. */
const DisplayToggle: React.FC<{ display: boolean; onChange: (display: boolean) => void }> = ({ display, onChange }) => (
  <div role="group" aria-label="Position de la formule" className="inline-flex shrink-0 rounded-lg bg-[#f2f1ee] p-0.5">
    {[false, true].map((d) => (
      <button key={String(d)} type="button" aria-pressed={display === d} onMouseDown={keepFocus} onClick={() => onChange(d)}
        className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors ${
          display === d ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
        {d ? 'Centrée' : 'Dans la ligne'}
      </button>
    ))}
  </div>
);

// ============================================
// Formulaire d'une formule : panneau d'insertion ou bulle de modification
// ============================================
const FormulaForm: React.FC<{
  mode: 'insert' | 'edit';
  initial: MathAttrs;
  onSubmit: (attrs: MathAttrs) => void;
  onCancel: () => void;
  onDelete?: () => void;
}> = ({ mode, initial, onSubmit, onCancel, onDelete }) => {
  const edit = mode === 'edit';
  const [latex, setLatex] = useState(initial.latex);
  const [display, setDisplay] = useState(initial.display);
  const [group, setGroup] = useState(0);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [category, setCategory] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const templatesRef = useRef<HTMLButtonElement>(null);
  const clean = latex.replace(/\$/g, '').trim();
  const error = useMemo(() => latexError(clean), [clean]);

  useLayoutEffect(() => {
    if (previewRef.current && clean) renderKatex(previewRef.current, clean, display);
  }, [clean, display]);

  // Le champ grandit avec la formule (5 lignes au plus) ; après un symbole, curseur (ou trou à remplir)
  // posé tout de suite, avant la prochaine touche.
  const pendingSelection = useRef<[number, number] | null>(null);
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
    const sel = pendingSelection.current;
    if (sel) {
      pendingSelection.current = null;
      el.focus({ preventScroll: true });
      el.setSelectionRange(sel[0], sel[1]);
    }
  }, [latex]);

  // Après l'affichage : la bulle est encore masquée le temps d'être placée, le focus y échouerait.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  /** Ajoute un morceau au curseur du champ ; la sélection éventuelle va dans son premier « trou ». */
  const insertAtCaret = (snippet: string, select?: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? latex.length;
    const end = el?.selectionEnd ?? latex.length;
    const picked = latex.slice(start, end);
    let text = snippet;
    let hole: [number, number] | null = null;
    // Le trou entre accolades d'abord : dans `\frac{a}{b}`, le « a » de {a}, pas celui de \frac.
    const braced = select ? snippet.indexOf(`{${select}}`) : -1;
    const at = !select ? -1 : braced >= 0 ? braced + 1 : snippet.indexOf(select);
    if (select && at >= 0) {
      if (picked) text = snippet.slice(0, at) + picked + snippet.slice(at + select.length);
      else hole = [start + at, start + at + select.length];
    }
    // `\pi` puis une lettre donnerait `\pix` (commande inconnue) : une espace après les commandes.
    if (/\\[a-zA-Z]+$/.test(text)) text += ' ';
    pendingSelection.current = hole ?? [start + text.length, start + text.length];
    setLatex(latex.slice(0, start) + text + latex.slice(end));
  };

  const submit = () => {
    if (clean) onSubmit({ latex: clean, display });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (templatesOpen) setTemplatesOpen(false);
      else onCancel();
    }
  };

  const symbols = mathSymbolGroups[group].symbols;
  const cat = mathFormulaCategories[category];

  return (
    <div className={edit ? 'p-3' : 'px-3 pb-3 pt-2.5'}>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
          {edit ? 'Modifier la formule' : 'Formule'}
        </span>
        <DisplayToggle display={display} onChange={setDisplay} />
        <button type="button" onClick={onCancel} aria-label="Fermer" title="Fermer (Échap)"
          className="-mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className={`mt-2 grid gap-2 ${edit ? '' : 'sm:grid-cols-2'}`}>
        <textarea
          ref={inputRef}
          rows={1}
          value={latex}
          onChange={(e) => setLatex(e.target.value.replace(/\n/g, ' '))}
          onKeyDown={onKeyDown}
          aria-label="Code LaTeX de la formule"
          aria-describedby={error ? 'formula-error' : undefined}
          placeholder="Ex. : \frac{1}{2}, x^2, \sqrt{x}"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          className="block min-h-[42px] w-full resize-none rounded-lg border border-line bg-white px-3 py-2.5 font-mono text-[13.5px] leading-snug text-ink placeholder:text-[#9a958c] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <div aria-hidden className="flex min-h-[42px] items-center overflow-x-auto rounded-lg border border-dashed border-line bg-white px-3 py-1.5">
          {clean
            ? <div ref={previewRef} className={`min-w-0 text-ink ${display ? 'w-full text-center' : ''}`} />
            : <span className="text-[12.5px] text-ink-faint">L’aperçu s’affiche ici</span>}
        </div>
      </div>
      {error && <p id="formula-error" role="status" className="mt-1.5 text-[12px] font-medium text-[#a23b34]">{error}</p>}

      {/* Palette : symboles par familles, modèles du programme. */}
      <div className="mt-2.5 flex items-center gap-1">
        <div role="tablist" aria-label="Symboles" className="scrollbar-hide flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {mathSymbolGroups.map((g, i) => (
            <button key={g.name} type="button" role="tab" aria-selected={group === i} onMouseDown={keepFocus} onClick={() => setGroup(i)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                group === i ? 'bg-ink text-white' : 'text-ink-faint hover:bg-[#f2f1ee] hover:text-ink'}`}>
              {g.name}
            </button>
          ))}
        </div>
        {!edit && (
          <button ref={templatesRef} type="button" onMouseDown={keepFocus} onClick={() => setTemplatesOpen((v) => !v)}
            aria-expanded={templatesOpen} aria-haspopup="dialog"
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
              templatesOpen ? 'border-brand bg-brand-soft text-brand-hover' : 'border-line bg-white text-ink-soft hover:border-ink'}`}>
            Modèles <ChevronDown className={`h-3.5 w-3.5 transition-transform ${templatesOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      <div role="tabpanel" className="mt-1.5 flex flex-wrap gap-1">
        {symbols.map((s) => (
          <button key={s.latex} type="button" title={s.label} aria-label={s.label} onMouseDown={keepFocus}
            onClick={() => insertAtCaret(s.latex, s.select)}
            className="inline-flex h-8 min-w-[34px] items-center justify-center rounded-md border border-line bg-white px-1.5 text-[14px] text-ink transition-colors hover:border-brand hover:bg-brand-soft">
            {s.preview ? <span className="text-[13px]" dangerouslySetInnerHTML={{ __html: katexHtml(s.preview) }} /> : s.display}
          </button>
        ))}
      </div>

      <FloatingPanel anchorRef={templatesRef} open={templatesOpen} onClose={() => setTemplatesOpen(false)} placement="bottom-end"
        role="dialog" className={`flex max-h-[min(440px,70vh)] w-[min(420px,calc(100vw-16px))] flex-col overflow-hidden rounded-xl border border-line bg-white ${SHADOW}`}>
        <div className="flex shrink-0 flex-wrap gap-1 border-b border-line px-2 py-2">
          {mathFormulaCategories.map((c, i) => (
            <button key={c.name} type="button" onMouseDown={keepFocus} onClick={() => setCategory(i)} aria-pressed={category === i}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                category === i ? 'bg-ink text-white' : 'text-ink-faint hover:bg-[#f2f1ee] hover:text-ink'}`}>
              {c.name}
            </button>
          ))}
        </div>
        <ul className="min-h-0 overflow-y-auto p-1.5">
          {cat.formulas.map((f) => (
            <li key={f.name}>
              <button type="button" onMouseDown={keepFocus}
                onClick={() => { insertAtCaret(f.latex); setTemplatesOpen(false); }}
                className="flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-brand-soft/70">
                <span className="text-[12px] font-semibold text-ink-faint">{f.name}</span>
                <span className="max-w-full overflow-x-auto py-0.5 text-[15px] text-ink" dangerouslySetInnerHTML={{ __html: katexHtml(f.latex) }} />
              </button>
            </li>
          ))}
        </ul>
      </FloatingPanel>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {edit ? (
          onDelete && (
            <button type="button" onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold text-[#a23b34] hover:bg-[#fbecea]">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          )
        ) : (
          <p className="hidden min-w-0 flex-1 text-[12px] text-ink-faint sm:block">
            Astuce : tu peux aussi taper <code className="rounded bg-[#f2f1ee] px-1 font-mono text-[11.5px] text-ink-soft">$x^2$</code> directement dans le texte.
          </p>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:bg-[#f2f1ee]">
            Annuler
          </button>
          <button type="button" onClick={submit} disabled={!clean}
            className="rounded-lg bg-brand px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-40">
            {edit ? 'Mettre à jour' : 'Insérer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Éditeur
// ============================================
const CompactTipTapEditor: React.FC<CompactTipTapEditorProps> = ({
  content = '',
  onChange,
  placeholder,
  minHeight = '100px',
  variant = 'full',
  onSubmit,
  autoFocus = false,
  footer,
  ariaLabel,
  className = '',
}) => {
  const comment = variant === 'comment';
  const [composer, setComposer] = useState<MathAttrs | null>(null);
  const [editing, setEditing] = useState<(MathAttrs & { pos: number }) | null>(null);
  const [showColors, setShowColors] = useState(false);
  const [showCallouts, setShowCallouts] = useState(false);
  const [imageNote, setImageNote] = useState<{ busy: boolean; text: string } | null>(null);
  const editAnchor = useRef<HTMLElement | null>(null);
  const colorRef = useRef<HTMLButtonElement>(null);
  const calloutRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Rappels toujours à jour, lus par les extensions (créées une seule fois).
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const placeholderRef = useRef(placeholder);
  placeholderRef.current = placeholder;
  const onEditRef = useRef<(attrs: MathAttrs, pos: number) => void>(() => {});
  const uploadRef = useRef<(ed: Editor, files: File[], pos?: number) => void>(() => {});
  // Dernier HTML émis (ou reçu) : distinguer l'écho de notre propre saisie d'un vrai changement venu du parent.
  const lastHtml = useRef(content);
  const touched = useRef(false);

  const extensions = useMemo(() => {
    const base = [
      StarterKit.configure({
        heading: comment ? false : { levels: [1, 2] },
        bulletList: { HTMLAttributes: { class: 'list-disc pl-5' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal pl-5' } },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
        ...(comment ? { code: false, codeBlock: false, blockquote: false, horizontalRule: false, trailingNode: false } : {}),
      }),
      Placeholder.configure({ placeholder: () => placeholderRef.current ?? '' }),
      MathNode.configure({ onEdit: (attrs, pos) => onEditRef.current(attrs, pos) }),
    ];
    if (comment) return base;
    return [
      ...base,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ImageResize.configure({ inline: false, HTMLAttributes: { class: 'content-image rounded max-w-full' } }),
      FileHandler.configure({
        allowedMimeTypes: IMAGE_TYPES,
        onDrop: (ed, files, pos) => uploadRef.current(ed, files, pos),
        // Image copiée depuis une page web : le HTML collé la contient déjà.
        onPaste: (ed, files, html) => { if (!html || !/<img/i.test(html)) uploadRef.current(ed, files); },
      }),
      CalloutExtension,
    ];
  }, [comment]);

  const editorProps = useMemo(() => ({
    attributes: {
      class: 'fd-editor-body',
      style: `min-height: ${minHeight}`,
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': ariaLabel || placeholder || 'Texte',
    },
    handleKeyDown: (_view: unknown, event: KeyboardEvent) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && onSubmitRef.current) {
        event.preventDefault();
        onSubmitRef.current();
        return true;
      }
      return false;
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [minHeight]);

  const [initialContent] = useState(() => mathifyHtml(content || ''));
  const editor = useEditor({
    extensions,
    content: initialContent,
    autofocus: autoFocus ? 'end' : false,
    editorProps,
    onFocus: () => { touched.current = true; },
    onUpdate: ({ editor: ed }) => {
      const html = storedHtml(ed.getHTML());
      lastHtml.current = html;
      onChangeRef.current?.(html);
    },
  });

  const ui = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? {
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    } : null),
  });

  // autoFocus : curseur à la fin tout de suite (TipTap ne le pose qu'à l'image suivante).
  useLayoutEffect(() => {
    if (autoFocus && editor && !editor.isDestroyed) editor.view.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Contenu changé par le parent (import JSON, champ vidé après envoi…) : on remplace, sans renvoyer onChange.
  useEffect(() => {
    if (!editor || editor.isDestroyed || content === lastHtml.current) return;
    lastHtml.current = content;
    if (content === storedHtml(editor.getHTML()) || (!content && editor.isEmpty)) return;
    setEditing(null);
    editor.commands.setContent(mathifyHtml(content || ''), { emitUpdate: false });
  }, [editor, content]);

  // Un clic sur une formule : la bulle s'ouvre juste à côté.
  onEditRef.current = (attrs, pos) => {
    if (!editor) return;
    editAnchor.current = editor.view.nodeDOM(pos) as HTMLElement | null;
    setComposer(null);
    setEditing({ ...attrs, pos });
  };

  uploadRef.current = async (ed, files, pos) => {
    setImageNote({ busy: true, text: files.length > 1 ? 'Envoi des images…' : 'Envoi de l’image…' });
    try {
      const { fileAPI } = await import('@/lib/api');
      let at = pos;
      for (const file of files) {
        const res = await fileAPI.upload(file, 'content');
        const image = { type: 'image', attrs: { src: res.download_url || res.url, alt: file.name } };
        if (ed.isDestroyed) return;
        if (at !== undefined) {
          ed.chain().insertContentAt(at, image).run();
          at = ed.state.selection.to;
        } else {
          ed.chain().focus().insertContent(image).run();
        }
      }
      setImageNote(null);
    } catch {
      setImageNote({ busy: false, text: 'L’image n’a pas pu être envoyée. Réessaie.' });
    }
  };

  const openComposer = useCallback(() => {
    if (!editor) return;
    setShowColors(false);
    setShowCallouts(false);
    const { selection, doc } = editor.state;
    // Une formule sélectionnée : on la modifie. Du texte sélectionné : il devient la formule.
    const node = doc.nodeAt(selection.from);
    if (!selection.empty && node?.type.name === 'math' && selection.to === selection.from + node.nodeSize) {
      onEditRef.current(node.attrs as MathAttrs, selection.from);
      return;
    }
    const picked = selection.empty ? '' : doc.textBetween(selection.from, selection.to, ' ', '');
    setEditing(null);
    setComposer({ latex: picked.replace(/\$/g, '').trim(), display: false });
  }, [editor]);

  if (!editor) return null;

  // Le focus de TipTap attend l'image suivante : les touches tapées entre-temps étaient perdues
  // (juste après « Insérer », par exemple). On le pose tout de suite.
  const focusNow = () => { if (!editor.isDestroyed) editor.view.focus(); };
  const closeComposer = () => {
    setComposer(null);
    editor.commands.focus();
    focusNow();
  };
  const insertFormula = ({ latex, display }: MathAttrs) => {
    // Jamais cliqué dans le texte : la formule va à la fin, pas devant tout le reste.
    editor.chain().focus(touched.current ? undefined : 'end').insertMath(latex, display).run();
    focusNow();
    setComposer(null);
  };
  const closeEdit = (refocus: boolean) => {
    const pos = editing?.pos;
    setEditing(null);
    if (refocus && pos !== undefined) {
      editor.chain().focus(pos + 1).run();
      focusNow();
    }
  };
  const updateFormula = (attrs: MathAttrs) => {
    if (!editing) return;
    editor.chain().updateMathAt(editing.pos, attrs).focus(editing.pos + 1).run();
    focusNow();
    setEditing(null);
  };
  const deleteFormula = () => {
    if (!editing) return;
    editor.chain().deleteMathAt(editing.pos).focus(editing.pos).run();
    focusNow();
    setEditing(null);
  };

  const run = (fn: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => () => fn(editor.chain().focus()).run();
  const formulaButton = (
    <ToolbarButton label="Formule" wide active={!!composer} onClick={() => (composer ? closeComposer() : openComposer())}>
      <Sigma className="h-4 w-4" /> Formule
    </ToolbarButton>
  );

  const composerPanel = composer && (
    <div className={`bg-[#fbfaf8] ${comment ? 'border-t' : 'border-b'} border-line`}>
      <FormulaForm mode="insert" initial={composer} onSubmit={insertFormula} onCancel={closeComposer} />
    </div>
  );

  const toolbar = comment ? (
    <div className="flex flex-wrap items-center gap-0.5 border-t border-line px-1.5 py-1.5">
      <ToolbarButton label="Gras (Ctrl+B)" active={ui?.bold} onClick={run((c) => c.toggleBold())}><Bold className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Italique (Ctrl+I)" active={ui?.italic} onClick={run((c) => c.toggleItalic())}><Italic className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Liste à puces" active={ui?.bullet} onClick={run((c) => c.toggleBulletList())}><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Liste numérotée" active={ui?.ordered} onClick={run((c) => c.toggleOrderedList())}><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <Divider />
      {formulaButton}
      {footer && <div className="ml-auto flex items-center gap-2 pl-2">{footer}</div>}
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-line bg-[#fbfaf8] px-1.5 py-1">
      <ToolbarButton label="Gras (Ctrl+B)" active={ui?.bold} onClick={run((c) => c.toggleBold())}><Bold className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Italique (Ctrl+I)" active={ui?.italic} onClick={run((c) => c.toggleItalic())}><Italic className="h-4 w-4" /></ToolbarButton>
      <Divider />
      <ToolbarButton label="Titre" active={ui?.h1} onClick={run((c) => c.toggleHeading({ level: 1 }))}><Heading1 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Sous-titre" active={ui?.h2} onClick={run((c) => c.toggleHeading({ level: 2 }))}><Heading2 className="h-4 w-4" /></ToolbarButton>
      <Divider />
      <ToolbarButton label="Liste à puces" active={ui?.bullet} onClick={run((c) => c.toggleBulletList())}><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Liste numérotée" active={ui?.ordered} onClick={run((c) => c.toggleOrderedList())}><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <Divider />
      <ToolbarButton label="Aligner à gauche" active={ui?.left} onClick={run((c) => c.setTextAlign('left'))}><AlignLeft className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Centrer" active={ui?.center} onClick={run((c) => c.setTextAlign('center'))}><AlignCenter className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Couleur du texte" buttonRef={colorRef} active={showColors} onClick={() => setShowColors((v) => !v)}><Palette className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Image" onClick={() => fileRef.current?.click()}><ImageIcon className="h-4 w-4" /></ToolbarButton>
      <Divider />
      {formulaButton}
      <ToolbarButton label="Encarts" wide buttonRef={calloutRef} active={showCallouts} onClick={() => setShowCallouts((v) => !v)}>
        <MessageSquare className="h-4 w-4" /> Encarts <ChevronDown className={`h-3 w-3 transition-transform ${showCallouts ? 'rotate-180' : ''}`} />
      </ToolbarButton>
      <span className="ml-auto flex items-center">
        <ToolbarButton label="Annuler (Ctrl+Z)" disabled={!ui?.canUndo} onClick={run((c) => c.undo())}><Undo className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Rétablir (Ctrl+Y)" disabled={!ui?.canRedo} onClick={run((c) => c.redo())}><Redo className="h-4 w-4" /></ToolbarButton>
      </span>

      <FloatingPanel anchorRef={colorRef} open={showColors} onClose={() => setShowColors(false)}
        className={`grid grid-cols-4 gap-1.5 rounded-xl border border-line bg-white p-2.5 ${SHADOW}`}>
        {colorOptions.map((color) => (
          <button key={color} type="button" aria-label={`Couleur ${color}`} onMouseDown={keepFocus}
            onClick={() => { editor.chain().focus().setColor(color).run(); setShowColors(false); }}
            className="h-7 w-7 rounded-md border border-line transition-transform hover:scale-110" style={{ backgroundColor: color }} />
        ))}
        <button type="button" onMouseDown={keepFocus} onClick={() => { editor.chain().focus().unsetColor().run(); setShowColors(false); }}
          className="col-span-4 mt-0.5 rounded-md py-1 text-[12px] font-semibold text-ink-soft hover:bg-[#f2f1ee]">
          Couleur par défaut
        </button>
      </FloatingPanel>
      <FloatingPanel anchorRef={calloutRef} open={showCallouts} onClose={() => setShowCallouts(false)}
        className={`max-h-96 w-64 overflow-y-auto rounded-xl border border-line bg-white p-2 ${SHADOW}`}>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(CALLOUT_CONFIGS) as CalloutType[]).map((type) => {
            const config = CALLOUT_CONFIGS[type];
            return (
              <button key={type} type="button" onMouseDown={keepFocus}
                onClick={() => { editor.chain().focus().setCallout({ type }).run(); setShowCallouts(false); }}
                className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-colors hover:bg-[#faf9f7] ${config.borderColor}`}>
                <span className="shrink-0 text-base">{config.icon}</span>
                <span className={`truncate text-[12px] font-semibold ${config.textColor}`}>{config.label}</span>
              </button>
            );
          })}
        </div>
      </FloatingPanel>
      <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).filter((f) => IMAGE_TYPES.includes(f.type));
          e.target.value = '';
          if (files.length) uploadRef.current(editor, files);
        }} />
    </div>
  );

  return (
    <div className={`fd-editor rounded-xl border border-line bg-white transition-shadow focus-within:border-[#b9d9c6] focus-within:ring-2 focus-within:ring-brand/10 ${className}`}>
      {!comment && toolbar}
      {!comment && composerPanel}
      <EditorContent editor={editor} />
      {imageNote && (
        <p role="status" className={`flex items-center gap-1.5 border-t border-line px-3.5 py-2 text-[12.5px] ${imageNote.busy ? 'text-ink-faint' : 'text-[#a23b34]'}`}>
          {imageNote.busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {imageNote.text}
          {!imageNote.busy && (
            <button type="button" onClick={() => setImageNote(null)} aria-label="Fermer" className="ml-auto rounded p-0.5 hover:bg-[#f2f1ee]"><X className="h-3.5 w-3.5" /></button>
          )}
        </p>
      )}
      {comment && composerPanel}
      {comment && toolbar}

      {/* Bulle de modification, accrochée à la formule cliquée. */}
      <FloatingPanel anchorRef={editAnchor} open={!!editing} onClose={() => closeEdit(false)} placement="bottom-start"
        role="dialog" className={`w-[min(380px,calc(100vw-16px))] rounded-xl border border-line bg-white ${SHADOW}`}>
        {editing && (
          <FormulaForm key={`${editing.pos}:${editing.latex}`} mode="edit" initial={editing}
            onSubmit={updateFormula} onDelete={deleteFormula} onCancel={() => closeEdit(true)} />
        )}
      </FloatingPanel>
    </div>
  );
};

export default CompactTipTapEditor;
