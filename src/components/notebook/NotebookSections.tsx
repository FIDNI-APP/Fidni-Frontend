import React from 'react';
import { BookOpen, Trash2 } from 'lucide-react';
import { Section } from '@/types';

interface NotebookSectionsProps {
  sections: Section[];
  activeSectionId: string | null;
  onSelectSection: (id: string) => void;
  onRemoveLesson: (sectionId: string, lessonEntryId: string) => void;
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
            const hasLessons = section.lesson_entries && section.lesson_entries.length > 0;
            const lessonCount = section.lesson_entries ? section.lesson_entries.length : 0;
            
            return (
              <div 
                key={section.id}
                className="group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                onClick={() => hasLessons && onSelectSection(section.id)}
              >
                {/* Improved tab design */}
                <div 
                  className={`relative rounded-lg py-3 px-4 
                    ${activeSectionId === section.id 
                      ? 'bg-white shadow-md border-l-4 border-indigo-600' 
                      : hasLessons 
                        ? 'bg-white/70 hover:bg-white border-l-4 border-transparent hover:border-indigo-300' 
                        : 'bg-gray-100 border-l-4 border-transparent'}
                  `}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className={`font-medium ${activeSectionId === section.id ? 'text-indigo-800' : 'text-gray-800'}`}>
                        {section.chapter.name}
                      </div>
                      {hasLessons && (
                        <div className="text-xs text-gray-500 mt-1">
                          {lessonCount} lesson{lessonCount > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    {hasLessons && (
                      <div className="flex items-center space-x-1">
                        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">
                          {lessonCount}
                        </span>
                        {/* For now, we'll remove the delete button since we need to handle multiple lessons */}
                      </div>
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