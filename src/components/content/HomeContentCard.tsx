// src/components/HomeContentCard.tsx - Lavender redesign (clean truncation)
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, MessageSquare } from 'lucide-react';
import { Content, VoteValue } from '@/types';
import type { ExerciseListItem, ExamListItem, LessonListItem } from '@/types/content';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import {
  saveExercise, unsaveExercise,
  saveLesson, unsaveLesson,
  saveExam, unsaveExam
} from '@/lib/api';
import {
  ContentCardBanner, getSubjectTheme, DIFFICULTY_CFG,
} from './ContentCardBanner';
import { ExerciseRenderer } from './viewer/ExerciseRenderer';
import { LessonRenderer } from './viewer/LessonRenderer';
import type { FlexibleExerciseStructure } from './editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from './editor/FlexibleLessonEditor';

type StructuredListItem = ExerciseListItem | ExamListItem | LessonListItem;

interface HomeContentCardProps {
  content: Content | StructuredListItem;
  onVote: (id: string, value: VoteValue, contentType?: 'exercise' | 'lesson' | 'exam') => void;
  onSave?: (id: string, saved: boolean) => void;
}

// Subject → gradient theme. Falls back to indigo (Analyse).
export const HomeContentCard: React.FC<HomeContentCardProps> = ({
  content,
  onVote,
  onSave
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const [isHovered, setIsHovered] = useState(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (content && 'user_save' in content && content.user_save !== undefined) {
      setIsSaved(content.user_save);
    }
  }, [content]);

  const getContentType = (): 'exercise' | 'lesson' | 'exam' => {
    const t = (content as any).type;
    if (t === 'exam' || t === 'exercise' || t === 'lesson') return t;
    if ('is_national_exam' in content && (content as any).is_national_exam !== undefined && (content as any).difficulty !== undefined) return 'exam';
    if ('difficulty' in content && (content as any).difficulty) return 'exercise';
    return 'lesson';
  };

  const getNavigationPath = () => {
    const contentType = getContentType();
    const basePaths = { exercise: '/exercises', lesson: '/lessons', exam: '/exams' };
    return `${basePaths[contentType]}/${content.id}`;
  };

  const handleCardClick = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    navigate(getNavigationPath());
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { openModal(); return; }
    try {
      setIsSaving(true);
      const contentType = getContentType();
      const contentId = content.id.toString();
      if (isSaved) {
        const fn = contentType === 'lesson' ? unsaveLesson : contentType === 'exam' ? unsaveExam : unsaveExercise;
        await fn(contentId);
        setIsSaved(false);
      } else {
        const fn = contentType === 'lesson' ? saveLesson : contentType === 'exam' ? saveExam : saveExercise;
        await fn(contentId);
        setIsSaved(true);
      }
      if (onSave) onSave(contentId, !isSaved);
    } catch (error) {
      console.error('Error toggling save status:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const contentType = getContentType();
  const typeLabel = contentType === 'lesson' ? 'Leçon' : contentType === 'exam' ? 'Examen' : 'Exercice';

  const subjectName = content.subject
    ? (typeof content.subject === 'string' ? content.subject : content.subject.name)
    : '';
  const theme = getSubjectTheme(subjectName);
  const difficultyConfig = ('difficulty' in content && content.difficulty
    && (content.difficulty in DIFFICULTY_CFG))
    ? DIFFICULTY_CFG[content.difficulty as 'easy' | 'medium' | 'hard']
    : null;

  const isSolved = ('user_complete' in content && (content as any).user_complete) ||
                   ('user_completed' in content && (content as any).user_completed);

  // Truncated JSON structure preview (first 1-2 blocks for exercises/exams,
  // first section for lessons). Rendered with the structured renderer so
  // math, lists, and formatting display correctly — not stripped to plain text.
  const previewStructure = useMemo((): FlexibleExerciseStructure | FlexibleLessonStructure | null => {
    if (!('structure' in content)) return null;
    const structure = (content as any).structure;
    if (!structure || typeof structure !== 'object') return null;

    if (contentType === 'lesson') {
      if (!structure.sections || structure.sections.length === 0) return null;
      return { ...structure, sections: structure.sections.slice(0, 1) } as FlexibleLessonStructure;
    }

    if (!structure.blocks || structure.blocks.length === 0) return null;
    return { ...structure, blocks: structure.blocks.slice(0, 2) } as FlexibleExerciseStructure;
  }, [content, contentType]);

  const author = (content as any).author?.username || (content as any).author_name || '';
  const className = content.class_levels && content.class_levels.length > 0
    ? (typeof content.class_levels[0] === 'string' ? content.class_levels[0] : content.class_levels[0].name)
    : '';

  const voteCount = (content as any).vote_count ?? 0;
  const userVote = (content as any).user_vote ?? 0;
  const viewCount = content.view_count ?? 0;
  const commentCount = (content as any).comment_count ?? 0;

  return (
    <div
      className="group cursor-pointer h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div
        className="fd-card h-full flex flex-col overflow-hidden"
        style={isHovered ? { boxShadow: `0 14px 40px ${theme.glow}` } : undefined}
      >
        <ContentCardBanner
          title={content.title}
          subjectName={subjectName}
          typeLabel={typeLabel}
          theme={theme}
          difficulty={difficultyConfig}
          isSolved={!!isSolved}
          isSaved={isSaved}
          isSaving={isSaving}
          onSave={handleSaveClick}
        />

        {/* Body — structured preview with clean fade, no nested box */}
        <div className="px-5 pt-3.5 pb-3 flex-1 flex flex-col gap-3 min-h-0">
          {previewStructure ? (
            <div
              className="card-preview-mode"
              // Stop clicks on the preview from bubbling into the card-click navigate.
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1,
                minHeight: 0,
                position: 'relative',
                maxHeight: 120,
                overflow: 'hidden',
                fontSize: 12,
                color: '#4b4880',
                lineHeight: 1.5,
                pointerEvents: 'none',
                WebkitMaskImage: 'linear-gradient(to bottom, #000 65%, transparent 100%)',
                maskImage: 'linear-gradient(to bottom, #000 65%, transparent 100%)',
              }}
            >
              {contentType === 'lesson' ? (
                <LessonRenderer structure={previewStructure as FlexibleLessonStructure} />
              ) : (
                <ExerciseRenderer
                  structure={previewStructure as FlexibleExerciseStructure}
                  interactive={false}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0" />
          )}

          {/* Hide solution buttons / interactive controls inside the preview */}
          <style>{`
            .card-preview-mode button { display: none !important; }
            .card-preview-mode [class*="border-green"] { display: none !important; }
            .card-preview-mode .katex-display { margin: .25em 0 !important; }
            .card-preview-mode h1,
            .card-preview-mode h2,
            .card-preview-mode h3 { font-size: 13px !important; margin-bottom: .35em !important; }
          `}</style>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 11, color: '#9391b8' }}>
            {author && <span>{author}</span>}
            {className && (
              <>
                {author && <span>·</span>}
                <span style={{
                  background: theme.light, color: theme.text,
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                }}>
                  {className}
                </span>
              </>
            )}
            {viewCount > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {viewCount}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ borderTop: '1px solid #f0effe' }}
        >
          {/* Vote pill */}
          <div onClick={(e) => e.stopPropagation()}>
            <VoteButtons
              initialVotes={voteCount}
              onVote={(value) => onVote(content.id.toString(), value, contentType)}
              vertical={false}
              userVote={userVote}
              size="sm"
            />
          </div>

          {commentCount > 0 && (
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="fd-btn-ghost"
              style={{ padding: '5px 10px' }}
            >
              <MessageSquare className="w-3 h-3" /> {commentCount}
            </button>
          )}

          <div className="flex-1" />

          <button
            type="button"
            className="fd-btn-primary"
            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 9 }}
            onClick={(e) => { e.stopPropagation(); navigate(getNavigationPath()); }}
          >
            Commencer <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Hide solution buttons inside preview */}
        <style>{`
          .card-preview-mode button { display: none !important; }
          .card-preview-mode [class*="border-green"] { display: none !important; }
        `}</style>
      </div>
    </div>
  );
};
