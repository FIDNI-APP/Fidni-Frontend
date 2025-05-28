import React, { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Heading from '@tiptap/extension-heading';
import { Link as LinkTiptap } from '@tiptap/extension-link';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import 'katex/dist/katex.min.css';
import ImageResize from 'tiptap-extension-resize-image';
import { FileHandler } from '@tiptap-pro/extension-file-handler';
import { Sparkles, Settings } from "lucide-react";

// Import des composants existants
import { EditorToolbar } from './EditorToolbar';
import { MathToolbar } from './MathToolbar';
import { ImageModal } from './ImageModal';
import { FormulaEditorModal } from './FormulaEditorModal';
import { EditorSettings } from './EditorSettings';
import { EditorHints } from './EditorHints';
import { 
  MathFormula, 
  FormulaCategory,
  editorThemes, 
  mathFormulaCategories, 
  colorOptions, 
  subFormulas 
} from './editorConstants';

// Import de notre extension mathématique corrigée
import { RealTimeMathExtension } from './RealTimeMathExtension';

interface DualPaneEditorProps {
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
}

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
  const [activeToolbar, setActiveToolbar] = useState<string>("text");
  const [showSettings, setShowSettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(editorThemes[0]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipText, setTooltipText] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [lastUsedFormulas, setLastUsedFormulas] = useState<MathFormula[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Formula editor modal state
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [currentFormula, setCurrentFormula] = useState<MathFormula | null>(null);
  const [editedLatex, setEditedLatex] = useState("");
  const [formulaInsertMode, setFormulaInsertMode] = useState<'inline' | 'block' | 'centered'>('inline');
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  
  // Refs
  const tooltipTimeoutRef = useRef<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Gestionnaire pour éditer une formule existante
  const handleEditMath = (latex: string, isDisplay: boolean) => {
    // Configurer l'éditeur de formule
    const formulaToEdit = { 
      name: isDisplay ? "Formule en bloc" : "Formule en ligne", 
      latex: latex 
    };
    
    setCurrentFormula(formulaToEdit);
    setEditedLatex(latex);
    setFormulaInsertMode(isDisplay ? (activeToolbar === 'centered' ? 'centered' : 'block') : 'inline');
    setIsEditingFormula(true);
    setShowFormulaModal(true);
  };

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TextStyle,
      Color,
      Document,
      Paragraph,
      Text,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Heading.configure({
        levels: [1, 2],
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc pl-5',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal pl-5',
        },
      }),
      ListItem,
      ImageResize.configure({
        allowBase64: true,
        inline: false,
        HTMLAttributes: {
          class: 'content-image rounded-lg max-w-full',
        },
      }),
      LinkTiptap.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 hover:text-indigo-800 underline',
        },
      }),
      FileHandler.configure({
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        onDrop: (editor, files, pos) => {
          Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                editor.chain().focus().setNodeSelection(pos).insertContentAt(pos, {
                  type: 'image',
                  attrs: {
                    src: e.target.result,
                    alt: file.name,
                  }
                }).run();
              }
            };
            reader.readAsDataURL(file);
          });
        },
        onPaste: (editor, files) => {
          Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                editor.chain().focus().setImage({
                  src: e.target.result as string,
                  alt: file.name,
                }).run();
              }
            };
            reader.readAsDataURL(file);
          });
        },
      }),
      // Utilisation de notre extension mathématique améliorée
      RealTimeMathExtension.configure({
        onEditMath: handleEditMath,
        katexOptions: {
          throwOnError: false,
          strict: false,
          displayMode: true
        }
      })
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  // Filter formulas based on search term
  const getFilteredFormulas = (category: FormulaCategory) => {
    if (!searchTerm) return category.formulas;
    
    return category.formulas.filter(formula => 
      formula.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formula.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Add a formula to recently used
  const addToRecentFormulas = (formula: MathFormula) => {
    const exists = lastUsedFormulas.some(f => f.latex === formula.latex);
    if (!exists) {
      setLastUsedFormulas(prev => [formula, ...prev].slice(0, 5));
    }
  };

  // Handle opening formula editor modal
  const openFormulaEditor = (formula: MathFormula, defaultMode: 'inline' | 'block' | 'centered' = 'inline') => {
    setCurrentFormula(formula);
    setEditedLatex(formula.latex);
    setFormulaInsertMode(defaultMode);
    setIsEditingFormula(false);
    setShowFormulaModal(true);
  };
  
  // Handle inserting the edited formula
  const insertEditedFormula = () => {
    if (!editor || !editedLatex.trim()) return;
    
    editor.chain().focus();
    
    if (isEditingFormula) {
      // Dans un cas réel, il faudrait mettre à jour la formule existante
      // Pour cette démo, nous insérons simplement une nouvelle formule
      // car il est difficile de localiser la formule originale
      if (formulaInsertMode === 'inline') {
        editor.commands.insertContent(`$${editedLatex}$`);
      } else if (formulaInsertMode === 'centered') {
        editor.commands.setTextAlign('center');
        editor.commands.insertContent(`$$${editedLatex}$$`);
      } else {
        editor.commands.insertContent(`$$${editedLatex}$$`);
      }
    } else {
      // Insertion d'une nouvelle formule
      if (formulaInsertMode === 'inline') {
        editor.commands.insertContent(`$${editedLatex}$`);
      } else if (formulaInsertMode === 'centered') {
        editor.commands.setTextAlign('center');
        editor.commands.insertContent(`$$${editedLatex}$$`);
      } else {
        editor.commands.insertContent(`$$${editedLatex}$$`);
      }
    }
    
    if (currentFormula) {
      addToRecentFormulas({
        ...currentFormula,
        latex: editedLatex
      });
    }
    
    setShowFormulaModal(false);
    setIsEditingFormula(false);
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
      setSearchTerm("");
    } else {
      setActiveCategoryIndex(index);
      setSearchTerm("");
    }
  };

  // Insert math inline example
  const insertMathInline = () => {
    const inlineFormula = { name: "Équation inline", latex: "x^2 + y^2 = r^2" };
    openFormulaEditor(inlineFormula, 'inline');
  };

  // Insert centered math formula
  const insertCenteredMathFormula = () => {
    const blockFormula = { name: "Formule quadratique", latex: "\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" };
    openFormulaEditor(blockFormula, 'centered');
  };

  // Image handling functions
  const openImageModal = () => {
    setImageUrl("");
    setImageCaption("");
    setImagePreview(null);
    setShowImageModal(true);
  };

  const insertImage = () => {
    if (!imageUrl) return;
    
    editor?.chain().focus().setImage({ 
      src: imageUrl,
      alt: imageCaption || 'Image',
      title: imageCaption,
    }).run();
    
    setShowImageModal(false);
  };
  
  // Focus editor handler
  const focusEditor = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('button')) {
      editor?.chain().focus().run();
    }
  };

  // Tooltip handling
  const showButtonTooltip = (text: string, event: React.MouseEvent) => {
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current);
    }
    
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

  // Effect to handle document clicks to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColorPicker || activeCategoryIndex !== null || showSettings) {
        const target = event.target as HTMLElement;
        
        if (showColorPicker && !target.closest('.color-picker-container')) {
          setShowColorPicker(false);
        }
        
        if (activeCategoryIndex !== null && !target.closest('.formula-category-container')) {
          setActiveCategoryIndex(null);
          setSearchTerm("");
        }
        
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

  // Ajouter des styles CSS pour les formules mathématiques
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Masquer le code LaTeX brut */
      .math-source-hidden {
        display: none !important;
      }
      
      /* Styles pour les formules mathématiques */
      .math-inline, .math-display {
        cursor: pointer;
        position: relative;
      }
      
      .math-display {
        display: block;
        width: 100%;
        text-align: center;
        margin: 1rem 0;
      }
      
      /* Indicateur d'édition au survol */
      .math-hover {
        position: relative;
        outline: 2px solid rgba(79, 70, 229, 0.4);
        background-color: rgba(79, 70, 229, 0.05);
        border-radius: 2px;
      }
      
      .math-hover::after {
        content: "✎";
        position: absolute;
        top: -10px;
        right: -10px;
        width: 20px;
        height: 20px;
        background-color: rgba(79, 70, 229, 0.9);
        color: white;
        border-radius: 50%;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }
      
      /* Styles pour les erreurs de rendu */
      .math-error {
        color: #f44336;
        border: 1px dashed #f44336;
        padding: 2px 4px;
        border-radius: 2px;
      }
      
      /* Styles pour les formules éditables */
      .math-editable {
        transition: all 0.2s ease;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className={`w-full border border-gray-200 rounded-lg shadow-lg ${currentTheme.bgColor} transition-colors duration-300`}>
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
            aria-label="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      <EditorSettings
        showSettings={showSettings}
        editorThemes={editorThemes}
        currentTheme={currentTheme}
        setCurrentTheme={setCurrentTheme}
      />

      {/* Toolbar */}
      <div ref={toolbarRef}>
        <EditorToolbar
          editor={editor}
          activeToolbar={activeToolbar}
          setActiveToolbar={setActiveToolbar}
          showColorPicker={showColorPicker}
          setShowColorPicker={setShowColorPicker}
          selectedColor={selectedColor}
          colorOptions={colorOptions}
          applyTextColor={applyTextColor}
          openImageModal={openImageModal}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          showButtonTooltip={showButtonTooltip}
          hideTooltip={hideTooltip}
        />
        
        {/* Math Toolbar */}
        {activeToolbar === 'math' && (
          <div className="px-3 py-2 bg-white border-b border-gray-200">
            <MathToolbar
              insertMathInline={insertMathInline}
              insertCenteredMathFormula={insertCenteredMathFormula}
              lastUsedFormulas={lastUsedFormulas}
              mathFormulaCategories={mathFormulaCategories}
              openFormulaEditor={openFormulaEditor}
              activeCategoryIndex={activeCategoryIndex}
              toggleCategory={toggleCategory}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              getFilteredFormulas={getFilteredFormulas}
            />
          </div>
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
          className="min-h-[400px] focus:outline-none prose max-w-none real-time-math-editor"
        />
      </div>

      {/* Modals */}
      <ImageModal
        showImageModal={showImageModal}
        setShowImageModal={setShowImageModal}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        imageCaption={imageCaption}
        setImageCaption={setImageCaption}
        imagePreview={imagePreview}
        setImagePreview={setImagePreview}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
        insertImage={insertImage}
      />
      
      <FormulaEditorModal
        showFormulaModal={showFormulaModal}
        setShowFormulaModal={setShowFormulaModal}
        currentFormula={currentFormula}
        editedLatex={editedLatex}
        setEditedLatex={setEditedLatex}
        formulaInsertMode={formulaInsertMode}
        setFormulaInsertMode={setFormulaInsertMode}
        insertEditedFormula={insertEditedFormula}
        subFormulas={subFormulas}
      />

      {/* Hints Panel */}
      <EditorHints />

      {/* Custom CSS for LaTeX styling */}
      <style>{`
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