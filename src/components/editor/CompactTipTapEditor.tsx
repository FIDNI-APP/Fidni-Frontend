/**
 * CompactTipTapEditor - Compact editor that grows with content
 *
 * Unlike the A4 format TipTapEditor, this one is minimal and expands as you type.
 * Includes full math support with formula categories.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import { Heading } from '@tiptap/extension-heading';
import { Link } from '@tiptap/extension-link';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { ListItem } from '@tiptap/extension-list-item';
import ImageResize from 'tiptap-extension-resize-image';
import { FileHandler } from '@tiptap/extension-file-handler';
import {
  Bold, Italic, Palette, ImageIcon, AlignLeft, AlignCenter,
  List, ListOrdered, Undo, Redo, Heading1, Heading2,
  X, Upload, ChevronDown, FunctionSquare, Search, Check, MessageSquare
} from 'lucide-react';

import { RealTimeMathExtension } from './MathExtension';
import TipTapRenderer from './TipTapRenderer';
import { mathFormulaCategories, mathSymbols, colorOptions, FormulaCategory } from './editorConfig';
import { CalloutExtension } from './extensions/CalloutExtension';
import { CALLOUT_CONFIGS, CalloutType } from '@/types/callout';

// ============================================
// Toolbar Button
// ============================================
const ToolbarButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}> = ({ icon, label, onClick, isActive, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
      isActive ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'
    }`}
    title={label}
  >
    {icon}
  </button>
);

// ============================================
// Formula Category Dropdown (using Portal)
// ============================================
const FormulaCategoryDropdown: React.FC<{
  category: FormulaCategory;
  onInsert: (latex: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
}> = ({ category, onInsert, onClose, anchorRef }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [anchorRef]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.formula-dropdown-portal') && !target.closest('.formula-dropdown-trigger')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return createPortal(
    <div
      className="formula-dropdown-portal fixed z-[9999] bg-white rounded-lg shadow-2xl border border-slate-200 w-80 max-h-80"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-t-lg">
        <span className="text-sm font-medium text-slate-700">{category.name}</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-slate-200 rounded"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>
      <div className="p-2 overflow-y-auto max-h-64 grid grid-cols-1 gap-1">
        {category.formulas.map((formula, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onInsert(formula.latex);
              onClose();
            }}
            className="p-2 text-left rounded hover:bg-indigo-50 transition-colors flex items-center gap-3"
          >
            <div className="w-24 h-8 flex items-center justify-center bg-slate-50 rounded overflow-hidden flex-shrink-0">
              <TipTapRenderer content={`<p>$${formula.latex}$</p>`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-700 truncate">{formula.name}</div>
              {formula.description && (
                <div className="text-xs text-slate-500 truncate">{formula.description}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

// ============================================
// Category Button with ref
// ============================================
const CategoryButton: React.FC<{
  category: FormulaCategory;
  isOpen: boolean;
  onToggle: () => void;
  onInsert: (latex: string) => void;
  onClose: () => void;
}> = ({ category, isOpen, onToggle, onInsert, onClose }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className={`formula-dropdown-trigger px-2 py-1 border rounded text-xs font-medium flex items-center gap-1 transition-colors ${
          isOpen
            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        {category.name}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <FormulaCategoryDropdown
          category={category}
          onInsert={onInsert}
          onClose={onClose}
          anchorRef={buttonRef}
        />
      )}
    </>
  );
};

// ============================================
// Math Panel
// ============================================
const MathPanel: React.FC<{
  editor: Editor;
  onInsertFormula: (latex: string) => void;
  onOpenFormulaModal?: (latex?: string) => void;
}> = ({ editor, onInsertFormula, onOpenFormulaModal }) => {
  const [quickLatex, setQuickLatex] = useState('');
  const [openCategory, setOpenCategory] = useState<number | null>(null);

  const handleCategoryInsert = (latex: string) => {
    // When clicking on a category formula, open the modal with it pre-filled
    if (onOpenFormulaModal) {
      onOpenFormulaModal(latex);
    } else {
      onInsertFormula(latex);
    }
  };

  return (
    <div className="space-y-2 p-2 border-b border-slate-200 bg-slate-50">
      {/* Quick insert */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">LaTeX:</span>
        <div className="flex items-center bg-white px-2 py-1 rounded border border-slate-200 flex-1">
          <span className="text-slate-400 font-mono text-sm">$</span>
          <input
            type="text"
            value={quickLatex}
            onChange={(e) => setQuickLatex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && quickLatex.trim()) {
                onInsertFormula(quickLatex);
                setQuickLatex('');
              }
            }}
            placeholder="x^2, \frac{a}{b}..."
            className="flex-1 outline-none text-sm font-mono mx-1 min-w-0"
          />
          <span className="text-slate-400 font-mono text-sm">$</span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (quickLatex.trim()) {
              onInsertFormula(quickLatex);
              setQuickLatex('');
            }
          }}
          disabled={!quickLatex.trim()}
          className="px-2 py-1 bg-indigo-600 text-white rounded text-xs font-medium disabled:opacity-50 hover:bg-indigo-700"
        >
          OK
        </button>
        {onOpenFormulaModal && (
          <button
            type="button"
            onClick={() => onOpenFormulaModal()}
            className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 flex items-center gap-1"
            title="Éditeur avancé"
          >
            <FunctionSquare className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Symbols */}
      <div className="flex flex-wrap gap-1">
        {mathSymbols.map(({ latex, label, display }) => (
          <button
            key={latex}
            type="button"
            onClick={() => onInsertFormula(latex)}
            className="px-2 py-1 bg-white border border-slate-200 rounded text-sm hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
            title={label}
          >
            {display}
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1">
        {mathFormulaCategories.map((cat, idx) => (
          <CategoryButton
            key={cat.name}
            category={cat}
            isOpen={openCategory === idx}
            onToggle={() => setOpenCategory(openCategory === idx ? null : idx)}
            onInsert={handleCategoryInsert}
            onClose={() => setOpenCategory(null)}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================
// Image Modal
// ============================================
const ImageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
}> = ({ isOpen, onClose, onInsert }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h3 className="font-semibold">Insérer une image</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex flex-col items-center gap-2"
          >
            <Upload className="w-8 h-8 text-slate-400" />
            <span className="text-sm text-slate-600">Cliquez pour choisir une image</span>
          </button>
          {preview && (
            <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded" />
          )}
        </div>
        <div className="px-4 py-3 bg-slate-50 rounded-b-xl flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              if (preview) {
                onInsert(preview);
                onClose();
                setPreview(null);
              }
            }}
            disabled={!preview}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded disabled:opacity-50 hover:bg-indigo-700"
          >
            Insérer
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Formula Modal (for editing formulas)
// ============================================
const FormulaModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string, isDisplay: boolean) => void;
  initialLatex?: string;
  initialIsDisplay?: boolean;
}> = ({ isOpen, onClose, onInsert, initialLatex = '', initialIsDisplay = false }) => {
  const [latex, setLatex] = useState(initialLatex);
  const [isDisplay, setIsDisplay] = useState(initialIsDisplay);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    setLatex(initialLatex);
    setIsDisplay(initialIsDisplay);
  }, [initialLatex, initialIsDisplay, isOpen]);

  const insertSubFormula = (subLatex: string) => {
    setLatex(prev => prev + subLatex);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-xl">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <FunctionSquare className="w-4 h-4" />
            Éditeur de formule
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Editor and Preview */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Code LaTeX</label>
              <textarea
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Entrez votre code LaTeX..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Aperçu</label>
              <div className="border border-slate-300 rounded-lg h-24 p-3 bg-slate-50 flex items-center justify-center overflow-auto">
                {latex && (
                  <TipTapRenderer
                    content={isDisplay ? `<p style="text-align:center">$$${latex}$$</p>` : `<p>$${latex}$</p>`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Insert mode */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsDisplay(false)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                !isDisplay ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="font-mono mr-1">$x$</span> En ligne
            </button>
            <button
              type="button"
              onClick={() => setIsDisplay(true)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center ${
                isDisplay ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <AlignCenter className="w-3 h-3 mr-1" /> Centré
            </button>
          </div>

          {/* Quick formulas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-700">Formules prédéfinies</label>
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-7 pr-2 py-1 border border-slate-300 rounded text-xs w-36"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {mathFormulaCategories.map((category) => (
                <div key={category.name} className="border-b border-slate-200 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <span className="text-xs font-medium text-slate-700">{category.name}</span>
                    <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${expandedCategory === category.name ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedCategory === category.name && (
                    <div className="p-2 grid grid-cols-3 gap-1.5 bg-white">
                      {category.formulas
                        .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((formula) => (
                          <button
                            type="button"
                            key={formula.name}
                            onClick={() => insertSubFormula(formula.latex)}
                            className="p-1.5 border border-slate-200 rounded hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left"
                          >
                            <div className="text-[10px] text-slate-500 truncate">{formula.name}</div>
                            <div className="h-6 flex items-center justify-center overflow-hidden">
                              <TipTapRenderer content={`<p>$${formula.latex}$</p>`} />
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 rounded-b-xl flex justify-end gap-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              if (latex.trim()) {
                onInsert(latex, isDisplay);
                onClose();
              }
            }}
            disabled={!latex.trim()}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            Insérer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================
// Main Component
// ============================================
interface CompactTipTapEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const CompactTipTapEditor: React.FC<CompactTipTapEditorProps> = ({
  content = '',
  onChange,
  placeholder = 'Écrivez ici...',
  minHeight = '100px',
}) => {
  const [showMathPanel, setShowMathPanel] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);
  const [editingFormula, setEditingFormula] = useState<{
    latex: string;
    isDisplay: boolean;
    nodePos?: number;
  } | null>(null);

  // Handlers for math formula editing
  const handleEditMath = (latex: string, isDisplay: boolean, nodePos: number) => {
    setEditingFormula({ latex, isDisplay, nodePos });
    setShowFormulaModal(true);
  };

  const handleDeleteMath = (nodePos: number, latex: string, isDisplay: boolean) => {
    if (editor) {
      editor.commands.deleteFormulaAtPosition(nodePos, latex, isDisplay);
    }
  };

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
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Heading.configure({ levels: [1, 2] }),
      BulletList.configure({ HTMLAttributes: { class: 'list-disc pl-5' } }),
      OrderedList.configure({ HTMLAttributes: { class: 'list-decimal pl-5' } }),
      ListItem,
      Link.configure({ openOnClick: false }),
      ImageResize.configure({
        allowBase64: true,
        inline: false,
        HTMLAttributes: { class: 'content-image rounded max-w-full' },
      }),
      FileHandler.configure({
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        onDrop: (currentEditor, files, pos) => {
          files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                currentEditor.chain().focus().insertContentAt(pos, {
                  type: 'image',
                  attrs: { src: e.target.result, alt: file.name },
                }).run();
              }
            };
            reader.readAsDataURL(file);
          });
        },
        onPaste: (currentEditor, files) => {
          files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                currentEditor.chain().focus().insertContent({
                  type: 'image',
                  attrs: { src: e.target.result, alt: file.name },
                }).run();
              }
            };
            reader.readAsDataURL(file);
          });
        },
      }),
      RealTimeMathExtension.configure({
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
        onEditMath: handleEditMath,
        onDeleteMath: handleDeleteMath,
      }),
      CalloutExtension,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2',
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
  });

  // Update editor content when prop changes (e.g., from JSON import)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      // Only update if content actually changed (avoid loops)
      if (content !== currentContent && content !== '<p></p>' || (content && currentContent === '<p></p>')) {
        editor.commands.setContent(content || '');
      }
    }
  }, [editor, content]);

  // Close callout menu on click outside
  useEffect(() => {
    if (!showCalloutMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.callout-menu-container')) {
        setShowCalloutMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalloutMenu]);

  if (!editor) return null;

  const insertFormula = (latex: string) => {
    editor.chain().focus().insertContent(`$${latex}$`).run();
  };

  const handleFormulaModalInsert = (latex: string, isDisplay: boolean) => {
    if (editingFormula?.nodePos !== undefined) {
      // Editing existing formula
      editor.commands.replaceFormula(
        editingFormula.latex,
        latex,
        editingFormula.isDisplay,
        isDisplay
      );
    } else {
      // Inserting new formula
      const formulaText = isDisplay ? `$$${latex}$$` : `$${latex}$`;
      editor.chain().focus().insertContent(formulaText).run();
    }
    setEditingFormula(null);
  };

  const openFormulaModal = (latex?: string) => {
    setEditingFormula(latex ? { latex, isDisplay: false } : null);
    setShowFormulaModal(true);
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-visible shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-1.5 border-b border-slate-200 bg-slate-50 flex-wrap">
        <ToolbarButton
          icon={<Bold className="w-4 h-4" />}
          label="Gras"
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        />
        <ToolbarButton
          icon={<Italic className="w-4 h-4" />}
          label="Italique"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        />

        <div className="h-5 border-l border-slate-300 mx-1" />

        <ToolbarButton
          icon={<Heading1 className="w-4 h-4" />}
          label="Titre 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
        />
        <ToolbarButton
          icon={<Heading2 className="w-4 h-4" />}
          label="Titre 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
        />

        <div className="h-5 border-l border-slate-300 mx-1" />

        <ToolbarButton
          icon={<List className="w-4 h-4" />}
          label="Liste"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        />
        <ToolbarButton
          icon={<ListOrdered className="w-4 h-4" />}
          label="Liste numérotée"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        />

        <div className="h-5 border-l border-slate-300 mx-1" />

        <ToolbarButton
          icon={<AlignLeft className="w-4 h-4" />}
          label="Aligner à gauche"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
        />
        <ToolbarButton
          icon={<AlignCenter className="w-4 h-4" />}
          label="Centrer"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
        />

        <div className="h-5 border-l border-slate-300 mx-1" />

        {/* Color picker */}
        <div className="relative">
          <ToolbarButton
            icon={<Palette className="w-4 h-4" />}
            label="Couleur"
            onClick={() => setShowColorPicker(!showColorPicker)}
            isActive={showColorPicker}
          />
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 p-2 bg-white rounded-lg shadow-xl border border-slate-200 grid grid-cols-4 gap-1">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColorPicker(false);
                  }}
                  className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        <ToolbarButton
          icon={<ImageIcon className="w-4 h-4" />}
          label="Image"
          onClick={() => setShowImageModal(true)}
        />

        <div className="h-5 border-l border-slate-300 mx-1" />

        {/* Math toggle */}
        <button
          type="button"
          onClick={() => setShowMathPanel(!showMathPanel)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            showMathPanel
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FunctionSquare className="w-3.5 h-3.5" />
          Maths
          <ChevronDown className={`w-3 h-3 transition-transform ${showMathPanel ? 'rotate-180' : ''}`} />
        </button>

        {/* Callout toggle */}
        <div className="relative callout-menu-container">
          <button
            type="button"
            onClick={() => setShowCalloutMenu(!showCalloutMenu)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              showCalloutMenu
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Encarts
            <ChevronDown className={`w-3 h-3 transition-transform ${showCalloutMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Callout Dropdown */}
          {showCalloutMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-xl border border-slate-200 w-64 max-h-96 overflow-y-auto">
              <div className="p-2 grid grid-cols-2 gap-2">
                {(Object.keys(CALLOUT_CONFIGS) as CalloutType[]).map((type) => {
                  const config = CALLOUT_CONFIGS[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setCallout({ type }).run();
                        setShowCalloutMenu(false);
                      }}
                      className={`flex items-start gap-2 p-2 border rounded hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left ${config.borderColor}`}
                    >
                      <span className="text-lg flex-shrink-0">{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-semibold ${config.textColor} truncate`}>
                          {config.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <ToolbarButton
          icon={<Undo className="w-4 h-4" />}
          label="Annuler"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          icon={<Redo className="w-4 h-4" />}
          label="Rétablir"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />
      </div>

      {/* Math Panel */}
      {showMathPanel && (
        <MathPanel
          editor={editor}
          onInsertFormula={insertFormula}
          onOpenFormulaModal={openFormulaModal}
        />
      )}

      {/* Editor Content */}
      <EditorContent editor={editor} className="compact-editor" />

      {/* Modals */}
      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={(url) => {
          editor.chain().focus().setImage({ src: url }).run();
        }}
      />
      <FormulaModal
        isOpen={showFormulaModal}
        onClose={() => {
          setShowFormulaModal(false);
          setEditingFormula(null);
        }}
        onInsert={handleFormulaModalInsert}
        initialLatex={editingFormula?.latex || ''}
        initialIsDisplay={editingFormula?.isDisplay || false}
      />

      {/* Styles */}
      <style>{`
        .compact-editor .ProseMirror {
          min-height: ${minHeight};
          outline: none;
        }
        .compact-editor .ProseMirror p {
          margin-bottom: 0.5rem;
        }
        .compact-editor .ProseMirror p:last-child {
          margin-bottom: 0;
        }
        .compact-editor .ProseMirror:focus {
          outline: none;
        }
        .compact-editor .math-source-hidden {
          font-size: 0 !important;
          line-height: 0 !important;
          width: 0 !important;
          height: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          overflow: hidden !important;
        }
        .compact-editor .math-inline {
          display: inline-block;
          vertical-align: middle;
          margin: 0 4px;
          position: relative;
        }
        .compact-editor .math-inline::before,
        .compact-editor .math-inline::after {
          content: '';
          display: inline-block;
          width: 1px;
          height: 1em;
          vertical-align: middle;
        }
        .compact-editor .math-display {
          display: block;
          margin: 0.5em 0;
          text-align: center;
          position: relative;
        }
        .compact-editor .content-image {
          display: block;
          margin: 0.5rem auto;
          max-width: 100%;
        }
        .compact-editor .math-inline,
        .compact-editor .math-display {
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.15s, box-shadow 0.15s;
        }
        .compact-editor .math-inline:hover,
        .compact-editor .math-display:hover,
        .compact-editor .math-hover {
          background-color: rgba(99, 102, 241, 0.1);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
        }

        /* Callout styles */
        .compact-editor [data-callout-type] {
          border-radius: 0.5rem;
          padding: 0.75rem;
          margin: 0.75rem 0;
          border-left-width: 4px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .compact-editor [data-callout-type="theorem"] {
          background-color: #eff6ff;
          border-left-color: #3b82f6;
          color: #1e3a8a;
        }

        .compact-editor [data-callout-type="property"] {
          background-color: #eef2ff;
          border-left-color: #6366f1;
          color: #312e81;
        }

        .compact-editor [data-callout-type="definition"] {
          background-color: #f5f3ff;
          border-left-color: #8b5cf6;
          color: #4c1d95;
        }

        .compact-editor [data-callout-type="lemma"] {
          background-color: #ecfeff;
          border-left-color: #06b6d4;
          color: #164e63;
        }

        .compact-editor [data-callout-type="corollary"] {
          background-color: #f0fdfa;
          border-left-color: #14b8a6;
          color: #134e4a;
        }

        .compact-editor [data-callout-type="example"] {
          background-color: #fffbeb;
          border-left-color: #f59e0b;
          color: #78350f;
        }

        .compact-editor [data-callout-type="remark"] {
          background-color: #f8fafc;
          border-left-color: #94a3b8;
          color: #1e293b;
        }

        .compact-editor [data-callout-type="proof"] {
          background-color: #ecfdf5;
          border-left-color: #10b981;
          color: #064e3b;
        }

        .compact-editor [data-callout-type="method"] {
          background-color: #faf5ff;
          border-left-color: #a855f7;
          color: #581c87;
        }

        .compact-editor [data-callout-type="warning"] {
          background-color: #fef2f2;
          border-left-color: #ef4444;
          color: #7f1d1d;
        }
      `}</style>
    </div>
  );
};

export default CompactTipTapEditor;
