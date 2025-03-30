import React, { useEffect, useRef } from 'react';
import { Content } from '@/types';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import 'katex/dist/katex.min.css';

interface ExercisePrintViewProps {
  exercise: Content;
  showSolution: boolean;
}

/**
 * A specialized component for printing exercises with LaTeX support
 * This component renders the exercise content in a print-friendly format
 * with proper LaTeX rendering using TipTapRenderer
 */
export const ExercisePrintView: React.FC<ExercisePrintViewProps> = ({
  exercise,
  showSolution
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Format date function
  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
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
  // even if KaTeX needs to re-render in the print component
  useEffect(() => {
    // If we need to re-render LaTeX, this would be a good place
    // But TipTapRenderer should handle this automatically
    
    // Apply special print styles to the container
    if (containerRef.current) {
      containerRef.current.classList.add('tiptap-for-print');
    }
  }, []);

  return (
    <div className="exercise-print-container" ref={containerRef}>
      <h1 className="exercise-title">{exercise.title}</h1>
      
      <div className="exercise-metadata">
        <div>Niveau: {exercise.class_levels?.[0]?.name || 'Non spécifié'}</div>
        <div>Matière: {exercise.subject?.name || 'Non spécifiée'}</div>
        <div>Difficulté: {getDifficultyLabel(exercise.difficulty)}</div>
        <div>Date: {formatDate(exercise.created_at)}</div>
      </div>
      
      <div className="exercise-content">
        {/* Using TipTapRenderer ensures LaTeX is properly rendered */}
        <TipTapRenderer 
          content={exercise.content} 
          className="print-content-body"
        />
      </div>
      
      {exercise.solution && showSolution && (
        <div className="solution-section">
          <h2 className="solution-title">Solution</h2>
          <div className="solution-content">
            <TipTapRenderer 
              content={exercise.solution.content} 
              className="print-solution-body"
            />
          </div>
        </div>
      )}
      
      <div className="print-footer">
        <p>Exercice proposé par {exercise.author.username} • Imprimé le {new Date().toLocaleDateString()}</p>
        <p>ExercicesMaths.ma</p>
      </div>
    </div>
  );
};

export default ExercisePrintView;