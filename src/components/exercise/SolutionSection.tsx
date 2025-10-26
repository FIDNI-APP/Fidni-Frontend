import React, { useState } from 'react';
import { Lightbulb, ChevronDown, Edit, Trash2, PenSquare, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Content, VoteValue } from '@/types';
import { VoteButtons } from '@/components/VoteButtons';
import DualPaneEditor from '@/components/editor/DualPaneEditor';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { AnimatePresence, motion } from 'framer-motion';

interface SolutionSectionProps {
  exercise: Content;
  canEditSolution: boolean;
  isAuthor: boolean;
  solutionVisible: boolean;
  showSolution: boolean;
  handleSolutionToggle: () => void;
  toggleSolutionVisibility: (e: React.MouseEvent) => void;
  handleVote: (value: VoteValue, target: 'exercise' | 'solution') => Promise<void>;
  handleEditSolution: () => void;
  handleDeleteSolution: () => Promise<void>;
  handleAddSolution: (solutionContent: string) => Promise<void>;
  setSolutionVisible: (visible: boolean) => void;
  userSolutionMatched?: boolean;
  onMarkSolutionMatched?: () => Promise<void>;
}

export const SolutionSection: React.FC<SolutionSectionProps> = ({
  exercise,
  canEditSolution,
  isAuthor,
  solutionVisible,
  showSolution,
  handleSolutionToggle,
  toggleSolutionVisibility,
  handleVote,
  handleEditSolution,
  handleDeleteSolution,
  handleAddSolution,
  setSolutionVisible,
  userSolutionMatched = false,
  onMarkSolutionMatched
}) => {
  const [solution, setSolution] = useState('');
  const hasSolution = !!exercise.solution;

  if (hasSolution) {
    return (
      <motion.div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6">
        <div
          className={`px-6 py-4 cursor-pointer ${solutionVisible ? 'bg-indigo-50 border-b border-indigo-100' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
          onClick={(e) => {
            e.stopPropagation();
            if (!solutionVisible) {
              toggleSolutionVisibility(e);
            }
            setSolutionVisible(!solutionVisible);
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${solutionVisible ? 'bg-indigo-100' : 'bg-white/90'}`}>
                <Lightbulb className={`w-5 h-5 ${solutionVisible ? 'text-indigo-600' : 'text-amber-500'}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Solution de l'exercice</h3>
                <p className="text-sm text-gray-500">Cliquez pour {solutionVisible ? 'masquer' : 'afficher'} la solution</p>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (!solutionVisible) {
                  toggleSolutionVisibility(e);
                }
                setSolutionVisible(!solutionVisible);
              }}
              className="text-gray-500 hover:text-indigo-600 h-9 w-9 p-0 rounded-full"
            >
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${solutionVisible ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {solutionVisible && exercise.solution && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-6 py-6 bg-white">
                <div className="prose max-w-none text-gray-800">
                  <TipTapRenderer content={exercise.solution.content} />
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <VoteButtons
                      initialVotes={exercise.solution.vote_count}
                      onVote={(value) => handleVote(value, 'solution')}
                      vertical={false}
                      userVote={exercise.solution.user_vote}
                      size="sm"
                    />

                    {canEditSolution && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          onClick={handleEditSolution}
                          className="text-indigo-600 border-indigo-200 rounded-lg h-9"
                          size="sm"
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={handleDeleteSolution}
                          className="text-red-600 border-red-200 rounded-lg h-9"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Supprimer
                        </Button>
                      </div>
                    )}
                  </div>

                  {onMarkSolutionMatched && (
                    <div className="space-y-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Votre solution correspond-elle à celle proposée?</span>
                        <span className="block text-gray-600 mt-1">Cliquez ci-dessous pour indiquer si votre solution correspond à la solution proposée.</span>
                      </p>
                      <Button
                        variant={userSolutionMatched ? 'default' : 'ghost'}
                        onClick={onMarkSolutionMatched}
                        className={`w-full rounded-lg ${
                          userSolutionMatched
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                            : 'border-green-200 text-green-600 hover:bg-green-50 bg-white'
                        }`}
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        {userSolutionMatched ? 'Solution validée - Cliquer pour annuler' : 'Valider la solution'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  } else if (isAuthor) {
    // Add Solution Section for Author
    return (
      <motion.div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100">
              <PenSquare className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Ajouter une solution</h3>
              <p className="text-sm text-gray-500 mt-1">Partagez votre solution pour aider les autres</p>
            </div>
          </div>
          
          <DualPaneEditor 
            content={solution} 
            setContent={setSolution} 
          />
          
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => handleAddSolution(solution)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md rounded-lg px-6 py-2.5 font-medium transition-all duration-300 hover:shadow-lg"
              disabled={!solution.trim()}
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Publier la solution
            </Button>
          </div>
        </div>
      </motion.div>
    );
  } else {
    // No Solution Message for non-authors
    return (
      <motion.div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-6 flex items-center gap-4">
          <div className="p-3 rounded-full bg-amber-100">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Aucune solution disponible</h3>
            <p className="text-sm text-gray-500 mt-1">
              L'auteur n'a pas encore publié de solution pour cet exercice.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }
};