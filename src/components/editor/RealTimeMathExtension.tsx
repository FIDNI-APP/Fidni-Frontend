import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import katex from 'katex';

// Type pour les options de l'extension
interface MathRenderOptions {
  delimiters: Array<{
    left: string;
    right: string;
    display: boolean;
  }>;
  katexOptions: katex.KatexOptions;
  onEditMath?: (latex: string, isDisplay: boolean) => void;
}

// Classe pour gérer les décorations des formules mathématiques
class MathView {
  dom: HTMLElement;
  contentDOM: HTMLElement | null = null;
  
  constructor(
    public readonly latex: string, 
    public readonly isDisplay: boolean,
    public readonly onEditMath?: (latex: string, isDisplay: boolean) => void
  ) {
    // Créer l'élément DOM pour le rendu
    this.dom = document.createElement(isDisplay ? 'div' : 'span');
    this.dom.classList.add(isDisplay ? 'math-display' : 'math-inline');
    
    try {
      // Rendre la formule LaTeX
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

    // Ajouter un gestionnaire de clic pour l'édition
    if (this.onEditMath) {
      this.dom.classList.add('math-editable');
      this.dom.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onEditMath?.(this.latex, this.isDisplay);
      });
    }
    
    // Ajouter des styles de survol
    this.dom.addEventListener('mouseenter', () => {
      if (this.onEditMath) {
        this.dom.classList.add('math-hover');
      }
    });
    
    this.dom.addEventListener('mouseleave', () => {
      this.dom.classList.remove('math-hover');
    });
  }

  // Méthode pour détruire la vue
  destroy() {
    // Nettoyer les événements si nécessaire
  }
}

// Extension principale pour le rendu des formules mathématiques
export const RealTimeMathExtension = Extension.create<MathRenderOptions>({
  name: 'realTimeMath',

  addOptions() {
    return {
      // Délimiteurs par défaut pour les formules en ligne et en bloc
      delimiters: [
        { left: '$', right: '$', display: false },
        { left: '$$', right: '$$', display: true },
      ],
      // Options KaTeX par défaut
      katexOptions: {
        throwOnError: false,
        strict: false,
      },
      // Fonction d'édition optionnelle
      onEditMath: undefined,
    };
  },

  addProseMirrorPlugins() {
    const { delimiters, onEditMath } = this.options;

    return [
      new Plugin({
        key: new PluginKey('realTimeMath'),
        
        props: {
          // Définir des attributs pour le conteneur
          attributes: {
            class: 'real-time-math-editor',
          },
          
          // Décorer le texte avec les formules rendues
          decorations(state) {
            const { doc } = state;
            const decorations: Decoration[] = [];
            
            // Vérifier chaque nœud de texte dans le document
            doc.descendants((node, pos) => {
              if (!node.isText) return;
              
              const nodeText = node.text || '';
              
              // Traiter chaque type de délimiteur
              for (const delimiter of delimiters) {
                const { left, right, display } = delimiter;
                
                let startPos = 0;
                let searchText = nodeText;
                
                while (startPos < searchText.length) {
                  // Trouver le délimiteur de début
                  const startDelimPos = searchText.indexOf(left, startPos);
                  if (startDelimPos === -1) break;
                  
                  // Trouver le délimiteur de fin
                  const endDelimPos = searchText.indexOf(right, startDelimPos + left.length);
                  if (endDelimPos === -1) break;
                  
                  // Extraire la formule LaTeX
                  const formula = searchText.slice(
                    startDelimPos + left.length, 
                    endDelimPos
                  );
                  
                  // Calculer les positions dans le document
                  const startRealPos = pos + startDelimPos;
                  const endRealPos = pos + endDelimPos + right.length;
                  
                  // Créer une décoration pour remplacer la formule brute par son rendu
                  decorations.push(
                    Decoration.widget(startRealPos, () => {
                      const view = new MathView(formula, display, onEditMath);
                      return view.dom;
                    })
                  );
                  
                  // Masquer le texte original
                  decorations.push(
                    Decoration.inline(startRealPos, endRealPos, {
                      class: 'math-source-hidden',
                    })
                  );
                  
                  // Continuer à chercher après cette formule
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
});