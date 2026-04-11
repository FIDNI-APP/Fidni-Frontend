import React from 'react';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { Section } from '@/types';

interface NotebookSectionsProps {
  sections: Section[];
  activeSectionId: string | null;
  onSelectSection: (id: string) => void;
  onRemoveLesson: (sectionId: string, lessonEntryId: string) => void;
  onGoBack?: () => void;
  notebookTitle?: string;
}

const NotebookSections: React.FC<NotebookSectionsProps> = ({
  sections,
  activeSectionId,
  onSelectSection,
  onRemoveLesson,
  onGoBack,
  notebookTitle
}) => {
  return (
    <div className="w-56 flex-shrink-0 bg-white border-r border-indigo-100 overflow-y-auto flex flex-col">
      {/* Back button + notebook title */}
      {onGoBack && (
        <div className="px-2 pt-2 pb-1 border-b border-indigo-100">
          <button onClick={onGoBack} className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 text-xs font-medium transition-colors w-full">
            <ChevronLeft className="w-3.5 h-3.5" />
            {notebookTitle || 'Retour'}
          </button>
        </div>
      )}
      <div className="py-2">
      <h3 className="px-3 mb-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center">
        <BookOpen className="w-3.5 h-3.5 mr-1.5" />
        Chapitres
      </h3>
      
      {!sections || sections.length === 0 ? (
        <div className="px-3 py-6 text-center">
          <p className="text-gray-400 text-xs">Aucun chapitre</p>
        </div>
      ) : (
        <div className="space-y-0.5 px-2">
          {sections.map((section) => {
            const hasLessons = section.lesson_entries && section.lesson_entries.length > 0;
            const lessonCount = section.lesson_entries ? section.lesson_entries.length : 0;
            const isActive = activeSectionId === section.id;

            return (
              <button
                key={section.id}
                onClick={() => hasLessons && onSelectSection(section.id)}
                disabled={!hasLessons}
                className={`w-full text-left rounded-lg py-2 px-3 flex items-center justify-between transition-colors
                  ${isActive
                    ? 'bg-indigo-50 border-l-3 border-indigo-600'
                    : hasLessons
                      ? 'text-slate-700 hover:bg-indigo-50 border-l-3 border-transparent'
                      : 'text-slate-400 border-l-3 border-transparent cursor-default'}
                `}
                style={{ borderLeftWidth: '3px' }}
              >
                <span className={`text-sm truncate ${isActive ? 'font-semibold text-indigo-800' : 'font-medium'}`}>
                  {section.chapter.name}
                </span>
                {hasLessons && (
                  <span className={`text-xs flex-shrink-0 ml-2 px-1.5 py-0.5 rounded-full ${isActive ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                    {lessonCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};

export default NotebookSections;