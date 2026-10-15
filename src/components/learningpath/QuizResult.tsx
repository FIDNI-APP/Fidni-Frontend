// src/components/learningpath/QuizResult.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, XCircle, CheckCircle, RotateCcw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuizQuestion } from './QuizQuestion';
import { 
  ChapterQuiz,
  QuizQuestion as QuizQuestionType,
  QuizResult as QuizResultType 
} from '@/types/index';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

interface QuizResultProps {
  result: QuizResultType;
  quiz: ChapterQuiz;
  questions: QuizQuestionType[];
  answers: Record<string, number | number[]>;
  onRetry: () => void;
  onContinue: () => void;
  pathId: string;
}

export const QuizResult: React.FC<QuizResultProps> = ({
  result,
  quiz,
  questions,
  answers,
  onRetry,
  onContinue,
  pathId
}) => {
  const navigate = useNavigate();
  const isPassed = result.passed;
  const scorePercentage = result.score;

  const getScoreColor = () => {
    if (scorePercentage >= 90) return 'text-green-600';
    if (scorePercentage >= 70) return 'text-blue-600';
    if (scorePercentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Le message suit le vrai verdict (seuil du quiz) : avant, 70 % affichait « réussi »
  // même quand le seuil était plus haut.
  const getScoreMessage = () => {
    if (!isPassed) {
      return scorePercentage >= 50
        ? t('Presque ! Revois les vidéos du chapitre et retente le quiz.')
        : t('Revois les vidéos du chapitre, puis retente le quiz.');
    }
    if (scorePercentage === 100) return t('Sans faute, bravo !');
    if (scorePercentage >= 85) return t('Très bien, tu maîtrises ce chapitre.');
    return t('Quiz réussi, beau travail.');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return t('{m}m {s}s', { m: mins, s: secs });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(`/learning-path/${pathId}`)}
            className="mb-6"
          >
            {t('Retour au parcours')}
          </Button>

          {/* Result Summary Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
            <div className={cn(
              "p-8 text-center",
              isPassed 
                ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                : "bg-gradient-to-br from-red-500 to-rose-600"
            )}>
              <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
                {isPassed ? (
                  <Trophy className="w-12 h-12 text-white" />
                ) : (
                  <XCircle className="w-12 h-12 text-white" />
                )}
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-2">
                {isPassed ? t('Quiz réussi !') : t('Pas encore')}
              </h1>
              
              <p className="text-xl text-white/90 mb-6">
                {isPassed ? t('Tu as atteint le seuil de réussite.') : t('Pas tout à fait cette fois')}
              </p>
              
              <div className={cn(
                "text-6xl font-bold mb-2",
                getScoreColor(),
                "bg-white rounded-xl py-4 px-8 inline-block"
              )}>
                {scorePercentage}%
              </div>
              
              <p className="text-white/80 mt-4">
                {getScoreMessage()}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 divide-x divide-gray-200">
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {result.correct_answers}/{result.total_questions}
                </div>
                <div className="text-sm text-gray-600">{t('Bonnes réponses')}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {quiz.passing_score}%
                </div>
                <div className="text-sm text-gray-600">{t('Seuil de réussite')}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatTime(result.time_spent_seconds)}
                </div>
                <div className="text-sm text-gray-600">{t('Temps')}</div>
              </div>
              <div className="p-4 text-center">
                <div className={cn(
                  "text-2xl font-bold",
                  isPassed ? "text-green-600" : "text-red-600"
                )}>
                  {isPassed ? t('RÉUSSI') : t('À RETENTER')}
                </div>
                <div className="text-sm text-gray-600">{t('Résultat')}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mb-8">
            <Button
              variant="outline"
              size="lg"
              onClick={onRetry}
              className="min-w-[200px]"
            >
              <RotateCcw className="w-5 h-5 me-2" />
              {t('Retenter le quiz')}
            </Button>
            {isPassed && (
              <Button
                size="lg"
                onClick={onContinue}
                className="min-w-[200px] bg-indigo-600 hover:bg-indigo-700"
              >
                {t('Continuer')}
                <ChevronRight className="w-5 h-5 ms-2" />
              </Button>
            )}
          </div>

          {/* Review Section */}
          {result.results && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('Revoir tes réponses')}</h2>
              
              {questions.map((question, index) => {
                const questionResult = result.results?.find(r => r.question_id === question.id);
                
                return (
                  <div key={question.id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                      {questionResult?.is_correct ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )}
                      <h3 className="text-lg font-medium">
                        {t('Question {n}: {verdict}', { n: index + 1, verdict: questionResult?.is_correct ? t('Juste') : t('Faux') })}
                      </h3>
                    </div>
                    
                    <QuizQuestion
                      question={{
                        ...question,
                        correct_answer_index: questionResult?.correct_answer as number,
                        correct_answer_indices: Array.isArray(questionResult?.correct_answer) 
                          ? questionResult.correct_answer as number[]
                          : undefined,
                        explanation: questionResult?.explanation || question.explanation
                      }}
                      questionNumber={index + 1}
                      totalQuestions={questions.length}
                      onAnswer={() => {}}
                      showResult={true}
                      userAnswer={answers[question.id]}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};