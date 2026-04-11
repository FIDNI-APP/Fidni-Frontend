/**
 * ContentCard - Card component for exercises/exams/lessons
 * Uses same renderer as detail page but truncated to first blocks
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  FileText,
  Bookmark,
  Loader2,
  MessageSquare,
  BookOpen,
} from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { ExerciseRenderer } from './viewer/ExerciseRenderer';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import type { Difficulty, VoteValue } from '@/types';
import type { StructuredExerciseListItem, StructuredExamListItem, StructuredLessonListItem } from '@/types/structured';
import type { FlexibleExerciseStructure } from './editor/FlexibleExerciseEditor';
import { structuredExerciseAPI, structuredExamAPI, structuredLessonAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';

type StructuredListItem = StructuredExerciseListItem | StructuredExamListItem | StructuredLessonListItem;

interface ContentCardProps {
  item: StructuredListItem;
  contentType: 'exercise' | 'exam' | 'lesson';
  onVote?: (id: string, value: VoteValue, contentType: 'exercise' | 'exam' | 'lesson') => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  contentType,
  onVote,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const [isHovered, setIsHovered] = useState(false);
  const [isSaved, setIsSaved] = useState<boolean>('user_save' in item ? Boolean(item.user_save) : false);
  const [isSaving, setIsSaving] = useState(false);
  const [voteCount, setVoteCount] = useState<number>('vote_count' in item ? (item.vote_count ?? 0) : 0);
  const [userVote, setUserVote] = useState<1 | -1 | 0>('user_vote' in item ? (item.user_vote as 1 | -1 | 0 ?? 0) : 0);

  const getAPI = () => {
    switch (contentType) {
      case 'exercise': return structuredExerciseAPI;
      case 'exam': return structuredExamAPI;
      case 'lesson': return structuredLessonAPI;
    }
  };

  const handleVote = async (value: VoteValue) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    try {
      const api = getAPI();
      const response = await api.vote(item.id.toString(), value);
      setVoteCount(response.vote_count);
      setUserVote(response.user_vote as 1 | -1 | 0);
      if (onVote) {
        onVote(item.id.toString(), value, contentType);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openModal();
      return;
    }

    try {
      setIsSaving(true);
      const api = getAPI();
      if (isSaved) {
        await api.unsave(item.id.toString());
        setIsSaved(false);
      } else {
        await api.save(item.id.toString());
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getNavigationPath = () => {
    const basePaths = {
      exercise: '/exercises',
      lesson: '/lessons',
      exam: '/exams'
    };
    return `${basePaths[contentType]}/${item.id}`;
  };

  const handleCardClick = () => {
    navigate(getNavigationPath());
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
    switch (contentType) {
      case 'lesson':
        return {
          icon: LessonIcon,
          label: 'Lecon',
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
  const TypeIcon = typeConfig.icon;

  // Get difficulty if available
  const difficulty = 'difficulty' in item ? item.difficulty : undefined;
  const difficultyConfig = difficulty ? getDifficultyConfig(difficulty) : null;

  // Exam specific
  const isNationalExam = 'is_national_exam' in item ? item.is_national_exam : false;
  const nationalYear = 'national_year' in item ? item.national_year : undefined;

  // Create truncated structure for preview (first 3 blocks max)
  const previewStructure = useMemo((): FlexibleExerciseStructure | null => {
    const structure = item.structure as FlexibleExerciseStructure | undefined;
    if (!structure || !structure.blocks || structure.blocks.length === 0) {
      return null;
    }
    // Take first 3 blocks for preview
    return {
      ...structure,
      blocks: structure.blocks.slice(0, 3)
    };
  }, [item.structure]);

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
          {/* Type badge row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Content type badge */}
              <div className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                ${typeConfig.lightBg} ${typeConfig.accentText}
                text-xs font-semibold tracking-wide
              `}>
                <TypeIcon className="w-3.5 h-3.5" />
                <span>{typeConfig.label}</span>
              </div>

              {/* Difficulty - next to type badge */}
              {difficultyConfig && (
                <span className={`
                  inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border
                  ${difficultyConfig.bgClass} ${difficultyConfig.textClass} ${difficultyConfig.borderClass}
                `}>
                  <span className={`w-1.5 h-1.5 rounded-full ${difficultyConfig.dotClass}`} />
                  {difficultyConfig.label}
                </span>
              )}

              {/* National exam badge */}
              {isNationalExam && (
                <span className="inline-flex items-center px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">
                  National {nationalYear}
                </span>
              )}
            </div>

            {/* Bookmark button */}
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
          </div>

          {/* Title */}
          <h3 className="text-slate-900 font-bold text-lg leading-snug line-clamp-2 mb-3 group-hover:text-slate-700 transition-colors">
            {item.title}
          </h3>

          {/* Tags row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Subject */}
            {item.subject && (
              <span className="inline-flex items-center px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold">
                {item.subject.name}
              </span>
            )}

            {/* Class level */}
            {item.class_levels && item.class_levels.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                {item.class_levels[0].name}
              </span>
            )}
          </div>
        </div>

        {/* Content Preview */}
        <div className="px-5 pb-3 flex-1 min-h-0">
          <div className="rounded-xl bg-slate-50/80 border border-slate-100 overflow-hidden">
            {/* Preview content - render with ExerciseRenderer */}
            {previewStructure ? (
              <div className="max-h-[180px] overflow-hidden relative card-preview-mode">
                <div className="scale-[0.85] origin-top-left w-[118%]">
                  <ExerciseRenderer
                    structure={previewStructure}
                    interactive={false}
                  />
                </div>
                {/* Fade out gradient at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
                {/* Hide solution buttons in card preview */}
                <style>{`
                  .card-preview-mode button { display: none !important; }
                  .card-preview-mode [class*="border-green"] { display: none !important; }
                `}</style>
              </div>
            ) : (
              <div className="p-4 text-sm text-slate-400 italic">Aucun contenu</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 mt-auto border-t border-slate-100 bg-slate-50/50 space-y-3">
          {/* Chapter / Theorem tags */}
          {(('chapters' in item && (item as any).chapters?.length > 0) || ('theorems' in item && (item as any).theorems?.length > 0)) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {('chapters' in item ? (item as any).chapters : [])?.map((ch: any) => (
                <span key={`ch-${ch.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[11px] font-medium">
                  <BookOpen className="w-3 h-3" />
                  {ch.name}
                </span>
              ))}
              {('theorems' in item ? (item as any).theorems : [])?.map((th: any) => (
                <span key={`th-${th.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-500 rounded-md text-[11px] font-medium">
                  {th.name}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center justify-between">
            {/* Left: Stats */}
            <div className="flex items-center gap-3">
              {/* Vote buttons */}
              <div onClick={(e) => e.stopPropagation()}>
                <VoteButtons
                  initialVotes={voteCount}
                  onVote={handleVote}
                  vertical={false}
                  userVote={userVote}
                  size="sm"
                />
              </div>

              {/* View count */}
              <div className="flex items-center gap-1.5 text-slate-500">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">{item.view_count}</span>
              </div>

              {/* Comment count */}
              {'comment_count' in item && (item as any).comment_count > 0 && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm font-medium">{(item as any).comment_count}</span>
                </div>
              )}
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

export default ContentCard;
