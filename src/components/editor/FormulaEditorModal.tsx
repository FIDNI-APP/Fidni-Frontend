import React from 'react';
import { X, FunctionSquare as FunctionIcon, AlignCenter, Check } from "lucide-react";
import TipTapRenderer from './TipTapRenderer';

interface MathFormula {
  name: string;
  latex: string;
  description?: string;
}

interface SubFormula {
  category: string;
  items: {
    latex: string;
    description: string;
  }[];
}

interface FormulaEditorModalProps {
  showFormulaModal: boolean;
  setShowFormulaModal: (show: boolean) => void;
  currentFormula: MathFormula | null;
  editedLatex: string;
  setEditedLatex: (latex: string) => void;
  formulaInsertMode: 'inline' | 'block' | 'centered';
  setFormulaInsertMode: (mode: 'inline' | 'block' | 'centered') => void;
  insertEditedFormula: () => void;
  subFormulas: SubFormula[];
}

export const FormulaEditorModal: React.FC<FormulaEditorModalProps> = ({
  showFormulaModal,
  setShowFormulaModal,
  currentFormula,
  editedLatex,
  setEditedLatex,
  formulaInsertMode,
  setFormulaInsertMode,
  insertEditedFormula,
  subFormulas
}) => {
  const insertSubFormula = (latex: string) => {
    const textArea = document.getElementById('latexEditor') as HTMLTextAreaElement;
    const cursorPosition = textArea.selectionStart;
    
    const newValue = 
      editedLatex.substring(0, cursorPosition) + 
      latex + 
      editedLatex.substring(cursorPosition);
    
    setEditedLatex(newValue);
    
    setTimeout(() => {
      textArea.focus();
      textArea.selectionStart = cursorPosition + latex.length;
      textArea.selectionEnd = cursorPosition + latex.length;
    }, 0);
  };

  if (!showFormulaModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
          <h3 className="text-lg font-medium flex items-center">
            <FunctionIcon className="w-5 h-5 mr-2" />
            {currentFormula ? `Éditer la formule: ${currentFormula.name}` : 'Éditer la formule'}
          </h3>
          <button
            onClick={() => setShowFormulaModal(false)}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            title="Fermer la fenêtre"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LaTeX Editor */}
            <div>
              <label htmlFor="latexEditor" className="block text-sm font-medium text-gray-700 mb-2">
                Code LaTeX
              </label>
              <textarea
                id="latexEditor"
                value={editedLatex}
                onChange={(e) => setEditedLatex(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm font-mono text-sm focus:ring-indigo-500 focus:border-indigo-500 h-64 resize-none"
                placeholder="Entrez votre code LaTeX ici..."
                spellCheck="false"
              />
            </div>
            {/* Preview */}
            <div>
              <div className="block text-sm font-medium text-gray-700 mb-2">
                Aperçu
              </div>
              <div className="border border-gray-300 rounded-lg h-64 p-4 bg-gray-50 flex items-center justify-center overflow-auto">
                <div className="max-w-full max-h-full">
                  <TipTapRenderer
                    content={
                      formulaInsertMode === 'inline'
                        ? `<p>$${editedLatex}$</p>`
                        : formulaInsertMode === 'centered'
                          ? `<p style="text-align: center">$${editedLatex}$</p>`
                          : `<p>$${editedLatex}$</p>`
                    }
                  />
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                <p>Visualisez le rendu de votre formule en temps réel.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg py-4 bg-gray-50 mt-4 w-full">
          {/* Conteneur défilant horizontal sur toute la largeur */}
          <div className="overflow-x-auto w-full">
            <div className="flex flex-row space-x-8 pb-0 px-4 min-w-max">
              {subFormulas.map((category, catIdx) => (
                <div key={catIdx} id={`formula-category-${catIdx}`} className="flex-shrink-0">
                  <h4 className="font-medium text-sm mb-2 text-gray-700">{category.category}</h4>
                  <div className="grid grid-cols-3 gap-0 w-full">
                    {category.items.map((formula, idx) => (
                      <button
                        key={idx}
                        className="flex flex-col items-center p-2 bg-white border border-gray-200 rounded hover:border-indigo-300 hover:shadow-sm transition-all"
                        onClick={() => insertSubFormula(`<p>$${formula.latex}$</p>`)}
                      >
                        <div className="h-12 w-full flex items-center justify-center">
                          <TipTapRenderer content={`<p>$${formula.latex}$</p>`} />
                        </div>
                        <div className="text-xs text-gray-600 mt-1 truncate w-full text-center">
                          {formula.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mode d'insertion options */}
          <div className="mt-6 border-t border-gray-200 pt-4 px-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Mode d'insertion:
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setFormulaInsertMode('inline')}
                className={`px-4 py-2 rounded-lg flex items-center text-sm ${
                  formulaInsertMode === 'inline'
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="font-mono mr-2">$x^2$</span>
                Formule en ligne
              </button>

              <button
                type="button"
                onClick={() => setFormulaInsertMode('centered')}
                className={`px-4 py-2 rounded-lg flex items-center text-sm ${
                  formulaInsertMode === 'centered'
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <AlignCenter className="w-4 h-4 mr-2" />
                Formule centrée
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 sm:flex sm:flex-row-reverse border-t border-gray-200 rounded-b-lg">
          <button
            type="button"
            onClick={insertEditedFormula}
            className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            disabled={!editedLatex.trim()}
          >
            <Check className="w-4 h-4 mr-2" />
            Insérer
          </button>
          <button
            type="button"
            onClick={() => setShowFormulaModal(false)}
            className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};