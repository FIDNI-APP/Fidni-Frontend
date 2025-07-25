// src/components/learningpath/QuizQuestion.tsx
import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { QuizQuestion as QuizQuestionType } from '@/types/index';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuizQuestionProps {
  question: QuizQuestionType;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: number | number[]) => void;
  showResult?: boolean;
  userAnswer?: number | number[];
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  showResult = false,
  userAnswer
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | number[]>(
    userAnswer || (question.question_type === 'multiple_select' ? [] : -1)
  );

  const handleSingleChoice = (index: number) => {
    setSelectedAnswer(index);
    if (!showResult) {
      onAnswer(index);
    }
  };

  const handleMultipleChoice = (index: number) => {
    const current = selectedAnswer as number[];
    const updated = current.includes(index)
      ? current.filter(i => i !== index)
      : [...current, index];
    
    setSelectedAnswer(updated);
    if (!showResult) {
      onAnswer(updated);
    }
  };

  const isCorrect = (index: number) => {
    if (!showResult) return null;
    
    if (question.question_type === 'multiple_select') {
      const correctIndices = question.correct_answer_indices || [];
      const userIndices = userAnswer as number[] || [];
      return correctIndices.includes(index);
    } else {
      return index === question.correct_answer_index;
    }
  };

  const isUserSelected = (index: number) => {
    if (question.question_type === 'multiple_select') {
      return (userAnswer as number[] || []).includes(index);
    } else {
      return userAnswer === index;
    }
  };

  const getDifficultyColor = () => {
    switch (question.difficulty) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'hard': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      {/* Question Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className={cn(
            "px-2 py-1 rounded text-xs font-medium capitalize",
            getDifficultyColor()
          )}>
            {question.difficulty}
          </span>
          <span className="text-xs text-gray-500">
            {question.points} point{question.points !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Question Text */}
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        {question.question_text}
      </h3>

      {/* Instructions for multiple select */}
      {question.question_type === 'multiple_select' && (
        <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Select all that apply
        </p>
      )}

      {/* Answer Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const correct = isCorrect(index);
          const selected = isUserSelected(index);
          
          return (
            <button
              key={index}
              onClick={() => {
                if (!showResult) {
                  if (question.question_type === 'multiple_select') {
                    handleMultipleChoice(index);
                  } else {
                    handleSingleChoice(index);
                  }
                }
              }}
              disabled={showResult}
              className={cn(
                "w-full text-left p-4 rounded-lg border-2 transition-all",
                showResult && correct && "border-green-500 bg-green-50",
                showResult && selected && !correct && "border-red-500 bg-red-50",
                !showResult && (
                  question.question_type === 'multiple_select'
                    ? (selectedAnswer as number[]).includes(index)
                    : selectedAnswer === index
                ) && "border-indigo-500 bg-indigo-50",
                !showResult && "hover:bg-gray-50 border-gray-200",
                showResult && "cursor-default"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {showResult ? (
                    correct ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : selected ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )
                  ) : question.question_type === 'multiple_select' ? (
                    <input
                      type="checkbox"
                      checked={(selectedAnswer as number[]).includes(index)}
                      onChange={() => {}}
                      className="w-5 h-5 text-indigo-600"
                    />
                  ) : (
                    <input
                      type="radio"
                      checked={selectedAnswer === index}
                      onChange={() => {}}
                      className="w-5 h-5 text-indigo-600"
                    />
                  )}
                </div>
                <span className={cn(
                  "flex-1",
                  showResult && correct && "font-medium text-green-700",
                  showResult && selected && !correct && "text-red-700"
                )}>
                  {option}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation (shown after answer) */}
      {showResult && question.explanation && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Explanation</h4>
          <p className="text-sm text-blue-800">{question.explanation}</p>
        </div>
      )}
    </div>
  );
};