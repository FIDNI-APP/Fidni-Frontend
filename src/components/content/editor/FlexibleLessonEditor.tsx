/**
 * FlexibleLessonEditor - Section-based editor for structured lessons
 *
 * Lessons have hierarchical sections instead of questions:
 * - Sections with title and content
 * - Subsections (nested)
 * - NO difficulty selector
 * - NO solution editor
 * - NO points tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Save, Eye, EyeOff, ArrowLeft, Trash2,
  BookOpen, ChevronDown, ChevronRight, Copy, ArrowUp, ArrowDown, FileText
} from 'lucide-react';
import { TextBlockEditor } from './TextBlockEditor';
import type { ContentBlock } from '@/types/structured';

// =====================
// TYPES
// =====================

export interface SubSectionBlock {
  id: string;
  title: string;
  content: ContentBlock;
}

export interface SectionBlock {
  id: string;
  title: string;
  content: ContentBlock;
  subSections?: SubSectionBlock[];
}

export interface FlexibleLessonStructure {
  version: string;
  sections: SectionBlock[];
}

export interface FlexibleLessonEditorState {
  title: string;
  structure: FlexibleLessonStructure;
}

interface FlexibleLessonEditorProps {
  initialData?: Partial<FlexibleLessonEditorState>;
  onSave: (data: FlexibleLessonEditorState) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  showPreview: boolean;
  onTogglePreview: () => void;
}

// =====================
// HELPERS
// =====================

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyStructure = (): FlexibleLessonStructure => ({
  version: '1.0',
  sections: [],
});

// =====================
// SUBSECTION EDITOR
// =====================

interface SubSectionEditorProps {
  subSection: SubSectionBlock;
  onChange: (ss: SubSectionBlock) => void;
  onDelete: () => void;
}

const SubSectionEditor: React.FC<SubSectionEditorProps> = ({
  subSection,
  onChange,
  onDelete,
}) => {
  return (
    <div className="ml-8 mt-3 border-l-2 border-indigo-200 pl-4">
      <div className="flex items-center gap-3 mb-2">
        <input
          type="text"
          value={subSection.title}
          onChange={(e) => onChange({ ...subSection, title: e.target.value })}
          placeholder="Titre de la sous-section"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
        <button
          onClick={onDelete}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Supprimer sous-section"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <TextBlockEditor
          value={subSection.content}
          onChange={(content) => onChange({ ...subSection, content })}
          placeholder="Contenu de la sous-section..."
        />
      </div>
    </div>
  );
};

// =====================
// SECTION EDITOR
// =====================

interface SectionEditorProps {
  section: SectionBlock;
  index: number;
  onChange: (section: SectionBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  index,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAddSubSection = () => {
    const newSubSection: SubSectionBlock = {
      id: generateId(),
      title: '',
      content: { html: '', text: '' },
    };
    onChange({
      ...section,
      subSections: [...(section.subSections || []), newSubSection],
    });
  };

  const handleUpdateSubSection = (index: number, subSection: SubSectionBlock) => {
    const updated = [...(section.subSections || [])];
    updated[index] = subSection;
    onChange({ ...section, subSections: updated });
  };

  const handleDeleteSubSection = (index: number) => {
    const updated = section.subSections?.filter((_, i) => i !== index) || [];
    onChange({ ...section, subSections: updated });
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200">
      {/* Section Header */}
      <div className="flex items-start gap-3 mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 p-1 hover:bg-white/50 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-indigo-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-indigo-600" />
          )}
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">
              Section {index + 1}
            </span>
          </div>

          <input
            type="text"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder="Titre de la section"
            className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Déplacer vers le haut"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Déplacer vers le bas"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors"
            title="Dupliquer"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="space-y-3">
          <div className="bg-white rounded-lg border border-indigo-200 p-3">
            <TextBlockEditor
              value={section.content}
              onChange={(content) => onChange({ ...section, content })}
              placeholder="Contenu de la section..."
            />
          </div>

          {/* SubSections */}
          {section.subSections && section.subSections.length > 0 && (
            <div className="space-y-3">
              {section.subSections.map((subSection, idx) => (
                <SubSectionEditor
                  key={subSection.id}
                  subSection={subSection}
                  onChange={(ss) => handleUpdateSubSection(idx, ss)}
                  onDelete={() => handleDeleteSubSection(idx)}
                />
              ))}
            </div>
          )}

          {/* Add SubSection Button */}
          <button
            onClick={handleAddSubSection}
            className="ml-8 flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Ajouter une sous-section
          </button>
        </div>
      )}
    </div>
  );
};

// =====================
// MAIN EDITOR
// =====================

export const FlexibleLessonEditor: React.FC<FlexibleLessonEditorProps> = ({
  initialData,
  onSave,
  onCancel,
  isLoading = false,
  showPreview,
  onTogglePreview,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [structure, setStructure] = useState<FlexibleLessonStructure>(
    initialData?.structure || createEmptyStructure()
  );

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setStructure(initialData.structure || createEmptyStructure());
    }
  }, [initialData]);

  const handleAddSection = () => {
    const newSection: SectionBlock = {
      id: generateId(),
      title: '',
      content: { html: '', text: '' },
      subSections: [],
    };
    setStructure({
      ...structure,
      sections: [...structure.sections, newSection],
    });
  };

  const handleUpdateSection = (index: number, section: SectionBlock) => {
    const updated = [...structure.sections];
    updated[index] = section;
    setStructure({ ...structure, sections: updated });
  };

  const handleDeleteSection = (index: number) => {
    setStructure({
      ...structure,
      sections: structure.sections.filter((_, i) => i !== index),
    });
  };

  const handleDuplicateSection = (index: number) => {
    const sectionToDup = structure.sections[index];
    const duplicated: SectionBlock = {
      ...sectionToDup,
      id: generateId(),
      subSections: sectionToDup.subSections?.map((ss) => ({
        ...ss,
        id: generateId(),
      })),
    };
    const updated = [...structure.sections];
    updated.splice(index + 1, 0, duplicated);
    setStructure({ ...structure, sections: updated });
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= structure.sections.length) return;

    const updated = [...structure.sections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setStructure({ ...structure, sections: updated });
  };

  const handleSave = async () => {
    await onSave({ title, structure });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Éditeur de leçon</h2>
            <p className="text-sm text-gray-500">Structure par sections et sous-sections</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePreview}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Masquer' : 'Aperçu'}
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !title.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Title Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Titre de la leçon *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Les nombres complexes"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
        />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Sections ({structure.sections.length})
          </h3>
        </div>

        {structure.sections.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">Aucune section pour le moment</p>
            <button
              onClick={handleAddSection}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter la première section
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {structure.sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                index={index}
                onChange={(s) => handleUpdateSection(index, s)}
                onDelete={() => handleDeleteSection(index)}
                onDuplicate={() => handleDuplicateSection(index)}
                onMoveUp={() => handleMoveSection(index, 'up')}
                onMoveDown={() => handleMoveSection(index, 'down')}
                canMoveUp={index > 0}
                canMoveDown={index < structure.sections.length - 1}
              />
            ))}

            <button
              onClick={handleAddSection}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Ajouter une section
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
