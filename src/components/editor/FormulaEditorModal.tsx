import React, { useState } from 'react';
import { 
  X, 
  FunctionSquare as FunctionIcon, 
  AlignCenter, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Search 
} from "lucide-react";
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
  // State for search and expanded sections
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Toggle section expansion
  const toggleSection = (category: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Insert sub-formula into the editor
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

  // Filter sub-formulas based on search term
  const getFilteredSubFormulas = () => {
    if (!searchTerm) return subFormulas;
    
    return subFormulas.map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.latex.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(category => category.items.length > 0);
  };

  if (!showFormulaModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg sticky top-0 z-10">
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

        <div className="overflow-y-auto flex-grow">
          <div className="p-4">
            {/* Editor and Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* LaTeX Editor */}
              <div>
                <label htmlFor="latexEditor" className="block text-sm font-medium text-gray-700 mb-2">
                  Code LaTeX
                </label>
                <textarea
                  id="latexEditor"
                  value={editedLatex}
                  onChange={(e) => setEditedLatex(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm font-mono text-sm focus:ring-indigo-500 focus:border-indigo-500 h-40 resize-none"
                  placeholder="Entrez votre code LaTeX ici..."
                  spellCheck="false"
                />
              </div>
              
              {/* Preview */}
              <div>
                <div className="block text-sm font-medium text-gray-700 mb-2">
                  Aperçu
                </div>
                <div className="border border-gray-300 rounded-lg h-40 p-4 bg-gray-50 flex items-center justify-center overflow-auto">
                  <div className="max-w-full max-h-full">
                    <TipTapRenderer
                      content={
                        formulaInsertMode === 'inline'
                          ? `<p>$${editedLatex}$</p>`
                          : formulaInsertMode === 'centered'
                            ? `<p style="text-align: center">$$${editedLatex}$$</p>`
                            : `<p>$$${editedLatex}$$</p>`
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mode d'insertion options */}
            <div className="mt-4 mb-4 border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Mode d'insertion:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormulaInsertMode('inline')}
                  className={`px-3 py-2 rounded-lg flex items-center text-sm ${
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
                  className={`px-3 py-2 rounded-lg flex items-center text-sm ${
                    formulaInsertMode === 'centered'
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <AlignCenter className="w-4 h-4 mr-2" />
                  Formule centrée
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormulaInsertMode('block')}
                  className={`px-3 py-2 rounded-lg flex items-center text-sm ${
                    formulaInsertMode === 'block'
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-mono mr-2">$$..$$</span>
                  Formule en bloc
                </button>
              </div>
            </div>

            {/* Formules pré-définies */}
            <div className="mt-4 mb-4 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Formules prédéfinies:
                </label>
                <div className="relative w-60">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher une formule..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-3 py-1.5 border border-gray-300 rounded-md text-sm w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              {/* Accordion de formules */}
              <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                {getFilteredSubFormulas().map((category, catIdx) => (
                  <div key={catIdx} className="border-b border-gray-200 last:border-b-0">
                    <button
                      onClick={() => toggleSection(category.category)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors text-left"
                    >
                      <span className="font-medium text-gray-700">{category.category}</span>
                      {expandedSections[category.category] ? 
                        <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      }
                    </button>
                    
                    {expandedSections[category.category] && (
                      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {category.items.map((formula, idx) => (
                          <button
                            key={idx}
                            className="flex flex-col items-center p-2 bg-white border border-gray-200 rounded hover:border-indigo-300 hover:shadow-sm transition-all"
                            onClick={() => insertSubFormula(formula.latex)}
                            title={formula.description}
                          >
                            <div className="h-10 w-full flex items-center justify-center">
                              <TipTapRenderer content={`<p>$${formula.latex}$</p>`} />
                            </div>
                            <div className="text-xs text-gray-600 mt-1 truncate w-full text-center">
                              {formula.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {getFilteredSubFormulas().length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    Aucune formule ne correspond à votre recherche
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with buttons - fixed at bottom */}
        <div className="px-4 py-3 bg-gray-50 sm:flex sm:flex-row-reverse border-t border-gray-200 rounded-b-lg sticky bottom-0">
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