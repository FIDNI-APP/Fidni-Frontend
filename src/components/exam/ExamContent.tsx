import React, { useState } from 'react';
import { Eye, CheckCircle, XCircle, Printer, Layers, Tag, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Exam, Difficulty, VoteValue } from '@/types';
import { VoteButtons } from '@/components/VoteButtons';
import TipTapRenderer from '@/components/editor/TipTapRenderer';

interface ExamContentProps {
  exam: Exam;
  completed: 'success' | 'review' | null;
  markAsCompleted: (status: 'success' | 'review') => Promise<void>;
  loadingStates: {
    progress: boolean;
    save: boolean;
  };
  handleVote: (value: VoteValue) => Promise<void>;
  handlePrint: () => void;
}

export const ExamContent: React.FC<ExamContentProps> = ({
  exam,
  completed,
  markAsCompleted,
  loadingStates,
  handleVote,
  handlePrint
}) => {
  const [showAllTags, setShowAllTags] = useState<boolean>(false);
  
  // Check if the content has theorems and subfields
  const hasTheorems = exam.theorems && exam.theorems.length > 0;
  const hasSubfields = exam.subfields && exam.subfields.length > 0;
  const hasChapters = exam.chapters && exam.chapters.length > 0;

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
                  {exam.chapters
                    .slice(0, showAllTags ? exam.chapters.length : 3)
                    .map((chapter) => (
                      <span
                        key={chapter.id}
                        className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs flex items-center whitespace-nowrap border border-purple-100"
                      >
                        {chapter.name}
                      </span>
                    ))}
                  {!showAllTags && exam.chapters.length > 3 && (
                    <button 
                      onClick={() => setShowAllTags(true)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      +{exam.chapters.length - 3} autres
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
                  {exam.subfields
                    .slice(0, showAllTags ? exam.subfields.length : 3)
                    .map((subfield) => (
                      <span
                        key={subfield.id}
                        className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center whitespace-nowrap border border-blue-100"
                      >
                        {subfield.name}
                      </span>
                    ))}
                  {!showAllTags && exam.subfields.length > 3 && (
                    <button 
                      onClick={() => setShowAllTags(true)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      +{exam.subfields.length - 3} autres
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
                  {exam.theorems
                    .slice(0, showAllTags ? exam.theorems.length : 3)
                    .map((theorem) => (
                      <span
                        key={theorem.id}
                        className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs flex items-center whitespace-nowrap border border-amber-100"
                      >
                        {theorem.name}
                      </span>
                    ))}
                  {!showAllTags && exam.theorems.length > 3 && (
                    <button 
                      onClick={() => setShowAllTags(true)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      +{exam.theorems.length - 3} autres
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
          <TipTapRenderer content={exam.content} />
        </div>
        
        {/* Footer with votes, progress tracking, etc */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {/* Vote Buttons */}
            <VoteButtons
              initialVotes={exam.vote_count}
              onVote={(value) => handleVote(value)}
              vertical={false}
              userVote={exam.user_vote}
              size="sm"
            />
            
            {/* Views count */}
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Eye className="w-4 h-4 text-gray-400" />
              <span>{exam.view_count} vues</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Completion status buttons */}
            <Button
              onClick={() => markAsCompleted('success')}
              variant={completed === 'success' ? "default" : "outline"}
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
              variant={completed === "review" ? "default" : "outline"}
              size="sm"
              className={`rounded-lg ${
                completed === "review" 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                  : 'border-gray-200 hover:border-rose-300 hover:text-rose-600'
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
              variant="outline"
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