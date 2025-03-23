import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Tag, Eye, User, Clock, BarChart3, GraduationCap } from 'lucide-react';
import { Content, VoteValue, Difficulty } from '@/types';
import { VoteButtons } from './VoteButtons';
import { truncateText } from '@/lib/utils';
import { InlineMath, BlockMath } from "react-katex";
import TipTapRenderer from './editor/TipTapRenderer';

interface HomeContentCardProps {
  content: Content;
  onVote: (id: string, value: VoteValue) => void;
}

export const HomeContentCard: React.FC<HomeContentCardProps> = ({
  content,
  onVote,
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => navigate(`/exercises/${content.id}`);

  const getDifficultyColor = (difficulty: Difficulty): string => {
    switch (difficulty) {
      case 'easy':
        return 'from-emerald-600 to-green-600 text-white';
      case 'medium':
        return 'from-amber-600 to-yellow-600 text-white';
      case 'hard':
        return 'from-red-600 to-pink-600 text-white';
      default:
        return 'from-gray-600 to-gray-500 text-white';
    }
  };
  
  const getDifficultyIcon = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return <BarChart3 className="w-4 h-4" />;
      case 'medium':
        return (
          <div className="flex">
            <BarChart3 className="w-4 h-4" />
          </div>
        );
      case 'hard':
        return (
          <div className="flex">
            <BarChart3 className="w-4 h-4" />
          </div>
        );
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };
  
  const getDifficultyLabel = (difficulty: Difficulty): string => {
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

  const renderMathContent = (text: string) => {
    if (!text) return null;
    
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Display math (centered)
        try {
          return (
            <div key={index} className="my-2 text-center">
              <BlockMath math={part.slice(2, -2)} />
            </div>
          );
        } catch (error) {
          return <div key={index} className="text-red-500">Erreur: {part}</div>;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        // Inline math (left-aligned)
        try {
          return <InlineMath key={index} math={part.slice(1, -1)} />;
        } catch (error) {
          return <span key={index} className="text-red-500">Erreur: {part}</span>;
        }
      } else if (part.startsWith('$') || part.endsWith('$')) {
        // Incomplete LaTeX expression (render as plain text)
        return <span key={index}>{part}</span>;
      } else {
        // Regular text
        return <span key={index}>{part}</span>;
      }
    });
  };

  return (
    <div
      className="home-content-card bg-white rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-indigo-200 overflow-hidden group cursor-pointer transform hover:-translate-y-1"
      onClick={handleCardClick}
    >
      <div className="flex flex-col h-full">
        {/* Compact header with title and difficulty */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between mb-1.5">
            {/* Title */}
            <h3 className="text-lg font-bold text-gray-800 line-clamp-1 mr-2 group-hover:text-indigo-700 transition-colors">
              {content.title}
            </h3>

            {/* Difficulty */}
            <span className={`bg-gradient-to-r ${getDifficultyColor(content.difficulty)} px-2 py-0.5 rounded-full text-xs font-medium shadow-sm flex items-center space-x-1 flex-shrink-0`}>
              {getDifficultyIcon(content.difficulty)}
              <span>{getDifficultyLabel(content.difficulty)}</span>
            </span>
          </div>
          
          {/* Subject and tags in one row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {/* Subject */}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-medium">
              {content.subject.name}
            </span>
            
            {/* Tags */}
            {content.chapters && content.chapters.length > 0 && (
              <>
                {content.chapters.slice(0, 2).map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag.name}
                  </span>
                ))}
                {content.chapters.length > 2 && (
                  <span className="text-xs text-indigo-500">+{content.chapters.length - 2}</span>
                )}
              </>
            )}
            
            {/* Class levels if available */}
            {content.class_levels && content.class_levels.length > 0 && (
              <>
                {content.class_levels.slice(0, 1).map((level) => (
                  <span
                    key={level.id}
                    className="bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center"
                  >
                    <GraduationCap className="w-3 h-3 mr-1" />
                    <span>{level.name}</span>
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
        
        {/* Main content */}
        <div className="px-4 py-2 flex-1">
          {/* Content Preview */}
          <div className="prose max-w-none text-sm text-gray-600 line-clamp-2 overflow-hidden">
            <TipTapRenderer content = {truncateText(content.content, 120)}></TipTapRenderer>
        </div>

        {/* Compact footer with metadata and votes */}
        <div className="bg-gray-50 px-3 py-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            {/* Left side with votes */}
            <div className="flex items-center">
              <VoteButtons
                initialVotes={content.vote_count}
                onVote={(value) => onVote(content.id, value)}
                vertical={false}
                userVote={content.user_vote}
                size="sm"
              />
            </div>
            
            {/* Right side with compact metadata */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center">
                <User className="w-3 h-3 text-indigo-500 mr-1" />
                <span className="truncate max-w-[80px]">{content.author.username}</span>
              </span>
              
              <span className="flex items-center">
                <Eye className="w-3 h-3 text-indigo-500 mr-1" />
                <span>{content.view_count}</span>
              </span>
              
              <span className="flex items-center">
                <MessageSquare className="w-3 h-3 text-indigo-500 mr-1" />
                <span>{(content.comments || []).length}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};