import React, { useEffect, useRef } from 'react';
import { Exam } from '@/types';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import 'katex/dist/katex.min.css';

interface ExamPrintViewProps {
  exam: Exam;
}

/**
 * A specialized component for printing exams with LaTeX support
 * This component renders the exam content in a print-friendly format
 * with proper LaTeX rendering using TipTapRenderer
 */
export const ExamPrintView: React.FC<ExamPrintViewProps> = ({ exam }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Format date function
  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  // Get difficulty label
  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'Facile';
      case 'medium': return 'Moyen';
      case 'hard': return 'Difficile';
      default: return difficulty;
    }
  };
  
  // This effect ensures LaTeX content is properly rendered
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.classList.add('tiptap-for-print');
    }
  }, []);

  return (
    <div className="exam-print-container" ref={containerRef}>
      <h1 className="exam-title">{exam.title}</h1>
      
      {exam.is_national_exam && (
        <div className="text-center mb-4">
          <p className="font-bold text-lg">🇫🇷 EXAMEN NATIONAL OFFICIEL 🇫🇷</p>
          {exam.national_date && (
            <p className="font-semibold">{formatDate(exam.national_date)}</p>
          )}
        </div>
      )}
      
      <div className="exam-metadata">
        <div>Niveau: {exam.class_levels?.[0]?.name || 'Non spécifié'}</div>
        <div>Matière: {exam.subject?.name || 'Non spécifiée'}</div>
        <div>Difficulté: {getDifficultyLabel(exam.difficulty)}</div>
        <div>Date de création: {formatDate(exam.created_at)}</div>
        {exam.is_national_exam && exam.national_date && (
          <div>Date d'examen: {formatDate(exam.national_date)}</div>
        )}
      </div>
      
      <div className="exam-content">
        {/* Using TipTapRenderer ensures LaTeX is properly rendered */}
        <TipTapRenderer 
          content={exam.content} 
          className="print-content-body"
        />
      </div>
      
      <div className="print-footer">
        <p>Examen proposé par {exam.author.username} • Imprimé le {new Date().toLocaleDateString()}</p>
        <p>ExercicesMaths.ma</p>
      </div>
    </div>
  );
};

export default ExamPrintView;