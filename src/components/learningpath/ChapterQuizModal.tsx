// src/components/learningpath/ChapterQuizModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trophy,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Brain
} from 'lucide-react';
import { ChapterQuiz, QuizQuestion } from '@/types/index';
import { startQuizAttempt, submitQuizAttempt } from '@/lib/api/learningpathApi';
import { Button } from '@/components/ui/button';

interface ChapterQuizModalProps {
  quiz: ChapterQuiz;
  onClose: () => void;
  onComplete: () => void;
}

export const ChapterQuizModal: React.FC<ChapterQuizModalProps> = ({
  quiz,
  onClose,
  onComplete
}) => {
  const [quizState, setQuizState] = useState<'intro' | 'questions' | 'results'>('intro');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [attemptId, setAttemptId] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (quiz.time_limit_minutes && quizState === 'questions') {
      setTimeLeft(quiz.time_limit_minutes * 60);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev && prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quizState]);

  const startQuiz = async () => {
    try {
      const response = await startQuizAttempt(quiz.id);
      setQuestions(response.questions);
      setAttemptId(response.attempt_id);
      setQuizState('questions');
    } catch (error) {
      console.error('Failed to start quiz:', error);
    }
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers({ ...answers, [questionId]: answerIndex });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmitQuiz();
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, answerIndex]) => ({
        question_id: questionId,
        answer_index: answerIndex
      }));

      const response = await submitQuizAttempt(quiz.id, {
        attempt_id: attemptId,
        answers: formattedAnswers
      });

      setResults(response);
      setQuizState('results');
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Compact Header */}
        <div className="bg-indigo-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5" />
              <div>
                <h2 className="font-semibold">{quiz.title}</h2>
                {quiz.description && (
                  <p className="text-indigo-100 text-sm">{quiz.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-indigo-200 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Intro State */}
            {quizState === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center py-6"
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Ready for the Quiz?
                  </h3>
                  <p className="text-gray-600">
                    You need {quiz.passing_score}% to pass this quiz.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-gray-800">{quiz.questions_count}</p>
                    <p className="text-xs text-gray-600">Questions</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-gray-800">{quiz.passing_score}%</p>
                    <p className="text-xs text-gray-600">To Pass</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-gray-800">
                      {quiz.time_limit_minutes || '∞'}
                    </p>
                    <p className="text-xs text-gray-600">Minutes</p>
                  </div>
                </div>

                <Button
                  onClick={startQuiz}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Start Quiz
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Questions State */}
            {quizState === 'questions' && currentQuestion && (
              <motion.div
                key={`question-${currentQuestionIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Progress and Timer */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    {timeLeft !== null && (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className={timeLeft < 60 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                          {formatTime(timeLeft)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {currentQuestion.question_text}
                  </h3>

                  {/* Options */}
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(currentQuestion.id, index)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          currentAnswer === index
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            currentAnswer === index
                              ? 'border-indigo-600 bg-indigo-600'
                              : 'border-gray-300'
                          }`}>
                            {currentAnswer === index && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <span className="text-gray-800 text-sm">{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={handleNextQuestion}
                    disabled={currentAnswer === undefined}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    size="sm"
                  >
                    {currentQuestionIndex === questions.length - 1 ? 'Submit Quiz' : 'Next'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Results State */}
            {quizState === 'results' && results && (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="mb-6">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    results.passed ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {results.passed ? (
                      <Trophy className="w-10 h-10 text-green-600" />
                    ) : (
                      <AlertCircle className="w-10 h-10 text-red-600" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {results.passed ? 'Well Done!' : 'Keep Trying!'}
                  </h3>
                  <p className="text-gray-600">
                    {results.passed 
                      ? 'You passed the quiz!' 
                      : `You need ${quiz.passing_score}% to pass.`}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6 max-w-xs mx-auto">
                  <div className="text-3xl font-bold text-gray-800 mb-1">
                    {results.score}%
                  </div>
                  <p className="text-gray-600 text-sm">
                    {results.correct_answers} of {results.total_questions} correct
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  {!results.passed && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuizState('intro');
                        setCurrentQuestionIndex(0);
                        setAnswers({});
                        setResults(null);
                      }}
                      size="sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      onComplete();
                      onClose();
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    size="sm"
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};