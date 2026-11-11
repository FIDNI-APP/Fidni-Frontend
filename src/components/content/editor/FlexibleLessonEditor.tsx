import React, { useState, useEffect } from 'react';
import { Plus, Save, Eye, ArrowLeft, Trash2, BookOpen, ArrowUp, ArrowDown, Copy } from 'lucide-react';
import { TextBlockEditor } from './TextBlockEditor';
import type { ContentBlock } from '@/types/content';
import { t } from '@/i18n';

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
  onChange?: (state: FlexibleLessonEditorState) => void;
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
// ADD SECTION BUTTON
// =====================

interface AddSectionRowProps {
  onAdd: () => void;
}

const AddSectionRow: React.FC<AddSectionRowProps> = ({ onAdd }) => (
  <div className="flex items-center gap-2 group/add py-1">
    <div className="flex-1 h-px bg-[#f2f1ee] group-hover/add:bg-line transition-colors" />
    <button
      type="button"
      onClick={onAdd}
      className="flex items-center gap-1 px-2 py-0.5 text-xs text-ink-faint hover:text-brand hover:bg-brand-soft rounded-full transition-colors opacity-0 group-hover/add:opacity-100"
    >
      <Plus className="w-3.5 h-3.5" />
      {t('Section')}
    </button>
    <div className="flex-1 h-px bg-[#f2f1ee] group-hover/add:bg-line transition-colors" />
  </div>
);

// =====================
// SUBSECTION ROW
// =====================

interface SubSectionRowProps {
  ss: SubSectionBlock;
  onChange: (ss: SubSectionBlock) => void;
  onDelete: () => void;
}

const SubSectionRow: React.FC<SubSectionRowProps> = ({ ss, onChange, onDelete }) => (
  <div className="group/ss ps-6 border-s-2 border-brand-soft py-2">
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={ss.title}
          onChange={(e) => onChange({ ...ss, title: e.target.value })}
          placeholder={t('Titre de la sous-section...')}
          className="w-full text-sm font-semibold text-ink-soft bg-transparent border-b border-transparent hover:border-line focus:border-brand-line focus:outline-none mb-1.5 py-0.5"
        />
        <TextBlockEditor
          value={ss.content}
          onChange={(content) => onChange({ ...ss, content })}
          placeholder={t('Contenu...')}
          minHeight="40px"
          showToolbar={false}
        />
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="p-1 text-[#d8d4cc] hover:text-red-500 opacity-0 group-hover/ss:opacity-100 transition-opacity mt-0.5 shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

// =====================
// SECTION ROW (Notion-style)
// =====================

interface SectionRowProps {
  section: SectionBlock;
  index: number;
  totalSections: number;
  onChange: (section: SectionBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const SectionRow: React.FC<SectionRowProps> = ({
  section, index, totalSections, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown,
}) => {
  const addSubSection = () => {
    const subs = section.subSections || [];
    onChange({
      ...section,
      subSections: [...subs, { id: generateId(), title: '', content: { type: 'text', html: '' } }],
    });
  };

  const updateSub = (i: number, ss: SubSectionBlock) => {
    const subs = [...(section.subSections || [])];
    subs[i] = ss;
    onChange({ ...section, subSections: subs });
  };

  const deleteSub = (i: number) =>
    onChange({ ...section, subSections: (section.subSections || []).filter((_, j) => j !== i) });

  return (
    <div className="group/section flex gap-3">
      {/* Left accent */}
      <div className="w-0.5 bg-brand rounded-full shrink-0 mt-2" />

      {/* Content */}
      <div className="flex-1 min-w-0 py-2">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-brand shrink-0" />
          <input
            type="text"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('Titre de la section...')}
            className="flex-1 text-base font-semibold text-ink bg-transparent border-b border-transparent hover:border-line focus:border-brand-line focus:outline-none py-0.5"
          />
        </div>

        <TextBlockEditor
          value={section.content}
          onChange={(content) => onChange({ ...section, content })}
          placeholder={t('Contenu de la section...')}
          minHeight="60px"
        />

        {/* Sub-sections */}
        <div className="mt-3 space-y-0">
          {(section.subSections || []).map((ss, i) => (
            <SubSectionRow
              key={ss.id}
              ss={ss}
              onChange={(updated) => updateSub(i, updated)}
              onDelete={() => deleteSub(i)}
            />
          ))}
          <button
            type="button"
            onClick={addSubSection}
            className="mt-1 flex items-center gap-1.5 text-xs text-ink-faint hover:text-brand transition-colors ps-6"
          >
            <Plus className="w-3 h-3" />
            {t('Sous-section')}
          </button>
        </div>
      </div>

      {/* Hover actions */}
      <div className="flex flex-col items-center gap-1 pt-2 opacity-0 group-hover/section:opacity-100 transition-opacity shrink-0">
        <button type="button" onClick={onMoveUp} disabled={index === 0}
          className="p-1 text-ink-faint hover:text-ink-soft disabled:opacity-20 disabled:cursor-not-allowed">
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onMoveDown} disabled={index === totalSections - 1}
          className="p-1 text-ink-faint hover:text-ink-soft disabled:opacity-20 disabled:cursor-not-allowed">
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onDuplicate}
          className="p-1 text-ink-faint hover:text-brand">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onDelete}
          className="p-1 text-ink-faint hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
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
  onChange,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [structure, setStructure] = useState<FlexibleLessonStructure>(
    initialData?.structure || createEmptyStructure()
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setStructure(initialData.structure || createEmptyStructure());
    }
  }, [initialData]);

  // Notify parent of state changes for live preview
  useEffect(() => {
    onChange?.({ title, structure });
  }, [title, structure]);

  const addSection = (afterIndex?: number) => {
    const newSection: SectionBlock = {
      id: generateId(),
      title: '',
      content: { type: 'text', html: '' },
      subSections: [],
    };
    setStructure((prev) => {
      const sections = [...prev.sections];
      if (afterIndex !== undefined) {
        sections.splice(afterIndex + 1, 0, newSection);
      } else {
        sections.push(newSection);
      }
      return { ...prev, sections };
    });
  };

  const updateSection = (index: number, section: SectionBlock) =>
    setStructure((prev) => {
      const sections = [...prev.sections];
      sections[index] = section;
      return { ...prev, sections };
    });

  const deleteSection = (index: number) =>
    setStructure((prev) => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }));

  const duplicateSection = (index: number) => {
    const s = structure.sections[index];
    const dup: SectionBlock = {
      ...JSON.parse(JSON.stringify(s)),
      id: generateId(),
      subSections: s.subSections?.map((ss) => ({ ...ss, id: generateId() })),
    };
    setStructure((prev) => {
      const sections = [...prev.sections];
      sections.splice(index + 1, 0, dup);
      return { ...prev, sections };
    });
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const ni = index + dir;
    if (ni < 0 || ni >= structure.sections.length) return;
    setStructure((prev) => {
      const sections = [...prev.sections];
      [sections[index], sections[ni]] = [sections[ni], sections[index]];
      return { ...prev, sections };
    });
  };

  const handleSave = async () => {
    if (!title.trim()) { alert(t('Veuillez entrer un titre')); return; }
    setIsSaving(true);
    try { await onSave({ title, structure }); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#f2f1ee] px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel}
            className="p-1.5 text-ink-faint hover:text-ink-soft hover:bg-[#f2f1ee] rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-[13px] text-ink-faint font-medium">{t('Leçon')}</p>
            <p className="text-sm text-ink-soft">{structure.sections.length !== 1 ? t('{n} sections', { n: structure.sections.length }) : t('{n} section', { n: structure.sections.length })}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onTogglePreview} data-tour="creer-apercu"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              showPreview ? 'bg-brand-soft text-brand-hover border-brand-line' : 'text-ink-faint border-line hover:bg-[#faf9f7]'
            }`}>
            <Eye className="w-4 h-4" />
            {t('Aperçu')}
          </button>
          <button type="button" onClick={handleSave} data-tour="creer-enregistrer" disabled={isSaving || isLoading || !title.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 text-sm transition-colors">
            <Save className="w-4 h-4" />
            {isSaving ? t('Enregistrement...') : t('Enregistrer')}
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-1">

          {/* Title */}
          <input
            data-tour="creer-titre"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('Titre de la leçon...')}
            className="w-full text-3xl font-semibold text-ink bg-transparent border-none outline-none placeholder:text-[#d8d4cc] mb-6"
          />

          {/* Sections */}
          {structure.sections.length === 0 ? (
            <div className="py-16 text-center" data-tour="creer-blocs">
              <p className="text-ink-faint text-sm mb-4">{t('Commencez à construire votre leçon')}</p>
              <button type="button" onClick={() => addSection()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm hover:bg-brand-hover transition-colors mx-auto">
                <Plus className="w-4 h-4" /> {t('Première section')}
              </button>
            </div>
          ) : (
            <div className="space-y-0" data-tour="creer-blocs">
              {structure.sections.map((section, index) => (
                <React.Fragment key={section.id}>
                  <SectionRow
                    section={section}
                    index={index}
                    totalSections={structure.sections.length}
                    onChange={(s) => updateSection(index, s)}
                    onDelete={() => deleteSection(index)}
                    onDuplicate={() => duplicateSection(index)}
                    onMoveUp={() => moveSection(index, -1)}
                    onMoveDown={() => moveSection(index, 1)}
                  />
                  <AddSectionRow onAdd={() => addSection(index)} />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
