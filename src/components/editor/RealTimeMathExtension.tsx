import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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

    // Create container for formula and delete button
    const container = document.createElement(isDisplay ? 'div' : 'span');
    container.style.position = 'relative';
    container.style.display = isDisplay ? 'block' : 'inline-block';
    container.classList.add(isDisplay ? 'math-display' : 'math-inline');
    container.setAttribute('data-formula-pos', String(nodePos));

    // Create element for KaTeX rendering
    const mathElement = document.createElement(isDisplay ? 'div' : 'span');
    mathElement.style.display = isDisplay ? 'block' : 'inline-block';
    mathElement.style.margin = isDisplay ? '1em auto' : '0';
    mathElement.style.padding = isDisplay ? '0.5em' : '0.1em 0.2em';
    if (isDisplay) {
      mathElement.style.textAlign = 'center';
    }

    // Render with KaTeX (synchronous, fast!)
    try {
      katex.render(latex, mathElement, {
        displayMode: isDisplay,
        throwOnError: false,
        errorColor: '#cc0000',
        strict: false,
        trust: false,
        output: 'html',
        fleqn: false,
        macros: {
          "\\f": "#1f(#2)"
        }
      });
    } catch (e) {
      console.error('KaTeX rendering error:', e);
      mathElement.textContent = `[Math Error: ${latex}]`;
      mathElement.classList.add('math-error');
      mathElement.style.color = '#f44336';
      mathElement.style.fontFamily = 'monospace';
      mathElement.style.fontSize = '0.9em';
      mathElement.style.padding = '2px 4px';
      mathElement.style.backgroundColor = '#fee';
      mathElement.style.borderRadius = '3px';
    }

    container.appendChild(mathElement);

    // Add delete button
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
        line-height: 18px;
        text-align: center;
        padding: 0;
        z-index: 10;
        display: none;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      this.deleteButton.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDeleteMath) {
          onDeleteMath(this.nodePos, latex, isDisplay);
        }
      };
      container.appendChild(this.deleteButton);
    }

    // Add hover effects
    container.style.cursor = onEditMath ? 'pointer' : 'default';

    // Click to edit
    if (onEditMath) {
      container.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onEditMath(latex, isDisplay, this.nodePos);
      };
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

  update(latex: string, isDisplay: boolean) {
    if (latex !== this.latex || isDisplay !== this.isDisplay) {
      return false;
    }
    return true;
  }

  destroy() {
    if (this.deleteButton) {
      this.deleteButton.remove();
    }
  }
}

// Helper function to get formula at position
export function getFormulaAtPosition(editor: any, position: number): FormulaInfo | null {
  if (!editor) return null;

  const doc = editor.state.doc;
  const node = doc.nodeAt(position);

  if (!node || node.type.name !== 'text') return null;

  const text = node.text || '';
  const regex = /\$\$([^\$]+)\$\$|\$([^\$]+)\$/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const latex = match[1] || match[2];
    const isDisplay = fullMatch.startsWith('$$');
    const matchStart = position + match.index;
    const matchEnd = matchStart + fullMatch.length;

    if (position >= matchStart && position < matchEnd) {
      return { latex, isDisplay };
    }
  }

  return null;
}

// Helper to find all math formulas in document
function findMathFormulas(doc: any, delimiters: MathRenderOptions['delimiters']): Array<{
  from: number;
  to: number;
  latex: string;
  isDisplay: boolean;
}> {
  const formulas: Array<{
    from: number;
    to: number;
    latex: string;
    isDisplay: boolean;
  }> = [];

  doc.descendants((node: any, pos: number) => {
    if (node.type.name === 'text' && node.text) {
      const text = node.text;

      // Debug: log text content to see what we're working with
      if (text.includes('$')) {
        console.log('💬 Text node with $:', { text, pos });
      }

      // Sort delimiters by length (longest first) to handle $$ before $
      const sortedDelimiters = [...delimiters].sort((a, b) => b.left.length - a.left.length);

      for (const delimiter of sortedDelimiters) {
        let regex: RegExp;

        // Handle $$ differently from $
        if (delimiter.left === '$$' && delimiter.right === '$$') {
          // Match $$....$$ - non-greedy, stops at $$
          regex = /\$\$([\s\S]*?)\$\$/g;
        } else if (delimiter.left === '$' && delimiter.right === '$') {
          // Match $...$ but NOT $$
          // More robust pattern that handles edge cases:
          // - Spaces before/after delimiters
          // - Special chars like <, >, (, ), [, ]
          // - Multiple formulas on same line
          regex = /\$(?!\$)([^\$\n]+?)\$(?!\$)/g;
        } else {
          // Generic handler for other delimiters
          const leftEscaped = delimiter.left.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const rightEscaped = delimiter.right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          regex = new RegExp(`${leftEscaped}([^${delimiter.right.charAt(0)}]+)${rightEscaped}`, 'g');
        }

        let match;

        while ((match = regex.exec(text)) !== null) {
          const latex = match[1].trim(); // Trim whitespace from captured content
          const from = pos + match.index;
          const to = from + match[0].length;

          // Check if this position is already covered by a longer delimiter
          const overlaps = formulas.some(
            f => (from >= f.from && from < f.to) || (to > f.from && to <= f.to)
          );

          if (!overlaps) {
            console.log('📐 Found formula:', {
              delimiter: delimiter.left,
              isDisplay: delimiter.display,
              latex,
              text: text.substring(from - pos, to - pos)
            });
            formulas.push({
              from,
              to,
              latex,
              isDisplay: delimiter.display,
            });
          }
        }
      }
    }
  });

  return formulas;
}

// Create decorations for math formulas
function createMathDecorations(
  doc: any,
  delimiters: MathRenderOptions['delimiters'],
  onEditMath?: MathRenderOptions['onEditMath'],
  onDeleteMath?: MathRenderOptions['onDeleteMath']
): DecorationSet {
  const decorations: Decoration[] = [];
  const formulas = findMathFormulas(doc, delimiters);

  formulas.forEach(({ from, to, latex, isDisplay }) => {
    decorations.push(
      Decoration.widget(
        from,
        (view, getPos) => {
          const pos = typeof getPos === 'function' ? getPos() : from;
          return new MathView(latex, isDisplay, pos, onEditMath, onDeleteMath).dom;
        },
        {
          side: -1,
          key: `math-${from}-${latex}`,
        }
      )
    );

    // Hide the source text
    decorations.push(
      Decoration.inline(from, to, {
        class: 'math-source-hidden',
        nodeName: 'span',
      })
    );
  });

  return DecorationSet.create(doc, decorations);
}

export const RealTimeMathExtension = Extension.create({
  name: 'realTimeMath',

  addOptions() {
    return {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      onEditMath: undefined,
      onDeleteMath: undefined,
    };
  },

  addCommands() {
    return {
      setFormulaAtPosition:
        (position: number, newLatex: string, isDisplay: boolean) =>
        ({ tr, dispatch, state }) => {
          try {
            const doc = state.doc;
            const node = doc.nodeAt(position);

            if (!node || node.type.name !== 'text') {
              return false;
            }

            const text = node.text || '';
            const regex = /\$\$([^\$]+)\$\$|\$([^\$]+)\$/g;
            let match;
            let found = false;

            while ((match = regex.exec(text)) !== null) {
              const fullMatch = match[0];
              const matchStart = position + match.index;
              const matchEnd = matchStart + fullMatch.length;

              if (position >= matchStart && position < matchEnd) {
                const newFormula = isDisplay ? `$$${newLatex}$$` : `$${newLatex}$`;

                if (dispatch) {
                  tr.insertText(newFormula, matchStart, matchEnd);
                }

                found = true;
                break;
              }
            }

            return found;
          } catch (error) {
            console.error('Error in setFormulaAtPosition:', error);
            return false;
          }
        },
      replaceFormula:
        (oldLatex: string, newLatex: string, oldIsDisplay: boolean, newIsDisplay: boolean) =>
        ({ tr, dispatch, state }) => {
          try {
            const doc = state.doc;
            const oldFormula = oldIsDisplay ? `$$${oldLatex}$$` : `$${oldLatex}$`;
            const newFormula = newIsDisplay ? `$$${newLatex}$$` : `$${newLatex}$`;

            let found = false;

            doc.descendants((node: any, pos: number) => {
              if (node.type.name === 'text' && node.text) {
                const text = node.text;
                const index = text.indexOf(oldFormula);

                if (index !== -1) {
                  const from = pos + index;
                  const to = from + oldFormula.length;

                  if (dispatch) {
                    tr.insertText(newFormula, from, to);
                  }

                  found = true;
                  return false;
                }
              }
            });

            return found;
          } catch (error) {
            console.error('Error in replaceFormula:', error);
            return false;
          }
        },
      deleteFormulaAtPosition:
        (position: number, latex: string, isDisplay: boolean) =>
        ({ tr, dispatch, state }) => {
          try {
            const doc = state.doc;
            const node = doc.nodeAt(position);

            if (!node || node.type.name !== 'text') {
              return false;
            }

            const text = node.text || '';
            const formula = isDisplay ? `$$${latex}$$` : `$${latex}$`;
            const index = text.indexOf(formula);

            if (index !== -1) {
              const from = position + index;
              const to = from + formula.length;

              if (dispatch) {
                tr.delete(from, to);
              }
              return true;
            }

            return false;
          } catch (error) {
            console.error('Error in deleteFormulaAtPosition:', error);
            return false;
          }
        },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options as MathRenderOptions;

    return [
      new Plugin({
        key: new PluginKey('realTimeMath'),
        state: {
          init(_, { doc }) {
            return createMathDecorations(
              doc,
              options.delimiters,
              options.onEditMath,
              options.onDeleteMath
            );
          },
          apply(tr, decorationSet) {
            if (tr.docChanged) {
              return createMathDecorations(
                tr.doc,
                options.delimiters,
                options.onEditMath,
                options.onDeleteMath
              );
            }
            return decorationSet.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

export default RealTimeMathExtension;
