import React from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  AlignCenter, 
  FunctionSquare as FunctionIcon,
  Search,
  Info
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
  insertMathInline: () => void;
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
    onClick={onClick}
    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-indigo-300 transition-all duration-200 transform hover:-translate-y-1 flex flex-col"
  >
    <div className="p-3 bg-gray-50 flex items-center justify-center h-16">
      {/* This would need TipTapRenderer passed as prop or imported */}
      <TipTapRenderer content={`<p>$${formula.latex}$</p>`} />
    </div>
    <div className="p-2 border-t border-gray-100">
      <h3 className="text-xs font-medium text-gray-800 truncate">{formula.name}</h3>
      {formula.description && (
        <p className="text-xs text-gray-500 truncate">{formula.description}</p>
      )}
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
  return (
    <div className="flex gap-1 flex-wrap items-center">
      <ToolbarButton
        icon={<span className="text-xs font-medium">x²</span>}
        label="Formule en ligne"
        onClick={insertMathInline}
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
            onClick={() => toggleCategory(index)}
            className={`px-2 py-1 rounded-md transition-colors text-sm flex items-center ${
              activeCategoryIndex === index
                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                : 'bg-white text-indigo-600 hover:bg-indigo-50'
            }`}
            title={`Formules de ${category.name}`}
          >
            <FunctionIcon className="w-3.5 h-3.5 mr-1" />
            {category.name}
            {activeCategoryIndex === index ? (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            )}
          </button>

          {activeCategoryIndex === index && (
            <div className="absolute z-30 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 w-[650px] max-h-[450px]">
              <div className="p-3 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <div className="text-sm font-medium text-gray-700 flex items-center">
                  <FunctionIcon className="w-4 h-4 mr-2 text-indigo-500" />
                  Formules de {category.name}
                </div>

                {/* Search input */}
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

              <div className="p-3 overflow-y-auto" style={{ maxHeight: "380px" }}>
                {getFilteredFormulas(category).length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {getFilteredFormulas(category).map((formula) => (
                      <FormulaCard
                        key={formula.name}
                        formula={formula}
                        onClick={() => openFormulaEditor(formula)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-gray-500">
                    <Info className="w-8 h-8 mb-2 text-gray-400" />
                    <p>Aucune formule trouvée pour "{searchTerm}"</p>
                    <p className="text-sm">Essayez avec un autre terme</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};