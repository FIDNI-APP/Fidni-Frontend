// src/components/learningpath/QuizQuestion.tsx
import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { QuizQuestion as QuizQuestionType } from '@/types/index';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

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
      default: return 'text-ink-soft bg-[#faf9f7]';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      {/* Question Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-faint">
            {t('Question {n} of {total}', { n: questionNumber, total: totalQuestions })}
          </span>
          <span className={cn(
            "px-2 py-1 rounded text-xs font-medium capitalize",
            getDifficultyColor()
          )}>
            {t(question.difficulty)}
          </span>
          <span className="text-xs text-ink-faint">
            {question.points !== 1 ? t('{n} points', { n: question.points }) : t('{n} point', { n: question.points })}
          </span>
        </div>
      </div>

      {/* Question Text */}
      <h3 className="text-lg font-medium text-ink mb-6">
        {question.question_text}
      </h3>

      {/* Instructions for multiple select */}
      {question.question_type === 'multiple_select' && (
        <p className="text-sm text-ink-soft mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {t('Plusieurs réponses possibles')}
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
                "w-full text-start p-4 rounded-lg border-2 transition-all",
                showResult && correct && "border-green-500 bg-green-50",
                showResult && selected && !correct && "border-red-500 bg-red-50",
                !showResult && (
                  question.question_type === 'multiple_select'
                    ? (selectedAnswer as number[]).includes(index)
                    : selectedAnswer === index
                ) && "border-brand bg-brand-soft",
                !showResult && "hover:bg-[#faf9f7] border-line",
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
                      <div className="w-5 h-5 rounded-full border-2 border-[#d8d4cc]" />
                    )
                  ) : question.question_type === 'multiple_select' ? (
                    <input
                      type="checkbox"
                      checked={(selectedAnswer as number[]).includes(index)}
                      onChange={() => {}}
                      className="w-5 h-5 text-brand"
                    />
                  ) : (
                    <input
                      type="radio"
                      checked={selectedAnswer === index}
                      onChange={() => {}}
                      className="w-5 h-5 text-brand"
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
        <div className="mt-6 p-4 bg-brand-soft border border-brand-line rounded-lg">
          <h4 className="font-medium text-brand-hover mb-2">{t('Explication')}</h4>
          <p className="text-sm text-brand-hover">{question.explanation}</p>
        </div>
      )}
    </div>
  );
};