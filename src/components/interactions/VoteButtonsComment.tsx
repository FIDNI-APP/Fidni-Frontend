import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type VoteValue = 1 | -1 | 0;

interface VoteButtonsCommentProps {
  initialVotes: number;
  onVote: (value: VoteValue) => void;
  vertical?: boolean;
  userVote?: VoteValue;
  onClick?: (e: React.MouseEvent) => void;
}

export function VoteButtonsComment({ 
  initialVotes, 
  onVote, 
  vertical = true, 
  userVote: initialUserVote = 0,
  onClick
}: VoteButtonsCommentProps) {
  const [userVote, setUserVote] = useState<VoteValue>(initialUserVote);
  const [score, setScore] = useState(initialVotes);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setScore(initialVotes);
  }, [initialVotes]);

  useEffect(() => {
    setUserVote(initialUserVote);
  }, [initialUserVote]);

  const handleVote = (value: 1 | -1) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  
    let newVote: VoteValue = userVote === value ? 0 : value;
  
    setUserVote(newVote);
    onVote(newVote);
  };



  const getUpvoteStyles = () => {
    if (userVote === 1) return "text-white scale-110"; // Active upvote
    if (userVote === -1) return "text-white"; // Downvoted state
    return "text-black hover:text-orange-900"; // Default
  };
  
  const getDownvoteStyles = () => {
    if (userVote === -1) return "text-white scale-110"; // Active downvote
    if (userVote === 1) return "text-white"; // Upvoted state
    return "text-black hover:text-violet-500"; // Default
  };

  const getCountStyles = () => {
    if (userVote === 1 || userVote === -1) return "text-gray-600";
    return "text-gray-600";
  };

  return (
    <div
      className={`inline-flex ${vertical ? "flex-col items-center" : "flex-row items-center"}`}
      onClick={onClick}
    >
      {/* Upvote Button */}
      <button
  onClick={(e) => {
    e.stopPropagation();
    handleVote(1);
  }}
  className="p-0 bg-transparent border-2 outline-none hover:bg-gray-300 rounded-xl transition-colors duration-200"
  aria-label="Upvote"
>
  <svg
    className={`h-5 w-6 transition-all duration-100 ${getUpvoteStyles()}`}
    fill={userVote === 1 ? "rgb(196, 73, 3)" : "black"} // Conditional fill
    height="16"
    viewBox="0 0 20 20"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
  >
    {userVote === 1 ? (
      // Active Upvote SVG
      <path d="M10 19c-.072 0-.145 0-.218-.006A4.1 4.1 0 0 1 6 14.816V11H2.862a1.751 1.751 0 0 1-1.234-2.993L9.41.28a.836.836 0 0 1 1.18 0l7.782 7.727A1.751 1.751 0 0 1 17.139 11H14v3.882a4.134 4.134 0 0 1-.854 2.592A3.99 3.99 0 0 1 10 19Z"></path>
    ) : (
      // Default Upvote SVG (inactive state)
      <path d="M10 19c-.072 0-.145 0-.218-.006A4.1 4.1 0 0 1 6 14.816V11H2.862a1.751 1.751 0 0 1-1.234-2.993L9.41.28a.836.836 0 0 1 1.18 0l7.782 7.727A1.751 1.751 0 0 1 17.139 11H14v3.882a4.134 4.134 0 0 1-.854 2.592A3.99 3.99 0 0 1 10 19Zm0-17.193L2.685 9.071a.251.251 0 0 0 .177.429H7.5v5.316A2.63 2.63 0 0 0 9.864 17.5a2.441 2.441 0 0 0 1.856-.682A2.478 2.478 0 0 0 12.5 15V9.5h4.639a.25.25 0 0 0 .176-.429L10 1.807Z"></path>
    )}
  </svg>
</button>
  
      {/* Score display */}
      <span className={`px-1 font-semibold ${getCountStyles()}`}>
        {score}
      </span>
  
      {/* Downvote Button */}

<button
  onClick={(e) => {
    e.stopPropagation();
    handleVote(-1);
  }}
  className="p-0 bg-transparent border-0 outline-none hover:bg-gray-300 rounded-full transition-colors duration-200"
  aria-label="Downvote"
>
  <svg
    className={`h-5 w-6 transition-all duration-200 ${getDownvoteStyles()}`}
    fill={userVote === -1 ? "rgb(108, 89, 196)" : "black"} // Conditional fill
    height="16"
    viewBox="0 0 20 20"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
  >
    {userVote === -1 ? (
      // Active Downvote SVG
      <path d="M10 1c.072 0 .145 0 .218.006A4.1 4.1 0 0 1 14 5.184V9h3.138a1.751 1.751 0 0 1 1.234 2.993L10.59 19.72a.836.836 0 0 1-1.18 0l-7.782-7.727A1.751 1.751 0 0 1 2.861 9H6V5.118a4.134 4.134 0 0 1 .854-2.592A3.99 3.99 0 0 1 10 1Z"></path>
    ) : (
      // Default Downvote SVG (inactive state)
      <path
        d="M10 1c.072 0 .145 0 .218.006A4.1 4.1 0 0 1 14 5.184V9h3.138a1.751 1.751 0 0 1 1.234 2.993L10.59 19.72a.836.836 0 0 1-1.18 0l-7.782-7.727A1.751 1.751 0 0 1 2.861 9H6V5.118a4.134 4.134 0 0 1 .854-2.592A3.99 3.99 0 0 1 10 1Zm0 17.193 7.315-7.264a.251.251 0 0 0-.177-.429H12.5V5.184A2.631 2.631 0 0 0 10.136 2.5a2.441 2.441 0 0 0-1.856.682A2.478 2.478 0 0 0 7.5 5v5.5H2.861a.251.251 0 0 0-.176.429L10 18.193Z"

      />
    )}
  </svg>
</button>
    </div>
  );
};
