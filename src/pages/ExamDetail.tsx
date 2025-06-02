import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { Exam, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { CommentSection } from '@/components/CommentSection';
import { useAdvancedTimeTracker } from '@/hooks/useAdvancedTimeTracker';
import { 
  getExamById, 
  voteExam, 
  addExamComment, 
  markExamViewed,
  markExamProgress, 
  removeExamProgress, 
  saveExam, 
  unsaveExam,
} from '@/lib/api/examApi';
import { getSessionHistory, TimeSession } from '@/lib/api/interactionApi';

// Import enhanced components (we'll need to create exam-specific versions)
import { ExamHeader } from '@/components/exam/ExamHeader';
import { TabNavigation } from '@/components/exam/TabNavigation';
import { FloatingToolbar } from '@/components/exam/FloatingToolbar';
import { ExamContent } from '@/components/exam/ExamContent';
import { ProposalsEmptyState, ActivityEmptyState } from '@/components/exercise/EmptyStates';
import { ExamPrintView } from '@/components/exam/ExamPrintView';
import { MobileSidebar } from '@/components/exam/MobileSidebar';
import { 
  ArrowLeft, 
  Share2, 
  Clock,
  Save,
  Play,
  Pause,
  RotateCcw,
  Award,
  Calendar,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  Bookmark,
  Printer,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import 'katex/dist/katex.min.css';

export function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { openModal } = useAuthModal();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'exam' | 'discussions' | 'proposals' | 'activity'>('exam');
  const [completed, setCompleted] = useState<'success' | 'review' | null>(null);
  const [savedForLater, setSavedForLater] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [loadingStates, setLoadingStates] = useState({
    progress: false,
    save: false
  });
  
  // User interaction states
  const [difficultyRating, setDifficultyRating] = useState<number | null>(null);
  const [fullscreenMode, setFullscreenMode] = useState<boolean>(false);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const [isSticky, setIsSticky] = useState<boolean>(false);
  const [showPrint, setShowPrint] = useState<boolean>(false);
  const [showSessionHistory, setShowSessionHistory] = useState<boolean>(false);
  const [fullSessionHistory, setFullSessionHistory] = useState<TimeSession[]>([]);
  
  // Time tracking with enhanced hook for session history
  const {
    currentTime,
    isRunning,
    sessions,
    sessionStats,
    loading: timeLoading,
    saving,
    startTimer,
    stopTimer,
    resetTimer,
    saveSession,
    deleteSession,
    loadSessionHistory,
    formatTime,
    calculateImprovement,
    formatCurrentTime,
    getBestTime,
    getLastTime,
    getAverageTime,
    getSessionCount,
    getTimeComparison
  } = useAdvancedTimeTracker({
    contentType: 'exam',
    contentId: id || '',
    enabled: !!id && !!exam && isAuthenticated
  });
  
  // Refs for scroll handling
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (id) {
      if (isAuthenticated) {
        loadExamWithUserStatus(id);
      } else {
        loadExam(id);
      }
      markExamViewed(id).catch(console.error);
    }
    
    // Add page transition animation
    document.body.classList.add('page-transition');
    return () => {
      document.body.classList.remove('page-transition');
    };
  }, [id, isAuthenticated]);

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
  
  // Format date for display (used for national exam date)
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Date non spécifiée';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const loadExamWithUserStatus = async (examId: string) => {
    try {
      setLoading(true);
      const examData = await getExamById(examId);
      setExam(examData);
      
      // Set user-specific states
      if (examData.user_complete) {
        setCompleted(examData.user_complete);
      }
      if (examData.user_save) {
        setSavedForLater(examData.user_save);
      }
    } catch (err) {
      console.error('Failed to load exam:', err);
      setError('Failed to load exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadExam = async (examId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getExamById(examId);
      setExam(data);
    } catch (err) {
      console.error('Failed to load exam:', err);
      setError('Failed to load exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (content: string, parentId?: string) => {
    if (!id || !exam) return;
  
    try {
      const newComment = await addExamComment(id, content, parentId);
      
      setExam(prev => {
        if (!prev) return prev;
  
        let updatedComments = [...prev.comments];
        
        if (parentId) {
          const updateCommentsTree = (comments: any[]): any[] => {
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
  
  const handleVote = async (value: VoteValue) => {
    if (!isAuthenticated || !id) {
      openModal();
      return;
    }

    try {
      const updatedExam = await voteExam(id, value);
      setExam(updatedExam);
    } catch (err) {
      console.error('Failed to vote:', err);
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
        await removeExamProgress(id);
        setCompleted(null);
      } else {
        await markExamProgress(id, status);
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
        await unsaveExam(id);
        setSavedForLater(false);
      } else {
        await saveExam(id);
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
    if (isRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  };

  const saveTimeManually = async () => {
    try {
      await saveSession();
      console.log('Session saved successfully');
    } catch (err) {
      console.error('Failed to save session manually:', err);
    }
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
        title: exam?.title || 'Exam',
        text: `Check out this exam: ${exam?.title}`,
        url: window.location.href
      }).catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying link:', err));
    }
  };

  // Get difficulty color and label
  const getDifficultyInfo = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return {
          label: 'Facile',
          color: 'from-emerald-500 to-green-500',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-100'
        };
      case 'medium':
        return {
          label: 'Moyen',
          color: 'from-amber-500 to-yellow-500',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-100'
        };
      case 'hard':
        return {
          label: 'Difficile',
          color: 'from-rose-500 to-pink-500',
          bgColor: 'bg-rose-50',
          textColor: 'text-rose-700',
          borderColor: 'border-rose-100'
        };
      default:
        return {
          label: difficulty,
          color: 'from-gray-500 to-gray-400',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-100'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
              <Award className="w-8 h-8" />
            </div>
          </div>
          <p className="mt-6 text-lg font-medium text-indigo-900">Loading exam...</p>
          <div className="mt-2 flex items-center space-x-2">
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white border-l-4 border-red-500 text-red-700 p-6 rounded-xl shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-6">
                <h3 className="text-lg font-semibold">Exam Unavailable</h3>
                <p className="mt-2 text-base">{error || 'Exam not found. Please check the link or try again later.'}</p>
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <Button 
              onClick={() => navigate('/exams')}
              className="group bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-full shadow-md px-8 py-3 text-lg font-medium transition-all duration-300 hover:shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
              Back to Exams
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  const isAuthor = user?.id === exam.author.id;
  const difficultyInfo = getDifficultyInfo(exam.difficulty);

  return (
    <div className={`min-h-screen bg-gray-50 pb-16 transition-all duration-300 ${fullscreenMode ? 'bg-white' : ''}`}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      {/* Print-only view */}
      {showPrint && (
        <div className="hidden print:block">
          <ExamPrintView exam={exam} />
        </div>
      )}
      
      {/* Main content - hidden during print */}
      <div className="print:hidden">
        {/* Floating toolbar */}
        <FloatingToolbar
          showToolbar={showToolbar}
          toggleToolbar={toggleToolbar}
          timerActive={isRunning}
          toggleTimer={toggleTimer}
          timer={currentTime}
          fullscreenMode={fullscreenMode}
          toggleFullscreen={toggleFullscreen}
          savedForLater={savedForLater}
          toggleSavedForLater={toggleSavedForLater}
          formatTime={formatTime}
        />
        
        {/* Mobile sidebar */}
        <MobileSidebar
          timer={currentTime}
          timerActive={isRunning}
          toggleTimer={toggleTimer}
          resetTimer={resetTimer}
          difficultyRating={difficultyRating}
          rateDifficulty={rateDifficulty}
          formatTime={formatTime}
          viewCount={exam.view_count}
          voteCount={exam.vote_count}
          commentsCount={exam.comments?.length || 0}
        />
        
        {/* Sticky header (appears on scroll) */}
        <div className={`fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 transform transition-transform duration-300 ${isSticky ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/exams')}
                className="rounded-full p-2 text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Back to exams"
                title="Back to exams"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <h2 className="text-lg font-medium text-gray-900 line-clamp-1">
                {exam.title}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              {exam.is_national_exam && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center">
                  <Award className="w-3.5 h-3.5 mr-1" />
                  Examen National
                </span>
              )}
              
              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${difficultyInfo.color} text-white`}>
                {difficultyInfo.label}
              </span>
              
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>{formatCurrentTime()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 lg:px-6 relative">
          {/* Header Section */}
          <div ref={headerRef}>
            <ExamHeader
              exam={exam}
              savedForLater={savedForLater}
              loadingStates={loadingStates}
              toggleSavedForLater={toggleSavedForLater}
              formatTimeAgo={formatTimeAgo}
              isAuthor={isAuthor}
            />
            <div className={`bg-gradient-to-r ${exam.is_national_exam ? 'from-blue-800 to-blue-600' : 'from-blue-800 via-indigo-800 to-indigo-900'} text-white px-6 pb-2`}>
              <TabNavigation
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                commentsCount={exam.comments?.length || 0}
              />
            </div>
          </div>
          
          {/* Main content grid */}
          <div className="w-full relative">
            <div className="flex flex-col lg:flex-row lg:gap-6">
              {/* Main Content Area */}
              <div className="flex-grow" ref={contentRef}>
                <AnimatePresence mode="wait">
                  {activeSection === 'exam' && (
                    <motion.div
                      key="exam-content"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      {/* Exam Content */}
                      <ExamContent
                        exam={exam}
                        completed={completed}
                        markAsCompleted={markAsCompleted}
                        loadingStates={loadingStates}
                        handleVote={handleVote}
                        handlePrint={handlePrint}
                      />
                      
                      {/* Additional actions */}
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <button
                          onClick={handleShare}
                          className="bg-white border border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-600 flex items-center justify-center gap-2 px-6 py-3 rounded-xl shadow-sm hover:shadow transition-all duration-200"
                        >
                          <Share2 className="w-5 h-5" />
                          <span>Partager l'examen</span>
                        </button>
                        
                        <button
                          onClick={toggleSavedForLater}
                          className={`${savedForLater 
                            ? 'bg-yellow-100 border-yellow-300 text-yellow-700' 
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white'
                          } flex items-center justify-center gap-2 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200`}
                        >
                          <Bookmark className={`w-5 h-5 ${savedForLater ? 'fill-yellow-500' : ''}`} />
                          <span>{savedForLater ? 'Enregistré' : 'Enregistrer pour plus tard'}</span>
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
                          comments={exam?.comments || []}
                          onAddComment={handleAddComment}
                          onVoteComment={async (commentId: string, type: VoteValue) => {
                            // TODO: Implement comment voting logic
                            return Promise.resolve();
                          }}
                          onEditComment={async (commentId: string, content: string) => {
                            // TODO: Implement comment editing logic
                            return Promise.resolve();
                          }}
                          onDeleteComment={async (commentId: string) => Promise.resolve()}
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
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden divide-y divide-gray-100">
                      {/* Timer Section with Session History */}
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium flex items-center text-sm">
                            <Clock className="w-4 h-4 mr-1.5" />
                            Chronomètre
                          </h3>
                          {getSessionCount() > 0 && (
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                              {getSessionCount()} session{getSessionCount() > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        
                        {/* Current Timer */}
                        <div className="text-center mb-4">
                          <div className="font-mono text-3xl font-bold">{formatCurrentTime()}</div>
                          <div className="text-xs text-white/70">Temps actuel</div>
                          
                          {/* Real-time comparison with last session */}
                          {isRunning && getTimeComparison() && (
                            <div className={`mt-2 text-sm ${getTimeComparison()!.isFaster ? 'text-green-300' : 'text-red-300'}`}>
                              {getTimeComparison()!.isFaster ? '▲' : '▼'} 
                              {getTimeComparison()!.differenceFormatted} 
                              {getTimeComparison()!.isFaster ? ' plus rapide' : ' plus lent'}
                            </div>
                          )}
                        </div>
                        
                        {/* Previous Sessions Stats */}
                        {sessionStats && sessionStats.total_sessions > 0 && (
                          <div className="bg-white/10 rounded-lg p-3 mb-4 space-y-2">
                            <div className="text-xs font-medium text-white/80 mb-2">Sessions précédentes</div>
                           
                           <div className="grid grid-cols-2 gap-2 text-xs">
                             <div>
                               <div className="text-white/60">Dernière session</div>
                               <div className="font-mono font-semibold">{getLastTime() || '-'}</div>
                             </div>
                             <div>
                               <div className="text-white/60">Meilleur temps</div>
                               <div className="font-mono font-semibold text-green-300">{getBestTime() || '-'}</div>
                             </div>
                             <div>
                               <div className="text-white/60">Temps moyen</div>
                               <div className="font-mono font-semibold">{getAverageTime() || '-'}</div>
                             </div>
                             <div>
                               <div className="text-white/60">Sessions</div>
                               <div className="font-semibold">{getSessionCount()}</div>
                             </div>
                           </div>
                         </div>
                       )}
                       
                       {/* Control Buttons */}
                       <div className="space-y-2">
                         <div className="flex gap-2">
                           <Button 
                             onClick={() => {
                               if (isRunning) {
                                 stopTimer();
                               } else {
                                 startTimer();
                               }
                             }}
                             className={`flex-1 h-9 text-sm font-medium ${
                               isRunning 
                                 ? 'bg-red-500 hover:bg-red-600 text-white' 
                                 : 'bg-white text-indigo-700 hover:bg-indigo-50'
                             }`}
                           >
                             {isRunning ? (
                               <>
                                 <Pause className="w-4 h-4 mr-1" />
                                 Pause
                               </>
                             ) : (
                               <>
                                 <Play className="w-4 h-4 mr-1" />
                                 {currentTime > 0 ? 'Reprendre' : 'Démarrer'}
                               </>
                             )}
                           </Button>
                           
                           <Button 
                             onClick={resetTimer} 
                             variant="outline" 
                             className="h-9 px-3 text-sm bg-white/10 border-white/30 text-white hover:bg-white/20"
                             disabled={currentTime === 0 || isRunning}
                           >
                             <RotateCcw className="w-4 h-4" />
                           </Button>
                         </div>
                         
                         {/* Save Session Button */}
                         {currentTime > 0 && (
                           <Button
                             onClick={async () => {
                               try {
                                 const result = await saveSession();
                                 if (result) {
                                   // Show comparison with previous session if exists
                                   if (sessionStats?.last_session) {
                                     const improvement = calculateImprovement(
                                       currentTime, 
                                       sessionStats.last_session.duration_seconds
                                     );
                                     
                                     if (improvement !== null) {
                                       if (improvement > 0) {
                                         alert(`Bravo! Vous avez amélioré votre temps de ${improvement}% 🎉`);
                                       } else if (improvement < 0) {
                                         alert(`Session enregistrée. Vous étiez ${Math.abs(improvement)}% plus lent cette fois.`);
                                       } else {
                                         alert('Session enregistrée. Même temps que la dernière fois!');
                                       }
                                     } else {
                                       alert('Session enregistrée avec succès!');
                                     }
                                   } else {
                                     alert('Première session enregistrée! 🎉');
                                   }
                                 }
                               } catch (error) {
                                 alert('Erreur lors de la sauvegarde');
                               }
                             }}
                             variant="outline"
                             className="w-full h-9 text-sm bg-white/10 border-white/30 text-white hover:bg-white/20 font-medium"
                             disabled={saving || isRunning}
                           >
                             {saving ? (
                               <>
                                 <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                 Sauvegarde...
                               </>
                             ) : (
                               <>
                                 <Save className="w-4 h-4 mr-2" />
                                 Terminer la session
                               </>
                             )}
                           </Button>
                         )}
                       </div>

                       {/* View History Button */}
                       {getSessionCount() > 0 && (
                         <button
                           onClick={async () => {
                             try {
                               if (!id) return;
                               const history = await getSessionHistory('exam', id);
                               setFullSessionHistory(history);
                               setShowSessionHistory(true);
                             } catch (error) {
                               console.error('Failed to load session history:', error);
                             }
                           }}
                           className="w-full mt-3 text-xs text-white/70 hover:text-white/90 transition-colors"
                         >
                           Voir l'historique complet →
                         </button>
                       )}
                       
                       {/* Loading indicator */}
                       {timeLoading && (
                         <div className="mt-2 text-xs text-white/60 text-center">
                           Synchronisation...
                         </div>
                       )}
                     </div>
                     
                     {/* Difficulty Rating */}
                     <div className="p-4">
                       <div className="flex items-center gap-2 mb-2">
                         <BarChart3 className="w-4 h-4 text-indigo-600" />
                         <span className="font-medium text-gray-800 text-sm">Évaluer la difficulté</span>
                       </div>
                       <div className="flex gap-1">
                         {[1, 2, 3, 4, 5].map(rating => (
                           <button 
                             key={rating}
                             onClick={() => rateDifficulty(rating)}
                             className={`flex-1 p-1.5 rounded text-sm transition-all ${
                               difficultyRating === rating 
                                 ? 'bg-indigo-600 text-white shadow-sm' 
                                 : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                             }`}
                           >
                             {rating}
                           </button>
                         ))}
                       </div>
                     </div>
                     
                     {/* Exam Statistics */}
                     <div className="p-4">
                       <h3 className="font-medium text-gray-800 text-sm mb-2">Statistiques</h3>
                       <div className="space-y-1.5">
                         <div className="flex justify-between text-sm">
                           <span className="text-gray-600">Vues</span>
                           <span className="font-medium">{exam.view_count}</span>
                         </div>
                         <div className="flex justify-between text-sm">
                           <span className="text-gray-600">Votes</span>
                           <span className="font-medium">{exam.vote_count}</span>
                         </div>
                         <div className="flex justify-between text-sm">
                           <span className="text-gray-600">Commentaires</span>
                           <span className="font-medium">{exam.comments?.length || 0}</span>
                         </div>
                         <div className="flex justify-between text-sm">
                           <span className="text-gray-600">Session actuelle</span>
                           <span className="font-medium">{formatCurrentTime()}</span>
                         </div>
                         <div className="flex justify-between text-sm">
                           <span className="text-gray-600">Temps total</span>
                           <span className="font-medium">{formatTime(currentTime)}</span>
                         </div>
                       </div>
                     </div>
                     
                     {/* Related Exams Section */}
                     <div className="p-4">
                       <div className="flex items-center justify-between mb-2">
                         <h3 className="font-medium text-gray-800 text-sm flex items-center gap-1.5">
                           <Award className="w-4 h-4 text-indigo-600" />
                           Examens similaires
                         </h3>
                         <Button 
                           variant="ghost" 
                           size="sm"
                           className="text-indigo-600 h-6 p-0 text-xs hover:bg-transparent hover:text-indigo-800"
                         >
                           Voir plus
                         </Button>
                       </div>
                       
                       <div className="space-y-2">
                         <p className="text-sm text-gray-500 italic">
                           Bientôt disponible
                         </p>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             )}
           </div>
         </div>
       </div>
     </div>

     {/* Session History Modal */}
     <AnimatePresence>
       {showSessionHistory && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
           onClick={() => setShowSessionHistory(false)}
         >
           <motion.div
             initial={{ scale: 0.9, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.9, opacity: 0, y: 20 }}
             className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-gray-100"
             onClick={(e) => e.stopPropagation()}
           >
             {/* Header */}
             <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-white/20 rounded-lg">
                     <Clock className="w-6 h-6 text-white" />
                   </div>
                   <div>
                     <h2 className="text-2xl font-bold text-white">Historique des sessions</h2>
                     <p className="text-indigo-100 text-sm">Suivez vos progrès et performances</p>
                   </div>
                 </div>
                 <button
                   onClick={() => setShowSessionHistory(false)}
                   className="text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200 p-2 rounded-lg"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
             </div>
             
             {/* Content */}
             <div className="p-8 overflow-y-auto max-h-[60vh]">
               {fullSessionHistory.length === 0 ? (
                 <div className="text-center py-16">
                   <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                     <Clock className="w-12 h-12 text-gray-400" />
                   </div>
                   <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune session trouvée</h3>
                   <p className="text-gray-500">Commencez à pratiquer pour voir vos sessions apparaître ici</p>
                 </div>
               ) : (
                 <div className="space-y-6">
                   {fullSessionHistory.map((session, index) => {
                     const createdDate = new Date(session.created_at);
                     const isRecent = Date.now() - createdDate.getTime() < 24 * 60 * 60 * 1000; // Last 24h
                     
                     const handleDeleteSession = async () => {
                       if (window.confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) {
                         try {
                           await deleteSession(session.id);
                           // Refresh the full session history
                           const updatedHistory = await getSessionHistory('exam', id!);
                           setFullSessionHistory(updatedHistory);
                         } catch (error) {
                           console.error('Failed to delete session:', error);
                           alert('Erreur lors de la suppression de la session');
                         }
                       }
                     };
                     
                     return (
                       <motion.div 
                         key={session.id} 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: index * 0.05 }}
                         className={`relative bg-gradient-to-r ${isRecent ? 'from-blue-50 to-indigo-50 border-blue-200' : 'from-gray-50 to-gray-100 border-gray-200'} rounded-xl p-6 border-2 hover:shadow-lg transition-all duration-200 group`}
                       >
                         {isRecent && (
                           <div className="absolute -top-2 -right-2">
                             <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                               Récent
                             </span>
                           </div>
                         )}
                         
                         <div className="flex items-start justify-between mb-4">
                           <div className="flex items-center gap-4">
                             <div className="bg-white rounded-lg p-3 shadow-sm">
                               <div className="text-2xl font-bold text-indigo-600">
                                 #{fullSessionHistory.length - index}
                               </div>
                             </div>
                             <div>
                               <div className="flex items-center gap-3 mb-2">
                                 <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-semibold rounded-full">
                                   <Clock className="w-4 h-4 mr-1" />
                                   {formatTime(session.session_duration)}
                                 </span>
                                 <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                   {formatTimeAgo(session.created_at)}
                                 </span>
                               </div>
                               <div className="text-sm text-gray-600">
                                 <span className="font-medium">Créé le:</span>
                                 <span className="ml-2">
                                   {createdDate.toLocaleDateString('fr-FR', {
                                     weekday: 'long',
                                     day: '2-digit',
                                     month: 'long',
                                     year: 'numeric'
                                   })}
                                 </span>
                                 <span className="mx-2 text-gray-400">•</span>
                                 <span className="font-mono">
                                   {createdDate.toLocaleTimeString('fr-FR', {
                                     hour: '2-digit',
                                     minute: '2-digit'
                                   })}
                                 </span>
                               </div>
                             </div>
                           </div>
                           
                           <button
                             onClick={handleDeleteSession}
                             className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 p-2 rounded-lg"
                             title="Supprimer cette session"
                           >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                             </svg>
                           </button>
                         </div>
                         
                         {session.notes && (
                           <div className="mt-4 pt-4 border-t border-gray-200">
                             <div className="flex items-start gap-2">
                               <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                               </svg>
                               <div>
                                 <span className="text-gray-600 text-sm font-medium">Notes:</span>
                                 <p className="text-gray-900 text-sm mt-1 leading-relaxed">{session.notes}</p>
                               </div>
                             </div>
                           </div>
                         )}
                       </motion.div>
                     );
                   })}
                 </div>
               )}
             </div>
             
             {/* Footer Stats */}
             <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="text-center">
                   <div className="text-2xl font-bold text-indigo-600">{fullSessionHistory.length}</div>
                   <div className="text-sm text-gray-600">Sessions totales</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-green-600">
                     {formatTime(fullSessionHistory.reduce((total, session) => total + session.session_duration, 0))}
                   </div>
                   <div className="text-sm text-gray-600">Temps total</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-purple-600">
                     {fullSessionHistory.length > 0 ? 
                       formatTime(Math.round(fullSessionHistory.reduce((total, session) => total + session.session_duration, 0) / fullSessionHistory.length))
                       : '00:00'
                     }
                   </div>
                   <div className="text-sm text-gray-600">Temps moyen</div>
                 </div>
               </div>
             </div>
           </motion.div>
         </motion.div>
       )}
     </AnimatePresence>
   </div>
 );
};