import React, { useState, useRef, ReactNode } from 'react';
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
  Palette, 
  ImageIcon,
  Camera,
  X,
  Upload,
  ChevronDown,
  ChevronRight,
  FunctionSquare as FunctionIcon
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
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
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
          class: 'content-image',
          loading: 'lazy',
        },
      }),
              Mathematics.configure({
        // Use standard LaTeX syntax ($ for inline, $ for block)
        regex: /\$([^\$]+)\$|\$\$([^\$]+)\$\$/gi,
        // Configure KaTeX options if needed
        katexOptions: {
          throwOnError: false,
          strict: false,
          displayMode: true  // This ensures display mode for block equations
        },
        // Only render in non-code blocks
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

  // Handle text formatting
  const toggleBold = () => {
    editor?.chain().focus().toggleBold().run();
  };

  const toggleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
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
  const insertMathFormula = (formula: string, isBlock = false) => {
    if (isBlock) {
      editor?.chain().focus().insertContent(`$$${formula}$$`).run();
    } else {
      editor?.chain().focus().insertContent(`$${formula}$`).run();
    }
    // Close the formulas panel
    setActiveCategoryIndex(null);
  };

  // Insert math inline example
  const insertMathInline = () => {
    editor?.chain().focus().insertContent('$x^2 + y^2 = r^2$').run();
  };

  // Insert math block example
  const insertMathBlock = () => {
    editor?.chain().focus().insertContent('$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$').run();
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

  return (
    <div className="w-full border border-gray-200 rounded-3xl shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-3xl">
        <span className="font-medium">Éditeur de texte enrichi avec LaTeX</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
        {/* Text Formatting Buttons */}
        <button
          onClick={toggleBold}
          className={`px-2 py-1 rounded-3xl border transition-colors text-sm flex items-center ${
            editor?.isActive('bold') 
              ? 'bg-purple-100 text-purple-700 border-purple-300' 
              : 'bg-white text-purple-600 border-gray-300 hover:bg-purple-50'
          }`}
          title="Texte en gras"
        >
          <Bold className="w-4 h-4 mr-1" />
          Gras
        </button>

        <button
          onClick={toggleItalic}
          className={`px-2 py-1 rounded-3xl border transition-colors text-sm flex items-center ${
            editor?.isActive('italic') 
              ? 'bg-purple-100 text-purple-700 border-purple-300' 
              : 'bg-white text-purple-600 border-gray-300 hover:bg-purple-50'
          }`}
          title="Texte en italique"
        >
          <Italic className="w-4 h-4 mr-1" />
          Italique
        </button>

        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="px-2 py-1 bg-white text-purple-600 rounded-3xl border border-gray-300 hover:bg-purple-50 transition-colors text-sm flex items-center"
            title="Couleur du texte"
          >
            <Palette className="w-4 h-4 mr-1" style={{ color: selectedColor }} />
            Couleur
          </button>
          
          {showColorPicker && (
            <div className="absolute z-10 mt-1 p-2 bg-white rounded-3xl shadow-lg border border-gray-200 grid grid-cols-4 gap-1">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded-3xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ backgroundColor: color }}
                  onClick={() => applyTextColor(color)}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>

        <div className="h-6 border-l border-gray-300 mx-1"></div>

        {/* Math Formatting Buttons */}
        <button
          onClick={insertMathInline}
          className="px-2 py-1 bg-white text-indigo-600 rounded-3xl border border-gray-300 hover:bg-indigo-50 transition-colors text-sm flex items-center"
          title="Insérer une formule en ligne ($...$)"
        >
          Formule Inline
        </button>

        <button
          onClick={insertMathBlock}
          className="px-2 py-1 bg-white text-indigo-600 rounded-3xl border border-gray-300 hover:bg-indigo-50 transition-colors text-sm flex items-center"
          title="Insérer une équation centrée ($$...$$)"
        >
          Équation Block
        </button>

        <div className="h-6 border-l border-gray-300 mx-1"></div>

        {/* Individual Category Buttons */}
        {mathFormulaCategories.map((category, index) => (
          <div key={category.name} className="relative">
            <button
              onClick={() => toggleCategory(index)}
              className={`px-2 py-1 rounded-3xl border transition-colors text-sm flex items-center ${
                activeCategoryIndex === index 
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300' 
                  : 'bg-white text-indigo-600 border-gray-300 hover:bg-indigo-50'
              }`}
              title={`Formules de ${category.name}`}
            >
              <FunctionIcon className="w-4 h-4 mr-1" />
              {category.name}
            </button>
            
            {activeCategoryIndex === index && (
              <div className="absolute z-20 mt-1 p-2 bg-white rounded-3xl shadow-lg border border-gray-200 w-56 max-h-64 overflow-y-auto">
                <div className="text-sm font-medium mb-2 text-gray-700">{category.name}</div>
                <div className="space-y-1">
                  {category.formulas.map((formula) => (
                    <button
                      key={formula.name}
                      onClick={() => insertMathFormula(formula.latex, formula.latex.includes('\\begin') || formula.latex.length > 20)}
                      className="w-full text-left px-2 py-1 text-xs hover:bg-indigo-50 rounded-3xl"
                      title={formula.description}
                    >
                      {formula.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="h-6 border-l border-gray-300 mx-1"></div>
        
        {/* Image Button */}
        <button
          onClick={openImageModal}
          className="px-2 py-1 bg-white text-green-600 rounded border border-gray-300 hover:bg-green-50 transition-colors text-sm flex items-center"
          title="Insérer une image"
        >
          <ImageIcon className="w-4 h-4 mr-1" />
          Image
        </button>
      </div>

      {/* Editor Area */}
      <div 
        className="p-4 bg-white latex-style min-h-[400px] text-xl border-none focus-within:outline-none" 
        onClick={focusEditor}
      >
        <EditorContent 
          editor={editor} 
          className="min-h-[400px] focus:outline-none prose max-w-none"
        />
      </div>

      {/* Add CSS for LaTeX styling */}


      {/* Tips */}
      <div className="mt-2 p-2 bg-indigo-50 rounded-lg text-xs text-indigo-700">
        <div className="font-medium mb-1">Astuces d'utilisation :</div>
        <ul className="list-disc list-inside space-y-1">
          <li>Sélectionnez du texte et utilisez les boutons ci-dessus pour le mettre en forme</li>
          <li>Tapez des formules mathématiques en les entourant de $...$</li>
          <li>Pour des équations centrées, utilisez $$...$$</li>
          <li>Cliquez sur chaque catégorie pour accéder à des formules mathématiques courantes</li>
          <li>Utilisez "Image" pour ajouter des images depuis votre appareil ou prendre une photo</li>
        </ul>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Insérer une image</h3>
              <button 
                onClick={() => setShowImageModal(false)}
                className="text-gray-400 hover:text-gray-500"
                title="Fermer la fenêtre"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {imagePreview && (
                <div className="border rounded-lg p-2 bg-gray-50">
                  <img 
                    src={imagePreview} 
                    alt="Aperçu" 
                    className="max-w-full h-auto max-h-64 mx-auto"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-3xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Décrivez votre image (optionnel)"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-3xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
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
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-3xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
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
                className="w-full inline-flex justify-center rounded-3xl border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                disabled={!imageUrl || isUploading}
              >
                Insérer
              </button>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="mt-3 w-full inline-flex justify-center rounded-3xl border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DualPaneEditor;