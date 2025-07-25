// src/pages/learningpaths/ChapterQuiz.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronRight,
  Trophy,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuizQuestion } from '@/components/learningpath/QuizQuestion';
import { QuizResult } from '@/components/learningpath/QuizResult';
import { Progress } from '@/components/ui/progress';
import {
  getLearningPath,
  startQuizAttempt,
  submitQuizAttempt,
} from '@/lib/api/LearningPathApi';
import { 
  LearningPath, 
  PathChapter, 
  ChapterQuiz as ChapterQuizType,
  QuizQuestion as QuizQuestionType,
  QuizResult as QuizResultType
} from '@/types/index';

export const ChapterQuiz: React.FC = () => {
  const { pathId, chapterId } = useParams<{ pathId: string; chapterId: string }>();
  const navigate = useNavigate();
  
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [currentChapter, setCurrentChapter] = useState<PathChapter | null>(null);
  const [quiz, setQuiz] = useState<ChapterQuizType | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Quiz state
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionType[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | number[]>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResultType | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (pathId && chapterId) {
      fetchQuizData();
    }
  }, [pathId, chapterId]);

  useEffect(() => {
    // Timer countdown
    if (timeRemaining !== null && timeRemaining > 0 && !showResults) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      
      // Auto-submit when time runs out
      if (timeRemaining === 1) {
        handleSubmitQuiz();
      }
      
      return () => clearTimeout(timer);
    }
  }, [timeRemaining, showResults]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      const pathData = await getLearningPath(pathId!);
      setLearningPath(pathData);
      
      const chapter = pathData.path_chapters.find(ch => ch.id === chapterId);
      if (chapter && chapter.quiz) {
        setCurrentChapter(chapter);
        setQuiz(chapter.quiz);
      }
    } catch (err) {
      console.error('Failed to fetch quiz data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    if (!quiz) return;
    
    try {
      const response = await startQuizAttempt(quiz.id);
      setAttemptId(response.attempt_id);
      setQuestions(response.questions);
      
      if (response.time_limit_minutes) {
        setTimeRemaining(response.time_limit_minutes * 60);
      }
    } catch (err) {
      console.error('Failed to start quiz:', err);
    }
  };

  const handleAnswerQuestion = (questionId: string, answer: number | number[]) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quiz || !attemptId) return;
    
    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: questionId,
        ...(Array.isArray(answer) 
          ? { answer_indices: answer }
          : { answer_index: answer }
        )
      }));
      
      const result = await submitQuizAttempt(quiz.id, {
        attempt_id: attemptId,
        answers: formattedAnswers
      });
      
      setQuizResult(result);
      setShowResults(true);
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    }
  };

  const handleRetryQuiz = () => {
    setAttemptId(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeRemaining(null);
    setQuizResult(null);
    setShowResults(false);
    startQuiz();
  };

  const handleNextChapter = () => {
    if (!learningPath) return;
    
    const currentChapterIndex = learningPath.path_chapters.findIndex(ch => ch.id === chapterId);
    if (currentChapterIndex < learningPath.path_chapters.length - 1) {
      const nextChapter = learningPath.path_chapters[currentChapterIndex + 1];
      if (nextChapter.videos.length > 0) {
        navigate(`/learning-paths/${pathId}/chapters/${nextChapter.id}/videos/${nextChapter.videos[0].id}`);
      }
    } else {
      navigate(`/learning-paths/${pathId}`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600">Quiz not found</p>
          <Button 
            onClick={() => navigate(`/learning-paths/${pathId}`)}
            className="mt-4"
          >
            Back to Learning Path
          </Button>
        </div>
      </div>
    );
  }

  // Show results
  if (showResults && quizResult) {
    return (
      <QuizResult
        result={quizResult}
        quiz={quiz}
        questions={questions}
        answers={answers}
        onRetry={handleRetryQuiz}
        onContinue={handleNextChapter}
        pathId={pathId!}
      />
    );
  }

  // Show quiz start screen
  if (!attemptId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/learning-paths/${pathId}`)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Learning Path
          </Button>
          
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-indigo-600" />
              </div>
              
              <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-gray-600 mb-6">{quiz.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 mb-8 text-left max-w-sm mx-auto">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {quiz.time_limit_minutes 
                      ? `${quiz.time_limit_minutes} minutes`
                      : 'No time limit'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {quiz.questions.length} questions
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Pass: {quiz.passing_score}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {currentChapter?.user_progress?.quiz_attempts || 0} attempts
                  </span>
                </div>
              </div>
              
              {currentChapter?.user_progress?.quiz_score && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Your best score: <strong>{currentChapter.user_progress.quiz_score}%</strong>
                  </p>
                </div>
              )}
              
              <Button
                size="lg"
                onClick={startQuiz}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Start Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show quiz questions
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Quiz Header */}
// src/pages/learningpaths/ChapterQuiz.tsx (continued)
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{quiz.title}</h2>
              {timeRemaining !== null && (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                  timeRemaining < 60 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                )}>
                  <Clock className="w-4 h-4" />
                  {formatTime(timeRemaining)}
                </div>
              )}
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question */}
          <QuizQuestion
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            onAnswer={(answer) => handleAnswerQuestion(currentQuestion.id, answer)}
            userAnswer={answers[currentQuestion.id]}
          />

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <span className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>

            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmitQuiz}
                className="bg-green-600 hover:bg-green-700"
                disabled={Object.keys(answers).length < questions.length}
              >
                Submit Quiz
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleNextQuestion}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Question Navigation Grid */}
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Question Navigation</h3>
            <div className="grid grid-cols-10 gap-2">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                    currentQuestionIndex === index 
                      ? "bg-indigo-600 text-white" 
                      : answers[q.id] !== undefined
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};