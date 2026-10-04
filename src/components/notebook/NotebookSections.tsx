import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronLeft, Printer } from 'lucide-react';
import { Section } from '@/types';

interface NotebookSectionsProps {
  sections: Section[];
  activeSectionId: string | null;
  onSelectSection: (id: string) => void;
  onRemoveLesson: (sectionId: string, lessonEntryId: string) => void;
  onGoBack?: () => void;
  notebookTitle?: string;
  /** Lien vers la version imprimable du cahier (PDF). */
  printTo?: string;
}

const NotebookSections: React.FC<NotebookSectionsProps> = ({
  sections,
  activeSectionId,
  onSelectSection,
  onGoBack,
  notebookTitle,
  printTo,
}) => {
  return (
    <div
      className="flex-shrink-0 overflow-y-auto flex flex-col"
      style={{ width: 240, background: '#fff', borderRight: '1px solid #e7e3dc' }}
    >
      {/* Back button + notebook title */}
      {onGoBack && (
        <button
          onClick={onGoBack}
          className="flex items-center gap-1.5 w-full text-left"
          style={{ padding: '12px 14px', borderBottom: '1px solid #faf9f7', background: 'transparent', border: 'none', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: '#faf9f7', color: '#33302b', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'color .14s' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#15633c'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#33302b'; }}
        >
          <ChevronLeft className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{notebookTitle || 'Retour'}</span>
        </button>
      )}

      <div className="py-3">
        <h3 className="flex items-center gap-1.5" style={{ padding: '0 14px 8px', fontSize: 10.5, fontWeight: 700, color: '#9a958c', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          <BookOpen className="w-3.5 h-3.5" />
          Chapitres
        </h3>

        {!sections || sections.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p style={{ color: '#9a958c', fontSize: 12.5 }}>Aucun chapitre</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 px-2">
            {sections.map((section) => {
              const hasLessons = section.lesson_entries && section.lesson_entries.length > 0;
              const lessonCount = section.lesson_entries ? section.lesson_entries.length : 0;
              const isActive = activeSectionId === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => hasLessons && onSelectSection(section.id)}
                  disabled={!hasLessons}
                  className="w-full text-left flex items-center justify-between"
                  style={{
                    padding: '9px 11px', borderRadius: 9,
                    borderLeft: `3px solid ${isActive ? '#1a7a4a' : 'transparent'}`,
                    background: isActive ? '#eaf3ed' : 'transparent',
                    color: isActive ? '#15633c' : hasLessons ? '#33302b' : '#cfcdc8',
                    cursor: hasLessons ? 'pointer' : 'default',
                    transition: 'background .14s, color .14s',
                  }}
                  onMouseEnter={(e) => { if (hasLessons && !isActive) e.currentTarget.style.background = '#f7f6f3'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="truncate" style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 500 }}>
                    {section.chapter.name}
                  </span>
                  {hasLessons && (
                    <span
                      className="flex-shrink-0 ml-2"
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                        background: isActive ? '#d3e7db' : '#f2f1ee',
                        color: isActive ? '#15633c' : '#6b6862',
                      }}
                    >
                      {lessonCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {printTo && (
        <div className="mt-auto p-3" style={{ borderTop: '1px solid #f2f1ee' }}>
          <Link to={printTo} data-tour="cahier-imprimer"
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-semibold text-ink-soft hover:border-ink hover:text-ink transition-colors">
            <Printer className="w-4 h-4" /> Imprimer le cahier
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotebookSections;
