/**
 * ContentListCard - Card component for content lists
 * Uses same design as ContentCard but renders structured content preview
 */

import React, { useState, useEffect, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Trash2,
  Edit,
  Eye,
  Bookmark,
  Loader2,
  ArrowUpRight,
  Zap,
  Flame,
  Target,
  BookOpen,
} from 'lucide-react';
import type { Difficulty, VoteValue } from '@/types';
import type { ExerciseListItem, ExamListItem, LessonListItem } from '@/types/content';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import { ExerciseRenderer } from './viewer/ExerciseRenderer';
import { LessonRenderer } from './viewer/LessonRenderer';
import { useAuthModal } from '@/components/auth/AuthController';
import { exerciseContentAPI, examContentAPI, lessonContentAPI } from '@/lib/api';
import type { FlexibleExerciseStructure } from './editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from './editor/FlexibleLessonEditor';
import '@/lib/styles.css';

type StructuredListItem = ExerciseListItem | ExamListItem | LessonListItem;

// Difficulty indicator component
const DifficultyIndicator = ({ level }: { level: Difficulty }) => {
  const config = {
    easy: {
      label: 'Facile',
      gradient: 'from-emerald-400 to-teal-500',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600',
      icon: Target,
      glow: 'shadow-emerald-500/25'
    },
    medium: {
      label: 'Moyen',
      gradient: 'from-amber-400 to-orange-500',
      bg: 'bg-amber-500/10',
      text: 'text-amber-600',
      icon: Zap,
      glow: 'shadow-amber-500/25'
    },
    hard: {
      label: 'Difficile',
      gradient: 'from-rose-400 to-red-500',
      bg: 'bg-rose-500/10',
      text: 'text-rose-600',
      icon: Flame,
      glow: 'shadow-rose-500/25'
    },
  };

  const { label, gradient, bg, text, icon: Icon, glow } = config[level];

  return (
    <div className={`inline-flex items-center gap-2 ${bg} ${text} pl-1.5 pr-3 py-1 rounded-full`}>
      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${glow}`}>
        <Icon className="w-3 h-3 text-white" />
      </div>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
};

// Stat pill component
const StatPill = ({ icon: Icon, value, onClick }: { icon: any; value: number | string; onClick?: (e: React.MouseEvent) => void }) => (
  <button
    onClick={onClick}
    className="group flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors"
  >
    <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
      <Icon className="w-3.5 h-3.5" />
    </div>
    <span className="text-sm font-medium">{value}</span>
  </button>
);

interface ContentListCardProps {
  content: StructuredListItem;
  onVote?: (id: string, value: VoteValue) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onSave?: (id: string, saved: boolean) => void;
  contentType?: 'exercise' | 'lesson' | 'exam';
  compact?: boolean;
}

export const ContentListCard: React.FC<ContentListCardProps> = ({
  content,
  onVote,
  onDelete,
  onEdit,
  onSave,
  contentType = 'exercise',
  compact = false,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAuthor = user?.id === content.author?.id;
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const { openModal } = useAuthModal();
  const [voteCount, setVoteCount] = useState<number>(0);
  const [userVote, setUserVote] = useState<1 | -1 | 0>(0);

  // Content type configuration
  const typeConfig = {
    exercise: {
      label: 'Exercice',
      gradient: 'from-blue-500 via-indigo-500 to-violet-500',
      softGradient: 'from-blue-50 to-indigo-50',
      accent: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      accentText: 'text-indigo-600',
      glowColor: 'shadow-indigo-500/20',
    },
    lesson: {
      label: 'Leçon',
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      softGradient: 'from-emerald-50 to-teal-50',
      accent: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      accentText: 'text-teal-600',
      glowColor: 'shadow-teal-500/20',
    },
    exam: {
      label: 'Examen',
      gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
      softGradient: 'from-violet-50 to-purple-50',
      accent: 'bg-gradient-to-br from-violet-500 to-purple-600',
      accentText: 'text-purple-600',
      glowColor: 'shadow-purple-500/20',
    },
  };

  const config = typeConfig[contentType];

  const hasDifficulty = 'difficulty' in content && content.difficulty !== undefined && content.difficulty !== null;
  const isNationalExam = 'is_national_exam' in content && content.is_national_exam;
  const nationalYear = 'national_year' in content ? content.national_year : undefined;

  const getNavigationPath = () => {
    const basePaths = { exercise: '/exercises', lesson: '/lessons', exam: '/exams' };
    return `${basePaths[contentType]}/${content.id}`;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    navigate(getNavigationPath());
  };

  // Initialize state from content
  useEffect(() => {
    if ('user_save' in content) setIsSaved(Boolean(content.user_save));
    if ('vote_count' in content) setVoteCount(content.vote_count ?? 0);
    if ('user_vote' in content) setUserVote((content.user_vote as 1 | -1 | 0) ?? 0);
  }, [content]);

  const getAPI = () => {
    switch (contentType) {
      case 'exercise': return exerciseContentAPI;
      case 'exam': return examContentAPI;
      case 'lesson': return lessonContentAPI;
    }
  };

  const handleVote = async (value: VoteValue) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    try {
      const api = getAPI();
      const response = await api.vote(content.id.toString(), value);
      setVoteCount(response.vote_count);
      setUserVote(response.user_vote as 1 | -1 | 0);
      onVote?.(content.id.toString(), value);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { openModal(); return; }

    try {
      setIsSaving(true);
      const api = getAPI();

      if (isSaved) {
        await api.unsave(content.id.toString());
        setIsSaved(false);
      } else {
        await api.save(content.id.toString());
        setIsSaved(true);
      }
      onSave?.(content.id.toString(), !isSaved);
    } catch (error) {
      console.error('Error toggling save status:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'à l\'instant';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}j`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}sem`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo`;
    return `${Math.floor(diffInDays / 365)}an`;
  };

  // Create truncated structure for preview
  const previewStructure = useMemo((): FlexibleExerciseStructure | FlexibleLessonStructure | null => {
    const structure = content.structure as any;
    if (!structure) return null;

    // For lessons: has 'sections' array
    if (contentType === 'lesson' && structure.sections && structure.sections.length > 0) {
      return {
        ...structure,
        sections: structure.sections.slice(0, 2) // First 2 sections for lesson preview
      } as FlexibleLessonStructure;
    }

    // For exercises/exams: has 'blocks' array
    if (structure.blocks && structure.blocks.length > 0) {
      return {
        ...structure,
        blocks: structure.blocks.slice(0, 4) // First 4 blocks for exercise/exam preview
      } as FlexibleExerciseStructure;
    }

    return null;
  }, [content.structure, contentType]);

  // Compact card variant
  if (compact) {
    return (
      <div
        className="group relative bg-white rounded-2xl border border-slate-200 p-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300"
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Left accent bar */}
        <div className={`absolute left-0 top-3 bottom-3 w-1 ${config.accent} rounded-full`} />

        <div className="flex items-center gap-4 pl-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold ${config.accentText}`}>{config.label} #{content.id}</span>
              {isNationalExam && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  National {nationalYear}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-1">
              {content.title}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>↑ {voteCount}</span>
              {content.subject && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>{content.subject.name}</span>
                </>
              )}
            </div>
          </div>
          <ArrowUpRight className={`w-5 h-5 text-slate-300 transition-all duration-300 flex-shrink-0 ${isHovered ? `${config.accentText} translate-x-0.5 -translate-y-0.5` : ''}`} />
        </div>
      </div>
    );
  }

  // Full card variant
  return (
    <article
      className="group relative max-w-5xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow effect on hover */}
      <div className={`absolute -inset-px rounded-[28px] bg-gradient-to-r ${config.gradient} opacity-0 blur-xl transition-opacity duration-500 ${isHovered ? 'opacity-30' : ''}`} />

      {/* Card container */}
      <div className={`relative bg-white rounded-3xl border border-slate-200/80 overflow-hidden transition-all duration-500 ${isHovered ? `shadow-2xl ${config.glowColor} border-slate-300/80` : 'shadow-lg shadow-slate-200/50'}`}>

        {/* Decorative gradient mesh background */}
        <div className={`absolute top-0 right-0 w-80 h-80 bg-gradient-to-br ${config.softGradient} rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none`} />

        {/* Content */}
        <div className="relative">
          {/* Header section */}
          <div className="p-6 pb-4">
            {/* Top row: Type label + Difficulty + Actions */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${config.accentText}`}>
                  {config.label} #{content.id}
                </span>
                {hasDifficulty && (
                  <DifficultyIndicator level={(content as any).difficulty} />
                )}
                {isNationalExam && (
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                    National {nationalYear}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Author actions (always visible if author) */}
                {isAuthor && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit?.(content.id.toString()); }}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      aria-label="Modifier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete?.(content.id.toString()); }}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Save button */}
                <button
                  onClick={handleSaveClick}
                  disabled={isSaving}
                  className={`relative p-3 rounded-2xl transition-all duration-300 ${
                    isSaved
                      ? 'bg-amber-100 text-amber-500 shadow-lg shadow-amber-200/50'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                  }`}
                  aria-label={isSaved ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Bookmark className={`w-5 h-5 transition-transform duration-300 ${isSaved ? 'fill-current scale-110' : isHovered ? 'scale-105' : ''}`} />
                  )}
                </button>
              </div>
            </div>

            {/* Title */}
            <h2 className={`text-xl font-bold text-slate-900 leading-snug mb-4 transition-colors duration-300 ${isHovered ? 'text-slate-800' : ''}`}>
              {content.title}
            </h2>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-2">
              {content.subject && (
                <span className="inline-flex items-center bg-slate-100/80 backdrop-blur-sm text-slate-600 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200/50">
                  {content.subject.name}
                </span>
              )}

              {content.class_levels?.[0] && (
                <span className="inline-flex items-center bg-slate-100/80 backdrop-blur-sm text-slate-600 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200/50">
                  {content.class_levels[0].name}
                </span>
              )}
            </div>
          </div>

          {/* Preview content with fade */}
          <div className="px-6 pb-4">
            <div className="relative min-h-[120px]">
              {previewStructure ? (
                <div className={`transition-all duration-500 ${isHovered ? 'max-h-[200px]' : 'max-h-[140px]'} overflow-hidden`}>
                  <div className="scale-[0.85] origin-top-left w-[118%] card-preview-mode">
                    {contentType === 'lesson' && 'sections' in previewStructure ? (
                      <LessonRenderer structure={previewStructure as FlexibleLessonStructure} />
                    ) : (
                      <ExerciseRenderer
                        structure={previewStructure as FlexibleExerciseStructure}
                        interactive={false}
                      />
                    )}
                  </div>
                  {/* Hide solution buttons in card preview */}
                  <style>{`
                    .card-preview-mode button { display: none !important; }
                    .card-preview-mode [class*="border-green"] { display: none !important; }
                  `}</style>
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic">Aucun contenu</div>
              )}

              {/* Fade gradient at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gradient-to-b from-white to-slate-50/80 space-y-3">
            {/* Chapter / Theorem tags */}
            {(('chapters' in content && (content as any).chapters?.length > 0) || ('theorems' in content && (content as any).theorems?.length > 0)) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {('chapters' in content ? (content as any).chapters : [])?.map((ch: any) => (
                  <span key={`ch-${ch.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[11px] font-medium">
                    <BookOpen className="w-3 h-3" />
                    {ch.name}
                  </span>
                ))}
                {('theorems' in content ? (content as any).theorems : [])?.map((th: any) => (
                  <span key={`th-${th.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-500 rounded-md text-[11px] font-medium">
                    {th.name}
                  </span>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div className="flex items-center justify-between">
              {/* Left: Votes and stats */}
              <div className="flex items-center gap-4">
                <div onClick={(e) => e.stopPropagation()}>
                  <VoteButtons
                    initialVotes={voteCount}
                    onVote={handleVote}
                    vertical={false}
                    userVote={userVote}
                    size="sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <StatPill icon={Eye} value={content.view_count} />
                  {'comment_count' in content && (content as any).comment_count > 0 && (
                    <StatPill icon={MessageSquare} value={(content as any).comment_count} />
                  )}
                </div>
              </div>

              {/* Right: Time */}
              <div className="flex items-center gap-3">
                {content.created_at && (
                  <span className="text-xs text-slate-400 font-medium">
                    {getTimeAgo(content.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hover action button */}
        <div className={`absolute bottom-20 right-6 transition-all duration-500 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className={`flex items-center gap-2 ${config.accent} text-white pl-5 pr-4 py-3 rounded-2xl shadow-xl ${config.glowColor} font-medium text-sm`}>
            <span>Voir</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </article>
  );
};

export default ContentListCard;
