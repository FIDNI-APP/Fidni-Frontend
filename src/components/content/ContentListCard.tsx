// src/components/content/ContentListCard.tsx
// Mirrors the HomeContentCard lavender design, with author edit/delete affordances.

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, MessageSquare } from 'lucide-react';
import type { VoteValue } from '@/types';
import type { ExerciseListItem, ExamListItem, LessonListItem } from '@/types/content';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import {
  exerciseContentAPI, examContentAPI, lessonContentAPI,
} from '@/lib/api';
import { ContentCardBanner, getSubjectTheme, DIFFICULTY_CFG } from './ContentCardBanner';
import { ExerciseRenderer } from './viewer/ExerciseRenderer';
import { LessonRenderer } from './viewer/LessonRenderer';
import type { FlexibleExerciseStructure } from './editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from './editor/FlexibleLessonEditor';

type StructuredListItem = ExerciseListItem | ExamListItem | LessonListItem;

interface ContentListCardProps {
  content: StructuredListItem;
  onVote?: (id: string, value: VoteValue) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onSave?: (id: string, saved: boolean) => void;
  contentType?: 'exercise' | 'lesson' | 'exam';
}

export const ContentListCard: React.FC<ContentListCardProps> = ({
  content,
  onVote,
  onDelete,
  onEdit,
  onSave,
  contentType = 'exercise',
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const isAuthor = user?.id === content.author?.id;

  const [isHovered, setIsHovered] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [userVote, setUserVote] = useState<1 | -1 | 0>(0);

  useEffect(() => {
    if ('user_save' in content) setIsSaved(Boolean(content.user_save));
    if ('vote_count' in content) setVoteCount(content.vote_count ?? 0);
    if ('user_vote' in content) setUserVote((content.user_vote as 1 | -1 | 0) ?? 0);
  }, [content]);

  const typeLabel = contentType === 'lesson' ? 'Leçon' : contentType === 'exam' ? 'Examen' : 'Exercice';
  const subjectName = content.subject?.name;
  const theme = getSubjectTheme(subjectName);
  const difficultyConfig = ('difficulty' in content && content.difficulty
    && content.difficulty in DIFFICULTY_CFG)
    ? DIFFICULTY_CFG[content.difficulty as 'easy' | 'medium' | 'hard']
    : null;
  const isSolved = ('user_complete' in content && (content as any).user_complete) ||
                   ('user_completed' in content && (content as any).user_completed);

  const className = content.class_levels?.[0]?.name;
  const author = content.author?.username || (content as any).author_name || '';

  const isNationalExam = 'is_national_exam' in content && (content as any).is_national_exam;
  const nationalYear = 'national_year' in content ? (content as any).national_year : undefined;

  // Truncated JSON-structure preview for the card body.
  const previewStructure = useMemo((): FlexibleExerciseStructure | FlexibleLessonStructure | null => {
    const structure = (content as any).structure;
    if (!structure || typeof structure !== 'object') return null;

    if (contentType === 'lesson') {
      if (!structure.sections || structure.sections.length === 0) return null;
      return { ...structure, sections: structure.sections.slice(0, 1) } as FlexibleLessonStructure;
    }
    if (!structure.blocks || structure.blocks.length === 0) return null;
    return { ...structure, blocks: structure.blocks.slice(0, 2) } as FlexibleExerciseStructure;
  }, [content, contentType]);

  const viewCount = content.view_count ?? 0;
  const commentCount = ('comment_count' in content) ? (content as any).comment_count ?? 0 : 0;

  const navigationPath = () => {
    const basePaths = { exercise: '/exercises', lesson: '/lessons', exam: '/exams' };
    return `${basePaths[contentType]}/${content.id}`;
  };

  const handleCardClick = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) return;
    navigate(navigationPath());
  };

  const getAPI = () => {
    switch (contentType) {
      case 'exam': return examContentAPI;
      case 'lesson': return lessonContentAPI;
      default: return exerciseContentAPI;
    }
  };

  const handleVote = async (value: VoteValue) => {
    if (!isAuthenticated) { openModal(); return; }
    try {
      const api = getAPI();
      const r = await api.vote(content.id.toString(), value);
      setVoteCount(r.vote_count);
      setUserVote(r.user_vote as 1 | -1 | 0);
      onVote?.(content.id.toString(), value);
    } catch (e) { console.error('Vote failed', e); }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { openModal(); return; }
    try {
      setIsSaving(true);
      const api = getAPI();
      if (isSaved) { await api.unsave(content.id.toString()); setIsSaved(false); }
      else { await api.save(content.id.toString()); setIsSaved(true); }
      onSave?.(content.id.toString(), !isSaved);
    } catch (e) { console.error('Save toggle failed', e); }
    finally { setIsSaving(false); }
  };

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
          isNationalExam={!!isNationalExam}
          nationalYear={nationalYear}
          isSaved={isSaved}
          isSaving={isSaving}
          onSave={handleSave}
          showOwnerActions={isAuthor}
          onEdit={onEdit ? (e) => { e.stopPropagation(); onEdit(content.id.toString()); } : undefined}
          onDelete={onDelete ? (e) => { e.stopPropagation(); onDelete(content.id.toString()); } : undefined}
        />

        {/* Body — JSON-structure preview with clean fade */}
        <div className="px-5 pt-3.5 pb-3 flex-1 flex flex-col gap-3 min-h-0">
          {previewStructure ? (
            <div
              className="card-preview-mode"
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

          <style>{`
            .card-preview-mode button { display: none !important; }
            .card-preview-mode [class*="border-green"] { display: none !important; }
            .card-preview-mode .katex-display { margin: .25em 0 !important; }
            .card-preview-mode h1,
            .card-preview-mode h2,
            .card-preview-mode h3 { font-size: 13px !important; margin-bottom: .35em !important; }
          `}</style>

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
          <div onClick={(e) => e.stopPropagation()}>
            <VoteButtons
              initialVotes={voteCount}
              onVote={handleVote}
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
            onClick={(e) => { e.stopPropagation(); navigate(navigationPath()); }}
          >
            {contentType === 'lesson' ? 'Lire' : 'Commencer'} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentListCard;
