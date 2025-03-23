import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type VoteValue = 1 | -1 | 0;

interface VoteButtonsProps {
  initialVotes: number;
  onVote: (value: VoteValue) => void;
  vertical?: boolean;
  userVote?: VoteValue;
  onClick?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function VoteButtons({ 
  initialVotes, 
  onVote, 
  vertical = true, 
  userVote: initialUserVote = 0,
  onClick,
  size = 'md'
}: VoteButtonsProps) {
  const [userVote, setUserVote] = useState<VoteValue>(initialUserVote);
  const [score, setScore] = useState(initialVotes);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Update internal state when props change
  useEffect(() => {
    setScore(initialVotes);
  }, [initialVotes]);

  useEffect(() => {
    setUserVote(initialUserVote);
  }, [initialUserVote]);

  const handleVote = (value: VoteValue) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  
    // Toggle vote off if clicking the same button
    const newVote: VoteValue = userVote === value ? 0 : value;
    
    setUserVote(newVote);
    onVote(newVote);
  };

  // Size-based classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'py-1 px-1.5',
          button: 'w-6 h-6',
          icon: 'h-3.5 w-4',
          text: 'text-xs'
        };
      case 'lg':
        return {
          container: 'py-2 px-3',
          button: 'w-10 h-10',
          icon: 'h-6 w-7',
          text: 'text-lg font-medium'
        };
      default: // medium
        return {
          container: 'py-1.5 px-2',
          button: 'w-8 h-8',
          icon: 'h-5 w-6',
          text: 'text-sm'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Container styles based on vote state
  const getContainerClasses = () => {
    const orientation = vertical 
      ? 'flex-col space-y-1' 
      : 'flex-row space-x-2 items-center';
    
    const baseClasses = `inline-flex ${orientation} rounded-xl transition-all duration-300 ${sizeClasses.container}`;
    
    // Background colors based on vote state
    if (userVote === 1) {
      return `${baseClasses} bg-gradient-to-r from-purple-100 to-indigo-100 border border-indigo-200`;
    } else if (userVote === -1) {
      return `${baseClasses} bg-gradient-to-r from-red-50 to-orange-100 border border-orange-200`;
    }
    
    return `${baseClasses} bg-gray-100 border border-gray-400 shadow-sm hover:border-indigo-400`;
  };

  // Upvote button styles
  const getUpvoteClasses = () => {
    const baseClasses = `rounded-full flex items-center justify-center ${sizeClasses.button} transition-all duration-200`;
    
    if (userVote === 1) {
      return `${baseClasses} bg-gradient-to-r from-indigo-600 to-purple-600 text-white transform scale-105 shadow-md`;
    }
    
    return `${baseClasses} bg-white text-black font-semibold hover:bg-indigo-50 hover:text-indigo-600`;
  };

  // Downvote button styles
  const getDownvoteClasses = () => {
    const baseClasses = `rounded-full flex items-center justify-center ${sizeClasses.button} transition-all duration-200`;
    
    if (userVote === -1) {
      return `${baseClasses} bg-gradient-to-r from-red-900 to-red-600 text-white transform scale-105 shadow-md`;
    }
    
    return `${baseClasses} bg-white text-black font-semibold hover:bg-red-50 hover:text-red-600`;
  };

  // Vote count styles
  const getScoreClasses = () => {
    const baseClasses = `font-medium ${sizeClasses.text}`;
    
    if (userVote === 1) {
      return `${baseClasses} text-indigo-700`;
    } else if (userVote === -1) {
      return `${baseClasses} text-red-700`;
    }
    
    return `${baseClasses} text-gray-700`;
  };


  return (
    <div
      className={getContainerClasses()}
      onClick={onClick}
    >
      {/* Upvote Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleVote(1);
        }}
        className={getUpvoteClasses()}
        aria-label="Upvote"
        title="Upvote"
      >
        <svg
          className={`transition-all duration-200 ${sizeClasses.icon}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          {userVote === 1 ? (
            <path d="M10 19c-.072 0-.145 0-.218-.006A4.1 4.1 0 0 1 6 14.816V11H2.862a1.751 1.751 0 0 1-1.234-2.993L9.41.28a.836.836 0 0 1 1.18 0l7.782 7.727A1.751 1.751 0 0 1 17.139 11H14v3.882a4.134 4.134 0 0 1-.854 2.592A3.99 3.99 0 0 1 10 19Z"></path>
          ) : (
            <path d="M10 19c-.072 0-.145 0-.218-.006A4.1 4.1 0 0 1 6 14.816V11H2.862a1.751 1.751 0 0 1-1.234-2.993L9.41.28a.836.836 0 0 1 1.18 0l7.782 7.727A1.751 1.751 0 0 1 17.139 11H14v3.882a4.134 4.134 0 0 1-.854 2.592A3.99 3.99 0 0 1 10 19Zm0-17.193L2.685 9.071a.251.251 0 0 0 .177.429H7.5v5.316A2.63 2.63 0 0 0 9.864 17.5a2.441 2.441 0 0 0 1.856-.682A2.478 2.478 0 0 0 12.5 15V9.5h4.639a.25.25 0 0 0 .176-.429L10 1.807Z"></path>
          )}
        </svg>
      </button>

      {/* Score display */}
      <span className={getScoreClasses()}>
        {score}
      </span>

      {/* Downvote Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleVote(-1);
        }}
        className={getDownvoteClasses()}
        aria-label="Downvote"
        title="Downvote"
      >
        <svg
          className={`transition-all duration-200 ${sizeClasses.icon}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          {userVote === -1 ? (
            <path d="M10 1c.072 0 .145 0 .218.006A4.1 4.1 0 0 1 14 5.184V9h3.138a1.751 1.751 0 0 1 1.234 2.993L10.59 19.72a.836.836 0 0 1-1.18 0l-7.782-7.727A1.751 1.751 0 0 1 2.861 9H6V5.118a4.134 4.134 0 0 1 .854-2.592A3.99 3.99 0 0 1 10 1Z"></path>
          ) : (
            <path d="M10 1c.072 0 .145 0 .218.006A4.1 4.1 0 0 1 14 5.184V9h3.138a1.751 1.751 0 0 1 1.234 2.993L10.59 19.72a.836.836 0 0 1-1.18 0l-7.782-7.727A1.751 1.751 0 0 1 2.861 9H6V5.118a4.134 4.134 0 0 1 .854-2.592A3.99 3.99 0 0 1 10 1Zm0 17.193 7.315-7.264a.251.251 0 0 0-.177-.429H12.5V5.184A2.631 2.631 0 0 0 10.136 2.5a2.441 2.441 0 0 0-1.856.682A2.478 2.478 0 0 0 7.5 5v5.5H2.861a.251.251 0 0 0-.176.429L10 18.193Z"></path>
          )}
        </svg>
      </button>
    </div>
  );
}