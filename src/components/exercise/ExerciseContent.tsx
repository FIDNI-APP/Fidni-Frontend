import React, { useState } from 'react';
import { Eye, CheckCircle, XCircle, Printer, Layers, Tag, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Content, Difficulty, VoteValue } from '@/types';
import { VoteButtons } from '@/components/VoteButtons';
import TipTapRenderer from '@/components/editor/TipTapRenderer';

interface ExerciseContentProps {
  exercise: Content;
  completed: 'success' | 'review' | null;
  markAsCompleted: (status: 'success' | 'review') => Promise<void>;
  loadingStates: {
    progress: boolean;
    save: boolean;
  };
  handleVote: (value: VoteValue, target?: 'exercise' | 'solution') => Promise<void>;
  handlePrint: () => void;
}

export const ExerciseContent: React.FC<ExerciseContentProps> = ({
  exercise,
  completed,
  markAsCompleted,
  loadingStates,
  handleVote,
  handlePrint
}) => {
  const [showAllTags, setShowAllTags] = useState<boolean>(false);
  
  // Check if the content has theorems and subfields
  const hasTheorems = exercise.theorems && exercise.theorems.length > 0;
  const hasSubfields = exercise.subfields && exercise.subfields.length > 0;
  const hasChapters = exercise.chapters && exercise.chapters.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6">
      <div className="p-6">
        {/* Tags section moved to top */}
        {(hasSubfields || hasChapters || hasTheorems) && (
          <div className="bg-gray-50 -mx-6 -mt-6 px-6 py-4 mb-6 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {/* Chapter Tags */}
              {hasChapters && (
                <div className="flex flex-wrap gap-1.5 mr-4">
                  <span className="flex items-center text-xs text-gray-500 mr-1 whitespace-nowrap">
                    <Tag className="w-3 h-3 mr-1 text-gray-400" />
                    Chapitres:
                  </span>
                  {exercise.chapters
                    .slice(0, showAllTags ? exercise.chapters.length : 3)
                    .map((chapter) => (
                      <span
                        key={chapter.id}
                        className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs flex items-center whitespace-nowrap border border-purple-100"
                      >
                        {chapter.name}
                      </span>
                    ))}
                  {!showAllTags && exercise.chapters.length > 3 && (
                    <button 
                      onClick={() => setShowAllTags(true)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      +{exercise.chapters.length - 3} autres
                    </button>
                  )}
                </div>
              )}
              
              {/* Subfield Tags */}
              {hasSubfields && (
                <div className="flex flex-wrap gap-1.5 mr-4">
                  <span className="flex items-center text-xs text-gray-500 mr-1 whitespace-nowrap">
                    <Layers className="w-3 h-3 mr-1 text-gray-400" />
                    Sous-domaines:
                  </span>
                  {exercise.subfields
                    .slice(0, showAllTags ? exercise.subfields.length : 3)
                    .map((subfield) => (
                      <span
                        key={subfield.id}
                        className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center whitespace-nowrap border border-blue-100"
                      >
                        {subfield.name}
                      </span>
                    ))}
                  {!showAllTags && exercise.subfields.length > 3 && (
                    <button 
                      onClick={() => setShowAllTags(true)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      +{exercise.subfields.length - 3} autres
                    </button>
                  )}
                </div>
              )}
              
              {/* Theorem Tags */}
              {hasTheorems && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="flex items-center text-xs text-gray-500 mr-1 whitespace-nowrap">
                    <BookMarked className="w-3 h-3 mr-1 text-gray-400" />
                    Théorèmes:
                  </span>
                  {exercise.theorems
                    .slice(0, showAllTags ? exercise.theorems.length : 3)
                    .map((theorem) => (
                      <span
                        key={theorem.id}
                        className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs flex items-center whitespace-nowrap border border-amber-100"
                      >
                        {theorem.name}
                      </span>
                    ))}
                  {!showAllTags && exercise.theorems.length > 3 && (
                    <button 
                      onClick={() => setShowAllTags(true)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      +{exercise.theorems.length - 3} autres
                    </button>
                  )}
                </div>
              )}
              
              {showAllTags && (
                <button 
                  onClick={() => setShowAllTags(false)}
                  className="text-xs text-indigo-600 hover:underline ml-auto"
                >
                  Voir moins
                </button>
              )}
            </div>
          </div>
        )}
        
        <div className="prose max-w-none text-gray-800 mb-6">
          <TipTapRenderer content={exercise.content} />
        </div>
        
        {/* Footer with votes, progress tracking, etc */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {/* Vote Buttons */}
            <VoteButtons
              initialVotes={exercise.vote_count}
              onVote={(value) => handleVote(value, 'exercise')}
              vertical={false}
              userVote={exercise.user_vote}
              size="sm"
            />
            
            {/* Views count */}
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Eye className="w-4 h-4 text-gray-400" />
              <span>{exercise.view_count} vues</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Completion status buttons */}
            <Button
              onClick={() => markAsCompleted('success')}
              variant={completed === 'success' ? "default" : "ghost"}
              size="sm"
              className={`rounded-lg ${
                completed === 'success' 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                  : 'border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
              }`}
              disabled={loadingStates.progress}
            >
              {loadingStates.progress ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <CheckCircle className="w-4 h-4 mr-1.5" />
              )}
              Réussi
            </Button>
            
            <Button
              onClick={() => markAsCompleted("review")}
              variant={completed === "review" ? "default" : "ghost"}
              size="sm"
              className={`rounded-lg ${
                completed === "review" 
                  ? 'liquid-glass bg-rose-500 hover:bg-rose-600 text-white' 
                  : 'liquid-glass liquid-effect border-gray-200 hover:border-rose-300 hover:text-rose-600'
              }`}
              disabled={loadingStates.progress}
            >
              {loadingStates.progress ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <XCircle className="w-4 h-4 mr-1.5" />
              )}
              À revoir
            </Button>
            
            {/* Print button */}
            <Button
              variant="ghost"
              onClick={handlePrint}
              className="rounded-lg text-sm"
              size="sm"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Imprimer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};