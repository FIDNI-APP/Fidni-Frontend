import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import katex from 'katex';

// Type for formula info
export interface FormulaInfo {
  latex: string;
  isDisplay: boolean;
}

// Type augmentation for the new command
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setFormulaAtPosition: {
      setFormulaAtPosition: (
        position: number,
        newLatex: string,
        isDisplay: boolean
      ) => ReturnType;
    };
    replaceFormula: {
      replaceFormula: (
        oldLatex: string,
        newLatex: string,
        oldIsDisplay: boolean,
        newIsDisplay: boolean
      ) => ReturnType;
    };
    deleteFormulaAtPosition: {
      deleteFormulaAtPosition: (
        position: number,
        latex: string,
        isDisplay: boolean
      ) => ReturnType;
    };
  }
}

interface MathRenderOptions {
  delimiters: Array<{
    left: string;
    right: string;
    display: boolean;
  }>;
  katexOptions: katex.KatexOptions;
  onEditMath?: (latex: string, isDisplay: boolean, nodePos: number) => void;
  onDeleteMath?: (nodePos: number, latex: string, isDisplay: boolean) => void;
}

class MathView {
  dom: HTMLElement;
  contentDOM: HTMLElement | null = null;
  private nodePos: number;
  private deleteButton?: HTMLElement;

  constructor(
    public readonly latex: string,
    public readonly isDisplay: boolean,
    nodePos: number,
    public readonly onEditMath?: (latex: string, isDisplay: boolean, nodePos: number) => void,
    public readonly onDeleteMath?: (nodePos: number, latex: string, isDisplay: boolean) => void
  ) {
    this.nodePos = nodePos;

    // Créer un conteneur pour la formule et le bouton de suppression
    const container = document.createElement(isDisplay ? 'div' : 'span');
    container.style.position = 'relative';
    container.style.display = isDisplay ? 'block' : 'inline-block';
    container.classList.add(isDisplay ? 'math-display' : 'math-inline');
    container.setAttribute('data-formula-pos', String(nodePos));

    // Créer l'élément pour le rendu KaTeX
    const mathElement = document.createElement(isDisplay ? 'div' : 'span');

    try {
      katex.render(latex, mathElement, {
        displayMode: isDisplay,
        throwOnError: false,
        errorColor: '#f44336',
      });
    } catch (e) {
      console.error('KaTeX error:', e);
      mathElement.textContent = latex;
      mathElement.classList.add('math-error');
    }

    container.appendChild(mathElement);

    // Ajouter le bouton de suppression
    if (onDeleteMath) {
      this.deleteButton = document.createElement('button');
      this.deleteButton.innerHTML = '×';
      this.deleteButton.className = 'math-delete-button';
      this.deleteButton.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background-color: #ef4444;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        line-height: 1;
        padding: 0;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 20;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;

      this.deleteButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDeleteMath(this.nodePos, this.latex, this.isDisplay);
      });

      container.appendChild(this.deleteButton);
    }

    if (this.onEditMath) {
      container.classList.add('math-editable');
      mathElement.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const currentPos = parseInt(container.getAttribute('data-formula-pos') || '0', 10);
        this.onEditMath?.(this.latex, this.isDisplay, currentPos);
      });
    }

    container.addEventListener('mouseenter', () => {
      if (this.onEditMath) {
        container.classList.add('math-hover');
      }
      if (this.deleteButton) {
        this.deleteButton.style.display = 'flex';
      }
    });

    container.addEventListener('mouseleave', () => {
      container.classList.remove('math-hover');
      if (this.deleteButton) {
        this.deleteButton.style.display = 'none';
      }
    });

    this.dom = container;
  }

  destroy() {
    // Cleanup if needed
  }
  
  update(nodePos: number) {
    this.nodePos = nodePos;
    this.dom.setAttribute('data-formula-pos', String(nodePos));
  }
}

export const RealTimeMathExtension = Extension.create<MathRenderOptions>({
  name: 'realTimeMath',

  addOptions() {
    return {
      delimiters: [
        { left: '$', right: '$', display: false },
        { left: '$$', right: '$$', display: true },
      ],
      katexOptions: {
        throwOnError: false,
        strict: false,
      },
      onEditMath: undefined,
      onDeleteMath: undefined,
    };
  },

  addProseMirrorPlugins() {
    const { delimiters, onEditMath, onDeleteMath } = this.options;

    return [
      new Plugin({
        key: new PluginKey('realTimeMath'),
        
        props: {
          attributes: {
            class: 'real-time-math-editor',
          },
          
          decorations(state) {
            const { doc } = state;
            const decorations: Decoration[] = [];
            
            doc.descendants((node, pos) => {
              if (!node.isText) return;
              
              const nodeText = node.text || '';
              
              for (const delimiter of delimiters) {
                const { left, right, display } = delimiter;
                
                let startPos = 0;
                let searchText = nodeText;
                
                while (startPos < searchText.length) {
                  const startDelimPos = searchText.indexOf(left, startPos);
                  if (startDelimPos === -1) break;
                  
                  const endDelimPos = searchText.indexOf(right, startDelimPos + left.length);
                  if (endDelimPos === -1) break;
                  
                  const formula = searchText.slice(
                    startDelimPos + left.length, 
                    endDelimPos
                  );
                  
                  const startRealPos = pos + startDelimPos;
                  const endRealPos = pos + endDelimPos + right.length;
                  
                  // Widget decoration with node position
                  decorations.push(
                    Decoration.widget(startRealPos, () => {
                      const view = new MathView(formula, display, startRealPos, onEditMath, onDeleteMath);
                      return view.dom;
                    }, {
                      side: -1,
                      key: `math-${startRealPos}`
                    })
                  );
                  
                  // Hide original text
                  decorations.push(
                    Decoration.inline(startRealPos, endRealPos, {
                      class: 'math-source-hidden',
                    })
                  );
                  
                  startPos = endDelimPos + right.length;
                }
              }
            });
            
            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
  
  // Add commands to replace formulas
  addCommands() {
    return {
      // Replace formula by searching for exact LaTeX content
      replaceFormula: (oldLatex: string, newLatex: string, oldIsDisplay: boolean, newIsDisplay: boolean) =>
        ({ state, dispatch, tr: transaction, commands }) => {
          if (!dispatch) return false;

          const { doc, selection } = state;
          const tr = transaction || state.tr;
          let found = false;
          let replacePos = { start: 0, end: 0 };

          // Normalize backslashes: LaTeX from KaTeX may have double backslashes
          // but the document stores single backslashes
          const normalizeLatex = (latex: string) => latex.replace(/\\\\/g, '\\');

          const normalizedOldLatex = normalizeLatex(oldLatex);
          const normalizedNewLatex = normalizeLatex(newLatex);

          // Build the search string with delimiters
          const oldDelims = oldIsDisplay ? '$$' : '$';
          const searchString = `${oldDelims}${normalizedOldLatex}${oldDelims}`;

          // Build the replacement string
          const newDelims = newIsDisplay ? '$$' : '$';
          const replaceString = `${newDelims}${normalizedNewLatex}${newDelims}`;

          doc.descendants((node, pos) => {
            if (!node.isText || found) return;

            const nodeText = node.text || '';
            const searchIdx = nodeText.indexOf(searchString);

            if (searchIdx !== -1) {
              const start = pos + searchIdx;
              const end = start + searchString.length;

              replacePos = { start, end };
              found = true;
            }
          });

          if (found) {
            // Delete the old formula
            tr.delete(replacePos.start, replacePos.end);
            // Insert the new formula at the same position
            tr.insertText(replaceString, replacePos.start);
            // Force decoration recalculation by updating metadata
            tr.setMeta('addToHistory', true);

            dispatch(tr);
            return true;
          }

          return false;
        },

      // Fallback: Replace formula at position (less reliable)
      setFormulaAtPosition: (position: number, newLatex: string, isDisplay: boolean) =>
        ({ state, dispatch, tr: transaction }) => {
          if (!dispatch) return false;

          const { doc } = state;
          const tr = transaction || state.tr;
          let found = false;

          doc.descendants((node, pos) => {
            if (!node.isText || found) return;

            const nodeText = node.text || '';

            // Try both delimiters - check $$ first (longer delimiter)
            const delimiterSets = [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false }
            ];

            for (const delims of delimiterSets) {
              let searchStart = 0;

              while (searchStart < nodeText.length) {
                const startIdx = nodeText.indexOf(delims.left, searchStart);
                if (startIdx === -1) break;

                // For $, make sure it's not part of $$ (avoid matching $ in $$)
                if (delims.left === '$' && nodeText[startIdx + 1] === '$') {
                  searchStart = startIdx + 1;
                  continue;
                }

                const endIdx = nodeText.indexOf(delims.right, startIdx + delims.left.length);
                if (endIdx === -1) break;

                const formulaStart = pos + startIdx;
                const formulaEnd = pos + endIdx + delims.right.length;

                // Check if position is within this formula (with some tolerance)
                if (position >= formulaStart - 2 && position <= formulaEnd + 2) {
                  // Use the correct delimiters based on the requested mode
                  const newDelims = isDisplay ? '$$' : '$';
                  const newFormula = `${newDelims}${newLatex}${newDelims}`;

                  tr.replaceWith(formulaStart, formulaEnd, state.schema.text(newFormula));
                  found = true;
                  break;
                }

                searchStart = endIdx + delims.right.length;
              }

              if (found) break;
            }
          });

          if (found) {
            dispatch(tr);
            return true;
          }

          return false;
        },

      // Delete formula at position
      deleteFormulaAtPosition: (position: number, latex: string, isDisplay: boolean) =>
        ({ state, dispatch, tr: transaction }) => {
          if (!dispatch) return false;

          const { doc } = state;
          const tr = transaction || state.tr;
          let found = false;

          // Normalize the latex
          const normalizeLatex = (latex: string) => latex.replace(/\\\\/g, '\\');
          const normalizedLatex = normalizeLatex(latex);

          // Build the search string with delimiters
          const delims = isDisplay ? '$$' : '$';
          const searchString = `${delims}${normalizedLatex}${delims}`;

          doc.descendants((node, pos) => {
            if (!node.isText || found) return;

            const nodeText = node.text || '';
            const searchIdx = nodeText.indexOf(searchString);

            if (searchIdx !== -1 && Math.abs(pos + searchIdx - position) < 5) {
              const start = pos + searchIdx;
              const end = start + searchString.length;

              tr.delete(start, end);
              found = true;
            }
          });

          if (found) {
            dispatch(tr);
            return true;
          }

          return false;
        }

    };
  },
});

// Helper function to get formula at position (outside of TipTap command system)
export function getFormulaAtPosition(editor: any, position: number): FormulaInfo | null {
  if (!editor || !editor.state) return null;

  const { doc } = editor.state;
  let result: FormulaInfo | null = null;

  doc.descendants((node: any, pos: number) => {
    if (!node.isText || result) return;

    const nodeText = node.text || '';

    // Try both delimiters - check $$ first (longer delimiter)
    const delimiterSets = [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false }
    ];

    for (const delims of delimiterSets) {
      let searchStart = 0;

      while (searchStart < nodeText.length) {
        const startIdx = nodeText.indexOf(delims.left, searchStart);
        if (startIdx === -1) break;

        // For $, make sure it's not part of $$ (avoid matching $ in $$)
        if (delims.left === '$' && nodeText[startIdx + 1] === '$') {
          searchStart = startIdx + 1;
          continue;
        }

        const endIdx = nodeText.indexOf(delims.right, startIdx + delims.left.length);
        if (endIdx === -1) break;

        const formulaStart = pos + startIdx;
        const formulaEnd = pos + endIdx + delims.right.length;

        // Check if position is within this formula (with some tolerance)
        if (position >= formulaStart - 2 && position <= formulaEnd + 2) {
          const latex = nodeText.slice(startIdx + delims.left.length, endIdx);
          result = { latex, isDisplay: delims.display };
          break;
        }

        searchStart = endIdx + delims.right.length;
      }

      if (result) break;
    }
  });

  return result;
}