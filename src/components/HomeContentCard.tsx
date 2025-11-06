// src/components/HomeContentCard.tsx - Premium Redesign
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Loader2,
  ChevronRight,
  Eye
} from 'lucide-react';
import { Content, VoteValue, Difficulty } from '@/types';
import { VoteButtons } from './VoteButtons';
import TipTapRenderer from './editor/TipTapRenderer';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { saveExercise, unsaveExercise } from '@/lib/api';
import axios from 'axios';

interface HomeContentCardProps {
  content: Content;
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

  // Initialize saved state from content
  useEffect(() => {
    if (content && content.user_save !== undefined) {
      setIsSaved(content.user_save);
    }
  }, [content]);

  // Detect content type based on properties
  const getContentType = (): 'exercise' | 'lesson' | 'exam' => {
    if ('is_national_exam' in content) return 'exam';
    if ('difficulty' in content && content.difficulty) return 'exercise';
    return 'lesson';
  };

  const getNavigationPath = () => {
    const contentType = getContentType();
    const basePaths = {
      exercise: '/exercises',
      lesson: '/lessons',
      exam: '/exams'
    };
    return `${basePaths[contentType]}/${content.id}`;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    if (!isAuthenticated) {
      e.preventDefault();
      openModal();
      return;
    }

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

      if (isSaved) {
        await unsaveExercise(content.id.toString());
        setIsSaved(false);
      } else {
        try {
          await saveExercise(content.id.toString());
          setIsSaved(true);
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 400) {
            setIsSaved(true);
          } else {
            throw error;
          }
        }
      }

      if (onSave) {
        onSave(content.id.toString(), !isSaved);
      }
    } catch (error) {
      console.error("Error toggling save status:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getDifficultyInfo = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return {
          label: 'Facile',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          dotColor: 'bg-green-500'
        };
      case 'medium':
        return {
          label: 'Moyen',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          dotColor: 'bg-amber-500'
        };
      case 'hard':
        return {
          label: 'Difficile',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700',
          dotColor: 'bg-orange-500'
        };
      default:
        return {
          label: difficulty,
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const difficultyInfo = content.difficulty ? getDifficultyInfo(content.difficulty) : null;

  // Get content type specific colors
  const getContentTypeColors = () => {
    const contentType = getContentType();
    switch (contentType) {
      case 'lesson':
        return {
          borderColor: '#2563eb', // blue-600
          gradientColors: 'from-blue-600 via-cyan-500 to-sky-600',
          shadow: 'rgba(37, 99, 235, 0.15)',
          subjectBg: 'bg-blue-50',
          subjectText: 'text-blue-700',
          buttonGradient: 'from-blue-200 via-cyan-200 to-sky-200',
          buttonHover: 'hover:from-blue-300 hover:via-cyan-300 hover:to-sky-300',
          buttonText: 'text-blue-900'
        };
      case 'exam':
        return {
          borderColor: '#16a34a', // green-600
          gradientColors: 'from-green-600 via-emerald-500 to-teal-600',
          shadow: 'rgba(22, 163, 74, 0.15)',
          subjectBg: 'bg-green-50',
          subjectText: 'text-green-700',
          buttonGradient: 'from-green-200 via-emerald-200 to-teal-200',
          buttonHover: 'hover:from-green-300 hover:via-emerald-300 hover:to-teal-300',
          buttonText: 'text-green-900'
        };
      default: // exercise
        return {
          borderColor: '#6A1B9A', // purple
          gradientColors: 'from-purple-600 via-pink-500 to-yellow-500',
          shadow: 'rgba(106, 27, 154, 0.15)',
          subjectBg: 'bg-[#EDE7F6]',
          subjectText: 'text-[#6A1B9A]',
          buttonGradient: 'from-yellow-200 via-pink-200 to-purple-200',
          buttonHover: 'hover:from-yellow-300 hover:via-pink-300 hover:to-purple-300',
          buttonText: 'text-purple-900'
        };
    }
  };

  const colors = getContentTypeColors();

  return (
    <div
      className="group relative rounded-xl cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Card with Colored Header */}
      <div
        className="relative bg-white rounded-xl overflow-hidden transition-all duration-300"
        style={{
          boxShadow: isHovered
            ? `0 8px 30px -4px ${colors.shadow}, 0 4px 12px -2px rgba(0, 0, 0, 0.08)`
            : '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
      >
        {/* Colored Header Bar with Gradient */}
        <div
          className={`h-2 bg-gradient-to-r ${colors.gradientColors} transition-all duration-300`}
          style={{
            height: isHovered ? '3px' : '2px'
          }}
        />

        {/* Card Content */}
        <div className="p-6">
          {/* Title & Bookmark Row */}
          <div className="flex justify-between items-start gap-3 mb-4">
            <h3 className="text-gray-900 font-bold text-xl leading-tight flex-1 line-clamp-2 group-hover:text-gray-700 transition-colors">
              {content.title}
            </h3>

            {/* Bookmark Icon */}
            <button
              onClick={handleSaveClick}
              className="flex-shrink-0 transition-all hover:scale-110"
              aria-label={isSaved ? "Retirer des favoris" : "Sauvegarder"}
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              ) : (
                <Bookmark
                  className={`w-5 h-5 transition-all ${
                    isSaved
                      ? 'fill-amber-500 text-amber-500 drop-shadow-sm'
                      : 'text-gray-400 hover:text-amber-400'
                  }`}
                />
              )}
            </button>
          </div>

          {/* Metadata Tags - Colorful Pills */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b-2 border-gray-100">
            {/* Subject Tag */}
            {content.subject && (
              <span
                className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm"
                style={{
                  backgroundColor: colors.borderColor + '15',
                  color: colors.borderColor,
                  border: `1.5px solid ${colors.borderColor}30`
                }}
              >
                {content.subject.name}
              </span>
            )}

            {/* Difficulty Tag with Animated Dot */}
            {difficultyInfo && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${difficultyInfo.bgColor} ${difficultyInfo.textColor} text-xs font-semibold shadow-sm border border-current border-opacity-20`}>
                <span
                  className={`w-2 h-2 rounded-full ${difficultyInfo.dotColor} animate-pulse`}
                  style={{ animationDuration: '2s' }}
                />
                {difficultyInfo.label}
              </span>
            )}

            {/* Class Level Tag */}
            {content.class_levels && content.class_levels.length > 0 && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold shadow-sm border border-indigo-200">
                {content.class_levels[0].name}
              </span>
            )}
          </div>

          {/* Content Preview with Better Spacing */}
          <div className="mb-5">
            <div className="prose prose-sm max-w-none text-gray-600 line-clamp-3 leading-relaxed">
              <TipTapRenderer content={content.content} compact={true} />
            </div>
          </div>

          {/* Footer Section - Separated with More Color */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-gray-100">
            {/* Left Side - Stats with Icons */}
            <div className="flex items-center gap-4">
              {/* Vote Buttons - Colored */}
              <div onClick={(e) => e.stopPropagation()}>
                <VoteButtons
                  initialVotes={content.vote_count}
                  onVote={(value) => {
                    const contentType = getContentType();
                    onVote(content.id.toString(), value, contentType);
                  }}
                  vertical={false}
                  userVote={content.user_vote}
                  size="sm"
                />
              </div>

              {/* View Count with Colored Icon */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50">
                <Eye className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700">{content.view_count}</span>
              </div>
            </div>

            {/* Right Side - Vibrant CTA Button */}
            <button
              onClick={handleCardClick}
              className="relative px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 group/btn overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${colors.borderColor}15, ${colors.borderColor}25)`,
                border: `2px solid ${colors.borderColor}`,
                color: colors.borderColor
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${colors.borderColor}, ${colors.borderColor}dd)`;
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 16px -4px ${colors.shadow}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${colors.borderColor}15, ${colors.borderColor}25)`;
                e.currentTarget.style.color = colors.borderColor;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span className="relative z-10">Commencer</span>
              <ChevronRight className="w-4 h-4 relative z-10 transition-transform group-hover/btn:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
