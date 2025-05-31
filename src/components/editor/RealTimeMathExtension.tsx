import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import katex from 'katex';

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
}

class MathView {
  dom: HTMLElement;
  contentDOM: HTMLElement | null = null;
  private nodePos: number;
  
  constructor(
    public readonly latex: string, 
    public readonly isDisplay: boolean,
    nodePos: number,
    public readonly onEditMath?: (latex: string, isDisplay: boolean, nodePos: number) => void
  ) {
    this.nodePos = nodePos;
    this.dom = document.createElement(isDisplay ? 'div' : 'span');
    this.dom.classList.add(isDisplay ? 'math-display' : 'math-inline');
    this.dom.setAttribute('data-formula-pos', String(nodePos));
    
    try {
      katex.render(latex, this.dom, {
        displayMode: isDisplay,
        throwOnError: false,
        errorColor: '#f44336',
      });
    } catch (e) {
      console.error('KaTeX error:', e);
      this.dom.textContent = latex;
      this.dom.classList.add('math-error');
    }

    if (this.onEditMath) {
      this.dom.classList.add('math-editable');
      this.dom.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onEditMath?.(this.latex, this.isDisplay, this.nodePos);
      });
    }
    
    this.dom.addEventListener('mouseenter', () => {
      if (this.onEditMath) {
        this.dom.classList.add('math-hover');
      }
    });
    
    this.dom.addEventListener('mouseleave', () => {
      this.dom.classList.remove('math-hover');
    });
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
    };
  },

  addProseMirrorPlugins() {
    const { delimiters, onEditMath } = this.options;

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
                      const view = new MathView(formula, display, startRealPos, onEditMath);
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
  
  // Add command to replace formula at position
  addCommands() {
    return {
      setFormulaAtPosition: (position: number, newLatex: string, isDisplay: boolean) => 
        ({ state, dispatch }) => {
          if (!dispatch) return false;
          
          const { doc, tr } = state;
          let found = false;
          
          doc.descendants((node, pos) => {
            if (!node.isText || found) return;
            
            const nodeText = node.text || '';
            const delimiters = isDisplay ? ['$$', '$$'] : ['$', '$'];
            
            // Find formula at or near position
            let index = 0;
            while (index < nodeText.length) {
              const startIdx = nodeText.indexOf(delimiters[0], index);
              if (startIdx === -1) break;
              
              const endIdx = nodeText.indexOf(delimiters[1], startIdx + delimiters[0].length);
              if (endIdx === -1) break;
              
              const formulaStart = pos + startIdx;
              const formulaEnd = pos + endIdx + delimiters[1].length;
              
              // Check if position is within this formula
              if (position >= formulaStart && position <= formulaEnd) {
                const newFormula = `${delimiters[0]}${newLatex}${delimiters[1]}`;
                tr.replaceRangeWith(formulaStart, formulaEnd, state.schema.text(newFormula));
                found = true;
                break;
              }
              
              index = endIdx + delimiters[1].length;
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