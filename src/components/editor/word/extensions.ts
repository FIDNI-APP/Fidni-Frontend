/**
 * Extensions TipTap de l'éditeur de documents (12/10/2026). Le format reste celui des contenus FIDNI
 * (HTML + formules `$…$`), enrichi de ce qu'un traitement de texte attend : police, taille, surlignage,
 * indice/exposant, tableaux, sauts de page, retraits.
 */
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder, CharacterCount } from '@tiptap/extensions';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import ImageResize from 'tiptap-extension-resize-image';
import { FileHandler } from '@tiptap/extension-file-handler';
import type { CommandProps, Editor } from '@tiptap/core';

import { CalloutExtension } from '../extensions/CalloutExtension';
import { EquationNode, type ActiveEquation } from './EquationNode';
import { PageSpacers } from '@/components/paper/livePagination';
import type { MathAttrs } from '../MathNode';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: { setPageBreak: () => ReturnType };
    indent: { indent: () => ReturnType; outdent: () => ReturnType; setLineSpacing: (value: string | null) => ReturnType };
  }
}

/** Saut de page (Ctrl+Entrée, comme Word) : une ligne pointillée à l'écran, une nouvelle feuille à l'impression. */
export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: 'div[data-page-break]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-page-break': '', class: 'wd-page-break' })],
  addCommands() {
    return {
      setPageBreak: () => ({ chain }) => chain().insertContent([{ type: this.name }, { type: 'paragraph' }]).run(),
    };
  },
  addKeyboardShortcuts() {
    return { 'Mod-Enter': () => this.editor.commands.setPageBreak() };
  },
});

const INDENT_STEP = 1.25; // cm, comme le retrait par défaut de Word
const MAX_INDENT = 10;

/**
 * Retrait de paragraphe (Augmenter / Diminuer le retrait ; dans une liste, change le niveau) et interligne
 * du paragraphe (1 ; 1,15 ; 1,5 ; 2…), portés par le paragraphe lui-même comme dans Word.
 */
export const Indent = Extension.create({
  name: 'indent',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        indent: {
          default: 0,
          parseHTML: (el) => {
            const v = parseFloat(el.style.marginLeft || '0');
            return Number.isFinite(v) ? Math.max(0, Math.min(MAX_INDENT, Math.round(v / INDENT_STEP))) : 0;
          },
          renderHTML: (attrs) => (attrs.indent ? { style: `margin-left: ${attrs.indent * INDENT_STEP}cm` } : {}),
        },
        lineSpacing: {
          default: null,
          parseHTML: (el) => {
            const v = parseFloat(el.style.lineHeight || '');
            return Number.isFinite(v) && v >= 0.8 && v <= 4 ? String(v) : null;
          },
          renderHTML: (attrs) => (attrs.lineSpacing ? { style: `line-height: ${attrs.lineSpacing}` } : {}),
        },
      },
    }];
  },
  addCommands() {
    const shift = (delta: number) => () => ({ editor, tr, state, dispatch }: CommandProps) => {
      if (editor.isActive('listItem')) {
        return delta > 0 ? editor.commands.sinkListItem('listItem') : editor.commands.liftListItem('listItem');
      }
      const { from, to } = state.selection;
      let changed = false;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
        const next = Math.max(0, Math.min(MAX_INDENT, (node.attrs.indent || 0) + delta));
        if (next !== node.attrs.indent) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          changed = true;
        }
      });
      if (changed && dispatch) return true;
      return changed;
    };
    const setLineSpacing = (value: string | null) => ({ tr, state }: CommandProps) => {
      const { from, to } = state.selection;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'paragraph' || node.type.name === 'heading') tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineSpacing: value });
      });
      return true;
    };
    return { indent: shift(1), outdent: shift(-1), setLineSpacing };
  },
});

export interface WordExtensionsOptions {
  placeholder: () => string;
  onEditFormula: (attrs: MathAttrs, pos: number) => void;
  onActiveEquation: (eq: ActiveEquation | null) => void;
  onFiles: (editor: Editor, files: File[], pos?: number) => void;
}

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function wordExtensions(o: WordExtensionsOptions) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
    }),
    Placeholder.configure({ placeholder: o.placeholder }),
    CharacterCount,
    TextStyleKit.configure({ backgroundColor: false, lineHeight: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    TableKit.configure({ table: { resizable: true, HTMLAttributes: { class: 'wd-table' } } }),
    ImageResize.configure({ inline: false, HTMLAttributes: { class: 'content-image rounded max-w-full' } }),
    FileHandler.configure({
      allowedMimeTypes: IMAGE_TYPES,
      onDrop: (ed, files, pos) => o.onFiles(ed, files, pos),
      onPaste: (ed, files, html) => { if (!html || !/<img/i.test(html)) o.onFiles(ed, files); },
    }),
    CalloutExtension,
    PageBreak,
    Indent,
    EquationNode.configure({ onEdit: o.onEditFormula, onActive: o.onActiveEquation }),
    // Vraies pages (12/10/2026) : espaces posés par la pagination avant ce qui déborderait.
    PageSpacers,
  ];
}
