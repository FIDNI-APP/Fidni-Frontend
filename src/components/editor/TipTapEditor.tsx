// ============================================
// FILE: editor/TipTapEditor.tsx
// Main editor component with all toolbars consolidated
// ============================================

import React, { useState, useRef, useEffect } from 'react';
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
  Bold, Italic, Palette, ImageIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Undo, Redo, Heading1, Heading2, Quote, Link as LinkIcon,
  X, Upload, Camera, Check, ChevronDown, Search, FunctionSquare
} from 'lucide-react';

import { RealTimeMathExtension } from './MathExtension';
import TipTapRenderer from './TipTapRenderer';
import { FormulaCategory, colorOptions, mathFormulaCategories, mathSymbols, PAGE_CONFIG } from './editorConfig';

// ============================================
// Sub-components
// ============================================

// Toolbar Button
const ToolbarButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}> = ({ icon, label, onClick, isActive }) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={`p-1.5 rounded-lg transition-colors ${
      isActive ? 'bg-brand-soft text-brand-hover' : 'hover:bg-[#f2f1ee] text-ink-soft'
    }`}
    title={label}
  >
    {icon}
  </button>
);

// Text Toolbar
const TextToolbar: React.FC<{
  editor: Editor;
  onImageClick: () => void;
  onColorClick: () => void;
  showColorPicker: boolean;
  selectedColor: string;
  onColorSelect: (color: string) => void;
}> = ({ editor, onImageClick, onColorClick, showColorPicker, selectedColor, onColorSelect }) => (
  <div className="flex items-center gap-1 flex-wrap">
    <ToolbarButton icon={<Bold className="w-4 h-4" />} label="Gras" onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} />
    <ToolbarButton icon={<Italic className="w-4 h-4" />} label="Italique" onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} />
    
    <div className="h-5 border-l border-[#d8d4cc] mx-1" />
    
    <ToolbarButton icon={<Heading1 className="w-4 h-4" />} label="Titre 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} />
    <ToolbarButton icon={<Heading2 className="w-4 h-4" />} label="Titre 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} />
    <ToolbarButton icon={<Quote className="w-4 h-4" />} label="Citation" onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} />
    
    <div className="h-5 border-l border-[#d8d4cc] mx-1" />
    
    <ToolbarButton icon={<List className="w-4 h-4" />} label="Liste" onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} />
    <ToolbarButton icon={<ListOrdered className="w-4 h-4" />} label="Liste numérotée" onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} />
    
    <div className="h-5 border-l border-[#d8d4cc] mx-1" />
    
    <ToolbarButton icon={<AlignLeft className="w-4 h-4" />} label="Gauche" onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} />
    <ToolbarButton icon={<AlignCenter className="w-4 h-4" />} label="Centre" onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} />
    <ToolbarButton icon={<AlignRight className="w-4 h-4" />} label="Droite" onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} />
    
    <div className="h-5 border-l border-[#d8d4cc] mx-1" />
    
    <ToolbarButton icon={<ImageIcon className="w-4 h-4" />} label="Image" onClick={onImageClick} />
    <ToolbarButton icon={<LinkIcon className="w-4 h-4" />} label="Lien" onClick={() => {
      const url = window.prompt('URL:');
      if (url) editor.chain().focus().setLink({ href: url }).run();
    }} isActive={editor.isActive('link')} />
    
    {/* Color picker */}
    <div className="relative">
      <ToolbarButton icon={<Palette className="w-4 h-4" style={{ color: selectedColor }} />} label="Couleur" onClick={onColorClick} isActive={showColorPicker} />
      {showColorPicker && (
        <div className="absolute z-30 mt-1 p-2 bg-white rounded-lg shadow-xl border border-line grid grid-cols-4 gap-1">
          {colorOptions.map((color) => (
            <button
              key={color}
              className="w-6 h-6 rounded-full border border-line hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => onColorSelect(color)}
            />
          ))}
        </div>
      )}
    </div>
    
    <div className="h-5 border-l border-[#d8d4cc] mx-1" />
    
    <ToolbarButton icon={<Undo className="w-4 h-4" />} label="Annuler" onClick={() => editor.chain().focus().undo().run()} />
    <ToolbarButton icon={<Redo className="w-4 h-4" />} label="Rétablir" onClick={() => editor.chain().focus().redo().run()} />
  </div>
);

// Math Toolbar
const MathToolbar: React.FC<{
  onInsertInline: (latex?: string) => void;
  onOpenCategory: (index: number) => void;
  categories: FormulaCategory[];
}> = ({ onInsertInline, onOpenCategory, categories }) => {
  const [quickLatex, setQuickLatex] = useState('');

  return (
    <div className="space-y-3">
      {/* Quick insert */}
      <div className="flex items-center gap-2 p-3 bg-brand-soft rounded-lg">
        <FunctionSquare className="w-4 h-4 text-brand" />
        <span className="text-sm font-medium text-ink-soft">Rapide:</span>
        <div className="flex items-center bg-white px-3 py-1.5 rounded-lg border border-line flex-1 max-w-sm">
          <span className="text-ink-faint font-mono">$</span>
          <input
            type="text"
            value={quickLatex}
            onChange={(e) => setQuickLatex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && quickLatex.trim()) {
                onInsertInline(quickLatex);
                setQuickLatex('');
              }
            }}
            placeholder="x^2, \frac{a}{b}..."
            className="flex-1 outline-none text-sm font-mono mx-2"
          />
          <span className="text-ink-faint font-mono">$</span>
        </div>
        <button
          onClick={() => {
            if (quickLatex.trim()) {
              onInsertInline(quickLatex);
              setQuickLatex('');
            }
          }}
          disabled={!quickLatex.trim()}
          className="px-3 py-1.5 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-hover transition-colors"
        >
          Insérer
        </button>
      </div>

      {/* Common symbols */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-ink-faint font-medium mr-2">Symboles:</span>
        {mathSymbols.slice(0, 12).map(({ latex, label, display }) => (
          <button
            key={latex}
            onClick={() => onInsertInline(latex)}
            className="px-2 py-1 bg-white border border-line rounded text-sm font-semibold text-brand hover:bg-brand-soft hover:border-brand-line transition-colors"
            title={`${label}: ${latex}`}
          >
            {display}
          </button>
        ))}
      </div>

      {/* Category buttons */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat, idx) => (
          <button
            key={cat.name}
            onClick={() => onOpenCategory(idx)}
            className="px-3 py-1.5 bg-white border border-line rounded-lg text-sm font-medium text-ink-soft hover:bg-[#faf9f7] hover:border-[#d8d4cc] flex items-center gap-1.5 transition-colors"
          >
            <FunctionSquare className="w-3.5 h-3.5" />
            {cat.name}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
};

// Image Modal
const ImageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, caption: string) => void;
}> = ({ isOpen, onClose, onInsert }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Real upload to S3 — the stable download_url is what gets embedded
    try {
      setUploading(true);
      setUploadError(null);
      setImageUrl('');
      const { fileAPI } = await import('@/lib/api');
      const res = await fileAPI.upload(file, 'content');
      setImageUrl(res.download_url || res.url);
    } catch (err) {
      console.error('Image upload failed:', err);
      setUploadError("Échec de l'envoi de l'image. Réessaie.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleInsert = () => {
    if (imageUrl) {
      onInsert(imageUrl, caption);
      setImageUrl('');
      setCaption('');
      setPreview(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center px-5 py-4 border-b border-line">
          <h3 className="text-lg font-semibold text-ink">Insérer une image</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#f2f1ee] rounded-lg transition-colors">
            <X className="w-5 h-5 text-ink-faint" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {preview && (
            <div className="border border-line rounded-xl p-3 bg-[#faf9f7]">
              <img src={preview} alt="Aperçu" className="max-w-full max-h-48 mx-auto rounded-lg" />
            </div>
          )}
          {uploading && (
            <p className="text-sm text-center" style={{ color: '#6b6862' }}>Envoi de l'image…</p>
          )}
          {uploadError && (
            <p className="text-sm text-center" style={{ color: '#b91c1c' }}>{uploadError}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">Légende</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3 py-2 border border-[#d8d4cc] rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
              placeholder="Description (optionnel)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#d8d4cc] rounded-xl text-sm font-medium text-ink-soft hover:bg-[#faf9f7] transition-colors"
            >
              <Upload className="w-4 h-4" />
              Télécharger
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#d8d4cc] rounded-xl text-sm font-medium text-ink-soft hover:bg-[#faf9f7] transition-colors"
            >
              <Camera className="w-4 h-4" />
              Photo
            </button>
          </div>
        </div>

        <div className="px-5 py-4 bg-[#faf9f7] rounded-b-2xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ink-soft hover:bg-[#f2f1ee] rounded-lg transition-colors">
            Annuler
          </button>
          <button
            onClick={handleInsert}
            disabled={!imageUrl || uploading}
            className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {uploading ? 'Envoi…' : 'Insérer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Formula Editor Modal
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-line bg-gradient-to-r from-brand to-brand rounded-t-2xl">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FunctionSquare className="w-5 h-5" />
            Éditeur de formule
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Editor and Preview */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Code LaTeX</label>
              <textarea
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                className="w-full px-3 py-2 border border-[#d8d4cc] rounded-lg font-mono text-sm h-32 resize-none focus:ring-2 focus:ring-brand"
                placeholder="Entrez votre code LaTeX..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Aperçu</label>
              <div className="border border-[#d8d4cc] rounded-lg h-32 p-4 bg-[#faf9f7] flex items-center justify-center overflow-auto">
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
              onClick={() => setIsDisplay(false)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                !isDisplay ? 'bg-brand-soft text-brand-hover border border-brand-line' : 'bg-white border border-[#d8d4cc] text-ink-soft hover:bg-[#faf9f7]'
              }`}
            >
              <span className="font-mono mr-2">$x$</span>
              En ligne
            </button>
            <button
              onClick={() => setIsDisplay(true)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                isDisplay ? 'bg-brand-soft text-brand-hover border border-brand-line' : 'bg-white border border-[#d8d4cc] text-ink-soft hover:bg-[#faf9f7]'
              }`}
            >
              <AlignCenter className="w-4 h-4 mr-2" />
              Centré
            </button>
          </div>

          {/* Quick formulas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-ink-soft">Formules prédéfinies</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-9 pr-3 py-1.5 border border-[#d8d4cc] rounded-lg text-sm w-48"
                />
              </div>
            </div>

            <div className="border border-line rounded-lg overflow-hidden">
              {mathFormulaCategories.map((category) => (
                <div key={category.name} className="border-b border-line last:border-b-0">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[#faf9f7] hover:bg-[#f2f1ee] transition-colors text-left"
                  >
                    <span className="font-medium text-ink-soft">{category.name}</span>
                    <ChevronDown className={`w-4 h-4 text-ink-faint transition-transform ${expandedCategory === category.name ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {expandedCategory === category.name && (
                    <div className="p-3 grid grid-cols-3 gap-2 bg-white">
                      {category.formulas
                        .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((formula) => (
                          <button
                            key={formula.name}
                            onClick={() => insertSubFormula(formula.latex)}
                            className="p-2 border border-line rounded-lg hover:border-brand-line hover:bg-brand-soft transition-colors text-left"
                          >
                            <div className="text-xs text-ink-faint mb-1 truncate">{formula.name}</div>
                            <div className="h-8 flex items-center justify-center overflow-hidden">
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
        <div className="px-5 py-4 bg-[#faf9f7] rounded-b-2xl flex justify-end gap-3 border-t border-line">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ink-soft hover:bg-[#f2f1ee] rounded-lg transition-colors">
            Annuler
          </button>
          <button
            onClick={() => {
              if (latex.trim()) {
                onInsert(latex, isDisplay);
                onClose();
              }
            }}
            disabled={!latex.trim()}
            className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Insérer
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Editor Component
// ============================================

interface TipTapEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content = '',
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'math'>('text');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [editingFormula, setEditingFormula] = useState<{ latex: string; isDisplay: boolean } | null>(null);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);

  // Formula edit handler
  const handleEditMath = (latex: string, isDisplay: boolean, _nodePos: number) => {
    setEditingFormula({ latex, isDisplay });
    setShowFormulaModal(true);
  };

  // Formula delete handler
  const handleDeleteMath = (nodePos: number, latex: string, isDisplay: boolean) => {
    editor?.commands.deleteFormulaAtPosition(nodePos, latex, isDisplay);
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
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-brand hover:text-brand-hover underline' },
      }),
      ImageResize.configure({
        allowBase64: true,
        inline: false,
        HTMLAttributes: { class: 'content-image rounded-lg max-w-full' },
      }),
      FileHandler.configure({
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        onDrop: (editor, files, pos) => {
          files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                editor.chain().focus().insertContentAt(pos, {
                  type: 'imageResize', // nœud de tiptap-extension-resize-image (pas « image » : erreur « Unknown node type »)
                  attrs: { src: e.target.result, alt: file.name },
                }).run();
              }
            };
            reader.readAsDataURL(file);
          });
        },
        onPaste: (editor, files) => {
          files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                editor.chain().focus().insertContent({
                  type: 'imageResize', // nœud de tiptap-extension-resize-image (pas « image » : erreur « Unknown node type »)
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
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '<p></p>');
    }
  }, [content, editor]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (_e: MouseEvent) => {
      if (showColorPicker) setShowColorPicker(false);
      if (activeCategoryIndex !== null) setActiveCategoryIndex(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showColorPicker, activeCategoryIndex]);

  if (!editor) return null;

  const insertMath = (latex?: string) => {
    if (latex) {
      editor.chain().focus().insertContent(`$${latex}$`).run();
    } else {
      setShowFormulaModal(true);
    }
  };

  const insertFormulaFromModal = (latex: string, isDisplay: boolean) => {
    if (editingFormula) {
      // Replace existing formula
      editor.commands.replaceFormula(
        editingFormula.latex,
        latex,
        editingFormula.isDisplay,
        isDisplay
      );
      setEditingFormula(null);
    } else {
      // Insert new formula
      const formula = isDisplay ? `$$${latex}$$` : `$${latex}$`;
      editor.chain().focus().insertContent(formula).run();
    }
  };

  return (
    <div className="w-full border border-line rounded-xl shadow-lg bg-white overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-line bg-[#faf9f7] px-3 pt-2">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'text'
              ? 'bg-white border-t border-l border-r border-line border-b-white -mb-px text-brand-hover'
              : 'text-ink-soft hover:bg-[#f2f1ee]'
          }`}
          onClick={() => setActiveTab('text')}
        >
          Texte
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'math'
              ? 'bg-white border-t border-l border-r border-line border-b-white -mb-px text-brand-hover'
              : 'text-ink-soft hover:bg-[#f2f1ee]'
          }`}
          onClick={() => setActiveTab('math')}
        >
          Mathématiques
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-3 py-2 bg-white border-b border-line">
        {activeTab === 'text' ? (
          <TextToolbar
            editor={editor}
            onImageClick={() => setShowImageModal(true)}
            onColorClick={() => setShowColorPicker(!showColorPicker)}
            showColorPicker={showColorPicker}
            selectedColor={selectedColor}
            onColorSelect={(color) => {
              setSelectedColor(color);
              editor.chain().focus().setColor(color).run();
              setShowColorPicker(false);
            }}
          />
        ) : (
          <MathToolbar
            onInsertInline={insertMath}
            onOpenCategory={(idx) => setActiveCategoryIndex(idx)}
            categories={mathFormulaCategories}
          />
        )}
      </div>

      {/* Editor */}
      <div
        className="tiptap-editor overflow-y-auto bg-[#faf9f7]"
        style={{ maxHeight: '500px', padding: '20px' }}
        onClick={() => editor.chain().focus().run()}
      >
        <div
          className="bg-white mx-auto shadow-md"
          style={{
            width: `${PAGE_CONFIG.width}px`,
            minHeight: `${PAGE_CONFIG.height}px`,
            padding: `${PAGE_CONFIG.marginTop}px ${PAGE_CONFIG.marginRight}px ${PAGE_CONFIG.marginBottom}px ${PAGE_CONFIG.marginLeft}px`,
          }}
        >
          <EditorContent
            editor={editor}
            className="prose max-w-none focus:outline-none"
          />
        </div>
      </div>

      {/* Modals */}
      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={(url, caption) => {
          editor.chain().focus().insertContent({
            type: 'imageResize', // nœud de tiptap-extension-resize-image (pas « image » : erreur « Unknown node type »)
            attrs: { src: url, alt: caption },
          }).run();
        }}
      />

      <FormulaModal
        isOpen={showFormulaModal}
        onClose={() => {
          setShowFormulaModal(false);
          setEditingFormula(null);
        }}
        onInsert={insertFormulaFromModal}
        initialLatex={editingFormula?.latex || ''}
        initialIsDisplay={editingFormula?.isDisplay || false}
      />

      {/* Category modal */}
      {activeCategoryIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-line flex justify-between items-center">
              <h3 className="text-lg font-semibold text-ink">
                {mathFormulaCategories[activeCategoryIndex].name}
              </h3>
              <button
                onClick={() => setActiveCategoryIndex(null)}
                className="p-1 hover:bg-[#f2f1ee] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-ink-faint" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {mathFormulaCategories[activeCategoryIndex].formulas.map((formula) => (
                  <button
                    key={formula.name}
                    onClick={() => {
                      setEditingFormula({ latex: formula.latex, isDisplay: false });
                      setShowFormulaModal(true);
                      setActiveCategoryIndex(null);
                    }}
                    className="p-3 border border-line rounded-xl hover:border-brand-line hover:bg-brand-soft transition-colors text-left group"
                  >
                    <div className="text-sm font-medium text-ink-soft mb-2">{formula.name}</div>
                    <div className="h-12 flex items-center justify-center bg-[#faf9f7] rounded-lg overflow-hidden">
                      <TipTapRenderer content={`<p>$${formula.latex}$</p>`} />
                    </div>
                    {formula.description && (
                      <div className="text-xs text-ink-faint mt-2 line-clamp-2">{formula.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 200px;
        }
        .ProseMirror p {
          margin-bottom: 0.75rem;
        }
        .content-image {
          display: block;
          margin: 1rem auto;
          max-width: 100%;
        }
        .math-source-hidden {
          font-size: 0 !important;
          opacity: 0 !important;
          position: absolute !important;
          pointer-events: none !important;
        }
        .math-inline {
          display: inline-block;
          vertical-align: middle;
          margin: 0 2px;
        }
        .math-display {
          display: block;
          margin: 1em 0;
          text-align: center;
        }
        .math-hover {
          outline: 2px solid rgba(79, 70, 229, 0.4);
          background-color: rgba(79, 70, 229, 0.05);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default TipTapEditor;