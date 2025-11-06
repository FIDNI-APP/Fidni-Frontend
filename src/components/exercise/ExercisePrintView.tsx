import React, { useEffect, useRef } from 'react';
import { Content } from '@/types';
import TipTapRenderer from '@/components/editor/TipTapRenderer';

interface ExercisePrintViewProps {
  exercise: Content;
  showSolution: boolean;
}

const ExercisePrintView: React.FC<ExercisePrintViewProps> = ({
  exercise,
  showSolution,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return 'Facile';
      case 'medium':
        return 'Moyen';
      case 'hard':
        return 'Difficile';
      default:
        return difficulty;
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.classList.add('tiptap-for-print');
    }
  }, []);

  return (
    <div ref={containerRef} className="exam-style-print">
      <style>{`
        @page {
          size: A4;
          margin: 2.5cm 2cm 3cm 2cm;
        }

        body, .exam-style-print {
          font-family: 'Times New Roman', 'Georgia', serif;
          color: #000;
          line-height: 1.55;
          background: white;
        }

        .exam-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid black;
          padding-bottom: 8px;
        }

        .exam-header .title {
          font-size: 20pt;
          font-weight: bold;
          text-transform: uppercase;
        }

        .exam-header .meta {
          font-size: 11pt;
          margin-top: 6px;
        }

        .exercise-section {
          margin-top: 30px;
          page-break-inside: avoid;
        }

        .exercise-section h2 {
          font-size: 13pt;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .exercise-meta {
          font-size: 10pt;
          font-style: italic;
          margin-bottom: 10px;
        }

        .exercise-content {
          font-size: 11.5pt;
          text-align: justify;
        }

        .solution-section {
          margin-top: 25px;
          border-top: 1px dashed #999;
          padding-top: 10px;
        }

        .solution-title {
          font-size: 12.5pt;
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 8px;
        }

        .solution-content {
          font-size: 11.5pt;
        }

        .katex { font-size: 1.05em; }

        .page-footer {
          position: fixed;
          bottom: 1cm;
          left: 0;
          right: 0;
          font-size: 9pt;
          text-align: center;
          color: #000;
        }

        .page-footer hr {
          border: none;
          border-top: 1px solid black;
          margin: 8px auto;
          width: 95%;
        }

        .page-footer .fin {
          font-style: italic;
          font-weight: bold;
          margin: 4px 0;
        }

        .page-footer .bottom-row {
          display: flex;
          justify-content: space-between;
          font-size: 8pt;
          margin: 0 1cm;
        }

        @media print {
          .page-footer { position: fixed; }
        }
      `}</style>

      {/* Header */}
      <div className="exam-header">
        <div className="title">{exercise.title}</div>
        <div className="meta">
          MP / MPI — Calculatrice autorisée<br />
          {formatDate(exercise.created_at)}
        </div>
      </div>

      {/* Exercise */}
      <div className="exercise-section">
        <h2>Énoncé</h2>
        <div className="exercise-meta">
          Matière : {exercise.subject?.name || 'Non spécifiée'} —
          Difficulté : {getDifficultyLabel(exercise.difficulty)}<br />
          Niveau : {exercise.class_levels?.[0]?.name || 'Non spécifié'}
        </div>

        <div className="exercise-content">
          <TipTapRenderer content={exercise.content} />
        </div>

        {showSolution && exercise.solution && (
          <div className="solution-section">
            <div className="solution-title">Solution</div>
            <div className="solution-content">
              <TipTapRenderer content={exercise.solution.content} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="page-footer">
        <hr />
        <div className="fin">• • • FIN • • •</div>
        <hr />
        <div className="bottom-row">
          <span>
            M{String(new Date().getFullYear()).slice(2)} — {new Date().toLocaleDateString('fr-FR')}
          </span>
          <span>Page 1/1</span>
          <span>© BY-NC-SA</span>
        </div>
      </div>
    </div>
  );
};

export { ExercisePrintView };
