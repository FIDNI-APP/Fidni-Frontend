import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Palette,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Quote,
  Link,
  Settings
} from "lucide-react";

interface EditorToolbarProps {
  editor: Editor | null;
  activeToolbar: string;
  setActiveToolbar: (toolbar: string) => void;
  showColorPicker: boolean;
  setShowColorPicker: (show: boolean) => void;
  selectedColor: string;
  colorOptions: string[];
  applyTextColor: (color: string) => void;
  openImageModal: () => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showButtonTooltip: (text: string, event: React.MouseEvent) => void;
  hideTooltip: () => void;
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

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  activeToolbar,
  setActiveToolbar,
  showColorPicker,
  setShowColorPicker,
  selectedColor,
  colorOptions,
  applyTextColor,
  openImageModal,
  showSettings,
  setShowSettings,
  showButtonTooltip,
  hideTooltip
}) => {
  if (!editor) return null;

  const toggleBold = (e: React.MouseEvent) => {
    e.preventDefault();
    editor.chain().focus().toggleBold().run();
  };

  const toggleItalic = (e: React.MouseEvent) => {
    e.preventDefault();
    editor.chain().focus().toggleItalic().run();
  };

  const toggleBulletList = (e: React.MouseEvent) => {
    e.preventDefault();
    editor.chain().focus().toggleBulletList().run();
  };

  const toggleOrderedList = (e: React.MouseEvent) => {
    e.preventDefault();
    editor.chain().focus().toggleOrderedList().run();
  };

  const toggleBlockquote = (e: React.MouseEvent) => {
    e.preventDefault();
    editor.chain().focus().toggleBlockquote().run();
  };

  const setHeading = (level: 1 | 2, e: React.MouseEvent) => {
    e.preventDefault();
    if (editor.isActive('heading', { level })) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().setHeading({ level }).run();
    }
  };

  const setTextAlign = (align: 'left' | 'center' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    editor.chain().focus().setTextAlign(align).run();
  };

  const handleUndo = () => {
    editor.chain().focus().undo().run();
  };

  const handleRedo = () => {
    editor.chain().focus().redo().run();
  };

  const handleLink = () => {
    const url = window.prompt('URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  return (
    <>
      {/* Toolbar Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-3 pt-1">
        <button
          type="button"
          className={`px-3 py-1.5 text-sm font-medium rounded-t-lg ${
            activeToolbar === 'text' ? 'bg-white border-t border-l border-r border-gray-200 border-b-white -mb-px text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveToolbar('text')}
        >
          Texte
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 text-sm font-medium rounded-t-lg ${
            activeToolbar === 'math' ? 'bg-white border-t border-l border-r border-gray-200 border-b-white -mb-px text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveToolbar('math')}
        >
          Mathématiques
        </button>
      </div>

      {/* Main Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-white border-b border-gray-200 relative">
        {activeToolbar === 'text' && (
          <div className="flex gap-1 items-center">
            <ToolbarButton
              icon={<Bold className="w-4 h-4" />}
              label="Gras"
              onClick={toggleBold}
              isActive={editor.isActive('bold')}
            />
            <ToolbarButton
              icon={<Italic className="w-4 h-4" />}
              label="Italique"
              onClick={toggleItalic}
              isActive={editor.isActive('italic')}
            />

            <div className="h-5 border-l border-gray-300 mx-1"></div>

            <ToolbarButton
              icon={<Heading1 className="w-4 h-4" />}
              label="Titre 1"
              onClick={(e) => setHeading(1, e)}
              isActive={editor.isActive('heading', { level: 1 })}
            />
            <ToolbarButton
              icon={<Heading2 className="w-4 h-4" />}
              label="Titre 2"
              onClick={(e) => setHeading(2, e)}
              isActive={editor.isActive('heading', { level: 2 })}
            />
            <ToolbarButton
              icon={<Quote className="w-4 h-4" />}
              label="Citation"
              onClick={toggleBlockquote}
              isActive={editor.isActive('blockquote')}
            />

            <div className="h-5 border-l border-gray-300 mx-1"></div>

            <ToolbarButton
              icon={<List className="w-4 h-4" />}
              label="Liste à puces"
              onClick={toggleBulletList}
              isActive={editor.isActive('bulletList')}
            />
            <ToolbarButton
              icon={<ListOrdered className="w-4 h-4" />}
              label="Liste numérotée"
              onClick={toggleOrderedList}
              isActive={editor.isActive('orderedList')}
            />

            <div className="h-5 border-l border-gray-300 mx-1"></div>

            <ToolbarButton
              icon={<AlignLeft className="w-4 h-4" />}
              label="Aligner à gauche"
              onClick={(e) => setTextAlign('left', e)}
              isActive={editor.isActive({ textAlign: 'left' })}
            />
            <ToolbarButton
              icon={<AlignCenter className="w-4 h-4" />}
              label="Centrer"
              onClick={(e) => setTextAlign('center', e)}
              isActive={editor.isActive({ textAlign: 'center' })}
            />
            <ToolbarButton
              icon={<AlignRight className="w-4 h-4" />}
              label="Aligner à droite"
              onClick={(e) => setTextAlign('right', e)}
              isActive={editor.isActive({ textAlign: 'right' })}
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
              onClick={handleLink}
              isActive={editor.isActive('link')}
            />

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
        )}
      </div>
    </>
  );
};