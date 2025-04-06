import React, { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Mathematics from '@tiptap-pro/extension-mathematics';

import 'katex/dist/katex.min.css';
import { 
  Bold, 
  Italic, 
  Underline,
  Palette, 
  ImageIcon,
  Camera,
  X,
  Upload,
  ChevronDown,
  ChevronRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo,
  Redo,
  FunctionSquare as FunctionIcon,
  Heading1,
  Heading2,
  Quote,
  Link,
  Sparkles,
  Settings
} from "lucide-react";

interface DualPaneEditorProps {
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
}

// Define common math formulas with categories
interface MathFormula {
  name: string;
  latex: string;
  description?: string;
}

interface FormulaCategory {
  name: string;
  formulas: MathFormula[];
}

const mathFormulaCategories: FormulaCategory[] = [
  {
    name: "Algèbre",
    formulas: [
      { name: "Équation quadratique", latex: "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}", description: "Solution de ax² + bx + c = 0" },
      { name: "Binôme de Newton", latex: "(x+y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k" },
      { name: "Factorielle", latex: "n! = n \\cdot (n-1) \\cdot (n-2) \\cdot \\ldots \\cdot 2 \\cdot 1" },
      { name: "Fraction", latex: "\\frac{a}{b}" },
      { name: "Racine carrée", latex: "\\sqrt{x}" },
      { name: "Racine n-ième", latex: "\\sqrt[n]{x}" },
    ]
  },
  {
    name: "Calcul",
    formulas: [
      { name: "Dérivée", latex: "\\frac{d}{dx}f(x)" },
      { name: "Intégrale définie", latex: "\\int_{a}^{b} f(x) \\, dx" },
      { name: "Intégrale indéfinie", latex: "\\int f(x) \\, dx" },
      { name: "Limite", latex: "\\lim_{x \\to a} f(x)" },
      { name: "Somme", latex: "\\sum_{i=1}^{n} a_i" },
      { name: "Produit", latex: "\\prod_{i=1}^{n} a_i" },
    ]
  },
  {
    name: "Trigonométrie",
    formulas: [
      { name: "Sinus", latex: "\\sin(\\theta)" },
      { name: "Cosinus", latex: "\\cos(\\theta)" },
      { name: "Tangente", latex: "\\tan(\\theta)" },
      { name: "Identité fondamentale", latex: "\\sin^2(\\theta) + \\cos^2(\\theta) = 1" },
      { name: "Loi des sinus", latex: "\\frac{a}{\\sin(A)} = \\frac{b}{\\sin(B)} = \\frac{c}{\\sin(C)}" },
      { name: "Loi des cosinus", latex: "c^2 = a^2 + b^2 - 2ab\\cos(C)" },
    ]
  },
  {
    name: "Matrices",
    formulas: [
      { name: "Matrice 2×2", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
      { name: "Déterminant", latex: "\\det(A) = |A|" },
      { name: "Matrice inverse", latex: "A^{-1}" },
      { name: "Système d'équations", latex: "\\begin{cases} a_1x + b_1y = c_1 \\\\ a_2x + b_2y = c_2 \\end{cases}" },
    ]
  },
  {
    name: "Statistiques",
    formulas: [
      { name: "Espérance", latex: "E(X) = \\sum_{i} x_i p_i" },
      { name: "Variance", latex: "\\operatorname{Var}(X) = E[(X - \\mu)^2]" },
      { name: "Loi normale", latex: "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{1}{2}(\\frac{x-\\mu}{\\sigma})^2}" },
      { name: "Binomiale", latex: "P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}" },
    ]
  }
];

// Predefined themes for quick styling
const editorThemes = [
  { name: "Classique", bgColor: "bg-white", textColor: "text-gray-800", accentColor: "from-indigo-500 to-purple-600" },
  { name: "Sombre", bgColor: "bg-gray-900", textColor: "text-gray-100", accentColor: "from-purple-500 to-indigo-600" },
  { name: "Pastel", bgColor: "bg-blue-50", textColor: "text-gray-800", accentColor: "from-blue-400 to-indigo-500" },
  { name: "Académique", bgColor: "bg-amber-50", textColor: "text-gray-800", accentColor: "from-amber-500 to-orange-500" },
  { name: "Minimaliste", bgColor: "bg-gray-50", textColor: "text-gray-800", accentColor: "from-gray-500 to-gray-600" }
];

const DualPaneEditor: React.FC<DualPaneEditorProps> = ({ content, setContent }) => {
  // UI state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageCaption, setImageCaption] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);
  const [activeToolbar, setActiveToolbar] = useState<string>("text"); // text, math, layout
  const [showSettings, setShowSettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(editorThemes[0]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipText, setTooltipText] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [lastUsedFormulas, setLastUsedFormulas] = useState<MathFormula[]>([]);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // Predefined colors for the color picker
  const colorOptions = [
    "#000000", "#e60000", "#ff9900", "#ffff00", 
    "#008a00", "#0066cc", "#9933ff", "#ff0066", 
    "#555555", "#ff6600", "#99cc00", "#00ccff", 
    "#993366", "#c0c0c0", "#ff99cc", "#ffcc00"
  ];

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Image.configure({
        HTMLAttributes: {
          class: 'content-image rounded-lg max-w-full',
          loading: 'lazy',
        },
      }),
      Mathematics.configure({
        regex: /\$([^\$]+)\$|\$\$([^\$]+)\$\$/gi,
        katexOptions: {
          throwOnError: false,
          strict: false,
          displayMode: true
        },
        shouldRender: (state, pos, node) => {
          const $pos = state.doc.resolve(pos);
          return node.type.name === 'text' && $pos.parent.type.name !== 'codeBlock';
        }
      })
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  // Add a formula to recently used
  const addToRecentFormulas = (formula: MathFormula) => {
    // Check if formula already exists in recent list
    const exists = lastUsedFormulas.some(f => f.latex === formula.latex);
    if (!exists) {
      // Add to beginning and keep only last 5 items
      setLastUsedFormulas(prev => [formula, ...prev].slice(0, 5));
    }
  };

  // Handle text formatting
  const toggleBold = () => {
    editor?.chain().focus().toggleBold().run();
  };

  const toggleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
  };
  
  const toggleUnderline = () => {
    editor?.chain().focus().toggleUnderline().run();
  };

  const toggleHeading = (level: 1 | 2) => {
    editor?.chain().focus().toggleHeading({ level }).run();
  };

  const toggleBulletList = () => {
    editor?.chain().focus().toggleBulletList().run();
  };

  const toggleOrderedList = () => {
    editor?.chain().focus().toggleOrderedList().run();
  };

  const toggleBlockquote = () => {
    editor?.chain().focus().toggleBlockquote().run();
  };

  const setTextAlign = (align: 'left' | 'center' | 'right') => {
    editor?.chain().focus().setTextAlign(align).run();
  };

  const handleUndo = () => {
    editor?.chain().focus().undo().run();
  };

  const handleRedo = () => {
    editor?.chain().focus().redo().run();
  };

  // Apply text color
  const applyTextColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
    setSelectedColor(color);
    setShowColorPicker(false);
  };

  // Handle category button click
  const toggleCategory = (index: number) => {
    if (activeCategoryIndex === index) {
      setActiveCategoryIndex(null);
    } else {
      setActiveCategoryIndex(index);
    }
  };

  // Insert math formula
  const insertMathFormula = (formula: MathFormula, isBlock = false) => {
    if (isBlock) {
      editor?.chain().focus().insertContent(`$$${formula.latex}$$`).run();
    } else {
      editor?.chain().focus().insertContent(`$${formula.latex}$`).run();
    }
    
    // Add to recently used formulas
    addToRecentFormulas(formula);
    
    // Close the formulas panel
    setActiveCategoryIndex(null);
  };

  // Insert math inline example
  const insertMathInline = () => {
    const inlineFormula = { name: "Équation inline", latex: "x^2 + y^2 = r^2" };
    editor?.chain().focus().insertContent(`$${inlineFormula.latex}$`).run();
    addToRecentFormulas(inlineFormula);
  };

  // Insert math block example
  const insertMathBlock = () => {
    const blockFormula = { name: "Formule quadratique", latex: "\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" };
    editor?.chain().focus().insertContent(`$$${blockFormula.latex}$$`).run();
    addToRecentFormulas(blockFormula);
  };

  // Open image modal
  const openImageModal = () => {
    setImageUrl("");
    setImageCaption("");
    setImagePreview(null);
    setShowImageModal(true);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Create a preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
        setImageUrl(e.target.result as string);
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      alert("Erreur lors du chargement de l'image");
    };
    reader.readAsDataURL(file);
  };

  // Handle camera capture
  const captureImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Create a preview for the captured photo
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
        setImageUrl(e.target.result as string);
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      alert("Erreur lors de la capture de l'image");
    };
    reader.readAsDataURL(file);
  };

  // Insert image into editor
  const insertImage = () => {
    if (!imageUrl) return;
    
    editor?.chain().focus().setImage({ 
      src: imageUrl,
      alt: imageCaption || 'Image',
    }).run();
    
    setShowImageModal(false);
  };
  
  // Attach click handler to editor to ensure it's focused
  const focusEditor = () => {
    editor?.chain().focus().run();
  };

  // Tooltip handling
  const showButtonTooltip = (text: string, event: React.MouseEvent) => {
    // Clear any existing timeout
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current);
    }
    
    // Get position
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const toolbarRect = toolbarRef.current?.getBoundingClientRect();
    
    if (toolbarRect) {
      setTooltipPosition({
        x: rect.left + rect.width / 2 - toolbarRect.left,
        y: rect.top - toolbarRect.top - 8
      });
    }
    
    setTooltipText(text);
    setShowTooltip(true);
    
    // Hide after 1.5 seconds
    tooltipTimeoutRef.current = window.setTimeout(() => {
      setShowTooltip(false);
    }, 1500);
  };
  
  const hideTooltip = () => {
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current);
    }
    setShowTooltip(false);
  };

  // Helper function to create buttons with consistent styling
  const ToolbarButton = ({ 
    icon, 
    label, 
    onClick, 
    isActive = false,
    color = "text-indigo-600"
  }: {
    icon: React.ReactNode;
    label: string;
    onClick: (e: React.MouseEvent) => void;
    isActive?: boolean;
    color?: string;
  }) => (
    <button
      onClick={(e) => {
        onClick(e);
        showButtonTooltip(label, e);
      }}
      onMouseEnter={(e) => showButtonTooltip(label, e)}
      onMouseLeave={hideTooltip}
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

  // Effect to handle document clicks to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColorPicker || activeCategoryIndex !== null || showSettings) {
        const target = event.target as HTMLElement;
        
        // Close color picker if clicking outside
        if (showColorPicker && !target.closest('.color-picker-container')) {
          setShowColorPicker(false);
        }
        
        // Close formula categories if clicking outside
        if (activeCategoryIndex !== null && !target.closest('.formula-category-container')) {
          setActiveCategoryIndex(null);
        }
        
        // Close settings if clicking outside
        if (showSettings && !target.closest('.settings-container')) {
          setShowSettings(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker, activeCategoryIndex, showSettings]);

  return (
    <div className={`w-full border border-gray-200 rounded-lg shadow-lg overflow-hidden ${currentTheme.bgColor} transition-colors duration-300`}>
      {/* Header */}
      <div className={`flex items-center justify-between gap-2 px-4 py-2 bg-gradient-to-r ${currentTheme.accentColor} text-white rounded-t-lg shadow-sm`}>
        <div className="flex items-center">
          <Sparkles className="w-5 h-5 mr-2 opacity-80" />
          <span className="font-medium">Éditeur de Formules Mathématiques</span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            onMouseEnter={(e) => showButtonTooltip("Paramètres", e)}
            onMouseLeave={hideTooltip}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="settings-container absolute right-0 mt-1 p-3 bg-white rounded-lg shadow-xl border border-gray-200 z-40 w-64">
          <div className="text-sm font-medium mb-2 text-gray-700 pb-1 border-b">Thèmes</div>
          <div className="space-y-1.5 mt-2">
            {editorThemes.map((theme, index) => (
              <button
                key={theme.name}
                onClick={() => setCurrentTheme(theme)}
                className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded-md flex items-center ${
                  currentTheme.name === theme.name ? 'bg-indigo-50 text-indigo-700' : ''
                }`}
              >
                <div className={`w-4 h-4 rounded-full mr-2 bg-gradient-to-r ${theme.accentColor}`}></div>
                {theme.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-3 pt-1">
        <button 
          className={`px-3 py-1.5 text-sm font-medium rounded-t-lg ${
            activeToolbar === 'text' ? 'bg-white border-t border-l border-r border-gray-200 border-b-white -mb-px text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveToolbar('text')}
        >
          Texte
        </button>
        <button 
          className={`px-3 py-1.5 text-sm font-medium rounded-t-lg ${
            activeToolbar === 'math' ? 'bg-white border-t border-l border-r border-gray-200 border-b-white -mb-px text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveToolbar('math')}
        >
          Mathématiques
        </button>
        <button 
          className={`px-3 py-1.5 text-sm font-medium rounded-t-lg ${
            activeToolbar === 'layout' ? 'bg-white border-t border-l border-r border-gray-200 border-b-white -mb-px text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveToolbar('layout')}
        >
          Mise en page
        </button>
      </div>

      {/* Main Toolbar */}
      <div 
        ref={toolbarRef} 
        className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-white border-b border-gray-200 relative"
      >
        {/* Text Formatting Toolbar */}
        {activeToolbar === 'text' && (
          <>
            <div className="flex gap-1 items-center">
              <ToolbarButton 
                icon={<Bold className="w-4 h-4" />} 
                label="Gras" 
                onClick={toggleBold} 
                isActive={editor?.isActive('bold')}
              />
              <ToolbarButton 
                icon={<Italic className="w-4 h-4" />} 
                label="Italique" 
                onClick={toggleItalic} 
                isActive={editor?.isActive('italic')}
              />
              <ToolbarButton 
                icon={<Underline className="w-4 h-4" />} 
                label="Souligné" 
                onClick={toggleUnderline} 
                isActive={editor?.isActive('underline')}
              />
              
              <div className="h-5 border-l border-gray-300 mx-1"></div>
              
              <ToolbarButton 
                icon={<Heading1 className="w-4 h-4" />} 
                label="Titre 1" 
                onClick={() => toggleHeading(1)} 
                isActive={editor?.isActive('heading', { level: 1 })}
              />
              <ToolbarButton 
                icon={<Heading2 className="w-4 h-4" />} 
                label="Titre 2" 
                onClick={() => toggleHeading(2)} 
                isActive={editor?.isActive('heading', { level: 2 })}
              />
              <ToolbarButton 
                icon={<Quote className="w-4 h-4" />} 
                label="Citation" 
                onClick={toggleBlockquote} 
                isActive={editor?.isActive('blockquote')}
              />
              
              <div className="h-5 border-l border-gray-300 mx-1"></div>
              
              <ToolbarButton 
                icon={<List className="w-4 h-4" />} 
                label="Liste à puces" 
                onClick={toggleBulletList} 
                isActive={editor?.isActive('bulletList')}
              />
              <ToolbarButton 
                icon={<ListOrdered className="w-4 h-4" />} 
                label="Liste numérotée" 
                onClick={toggleOrderedList} 
                isActive={editor?.isActive('orderedList')}
              />
              
              <div className="h-5 border-l border-gray-300 mx-1"></div>
              
              <div className="color-picker-container relative">
                <ToolbarButton 
                  icon={<Palette className="w-4 h-4" style={{ color: selectedColor }} />} 
                  label="Couleur du texte" 
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  isActive={showColorPicker}
                />
                
                {showColorPicker && (
                  <div className="absolute z-30 mt-1 p-2 bg-white rounded-lg shadow-lg border border-gray-200 grid grid-cols-4 gap-1 w-36">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        className="w-7 h-7 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        onClick={() => applyTextColor(color)}
                        title={color}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="h-5 border-l border-gray-300 mx-1"></div>
              
              <ToolbarButton 
                icon={<Undo className="w-4 h-4" />} 
                label="Annuler" 
                onClick={handleUndo}
              />
              <ToolbarButton 
                icon={<Redo className="w-4 h-4" />} 
                label="Rétablir" 
                onClick={handleRedo}
              />
            </div>
          </>
        )}

        {/* Math Formatting Toolbar */}
        {activeToolbar === 'math' && (
          <>
            <div className="flex gap-1 flex-wrap items-center">
              <ToolbarButton 
                icon={<span className="text-xs font-medium">x²</span>} 
                label="Formule en ligne" 
                onClick={insertMathInline}
                color="text-indigo-700"
              />
              <ToolbarButton 
                icon={<span className="text-xs font-medium">∑</span>} 
                label="Équation centrée" 
                onClick={insertMathBlock}
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
                      onClick={() => insertMathFormula(formula, formula.latex.includes('\\begin') || formula.latex.length > 20)}
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
                    <div className="absolute z-30 mt-1 p-2 bg-white rounded-lg shadow-lg border border-gray-200 w-60 max-h-64 overflow-y-auto">
                      <div className="text-sm font-medium mb-2 text-gray-700 pb-1 border-b">{category.name}</div>
                      <div className="grid grid-cols-1 gap-1">
                        {category.formulas.map((formula) => (
                          <button
                            key={formula.name}
                            onClick={() => insertMathFormula(formula, formula.latex.includes('\\begin') || formula.latex.length > 20)}
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-indigo-50 rounded-md flex items-center justify-between group"
                            title={formula.description}
                          >
                            <span>{formula.name}</span>
                            <span className="text-xs text-gray-400 group-hover:text-indigo-500">$</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Layout Formatting Toolbar */}
        {activeToolbar === 'layout' && (
          <>
            <div className="flex gap-1 flex-wrap items-center">
              <ToolbarButton 
                icon={<AlignLeft className="w-4 h-4" />} 
                label="Aligner à gauche" 
                onClick={() => setTextAlign('left')} 
                isActive={editor?.isActive({ textAlign: 'left' })}
              />
              <ToolbarButton 
                icon={<AlignCenter className="w-4 h-4" />} 
                label="Centrer" 
                onClick={() => setTextAlign('center')} 
                isActive={editor?.isActive({ textAlign: 'center' })}
              />
              <ToolbarButton 
                icon={<AlignRight className="w-4 h-4" />} 
                label="Aligner à droite" 
                onClick={() => setTextAlign('right')} 
                isActive={editor?.isActive({ textAlign: 'right' })}
              />
              
              <div className="h-5 border-l border-gray-300 mx-1"></div>
              
              <ToolbarButton 
                icon={<ImageIcon className="w-4 h-4" />} 
                label="Insérer une image" 
                onClick={openImageModal}
                color="text-green-600"
              />
              <ToolbarButton 
                icon={<Link className="w-4 h-4" />} 
                label="Ajouter un lien" 
                onClick={() => {
                  const url = window.prompt('URL:');
                  if (url) {
                    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                  }
                }}
                isActive={editor?.isActive('link')}
              />
            </div>
          </>
        )}
        
        {/* Tooltip */}
        {showTooltip && (
          <div 
            className="absolute bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none transform -translate-x-1/2 -translate-y-full opacity-90 z-50"
            style={{ 
              left: `${tooltipPosition.x}px`, 
              top: `${tooltipPosition.y}px` 
            }}
          >
            {tooltipText}
            <div className="tooltip-arrow absolute h-2 w-2 bg-gray-800 transform rotate-45 left-1/2 -ml-1 -bottom-1"></div>
          </div>
        )}
      </div>

      {/* Editor Area */}
      <div 
        className={`p-4 ${currentTheme.bgColor} ${currentTheme.textColor} latex-style min-h-[400px] text-lg border-none focus-within:outline-none transition-colors duration-300`} 
        onClick={focusEditor}
      >
        <EditorContent 
          editor={editor} 
          className="min-h-[400px] focus:outline-none prose max-w-none"
        />
      </div>

      {/* Status Bar */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>Mode: {activeToolbar === 'text' ? 'Texte' : activeToolbar === 'math' ? 'Mathématiques' : 'Mise en page'}</span>
          <span>•</span>
          <span>Thème: {currentTheme.name}</span>
        </div>
        <div>
          Éditeur de formules mathématiques
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Insérer une image</h3>
              <button 
                onClick={() => setShowImageModal(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                title="Fermer la fenêtre"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {imagePreview && (
                <div className="border rounded-lg p-2 bg-gray-50 flex items-center justify-center">
                  <img 
                    src={imagePreview} 
                    alt="Aperçu" 
                    className="max-w-full h-auto max-h-64 rounded shadow-sm"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="imageCaption" className="block text-sm font-medium text-gray-700">
                  Légende de l'image
                </label>
                <input
                  type="text"
                  id="imageCaption"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  placeholder="Décrivez votre image (optionnel)"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Télécharger
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  title="Télécharger une image"
                  aria-label="Télécharger une image"
                />
                
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  disabled={isUploading}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Photo
                </button>
                <label htmlFor="camera-input" className="hidden">Prendre une photo</label>
                <input 
                  type="file" 
                  id="camera-input"
                  ref={cameraInputRef}
                  className="hidden" 
                  accept="image/*" 
                  title="Prendre une photo"
                  onChange={captureImage}
                />
              </div>
            </div>
            
            <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 rounded-b-lg">
              <button
                type="button"
                onClick={insertImage}
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                disabled={!imageUrl || isUploading}
              >
                Insérer
              </button>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hints Panel */}
      <div className="mt-2 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700 shadow-inner">
        <div className="font-medium mb-2 flex items-center">
          <Sparkles className="w-4 h-4 mr-1.5 opacity-80" />
          Astuces d'utilisation
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="font-medium text-xs uppercase tracking-wider mb-1.5 text-indigo-800">Texte</div>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>Sélectionnez le texte pour le mettre en forme</li>
              <li>Utilisez les options de couleur pour personnaliser</li>
              <li>Structurez votre document avec des titres</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-xs uppercase tracking-wider mb-1.5 text-indigo-800">Mathématiques</div>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>$x^2$ : Formule en ligne avec $...$</li>
              <li>Équation centrée avec $...$</li>
              <li>Utilisez les catégories pour des formules courantes</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-xs uppercase tracking-wider mb-1.5 text-indigo-800">Mise en page</div>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>Ajoutez des images depuis votre appareil</li>
              <li>Alignez votre texte à gauche, au centre ou à droite</li>
              <li>Personnalisez l'apparence avec les thèmes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Custom CSS for LaTeX styling */}
      <style jsx>{`
        .latex-style .ProseMirror {
          min-height: 400px;
          outline: none;
        }
        
        .content-image {
          display: block;
          margin: 1rem auto;
          max-width: 100%;
          border-radius: 0.5rem;
        }

        .tooltip-arrow {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #333;
          transform: rotate(45deg);
          bottom: -4px;
          left: 50%;
          margin-left: -4px;
        }
      `}</style>
    </div>
  );
};

export default DualPaneEditor;