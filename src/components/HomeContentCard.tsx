import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Tag, 
  Eye, 
  User, 
  Clock, 
  BarChart3, 
  GraduationCap,
  Bookmark,
  Lightbulb,
  ArrowRight,
  BookOpen,
  Layers
} from 'lucide-react';
import { Content, VoteValue, Difficulty } from '@/types';
import { VoteButtons } from './VoteButtons';
import TipTapRenderer from './editor/TipTapRenderer';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';

interface HomeContentCardProps {
  content: Content;
  onVote: (id: string, value: VoteValue) => void;
}

export const HomeContentCard: React.FC<HomeContentCardProps> = ({
  content,
  onVote,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = () => {
    if (!isAuthenticated) {
      openModal(`/exercises/${content.id}`);
      return;
    }
    navigate(`/exercises/${content.id}`);
  };

  const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'from-emerald-500 to-green-500 border-emerald-400';
      case 'medium':
        return 'from-amber-500 to-yellow-500 border-amber-400';
      case 'hard':
        return 'from-rose-500 to-pink-500 border-rose-400';
      default:
        return 'from-gray-500 to-gray-400 border-gray-400';
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
  
  const truncateTitle = (title: string, maxLength = 50) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };
  
  // Format time as "time ago"
  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'à l\'instant';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `il y a ${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'}`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `il y a ${diffInHours} ${diffInHours === 1 ? 'heure' : 'heures'}`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `il y a ${diffInDays} ${diffInDays === 1 ? 'jour' : 'jours'}`;
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `il y a ${diffInWeeks} ${diffInWeeks === 1 ? 'semaine' : 'semaines'}`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `il y a ${diffInMonths} ${diffInMonths === 1 ? 'mois' : 'mois'}`;
  };
  
  // Check if solution exists
  const hasSolution = !!content.solution;
  
  // Check if the content has chapters
  const hasChapters = content.chapters && content.chapters.length > 0;
  const hasSubfields = content.subfields && content.subfields.length > 0;

  return (
    <div 
      className="relative home-content-card group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-indigo-300 overflow-hidden transform hover:-translate-y-1 cursor-pointer h-full"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header with Gradient */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 px-4 pt-4 pb-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#smallGrid)" />
          </svg>
        </div>
        
        {/* Author and Date */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-medium">
              {content.author.username.charAt(0).toUpperCase()}
            </div>
            <span className="ml-1.5 text-xs text-white/90">{content.author.username}</span>
          </div>
          <span className="text-xs text-white/70 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {getTimeAgo(content.created_at)}
          </span>
        </div>
        
        {/* Title with Solution Indicator */}
        <div className="flex items-start gap-1.5 mb-2 relative z-10">
          {hasSolution && (
            <div className="flex-shrink-0 bg-emerald-400 p-0.5 rounded-full mt-1">
              <Lightbulb className="w-3 h-3 text-white" />
            </div>
          )}
          <h3 className="text-lg font-bold text-white leading-tight">
            {truncateTitle(content.title)}
          </h3>
        </div>
        
        {/* Difficulty and Subject Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {/* Subject Tag */}
          {content.subject && (
            <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center">
              <BookOpen className="w-3 h-3 mr-1" />
              {content.subject.name}
            </span>
          )}
          
          {/* Difficulty Badge */}
          <span className={`bg-gradient-to-r ${getDifficultyColor(content.difficulty)} px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center`}>
            <BarChart3 className="w-3 h-3 mr-1" />
            {getDifficultyLabel(content.difficulty)}
          </span>
          
          {/* Class Levels Badge - if available */}
          {content.class_levels && content.class_levels.length > 0 && (
            <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center">
              <GraduationCap className="w-3 h-3 mr-1" />
              {content.class_levels[0].name}
            </span>
          )}
        </div>
      </div>
      
      {/* Content Area - Card Body with Content Preview */}
      <div className="px-4 pt-2 pb-4 -mt-6 relative z-10">
        {/* Content Card - White Background */}
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
          {/* Content Preview */}
          <div className="prose max-w-none text-sm text-gray-600 line-clamp-3 overflow-hidden">
            <TipTapRenderer content={content.content} compact={true} />
          </div>
        </div>
      </div>
      
      {/* Card Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
        {/* Left side - Vote and Stats */}
        <div className="flex items-center gap-3">
          <VoteButtons
            initialVotes={content.vote_count}
            onVote={(value) => onVote(content.id, value)}
            vertical={false}
            userVote={content.user_vote}
            size="sm"
          />
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center">
              <Eye className="w-3 h-3 text-indigo-400 mr-1" />
              <span>{content.view_count}</span>
            </span>
            
            <span className="flex items-center">
              <MessageSquare className="w-3 h-3 text-indigo-400 mr-1" />
              <span>{(content.comments || []).length}</span>
            </span>
          </div>
        </div>
        
        {/* Right side - Tags */}
        <div className="flex items-center gap-1">
          {hasChapters && content.chapters.slice(0, 1).map(chapter => (
            <span
              key={chapter.id}
              className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded text-xs flex items-center border border-purple-100"
            >
              <Tag className="w-2.5 h-2.5 mr-0.5" />
              <span className="truncate max-w-[80px]">{chapter.name}</span>
            </span>
          ))}
          
          {hasSubfields && content.subfields.slice(0, 1).map(subfield => (
            <span
              key={subfield.id}
              className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs flex items-center border border-blue-100"
            >
              <Layers className="w-2.5 h-2.5 mr-0.5" />
              <span className="truncate max-w-[80px]">{subfield.name}</span>
            </span>
          ))}
        </div>
      </div>
      
      {/* Hover Overlay */}
      <div className={`absolute inset-0 bg-indigo-900/75 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isHovered ? 'backdrop-blur-sm' : ''}`}>
        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 text-center">
          <div className="bg-white/20 rounded-full p-3 mx-auto mb-3 w-12 h-12 flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-white" />
          </div>
          <p className="text-white font-medium">Voir l'exercice</p>
        </div>
      </div>
      
      {/* Animation Styles */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        .pulse-animation {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
}