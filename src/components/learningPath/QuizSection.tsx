// src/components/learningPath/QuizSection.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  ChevronLeft,
  ChevronRight,
  Award,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Confetti from 'react-confetti';
import { startQuizAttempt, submitQuizAttempt } from '@/lib/api/learningPathApi';

interface QuizSectionProps {
  chapter: any;
  onComplete: (score: number) => void;
  onBack: () => void;
}

export const QuizSection: React.FC<QuizSectionProps> = ({
  chapter,
  onComplete,
  onBack
}) => {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    startQuiz();
  }, []);

  const startQuiz = async () => {
    try {
      setLoading(true);
      const quizData = await startQuizAttempt(chapter.quiz.id);
      setAttemptId(quizData.attempt_id);
      setQuestions(quizData.questions);
      setAnswers(new Array(quizData.questions.length).fill(null));
    } catch (error) {
      console.error('Failed to start quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (answerIndex: number) => {
    if (!showFeedback) {
      setSelectedAnswer(answerIndex);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer;
    setAnswers(newAnswers);

    if (selectedAnswer === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }

    setShowFeedback(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      setShowResults(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(answers[currentQuestion - 1]);
      setShowFeedback(true);
    }
  };

  const handleCompleteQuiz = async () => {
    if (!attemptId) return;
    
    try {
      const answersData = answers.map((answer, index) => ({
        question_id: questions[index].id,
        answer_index: answer || 0
      }));
      
      const result = await submitQuizAttempt(
        chapter.quiz.id,
        attemptId,
        answersData
      );
      
      setScore(result.correct_answers);
      setShowResults(true);
      
      const percentage = result.score;
      onComplete(percentage);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
  };

  const isCorrect = selectedAnswer === questions[currentQuestion]?.correctAnswer;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du quiz...</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    const isPassed = percentage >= 70;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto"
      >
        {isPassed && <Confetti recycle={false} numberOfPieces={200} />}
        
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={`
              w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center
              ${isPassed ? 'bg-green-100' : 'bg-amber-100'}
            `}
          >
            <Award className={`w-16 h-16 ${isPassed ? 'text-green-600' : 'text-amber-600'}`} />
          </motion.div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isPassed ? 'Félicitations !' : 'Bon effort !'}
          </h2>
          
          <p className="text-xl text-gray-600 mb-6">
            Vous avez obtenu {score} sur {questions.length} ({percentage}%)
          </p>

          {isPassed ? (
            <p className="text-gray-600 mb-8">
              Excellent travail ! Vous avez maîtrisé ce chapitre et êtes prêt pour la suite.
            </p>
          ) : (
            <p className="text-gray-600 mb-8">
              Vous devez obtenir au moins 70% pour valider ce chapitre. 
              N'hésitez pas à revoir les vidéos et réessayer !
            </p>
          )}

          {/* Review Answers */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Récapitulatif des réponses</h3>
            <div className="grid grid-cols-5 gap-2">
              {answers.map((answer, index) => {
                const isCorrect = answer === questions[index].correctAnswer;
                return (
                  <div
                    key={index}
                    className={`
                      p-3 rounded-lg text-sm font-medium
                      ${isCorrect 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                      }
                    `}
                  >
                    Q{index + 1}: {isCorrect ? '✓' : '✗'}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            {!isPassed && (
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentQuestion(0);
                  setSelectedAnswer(null);
                  setShowFeedback(false);
                  setScore(0);
                  setAnswers(new Array(questions.length).fill(null));
                  setShowResults(false);
                }}
              >
                Réessayer
              </Button>
            )}
            <Button
              onClick={handleCompleteQuiz}
              className="bg-gradient-to-r from-indigo-500 to-purple-500"
            >
              {isPassed ? 'Continuer' : 'Retour au chapitre'}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour au chapitre
          </Button>
          
          <div className="text-sm font-medium text-gray-600">
            Question {currentQuestion + 1} sur {questions.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {questions[currentQuestion].question}
          </h2>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {questions[currentQuestion].options.map((option: string, index: number) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption = index === questions[currentQuestion].correctAnswer;
              const showCorrect = showFeedback && isCorrectOption;
              const showIncorrect = showFeedback && isSelected && !isCorrectOption;

              return (
                <motion.button
                  key={index}
                  whileHover={{ scale: showFeedback ? 1 : 1.02 }}
                  whileTap={{ scale: showFeedback ? 1 : 0.98 }}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={showFeedback}
                  className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all
                    ${isSelected && !showFeedback ? 'border-indigo-500 bg-indigo-50' : ''}
                    ${showCorrect ? 'border-green-500 bg-green-50' : ''}
                    ${showIncorrect ? 'border-red-500 bg-red-50' : ''}
                    ${!isSelected && !showFeedback ? 'border-gray-200 hover:border-gray-300' : ''}
                    ${showFeedback ? 'cursor-default' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className={`
                      ${showCorrect ? 'text-green-700 font-medium' : ''}
                      ${showIncorrect ? 'text-red-700' : ''}
                    `}>
                      {option}
                    </span>
                    {showCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {showIncorrect && <XCircle className="w-5 h-5 text-red-600" />}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`
                  p-4 rounded-lg mb-6
                  ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
                `}
              >
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {isCorrect ? 'Bonne réponse !' : 'Pas tout à fait...'}
                    </p>
                    <p className="text-gray-700 mt-1">
                      {questions[currentQuestion].explanation}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Question précédente
            </Button>

            {!showFeedback ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                className="bg-gradient-to-r from-indigo-500 to-purple-500"
              >
                Valider la réponse
              </Button>
            ) : (
              <Button
                onClick={handleNextQuestion}
                className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-500"
              >
                {currentQuestion === questions.length - 1 ? 'Voir les résultats' : 'Question suivante'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};