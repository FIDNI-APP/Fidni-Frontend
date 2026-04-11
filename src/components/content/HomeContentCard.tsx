// src/components/HomeContentCard.tsx - Premium Redesign v2
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Loader2,
  ArrowRight,
  Eye,
  Sparkles,
  FileText,
  TrendingUp
} from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { Content, VoteValue, Difficulty } from '@/types';
import type { StructuredExerciseListItem, StructuredExamListItem, StructuredLessonListItem } from '@/types/structured';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import { ContentPreview } from '@/components/editor';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { ExerciseRenderer } from './viewer/ExerciseRenderer';
import { LessonRenderer } from './viewer/LessonRenderer';
import type { FlexibleExerciseStructure } from './editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from './editor/FlexibleLessonEditor';
import { useMemo } from 'react';
import {
  saveExercise, unsaveExercise,
  saveLesson, unsaveLesson,
  saveExam, unsaveExam
} from '@/lib/api';

type StructuredListItem = StructuredExerciseListItem | StructuredExamListItem | StructuredLessonListItem;

interface HomeContentCardProps {
  content: Content | StructuredListItem;
  onVote: (id: string, value: VoteValue, contentType?: 'exercise' | 'lesson' | 'exam') => void;
  onSave?: (id: string, saved: boolean) => void;
}

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

  // Check if content has structure field (for rendering content preview)
  const hasStructure = 'structure' in content && content.structure !== null;

  useEffect(() => {
    if (content && 'user_save' in content && content.user_save !== undefined) {
      setIsSaved(content.user_save);
    }
  }, [content]);

  const getContentType = (): 'exercise' | 'lesson' | 'exam' => {
    if ('is_national_exam' in content) return 'exam';
    if ('difficulty' in content && content.difficulty) return 'exercise';
    return 'lesson';
  };

  const getNavigationPath = () => {
    const contentType = getContentType();
    const basePaths = {
      exercise: '/structured/exercises',
      lesson: '/structured/lessons',
      exam: '/structured/exams'
    };
    return `${basePaths[contentType]}/${content.id}`;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    navigate(getNavigationPath());
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openModal();
      return;
    }

    try {
      setIsSaving(true);
      const contentType = getContentType();
      const contentId = content.id.toString();

      if (isSaved) {
        const unsaveFn = contentType === 'lesson' ? unsaveLesson : contentType === 'exam' ? unsaveExam : unsaveExercise;
        await unsaveFn(contentId);
        setIsSaved(false);
      } else {
        const saveFn = contentType === 'lesson' ? saveLesson : contentType === 'exam' ? saveExam : saveExercise;
        await saveFn(contentId);
        setIsSaved(true);
      }

      if (onSave) onSave(contentId, !isSaved);
    } catch (error) {
      console.error("Error toggling save status:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getDifficultyConfig = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return {
          label: 'Facile',
          bgClass: 'bg-emerald-500/10',
          textClass: 'text-emerald-700',
          borderClass: 'border-emerald-500/20',
          dotClass: 'bg-emerald-500'
        };
      case 'medium':
        return {
          label: 'Moyen',
          bgClass: 'bg-amber-500/10',
          textClass: 'text-amber-700',
          borderClass: 'border-amber-500/20',
          dotClass: 'bg-amber-500'
        };
      case 'hard':
        return {
          label: 'Difficile',
          bgClass: 'bg-rose-500/10',
          textClass: 'text-rose-700',
          borderClass: 'border-rose-500/20',
          dotClass: 'bg-rose-500'
        };
      default:
        return {
          label: difficulty,
          bgClass: 'bg-slate-500/10',
          textClass: 'text-slate-700',
          borderClass: 'border-slate-500/20',
          dotClass: 'bg-slate-500'
        };
    }
  };

  const getContentTypeConfig = () => {
    const contentType = getContentType();
    switch (contentType) {
      case 'lesson':
        return {
          icon: LessonIcon,
          label: 'Leçon',
          gradient: 'from-indigo-600 to-indigo-700',
          accentBg: 'bg-indigo-600',
          accentText: 'text-indigo-600',
          lightBg: 'bg-indigo-50',
          hoverGlow: 'hover:shadow-indigo-500/20'
        };
      case 'exam':
        return {
          icon: APlusIcon,
          label: 'Examen',
          gradient: 'from-violet-600 to-violet-700',
          accentBg: 'bg-violet-600',
          accentText: 'text-violet-600',
          lightBg: 'bg-violet-50',
          hoverGlow: 'hover:shadow-violet-500/20'
        };
      default:
        return {
          icon: FileText,
          label: 'Exercice',
          gradient: 'from-blue-600 to-blue-700',
          accentBg: 'bg-blue-600',
          accentText: 'text-blue-600',
          lightBg: 'bg-blue-50',
          hoverGlow: 'hover:shadow-blue-500/20'
        };
    }
  };

  const typeConfig = getContentTypeConfig();
  const difficultyConfig = ('difficulty' in content && content.difficulty) ? getDifficultyConfig(content.difficulty) : null;
  const TypeIcon = typeConfig.icon;

  const contentType = getContentType();

  // Create truncated structure for preview
  const previewStructure = useMemo((): FlexibleExerciseStructure | FlexibleLessonStructure | null => {
    if (!hasStructure || !('structure' in content)) return null;
    const structure = content.structure as any;
    if (!structure) return null;

    // Lessons have sections, exercises/exams have blocks
    if (contentType === 'lesson') {
      if (!structure.sections || structure.sections.length === 0) return null;
      return { ...structure, sections: structure.sections.slice(0, 2) };
    }

    if (!structure.blocks || structure.blocks.length === 0) return null;
    return { ...structure, blocks: structure.blocks.slice(0, 4) };
  }, [content, hasStructure, contentType]);

  return (
    <div
      className="group cursor-pointer h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div 
        className={`
          relative bg-white rounded-2xl overflow-hidden h-full flex flex-col
          border border-slate-200/80 
          transition-all duration-300 ease-out
          ${isHovered ? 'shadow-xl shadow-slate-900/10 -translate-y-1 border-slate-300' : 'shadow-md shadow-slate-900/5'}
          ${typeConfig.hoverGlow}
        `}
      >
        {/* Top accent line */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${typeConfig.gradient}`} />

        {/* Card Header */}
        <div className="p-5 pb-3">
          {/* Type badge + Bookmark row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              {/* Content type badge */}
              <div className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                ${typeConfig.lightBg} ${typeConfig.accentText}
                text-xs font-semibold tracking-wide
              `}>
                <TypeIcon className="w-3.5 h-3.5" />
                <span>{typeConfig.label}</span>
              </div>

              {/* ID badge */}
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
                #{content.id}
              </span>
            </div>

            {/* Bookmark button - Only show for old format with user_save */}
            {!hasStructure && (
              <button
                onClick={handleSaveClick}
                className={`
                  flex-shrink-0 p-2 rounded-xl transition-all duration-200
                  ${isSaved 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                  }
                `}
                aria-label={isSaved ? "Retirer" : "Sauvegarder"}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                )}
              </button>
            )}
          </div>

          {/* Title */}
          <h3 className="text-slate-900 font-bold text-lg leading-snug line-clamp-2 mb-3 group-hover:text-slate-700 transition-colors">
            {content.title}
          </h3>

          {/* Tags row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Subject */}
            {content.subject && (
              <span className="inline-flex items-center px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold">
                {typeof content.subject === 'string' ? content.subject : content.subject.name}
              </span>
            )}

            {/* Difficulty */}
            {difficultyConfig && (
              <span className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border
                ${difficultyConfig.bgClass} ${difficultyConfig.textClass} ${difficultyConfig.borderClass}
              `}>
                <span className={`w-1.5 h-1.5 rounded-full ${difficultyConfig.dotClass}`} />
                {difficultyConfig.label}
              </span>
            )}

            {/* Class level */}
            {content.class_levels && content.class_levels.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                {typeof content.class_levels[0] === 'string' ? content.class_levels[0] : content.class_levels[0].name}
              </span>
            )}
          </div>
        </div>

        {/* Content Preview */}
        <div className="px-5 pb-3 flex-1 min-h-0">
          <div className="relative rounded-xl bg-slate-50/80 border border-slate-100 p-3 overflow-hidden max-h-48">
            {!hasStructure && 'content' in content ? (
              <ContentPreview
                content={content.content}
                maxHeight={120}
                className="text-slate-900"
              />
            ) : previewStructure ? (
              <div className="card-preview-mode text-sm">
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
              <p className="text-sm text-slate-400 italic">Aucun contenu</p>
            )}
            {/* Fade gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50/80 to-transparent pointer-events-none" />
          </div>
          {/* Hide solution buttons in preview */}
          <style>{`
            .card-preview-mode button { display: none !important; }
            .card-preview-mode [class*="border-green"] { display: none !important; }
          `}</style>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 mt-auto border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            {/* Left: Stats */}
            <div className="flex items-center gap-3">
              {/* Vote buttons - only for old format */}
              {!hasStructure && 'vote_count' in content && (
                <div onClick={(e) => e.stopPropagation()}>
                  <VoteButtons
                    initialVotes={content.vote_count}
                    onVote={(value) => {
                      const contentType = getContentType();
                      onVote(content.id.toString(), value, contentType);
                    }}
                    vertical={false}
                    userVote={'user_vote' in content ? content.user_vote : 0}
                    size="sm"
                  />
                </div>
              )}

              {/* View count */}
              <div className="flex items-center gap-1.5 text-slate-500">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">{content.view_count}</span>
              </div>
            </div>

            {/* Right: CTA */}
            <div 
              className={`
                inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                text-sm font-semibold transition-all duration-200
                ${typeConfig.accentBg} text-white
                group-hover:shadow-lg group-hover:scale-105
              `}
            >
              <span>Voir</span>
              <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${isHovered ? 'translate-x-0.5' : ''}`} />
            </div>
          </div>
        </div>

        {/* Hover shine effect */}
        <div 
          className={`
            absolute inset-0 pointer-events-none
            bg-gradient-to-br from-white/0 via-white/0 to-white/0
            group-hover:from-white/5 group-hover:via-transparent group-hover:to-transparent
            transition-all duration-500
          `}
        />
      </div>
    </div>
  );
};