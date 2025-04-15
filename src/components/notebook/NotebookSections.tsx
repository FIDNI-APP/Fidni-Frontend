import React from 'react';
import { BookOpen, Trash2 } from 'lucide-react';
import { Section } from '@/types';

interface NotebookSectionsProps {
  sections: Section[];
  activeSectionId: string | null;
  onSelectSection: (id: string) => void;
  onRemoveLesson: (id: string) => void;
}

const NotebookSections: React.FC<NotebookSectionsProps> = ({ 
  sections, 
  activeSectionId, 
  onSelectSection,
  onRemoveLesson
}) => {
  return (
    <div className="w-64 flex-shrink-0 bg-gradient-to-br from-indigo-50 to-blue-50 border-r border-indigo-100 overflow-y-auto py-6">
      <h3 className="px-4 mb-4 font-semibold text-indigo-900 flex items-center">
        <BookOpen className="w-4 h-4 mr-2" />
        Chapters
      </h3>
      
      {!sections || sections.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-gray-500">No chapters available</p>
        </div>
      ) : (
        <div className="space-y-2 px-2">
          {sections.map((section) => {
            // Determine if this section has a lesson
            const hasLesson = !!section.lesson;
            
            return (
              <div 
                key={section.id}
                className={`relative group ${hasLesson ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                onClick={() => hasLesson && onSelectSection(section.id)}
              >
                {/* Improved tab design */}
                <div 
                  className={`relative rounded-lg py-3 px-4 
                    ${activeSectionId === section.id 
                      ? 'bg-white shadow-md border-l-4 border-indigo-600' 
                      : hasLesson 
                        ? 'bg-white/70 hover:bg-white border-l-4 border-transparent hover:border-indigo-300' 
                        : 'bg-gray-100 border-l-4 border-transparent'}
                  `}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className={`font-medium ${activeSectionId === section.id ? 'text-indigo-800' : 'text-gray-800'}`}>
                        {section.chapter.name}
                      </div>
                      {section.lesson && (
                        <div className="text-xs text-gray-500 mt-1 truncate max-w-[180px]">
                          {section.lesson.title}
                        </div>
                      )}
                    </div>
                    {hasLesson && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveLesson(section.id);
                        }}
                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove lesson"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotebookSections;