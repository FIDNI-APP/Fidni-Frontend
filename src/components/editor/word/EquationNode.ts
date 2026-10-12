/**
 * Équations de l'éditeur de documents (12/10/2026), sur le modèle de wordcraft (`cmd/equation.rs`,
 * onglet contextuel « Équation ») : une équation se modifie SUR PLACE, dans la ligne, comme dans Word.
 *
 * - Même nœud que l'éditeur compact (MathNode, nom `math`) : le HTML enregistré reste `$…$` / `$$…$$`.
 * - Clic sur une équation, Entrée quand elle est sélectionnée, ou flèche gauche/droite qui y entre :
 *   un champ MathLive remplace le rendu KaTeX. Flèche qui sort, Échap, Entrée ou clic ailleurs : on
 *   en ressort, le curseur du texte reprend juste avant ou après. Une équation laissée vide disparaît.
 * - `Alt+=` (raccourci de Word et de wordcraft) insère une nouvelle équation et l'ouvre.
 * - Numérotation : `\tag{n}` en fin d'équation centrée (KaTeX l'affiche à la marge droite). MathLive ne
 *   le connaît pas : il est retiré pendant la modification et remis à la sortie.
 * - Le ruban suit l'équation ouverte (onglet « Équation ») grâce à `onActive`.
 */
import type { Editor } from '@tiptap/core';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import type { MathfieldElement } from 'mathlive';
import { MathNode, renderKatex, type MathAttrs } from '../MathNode';
import { forEditing } from './mathGallery';
import { loadMathLive, toStoredLatex } from './mathlive';
import './word.css';

/** Ce que le ruban sait faire de l'équation ouverte. */
export interface ActiveEquation {
  mathfield: MathfieldElement;
  display: boolean;
  numbered: boolean;
  /** Insère un modèle (cases vides `⬚`) à la place de la sélection du champ. */
  insert: (tex: string) => void;
  setDisplay: (display: boolean) => void;
  toggleNumber: () => void;
  /** Code LaTeX (lecture), pour l'afficher en « linéaire ». */
  latex: () => string;
  setLatex: (latex: string) => void;
  close: (where?: 'before' | 'after') => void;
}

export interface EquationNodeOptions {
  onEdit?: (attrs: MathAttrs, pos: number) => void;
  /** Une équation s'ouvre (handle) ou se referme (null). */
  onActive?: (eq: ActiveEquation | null) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    equation: {
      /** Nouvelle équation au curseur, ouverte aussitôt (`Alt+=`). Avec un LaTeX : équation prête. */
      insertEquation: (latex?: string, display?: boolean, template?: string) => ReturnType;
    };
  }
}

const TAG_RE = /\s*\\tag\{([^{}]*)\}\s*$/;
type Opener = (caret?: 'start' | 'end', template?: string) => void;
const openers = new WeakMap<HTMLElement, Opener>();

/** Ouvre l'équation à `pos` (si c'en est une). */
export function openEquationAt(editor: Editor, pos: number, caret?: 'start' | 'end', template?: string) {
  const dom = editor.view.nodeDOM(pos);
  const open = dom instanceof HTMLElement ? openers.get(dom) : undefined;
  if (!open) return false;
  open(caret, template);
  return true;
}

/** Prochain numéro d'équation du document : 1 + le plus grand `\tag{n}` déjà posé. */
function nextNumber(editor: Editor) {
  let max = 0;
  editor.state.doc.descendants((n) => {
    if (n.type.name !== 'math') return;
    const m = String(n.attrs.latex).match(TAG_RE);
    const v = m ? parseInt(m[1], 10) : NaN;
    if (Number.isFinite(v)) max = Math.max(max, v);
  });
  return max + 1;
}

export const EquationNode = MathNode.extend<EquationNodeOptions>({
  addOptions() {
    return { onEdit: undefined, onActive: undefined };
  },

  addNodeView() {
    const options = this.options;
    const editor = this.editor;
    return ({ node, getPos }) => {
      const dom = document.createElement('span');
      const rendered = document.createElement('span');
      dom.appendChild(rendered);
      dom.contentEditable = 'false';
      let current = node;
      let field: MathfieldElement | null = null;
      let tag: string | null = null;
      let closing = false;

      const attrs = () => current.attrs as MathAttrs;
      const pos = () => (typeof getPos === 'function' ? getPos() : undefined);
      const paint = () => {
        const { latex, display } = attrs();
        dom.className = `math-node wd-eq ${display ? 'math-node-display' : 'math-node-inline'}${field ? ' is-editing' : ''}`;
        dom.setAttribute('data-latex', latex);
        dom.title = field ? '' : 'Cliquer pour modifier l’équation';
        if (!field) renderKatex(rendered, latex, display);
      };

      /** Écrit le LaTeX du champ dans le document (une étape d'annulation par pause de frappe). */
      const commit = (patch?: Partial<MathAttrs>) => {
        const at = pos();
        if (at === undefined || !field) return;
        let latex = toStoredLatex(field.getValue('latex-without-placeholders'));
        const display = patch?.display ?? attrs().display;
        if (tag !== null && display && latex) latex = `${latex} \\tag{${tag}}`;
        const next = { latex, display };
        if (next.latex === attrs().latex && next.display === attrs().display) return;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(at, undefined, next));
      };

      const handle = (): ActiveEquation | null => field && ({
        mathfield: field,
        display: attrs().display,
        numbered: tag !== null,
        insert: (tex) => {
          field?.insert(forEditing(tex), { selectionMode: 'placeholder', focus: true, format: 'latex' });
          commit();
          options.onActive?.(handle());
        },
        setDisplay: (display) => {
          if (!display) tag = null;
          commit({ display });
          field?.focus();
          options.onActive?.(handle());
        },
        toggleNumber: () => {
          if (tag !== null) tag = null;
          else tag = String(nextNumber(editor));
          commit({ display: tag !== null ? true : attrs().display });
          field?.focus();
          options.onActive?.(handle());
        },
        latex: () => toStoredLatex(field?.getValue('latex') ?? ''),
        setLatex: (latex) => {
          field?.setValue(latex);
          commit();
          field?.focus();
          options.onActive?.(handle());
        },
        close: (where = 'after') => close(where),
      });

      const close = (where: 'before' | 'after' = 'after') => {
        if (!field || closing) return;
        closing = true;
        commit();
        field.remove();
        field = null;
        tag = null;
        closing = false;
        rendered.style.display = '';
        paint();
        options.onActive?.(null);
        const at = pos();
        if (at === undefined || editor.isDestroyed) return;
        // Équation laissée vide : on la retire (comme Word).
        if (!attrs().latex.trim()) {
          editor.view.dispatch(editor.state.tr.delete(at, at + current.nodeSize));
          editor.view.focus();
          return;
        }
        const target = where === 'before' ? at : at + current.nodeSize;
        const tr = editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(target), where === 'before' ? -1 : 1));
        editor.view.dispatch(tr);
        editor.view.focus();
      };

      const open: Opener = (caret = 'end', template) => {
        if (field || !editor.isEditable) return;
        loadMathLive().then((MF) => {
          if (field || editor.isDestroyed || !dom.isConnected) return;
          const mf = new MF();
          field = mf;
          const { latex } = attrs();
          const m = latex.match(TAG_RE);
          tag = m ? m[1] : null;
          mf.className = 'wd-mathfield';
          mf.defaultMode = 'math';
          mf.smartFence = true;
          mf.mathVirtualKeyboardPolicy = 'auto';
          mf.popoverPolicy = 'auto';
          mf.setAttribute('aria-label', 'Équation');
          mf.value = m ? latex.replace(TAG_RE, '') : latex;
          mf.addEventListener('input', () => commit());
          mf.addEventListener('move-out', (e) => {
            e.preventDefault();
            const dir = e.detail.direction;
            close(dir === 'backward' || dir === 'upward' ? 'before' : 'after');
          });
          mf.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
              e.preventDefault();
              e.stopPropagation();
              close('after');
            }
          }, { capture: true });
          // Clic ailleurs dans le document : on referme. Les boutons du ruban gardent le focus (mousedown
          // annulé) ; le clavier virtuel aussi. Fenêtre qui perd le focus : on ne referme pas.
          mf.addEventListener('focusout', () => {
            window.setTimeout(() => {
              if (field === mf && !mf.hasFocus() && document.hasFocus() && !document.activeElement?.closest('.wd-ribbon, .wd-menu, .ML__keyboard')) close('after');
            }, 0);
          });
          rendered.style.display = 'none';
          dom.appendChild(mf);
          paint();
          mf.focus();
          mf.executeCommand(caret === 'start' ? 'moveToMathfieldStart' : 'moveToMathfieldEnd');
          if (template) {
            mf.insert(forEditing(template), { selectionMode: 'placeholder', focus: true, format: 'latex' });
            commit();
          }
          options.onActive?.(handle());
        }).catch(() => {
          // MathLive indisponible (réseau) : la bulle LaTeX classique.
          const at = pos();
          if (at !== undefined) options.onEdit?.(attrs(), at);
        });
      };
      openers.set(dom, open);

      dom.addEventListener('mousedown', (e) => {
        if (field) return;
        e.preventDefault();
      });
      dom.addEventListener('click', (e) => {
        if (field) return;
        e.preventDefault();
        e.stopPropagation();
        open('end');
      });
      paint();

      return {
        dom,
        update: (updated) => {
          if (updated.type !== current.type) return false;
          current = updated;
          if (field) {
            // Pendant la modification, le champ fait foi ; on ne suit que l'alignement.
            dom.classList.toggle('math-node-display', attrs().display);
            dom.classList.toggle('math-node-inline', !attrs().display);
          } else {
            paint();
          }
          return true;
        },
        selectNode: () => dom.classList.add('is-selected'),
        deselectNode: () => dom.classList.remove('is-selected'),
        // Tout ce qui se passe dans le champ MathLive lui appartient.
        stopEvent: () => !!field,
        ignoreMutation: () => true,
        destroy: () => {
          if (field) options.onActive?.(null);
          field = null;
        },
      };
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      insertEquation: (latex = '', display = false, template?: string) => ({ editor, chain }) => {
        const at = editor.state.selection.from;
        const ok = chain().insertMath(latex, display).run();
        if (ok && !latex) window.setTimeout(() => openEquationAt(editor, at, 'end', template), 0);
        return ok;
      },
    };
  },

  addKeyboardShortcuts() {
    const parent = this.parent?.() ?? {};
    // Flèches qui entrent dans une équation : elle s'ouvre (curseur au bord par lequel on entre).
    const enter = (dir: -1 | 1) => () => {
      const { selection } = this.editor.state;
      if (!selection.empty) return false;
      const $pos = selection.$from;
      const n = dir < 0 ? $pos.nodeBefore : $pos.nodeAfter;
      if (!n || n.type !== this.type) return false;
      return openEquationAt(this.editor, dir < 0 ? $pos.pos - n.nodeSize : $pos.pos, dir < 0 ? 'end' : 'start');
    };
    return {
      ...parent,
      'Alt-=': () => this.editor.commands.insertEquation(),
      ArrowLeft: enter(-1),
      ArrowRight: enter(1),
      Enter: () => {
        const { selection } = this.editor.state;
        if (!(selection instanceof NodeSelection) || selection.node.type !== this.type) return false;
        return openEquationAt(this.editor, selection.from);
      },
    };
  },
});

export default EquationNode;
