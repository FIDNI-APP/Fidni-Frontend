/**
 * Formules dans l'éditeur (08/10/2026) : chaque formule est un nœud indivisible, rendu par KaTeX.
 *
 * Avant (MathExtension.ts), le code `$…$` restait dans le texte, caché, et la formule était dessinée
 * par-dessus. D'où des bugs : un retour arrière juste après une formule effaçait son `$` invisible
 * (la formule se cassait en texte brut), modifier une formule présente deux fois modifiait la
 * première, le curseur se perdait dans le code caché.
 *
 * Le format enregistré ne change pas : le HTML contient toujours `$…$` / `$$…$$` en texte
 * (storedHtml retire le span qui les entoure). À l'ouverture, `mathifyHtml` transforme ce texte en nœuds.
 * Taper `$x^2$` (ou `$$…$$`) crée la formule ; un clic dessus (ou Entrée quand elle est sélectionnée)
 * l'ouvre pour la modifier. Retour arrière juste après une formule la sélectionne, un second l'efface.
 */
import { InputRule, Node, PasteRule } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface MathAttrs { latex: string; display: boolean }

export interface MathNodeOptions {
  /** Clic sur une formule : l'ouvrir pour la modifier (position du nœud dans le document). */
  onEdit?: (attrs: MathAttrs, pos: number) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      insertMath: (latex: string, display?: boolean) => ReturnType;
      updateMathAt: (pos: number, attrs: MathAttrs) => ReturnType;
      deleteMathAt: (pos: number) => ReturnType;
    };
  }
}

const source = ({ latex, display }: MathAttrs) => (display ? `$$${latex}$$` : `$${latex}$`);
const stripSource = (text: string) => text.trim().replace(/^\$\$?([\s\S]*?)\$?\$$/, '$1').trim();

/** HTML de l'éditeur → HTML enregistré : les formules redeviennent du texte `$…$`. */
export const storedHtml = (html: string) => html.replace(/<span data-math="(?:inline|display)">([^<]*)<\/span>/g, '$1');

/** Rendu KaTeX d'une formule dans un élément (erreur de syntaxe : le code en rouge, sans planter). */
export function renderKatex(el: HTMLElement, latex: string, display: boolean) {
  try {
    katex.render(latex || '\\square', el, {
      displayMode: display, throwOnError: false, errorColor: '#b42318', strict: false, trust: false, output: 'html',
      macros: { '\\f': '#1f(#2)' },
    });
  } catch {
    el.textContent = latex;
  }
}

/** Message court si le code LaTeX ne passe pas (accolade oubliée, commande inconnue…), sinon null. */
export function latexError(latex: string): string | null {
  if (!latex.trim()) return null;
  try {
    katex.renderToString(latex, { throwOnError: true, strict: false, trust: false, macros: { '\\f': '#1f(#2)' } });
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    let m: RegExpMatchArray | null;
    if ((m = msg.match(/Undefined control sequence: (\\\S+)/))) return `Commande inconnue : ${m[1]}`;
    if (/Expected '\\right'|got '\\right'/.test(msg)) return 'Chaque \\left( doit avoir son \\right).';
    if (/expected '\}'/i.test(msg)) return 'Il manque une accolade fermante « } ».';
    if (/got '\}'/.test(msg)) return 'Une accolade « } » est en trop.';
    if ((m = msg.match(/Expected group after '(.)'/))) return `Complète ce qui suit « ${m[1]} », par exemple ${m[1]}{2}.`;
    if ((m = msg.match(/Expected group as argument to '(\\\w+)'/))) return `Il manque ce qui va dans ${m[1]}{…}.`;
    return 'Formule incomplète : vérifie-la avant de l’insérer.';
  }
}

/**
 * Les règles de saisie lisent le texte du paragraphe, où une formule déjà posée compte pour `$…$`
 * (renderText) alors qu'elle n'occupe qu'une position : sans ce contrôle, taper le `$` d'ouverture
 * après une formule pouvait en créer une à cheval sur l'autre (« $x$ et $ » → formule « et »).
 */
const plainTextIs = (state: EditorState, from: number, to: number, expected: string) =>
  from >= 0 && state.doc.textBetween(from, to, '\n', '\ufffc') === expected;

// `$$…$$` puis `$…$` (sur une ligne, au moins un caractère, pas `$$`).
const SOURCE_RE = /\$\$([\s\S]+?)\$\$|\$(?!\$)([^$\n]+?)\$/g;

/**
 * HTML enregistré (formules en texte `$…$`) → HTML où chaque formule est un `<span data-math>` que
 * l'éditeur reconnaît comme nœud. Le texte des balises code/pre n'est pas touché.
 */
export function mathifyHtml(html: string): string {
  if (!html || !html.includes('$') || typeof DOMParser === 'undefined') return html || '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('code, pre, [data-math]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  for (const t of texts) {
    const value = t.nodeValue ?? '';
    if (!value.includes('$')) continue;
    SOURCE_RE.lastIndex = 0;
    const frag = doc.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = SOURCE_RE.exec(value)) !== null) {
      const display = m[1] !== undefined;
      // Tel quel (espaces compris) : rouvrir puis enregistrer un contenu ne doit rien y changer.
      const latex = display ? m[1] : m[2];
      if (!latex.trim()) continue;
      if (m.index > last) frag.appendChild(doc.createTextNode(value.slice(last, m.index)));
      const span = doc.createElement('span');
      span.setAttribute('data-math', display ? 'display' : 'inline');
      span.setAttribute('data-latex', latex);
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last === 0) continue;
    if (last < value.length) frag.appendChild(doc.createTextNode(value.slice(last)));
    t.parentNode?.replaceChild(frag, t);
  }
  return doc.body.innerHTML;
}

export const MathNode = Node.create<MathNodeOptions>({
  name: 'math',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { onEdit: undefined };
  },

  addAttributes() {
    return {
      latex: { default: '', parseHTML: (el) => el.getAttribute('data-latex') ?? stripSource(el.textContent ?? '') },
      display: { default: false, parseHTML: (el) => el.getAttribute('data-math') === 'display' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-math]' }];
  },

  // `$…$` dans un <span data-math> (ProseMirror n'accepte plus un simple texte) ; l'éditeur retire ce
  // span à la sortie (storedHtml) : le HTML enregistré garde le format d'avant (rendu, PDF, recherche).
  // Copier-coller entre éditeurs : le span est relu tel quel (latex = son texte sans les `$`).
  renderHTML({ node }) {
    const attrs = node.attrs as MathAttrs;
    return ['span', { 'data-math': attrs.display ? 'display' : 'inline' }, source(attrs)];
  },

  renderText({ node }) {
    return source(node.attrs as MathAttrs);
  },

  addNodeView() {
    const options = this.options;
    return ({ node, getPos }) => {
      const dom = document.createElement('span');
      let current = node;
      const paint = () => {
        const { latex, display } = current.attrs as MathAttrs;
        dom.className = `math-node ${display ? 'math-node-display' : 'math-node-inline'}`;
        dom.setAttribute('data-latex', latex);
        dom.title = 'Cliquer pour modifier la formule';
        renderKatex(dom, latex, display);
      };
      dom.contentEditable = 'false';
      paint();
      dom.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = typeof getPos === 'function' ? getPos() : undefined;
        if (typeof pos === 'number') options.onEdit?.(current.attrs as MathAttrs, pos);
      });
      return {
        dom,
        update: (updated) => {
          if (updated.type !== current.type) return false;
          current = updated;
          paint();
          return true;
        },
        selectNode: () => dom.classList.add('is-selected'),
        deselectNode: () => dom.classList.remove('is-selected'),
        ignoreMutation: () => true,
      };
    };
  },

  addCommands() {
    return {
      insertMath: (latex: string, display = false) => ({ commands }) =>
        commands.insertContent({ type: this.name, attrs: { latex, display } }),
      updateMathAt: (pos: number, attrs: MathAttrs) => ({ tr, dispatch }) => {
        const n = tr.doc.nodeAt(pos);
        if (!n || n.type.name !== this.name) return false;
        if (dispatch) tr.setNodeMarkup(pos, undefined, attrs);
        return true;
      },
      deleteMathAt: (pos: number) => ({ tr, dispatch }) => {
        const n = tr.doc.nodeAt(pos);
        if (!n || n.type.name !== this.name) return false;
        if (dispatch) tr.delete(pos, pos + n.nodeSize);
        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    // Retour arrière / Suppr. contre une formule : d'abord la sélectionner (on voit ce qui va partir),
    // le second appui l'efface. Juste après l'avoir tapée, retour arrière rend le code `$…$` à corriger.
    const besideFormula = (dir: -1 | 1) => () => {
      const { selection } = this.editor.state;
      if (!selection.empty) return false;
      const $pos = selection.$from;
      const node = dir < 0 ? $pos.nodeBefore : $pos.nodeAfter;
      if (!node || node.type !== this.type) return false;
      if (dir < 0 && this.editor.commands.undoInputRule()) return true;
      return this.editor.commands.setNodeSelection(dir < 0 ? $pos.pos - node.nodeSize : $pos.pos);
    };
    return {
      Backspace: besideFormula(-1),
      Delete: besideFormula(1),
      // Formule sélectionnée au clavier : Entrée l'ouvre pour la modifier.
      Enter: () => {
        const { selection } = this.editor.state;
        if (!(selection instanceof NodeSelection) || selection.node.type !== this.type || !this.options.onEdit) return false;
        this.options.onEdit(selection.node.attrs as MathAttrs, selection.from);
        return true;
      },
    };
  },

  // Taper `$x^2$` ou `$$…$$` : la formule apparaît dès le `$` de fin.
  addInputRules() {
    return [
      new InputRule({
        find: /\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1].trim();
          // Le dernier `$` vient d'être tapé : il n'est pas encore dans le document.
          if (!latex || !plainTextIs(state, range.from, range.to, match[0].slice(0, -1))) return null;
          state.tr.replaceWith(range.from, range.to, this.type.create({ latex, display: true }));
        },
      }),
      new InputRule({
        // Pas après un `$` (on tape peut-être `$$…`) ni après `\` (dollar échappé).
        find: /(?:^|[^$\\])(\$([^$\n]+?)\$)$/,
        handler: ({ state, range, match }) => {
          const latex = match[2].trim();
          const start = range.from + (match[0].length - match[1].length);
          if (!latex || !plainTextIs(state, start, range.to, match[1].slice(0, -1))) return null;
          state.tr.replaceWith(start, range.to, this.type.create({ latex, display: false }));
        },
      }),
    ];
  },

  // Coller du texte qui contient des formules.
  addPasteRules() {
    return [
      new PasteRule({
        find: /\$\$([^$]+?)\$\$|\$(?!\$)([^$\n]+?)\$/g,
        handler: ({ state, range, match }) => {
          const display = match[1] !== undefined;
          const latex = (display ? match[1] : match[2] ?? '').trim();
          if (!latex) return null;
          state.tr.replaceWith(range.from, range.to, this.type.create({ latex, display }));
        },
      }),
    ];
  },
});

export default MathNode;
