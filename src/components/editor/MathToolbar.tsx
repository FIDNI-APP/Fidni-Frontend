import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlignCenter,
  FunctionSquare as FunctionIcon,
  Search,
  Info,
  Clock
} from "lucide-react";
import TipTapRenderer from './TipTapRenderer';

interface MathFormula {
  name: string;
  latex: string;
  description?: string;
}

interface FormulaCategory {
  name: string;
  formulas: MathFormula[];
}

interface MathToolbarProps {
  insertMathInline: (latex?: string) => void;
  insertCenteredMathFormula: () => void;
  lastUsedFormulas: MathFormula[];
  mathFormulaCategories: FormulaCategory[];
  openFormulaEditor: (formula: MathFormula) => void;
  activeCategoryIndex: number | null;
  toggleCategory: (index: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  getFilteredFormulas: (category: FormulaCategory) => MathFormula[];
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  isActive?: boolean;
  color?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  onClick,
  isActive = false,
  color = "text-indigo-600"
}) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault();
      onClick(e);
    }}
    className={`p-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
      isActive
        ? 'bg-indigo-100 text-indigo-700 shadow-sm'
        : `bg-white ${color} hover:bg-indigo-50`
    }`}
    title={label}
  >
    {icon}
  </button>
);

const FormulaCard: React.FC<{ formula: MathFormula; onClick: () => void }> = ({ formula, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group bg-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-lg hover:border-indigo-400 transition-all duration-200 transform hover:scale-105 flex flex-col overflow-visible relative"
  >
    {/* Hover overlay */}
    <div className="absolute inset-0 bg-indigo-500 opacity-0 group-hover:opacity-5 rounded-xl transition-opacity duration-200"></div>

    {/* Formula Display */}
    <div className="p-4 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center min-h-20 overflow-visible relative z-10">
      <div className="max-w-full">
        <TipTapRenderer content={`<p>$${formula.latex}$</p>`} />
      </div>
    </div>

    {/* Formula Info */}
    <div className="p-3 border-t-2 border-gray-100 bg-white">
      <h3 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2 text-left">{formula.name}</h3>
      {formula.description && (
        <p className="text-xs text-gray-500 line-clamp-2 text-left">{formula.description}</p>
      )}
    </div>

    {/* Click indicator */}
    <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </div>
  </button>
);

export const MathToolbar: React.FC<MathToolbarProps> = ({
  insertMathInline,
  insertCenteredMathFormula,
  lastUsedFormulas,
  mathFormulaCategories,
  openFormulaEditor,
  activeCategoryIndex,
  toggleCategory,
  searchTerm,
  setSearchTerm,
  getFilteredFormulas
}) => {
  const [quickLatex, setQuickLatex] = useState('');

  const insertQuickFormula = () => {
    if (quickLatex.trim()) {
      insertMathInline(quickLatex);
      setQuickLatex('');
    }
  };

  const insertCommonSymbol = (latex: string) => {
    insertMathInline(latex);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Quick Math Input Row */}
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
        <div className="flex items-center gap-2 flex-1">
          <div className="bg-indigo-600 p-1.5 rounded-md">
            <FunctionIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Insertion rapide:</span>

          <div className="flex items-center gap-1 bg-white px-3 py-2 rounded-lg border border-gray-300 flex-1 max-w-md shadow-sm">
            <span className="text-gray-500 font-mono text-sm">$</span>
            <input
              type="text"
              value={quickLatex}
              onChange={(e) => setQuickLatex(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  insertQuickFormula();
                }
              }}
              placeholder="Tapez LaTeX... (ex: x^2, \\frac{a}{b})"
              className="flex-1 outline-none text-sm font-mono"
            />
            <span className="text-gray-500 font-mono text-sm">$</span>
          </div>

          <button
            type="button"
            onClick={insertQuickFormula}
            disabled={!quickLatex.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Insérer
          </button>
        </div>
      </div>

      {/* Common Symbols Row */}
      <div className="flex flex-wrap gap-2 items-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
        <span className="text-xs text-gray-600 font-semibold flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Symboles courants:
        </span>

        {[
          { latex: 'x^{2}', label: 'Puissance', display: 'x²' },
          { latex: '\\frac{a}{b}', label: 'Fraction', display: 'a/b' },
          { latex: '\\sqrt{x}', label: 'Racine carrée', display: '√' },
          { latex: '\\sum', label: 'Somme', display: '∑' },
          { latex: '\\int', label: 'Intégrale', display: '∫' },
          { latex: '\\lim', label: 'Limite', display: 'lim' },
          { latex: '\\alpha', label: 'Alpha', display: 'α' },
          { latex: '\\beta', label: 'Beta', display: 'β' },
          { latex: '\\pi', label: 'Pi', display: 'π' },
          { latex: '\\theta', label: 'Theta', display: 'θ' },
          { latex: '\\infty', label: 'Infini', display: '∞' },
          { latex: '\\leq', label: 'Inférieur ou égal', display: '≤' },
          { latex: '\\geq', label: 'Supérieur ou égal', display: '≥' },
          { latex: '\\neq', label: 'Différent', display: '≠' },
          { latex: '\\in', label: 'Appartient', display: '∈' },
          { latex: '\\times', label: 'Multiplication', display: '×' },
          { latex: '\\div', label: 'Division', display: '÷' },
          { latex: '\\pm', label: 'Plus ou moins', display: '±' },
        ].map(({ latex, label, display }) => (
          <button
            key={latex}
            type="button"
            onClick={() => insertCommonSymbol(latex)}
            className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-400 rounded-md text-sm transition-all duration-200 font-semibold text-indigo-600 hover:text-indigo-700 hover:shadow-sm"
            title={`${label}: ${latex}`}
          >
            {display}
          </button>
        ))}
      </div>

      {/* Original toolbar content */}
      <div className="flex gap-1 flex-wrap items-center">
      <ToolbarButton
        icon={<span className="text-xs font-medium">x²</span>}
        label="Formule en ligne vide"
        onClick={() => insertMathInline()}
        color="text-indigo-700"
      />
      <ToolbarButton
        icon={
          <div className="flex items-center text-xs">
            <span className="font-medium mr-1">∑</span>
            <AlignCenter className="w-3 h-3" />
          </div>
        }
        label="Formule centrée"
        onClick={insertCenteredMathFormula}
        color="text-indigo-700"
      />

      <div className="h-5 border-l border-gray-300 mx-1"></div>

      {/* Recently used formulas */}
      {lastUsedFormulas.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Récent:</span>
          {lastUsedFormulas.map((formula, idx) => (
            <button
              key={idx}
              onClick={() => openFormulaEditor(formula)}
              className="px-1.5 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors"
              title={formula.name}
            >
              {formula.name.length > 10 ? formula.name.substring(0, 10) + '...' : formula.name}
            </button>
          ))}

          <div className="h-5 border-l border-gray-300 mx-1"></div>
        </div>
      )}

      {/* Formula Categories */}
      {mathFormulaCategories.map((category, index) => (
        <div key={category.name} className="formula-category-container relative">
          <button
            type="button"
            onClick={() => toggleCategory(index)}
            className={`px-3 py-2 rounded-lg transition-all duration-200 text-sm flex items-center font-medium shadow-sm ${
              activeCategoryIndex === index
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
            }`}
            title={`Formules de ${category.name}`}
          >
            <FunctionIcon className="w-4 h-4 mr-1.5" />
            {category.name}
            {activeCategoryIndex === index ? (
              <ChevronDown className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
          </button>

          {activeCategoryIndex === index && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="bg-indigo-600 p-2 rounded-lg mr-3">
                      <FunctionIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Formules de {category.name}</h3>
                      <p className="text-xs text-gray-600">Cliquez sur une formule pour l'insérer</p>
                    </div>
                  </div>

                  {/* Search input */}
                  <div className="relative w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Rechercher une formule..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                      autoFocus
                    />
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(index)}
                    className="ml-3 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Fermer"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Formulas Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                  {getFilteredFormulas(category).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getFilteredFormulas(category).map((formula) => (
                        <FormulaCard
                          key={formula.name}
                          formula={formula}
                          onClick={() => {
                            openFormulaEditor(formula);
                            toggleCategory(index);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                      <div className="bg-gray-200 p-4 rounded-full mb-4">
                        <Info className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-lg font-medium mb-1">Aucune formule trouvée</p>
                      <p className="text-sm">Essayez un autre terme de recherche</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                  <p className="text-xs text-gray-600">
                    {getFilteredFormulas(category).length} formule{getFilteredFormulas(category).length > 1 ? 's' : ''} disponible{getFilteredFormulas(category).length > 1 ? 's' : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleCategory(index)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
};