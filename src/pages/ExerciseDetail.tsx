import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { Content, Comment, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { CommentSection } from '@/components/CommentSection';
import { 
  getContentById, 
  voteExercise, 
  addComment, 
  markContentViewed,
  deleteSolution, 
  voteSolution, 
  addSolution,
  markExerciseProgress, 
  removeExerciseProgress, 
  saveExercise, 
  unsaveExercise,
} from '@/lib/api';

// Import enhanced components
import { ExerciseHeader } from '@/components/exercise/ExerciseHeader';
import { TabNavigation } from '@/components/exercise/TabNavigation';
import { FloatingToolbar } from '@/components/exercise/FloatingToolbar';
import { ExerciseContent } from '@/components/exercise/ExerciseContent';
import { ExerciseSidebar } from '@/components/exercise/ExerciseSidebar';
import { ProposalsEmptyState, ActivityEmptyState } from '@/components/exercise/EmptyStates';
import { SolutionSection } from '@/components/exercise/SolutionSection';
import { ExercisePrintView } from '@/components/exercise/ExercisePrintView';
import { MobileSidebar } from '@/components/exercise/MobileSidebar';
import { 
  ArrowLeft, 
  Lightbulb,
  Share2, 
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'katex/dist/katex.min.css';

export function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { openModal } = useAuthModal();
  const [exercise, setExercise] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<'exercise' | 'discussions' | 'proposals' | 'activity'>('exercise');
  const [completed, setCompleted] = useState<'success' | 'review' | null>(null);
  const [savedForLater, setSavedForLater] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [loadingStates, setLoadingStates] = useState({
    progress: false,
    save: false
  });
  
  // User interaction states
  const [timer, setTimer] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [difficultyRating, setDifficultyRating] = useState<number | null>(null);
  const [fullscreenMode, setFullscreenMode] = useState<boolean>(false);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const [isSticky, setIsSticky] = useState<boolean>(false);
  const [showPrint, setShowPrint] = useState<boolean>(false);
  
  // Refs for scroll handling
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (id) {
      if (isAuthenticated) {
        loadExerciseWithUserStatus(id);
      } else {
        loadExercise(id);
      }
      markContentViewed(id).catch(console.error);
    }
    
    // Add page transition animation
    document.body.classList.add('page-transition');
    return () => {
      document.body.classList.remove('page-transition');
    };
  }, [id, isAuthenticated]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (timerActive) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive]);

  // Scroll effect to track sticky header
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsSticky(scrollPosition > 300);
      
      // Auto-hide toolbar when scrolling down
      if (scrollPosition > 600 && showToolbar) {
        setShowToolbar(false);
      } else if (scrollPosition < 300 && !showToolbar) {
        setShowToolbar(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showToolbar]);

  // Format date as time ago (e.g. "2 hours ago")
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffSecs < 60) return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  };

  const loadExerciseWithUserStatus = async (exerciseId: string) => {
    try {
      setLoading(true);
      const exerciseData = await getContentById(exerciseId);
      setExercise(exerciseData);
      
      // Set user-specific states
      if (exerciseData.user_complete) {
        setCompleted(exerciseData.user_complete);
      }
      if (exerciseData.user_save) {
        setSavedForLater(exerciseData.user_save);
      }
    } catch (err) {
      console.error('Failed to load exercise:', err);
      setError('Failed to load exercise. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadExercise = async (exerciseId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getContentById(exerciseId);
      setExercise(data);
    } catch (err) {
      console.error('Failed to load exercise:', err);
      setError('Failed to load exercise. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (content: string, parentId?: string) => {
    if (!id || !exercise) return;
  
    try {
      const newComment = await addComment(id, content, parentId);
      
      setExercise(prev => {
        if (!prev) return prev;
  
        let updatedComments = [...prev.comments];
        
        if (parentId) {
          const updateCommentsTree = (comments: Comment[]): Comment[] => {
            return comments.map(comment => {
              if (comment.id === parentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), newComment]
                };
              }
              if (comment.replies) {
                return {
                  ...comment,
                  replies: updateCommentsTree(comment.replies)
                };
              }
              return comment;
            });
          };
          
          updatedComments = updateCommentsTree(updatedComments);
        } else {
          updatedComments.push(newComment);
        }
  
        return {
          ...prev,
          comments: updatedComments
        };
      });
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };
  
  const handleVote = async (value: VoteValue, target: 'exercise' | 'solution' = 'exercise') => {
    if (!isAuthenticated || !id) {
      openModal();
      return;
    }

    try {
      if (target === 'solution' && exercise?.solution) {
        const updatedSolution = await voteSolution(exercise.solution.id, value);
        setExercise(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            solution: updatedSolution
          };
        });
      } else {
        const updatedExercise = await voteExercise(id, value);
        setExercise(updatedExercise);
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleAddSolution = async (solutionContent: string) => {
    if (!isAuthenticated || !exercise || !solutionContent.trim()) {
      return;
    }
  
    try {
      const newSolution = await addSolution(exercise.id, { content: solutionContent });
      setExercise(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          solution: newSolution
        };
      });
      
      // Show confetti when solution is added
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      
      // Auto-open the solution view
      setSolutionVisible(true);
    } catch (err) {
      console.error('Failed to add solution:', err);
    }
  };
  
  const handleDeleteSolution = async () => {
    if (!exercise?.solution || !window.confirm('Are you sure you want to delete this solution?')) {
      return;
    }
  
    try {
      await deleteSolution(exercise.solution.id);
      loadExercise(exercise.id);
    } catch (err) {
      console.error('Failed to delete solution:', err);
    }
  };
  
  // Implement progress tracking (Success/Review)
  const markAsCompleted = async (status: 'success' | 'review') => {
    if (!isAuthenticated || !id) {
      openModal();
      return;
    }
    
    try {
      setLoadingStates(prev => ({ ...prev, progress: true }));
      
      // If user clicks the same status button again, remove the progress
      if (completed === status) {
        await removeExerciseProgress(id);
        setCompleted(null);
      } else {
        await markExerciseProgress(id, status);
        setCompleted(status);
        
        // Show confetti animation when marking as success
        if (status === 'success') {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }
      }
    } catch (err) {
      console.error('Failed to update progress:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, progress: false }));
    }
  };
  
  // Toggle saved status (Bookmark)
  const toggleSavedForLater = async () => {
    if (!isAuthenticated || !id) {
      openModal();
      return;
    }
    
    try {
      setLoadingStates(prev => ({ ...prev, save: true }));
      
      if (savedForLater) {
        await unsaveExercise(id);
        setSavedForLater(false);
      } else {
        await saveExercise(id);
        setSavedForLater(true);
      }
    } catch (err) {
      console.error('Failed to update saved status:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, save: false }));
    }
  };

  // Timer functions
  const toggleTimer = () => {
    setTimerActive(!timerActive);
  };

  const resetTimer = () => {
    setTimer(0);
    setTimerActive(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Difficulty rating
  const rateDifficulty = (rating: number) => {
    setDifficultyRating(rating);
    // TODO: API call would go here
  };

  // Layout control functions
  const toggleFullscreen = () => {
    setFullscreenMode(!fullscreenMode);
  };

  const toggleToolbar = () => {
    setShowToolbar(!showToolbar);
  };
  
  // Print function with enhanced preview
  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => {
      window.print();
      setShowPrint(false);
    }, 300);
  };
  
  // Share function
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: exercise?.title || 'Math Exercise',
        text: `Check out this math exercise: ${exercise?.title}`,
        url: window.location.href
      }).catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying link:', err));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 22H20C21.1 22 22 21.1 22 20V4C22 2.9 21.1 2 20 2H4C2.9 2 2 2.9 2 4V20C2 21.1 2.9 22 4 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 6L9 18L6 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="mt-6 text-lg font-medium text-indigo-900">Loading exercise...</p>
          <div className="mt-2 flex items-center space-x-2">
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pt-10 pb-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white border-l-4 border-red-500 text-red-700 p-6 rounded-xl shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-6">
                <h3 className="text-lg font-semibold">Exercise Unavailable</h3>
                <p className="mt-2 text-base">{error || 'Exercise not found. Please check the link or try again later.'}</p>
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <Button 
              onClick={() => navigate('/exercises')}
              className="group bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-full shadow-md px-8 py-3 text-lg font-medium transition-all duration-300 hover:shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
              Back to Exercises
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  const isAuthor = user?.id === exercise.author.id;
  const hasSolution = !!exercise.solution;
  const canEditSolution = exercise.solution && user?.id === exercise.solution.author.id;

  return (
    <div className={`min-h-screen bg-gray-50 pb-16 transition-all duration-300 ${fullscreenMode ? 'bg-white' : ''}`}>

      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      {/* Print-only view */}
      {showPrint && (
        <div className="hidden print:block">
          <ExercisePrintView exercise={exercise} showSolution={solutionVisible} />
        </div>
      )}
      
      {/* Main content - hidden during print */}
      <div className="print:hidden">
        {/* Floating toolbar */}
        <FloatingToolbar
          showToolbar={showToolbar}
          toggleToolbar={toggleToolbar}
          timerActive={timerActive}
          toggleTimer={toggleTimer}
          timer={timer}
          fullscreenMode={fullscreenMode}
          toggleFullscreen={toggleFullscreen}
          savedForLater={savedForLater}
          toggleSavedForLater={toggleSavedForLater}
          formatTime={formatTime}
        />
        
        {/* Mobile sidebar */}
        <MobileSidebar
          timer={timer}
          timerActive={timerActive}
          toggleTimer={toggleTimer}
          resetTimer={resetTimer}
          difficultyRating={difficultyRating}
          rateDifficulty={rateDifficulty}
          formatTime={formatTime}
          viewCount={exercise.view_count}
          voteCount={exercise.vote_count}
          commentsCount={exercise.comments?.length || 0}
        />
        
        {/* Sticky header (appears on scroll) */}
        <div className={`fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 transform transition-transform duration-300 ${isSticky ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/exercises')}
                className="rounded-full p-2 text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Back to exercises"
                title="Back to exercises"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <h2 className="text-lg font-medium text-gray-900 line-clamp-1">
                {exercise.title}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${
                exercise.difficulty === 'easy' ? 'from-emerald-500 to-green-500' : 
                exercise.difficulty === 'medium' ? 'from-amber-500 to-yellow-500' : 
                'from-rose-500 to-pink-500'
              } text-white`}>
                {exercise.difficulty === 'easy' ? 'Easy' : 
                 exercise.difficulty === 'medium' ? 'Medium' : 
                 'Hard'}
              </span>
              
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>{formatTime(timer)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 lg:px-6 relative">
          <div ref={headerRef}>
            <ExerciseHeader
              exercise={exercise}
              savedForLater={savedForLater}
              loadingStates={loadingStates}
              toggleSavedForLater={toggleSavedForLater}
              formatTimeAgo={formatTimeAgo}
              isAuthor={isAuthor}
            />
            <div className="bg-gradient-to-r from-blue-800 via-indigo-800 to-indigo-900 text-white px-6 pb-2">
              <TabNavigation
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                commentsCount={exercise.comments?.length || 0}
              />
            </div>
          </div>
          
          {/* Main content grid */}
          <div className="w-full relative">
            <div className="flex flex-col lg:flex-row lg:gap-6">
              {/* Main Content Area */}
              <div className="flex-grow" ref={contentRef}>
                <AnimatePresence mode="wait">
                  {activeSection === 'exercise' && (
                    <motion.div
                      key="exercise-content"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      {/* Exercise Content */}
                      <ExerciseContent
                        exercise={exercise}
                        completed={completed}
                        markAsCompleted={markAsCompleted}
                        loadingStates={loadingStates}
                        handleVote={handleVote}
                        handlePrint={handlePrint}
                      />
                      
                      {/* Solution Section */}
                      <SolutionSection
                        exercise={exercise}
                        canEditSolution={canEditSolution? true : false}
                        isAuthor={isAuthor}
                        solutionVisible={solutionVisible}
                        showSolution={showSolution}
                        handleSolutionToggle={() => setShowSolution(!showSolution)}
                        toggleSolutionVisibility={(e) => {
                          e.stopPropagation();
                          setSolutionVisible(!solutionVisible);
                        }}
                        handleVote={handleVote}
                        handleEditSolution={() => navigate(`/solutions/${exercise.solution?.id}/edit`)}
                        handleDeleteSolution={handleDeleteSolution}
                        handleAddSolution={handleAddSolution}
                        setSolutionVisible={setSolutionVisible}
                      />
                      
                      {/* Additional actions */}
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <button
                          onClick={handleShare}
                          className="bg-white border border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-600 flex items-center justify-center gap-2 px-6 py-3 rounded-xl shadow-sm hover:shadow transition-all duration-200"
                        >
                          <Share2 className="w-5 h-5" />
                          <span>Share Exercise</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            if (hasSolution && !solutionVisible) {
                              setSolutionVisible(true);
                            } else if (!hasSolution && isAuthor) {
                              // Scroll to solution form
                              const solutionForm = document.getElementById('solution-form');
                              if (solutionForm) {
                                solutionForm.scrollIntoView({ behavior: 'smooth' });
                              }
                            }
                          }}
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white flex items-center justify-center gap-2 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          <Lightbulb className="w-5 h-5" />
                          <span>{hasSolution ? 'View Solution' : isAuthor ? 'Add Solution' : 'No Solution Yet'}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Discussions Section */}
                  {activeSection === 'discussions' && (
                    <motion.div
                      key="discussions-content"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6"
                    >
                      <div className="p-6" id="comments">
                        <CommentSection
                          comments={exercise?.comments || []}
                          onAddComment={handleAddComment}
                          onVoteComment={async (commentId: string, type: VoteValue) => {
                            // TODO: Implement comment voting logic
                            return Promise.resolve();
                          }}
                          onEditComment={async (commentId: string, content: string) => {
                            // TODO: Implement comment editing logic
                            return Promise.resolve();
                          }}
                          onDeleteComment={async (commentId: string) => Promise.resolve()} // TODO: Implement delete comment logic
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Proposals Section */}
                  {activeSection === 'proposals' && (
                    <motion.div
                      key="proposals-content"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <ProposalsEmptyState />
                    </motion.div>
                  )}
                  
                  {/* Activity Section */}
                  {activeSection === 'activity' && (
                    <motion.div
                      key="activity-content"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <ActivityEmptyState />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Right Sidebar - Only show on larger screens */}
              {!fullscreenMode && (
                <div className="hidden lg:block lg:w-72 lg:flex-shrink-0 mt-6 lg:mt-0">
                  <div 
                    className="lg:sticky lg:top-28"
                    style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}
                  >
                    <ExerciseSidebar
                      timer={timer}
                      timerActive={timerActive}
                      toggleTimer={toggleTimer}
                      resetTimer={resetTimer}
                      difficultyRating={difficultyRating}
                      rateDifficulty={rateDifficulty}
                      formatTime={formatTime}
                      viewCount={exercise.view_count}
                      voteCount={exercise.vote_count}
                      commentsCount={exercise.comments?.length || 0}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS for Enhanced UI */}
      <style jsx>{`
        /* Page transition animations */
        .page-transition {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        /* Custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(249, 250, 251, 0.5);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(79, 70, 229, 0.2);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(79, 70, 229, 0.4);
        }
        
        /* Print styles */
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
        }
        
        /* Focus style for accessibility */
        button:focus-visible, a:focus-visible {
          outline: 2px solid #6366F1;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}