import React, { useState } from 'react';
import { ClassLevelModel, SubjectModel, ChapterModel, Difficulty, Subfield, Theorem } from '@/types';
import { 
  BarChart3, 
  BookOpen, 
  GraduationCap, 
  Tag, 
  Layers, 
  BookMarked, 
  ChevronDown, 
  ChevronUp, 
  EyeIcon,
  Check,
  Rocket,
  BookOpenCheck,
  Sparkles
} from 'lucide-react';
import parse from 'html-react-parser';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
interface ContentPreviewProps {
  title: string;
  selectedClassLevels: ClassLevelModel[];
  selectedSubject: SubjectModel;
  selectedSubfields: Subfield[];
  selectedChapters: ChapterModel[];
  selectedTheorems: Theorem[];
  difficulty?: Difficulty; // Make difficulty optional for lessons
  content: string;
  solution?: string; // Make solution optional for lessons
  isLesson?: boolean;
}

const ContentPreview: React.FC<ContentPreviewProps> = ({
  title,
  selectedClassLevels,
  selectedSubject,
  selectedSubfields,
  selectedChapters,
  selectedTheorems,
  difficulty,
  content,
  solution,
  isLesson = false
}) => {
  const [activeTabs, setActiveTabs] = useState({
    content: true,
    solution: true
  });

  const toggleTab = (tab: 'content' | 'solution') => {
    setActiveTabs(prev => ({
      ...prev,
      [tab]: !prev[tab]
    }));
  };

  const getDifficultyLabel = (level: string): string => {
    switch (level) {
      case 'easy':
        return 'Easy';
      case 'medium':
        return 'Medium';
      case 'hard':
        return 'Difficult';
      default:
        return level;
    }
  };

  const getDifficultyColor = (level: string): string => {
    switch (level) {
      case 'easy':
        return 'bg-gradient-to-r from-emerald-500 to-green-500 text-white';
      case 'medium':
        return 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white';
      case 'hard':
        return 'bg-gradient-to-r from-red-500 to-pink-500 text-white';
      default:
        return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-500">
      {/* Beautiful header with background gradient */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 p-6 text-white">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {/* Only show difficulty for exercises */}
          {!isLesson && difficulty && (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(difficulty)}`}>
              <BarChart3 className="w-4 h-4 mr-1" />
              {getDifficultyLabel(difficulty)}
            </div>
          )}
          {/* Show lesson badge for lessons */}
          {isLesson && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-yellow-500 to-amber-500 text-white">
              <Sparkles className="w-4 h-4 mr-1" />
              Lesson
            </div>
          )}
        </div>
        
        <div className="absolute top-0 right-0 h-full w-1/3 opacity-10">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 L100,0 L100,100 Z" fill="white" />
          </svg>
        </div>
        
        {/* Metadata as tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          {selectedClassLevels.map(level => (
            <div key={level.id} className="flex items-center text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full">
              <GraduationCap className="w-3 h-3 mr-1" />
              {level.name}
            </div>
          ))}
          
          {selectedSubject && selectedSubject.name && (
            <div className="flex items-center text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full">
              <BookOpen className="w-3 h-3 mr-1" />
              {selectedSubject.name}
            </div>
          )}

          {selectedSubfields.map(subfield => (
            <div key={subfield.id} className="flex items-center text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full">
              <Layers className="w-3 h-3 mr-1" />
              {subfield.name}
            </div>
          ))}
          
          {selectedChapters.map(chapter => (
            <div key={chapter.id} className="flex items-center text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full">
              <Tag className="w-3 h-3 mr-1" />
              {chapter.name}
            </div>
          ))}

          {selectedTheorems.length > 0 && selectedTheorems.map(theorem => (
            <div key={theorem.id} className="flex items-center text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full">
              <BookMarked className="w-3 h-3 mr-1" />
              {theorem.name}
            </div>
          ))}
        </div>
      </div>

      {/* Content section with collapsible panel */}
      <div className="border-b border-gray-200">
        <button 
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          onClick={() => toggleTab('content')}
        >
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
              <EyeIcon className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-800">
              {isLesson ? 'Lesson Content' : 'Exercise Content'}
            </h3>
          </div>
          {activeTabs.content ? 
            <ChevronUp className="w-5 h-5 text-gray-500" /> : 
            <ChevronDown className="w-5 h-5 text-gray-500" />
          }
        </button>
        
        {activeTabs.content && (
          <div className="px-6 py-4 bg-white">
            <div className="prose prose-indigo max-w-none text-gray-700 pb-4">
            <TipTapRenderer content={content} />
            </div>
          </div>
        )}
      </div>

      {/* Solution section with collapsible panel - only for exercises */}
      {solution && !isLesson && (
        <div className="border-b border-gray-200">
          <button 
            className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => toggleTab('solution')}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                <Rocket className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-800">Solution</h3>
            </div>
            {activeTabs.solution ? 
              <ChevronUp className="w-5 h-5 text-gray-500" /> : 
              <ChevronDown className="w-5 h-5 text-gray-500" />
            }
          </button>
          
          {activeTabs.solution && (
            <div className="px-6 py-4 bg-white">
              <div className="prose prose-indigo max-w-none text-gray-700 pb-4">
              <TipTapRenderer content={solution} />

              </div>
            </div>
          )}
        </div>
      )}

      {/* Status indicator */}
      <div className="px-6 py-4 bg-gray-50">
        <div className="flex justify-end">
          <button className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
            <Check className="w-4 h-4 mr-1" />
            Ready to publish
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentPreview;