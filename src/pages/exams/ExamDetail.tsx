import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { Exam, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { CommentSection } from '@/components/CommentSection';
import { useAdvancedTimeTracker } from '@/hooks/useAdvancedTimeTracker';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import { useContentActions } from '@/hooks/useContentActions';
import { useContentUI } from '@/hooks/useContentUI';
import { useContentStatistics } from '@/hooks/useContentStatistics';
import { useSolutionTracking } from '@/hooks/useSolutionTracking';
import { useSolutionManagement } from '@/hooks/content/useSolutionManagement';
import { usePageTimeTracker } from '@/hooks/usePageTimeTracker';
import { voteSolution, undoSolutionViewed, toggleSolutionMatched, voteComment } from '@/lib/api';
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
import { getSessionHistory as getSessionHistoryAPI } from '@/lib/api/interactionApi';

// Import enhanced components
import { ExamHeaderNew } from '@/components/exam/ExamHeaderNew';
import { ExamTitleSection } from '@/components/exam/ExamTitleSection';
import { ExamMainCard } from '@/components/exam/ExamMainCard';
import { ProposalsEmptyState, ActivityEmptyState } from '@/components/exercise/EmptyStates';
import { ExamPrintView } from '@/components/exam/ExamPrintView';
import { ExamSidebar } from '@/components/exam/ExamSidebar';
import { SolutionSection } from '@/components/exercise/SolutionSection';

// Import shared components (consolidated from exam/exercise duplicates)
import { FloatingToolbar } from '@/components/shared/FloatingToolbar';
import { MobileSidebar } from '@/components/shared/MobileSidebar';
import { ActivitySection } from '@/components/activity/ActivitySection';
import { Toast } from '@/components/shared/Toast';
import { SimilarExercises } from '@/components/exercise/SimilarExercises';
import {
  ArrowLeft,
  Clock,
  Save,
  Play,
  Pause,
  RotateCcw,
  Award,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEO, createBreadcrumbStructuredData } from '@/components/SEO';
import { formatTimeAgo, formatDate } from '@/lib/utils/dateHelpers';
import { handleShare as shareContent } from '@/lib/utils/shareHelpers';
import { getDifficultyInfo } from '@/lib/utils/difficultyHelpers';

export function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const { openModal } = useAuthModal();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optimisticSolutionMatched, setOptimisticSolutionMatched] = useState<boolean | null>(null);

  // Content Actions hook (manages: completed, savedForLater, showConfetti, loadingStates, handleVote)
  const {
    completed,
    savedForLater,
    showConfetti,
    loadingStates,
    handleVote: handleContentVote,
    toggleSave,
    setCompleted,
    setSavedForLater
  } = useContentActions({
    contentId: id || '',
    contentType: 'exam',
    initialCompleted: exam?.user_complete,
    initialSaved: exam?.user_save || false,
    onVote: (value) => voteExam(id || '', value).then(data => { setExam(data); return data; }),
    onMarkProgress: (status) => markExamProgress(id || '', status),
    onRemoveProgress: () => removeExamProgress(id || ''),
    onSave: () => saveExam(id || ''),
    onUnsave: () => unsaveExam(id || '')
  });

  // Content UI hook (manages: fullscreenMode, showToolbar, isSticky, showPrint, activeSection, difficultyRating)
  const {
    fullscreenMode,
    showToolbar,
    isSticky,
    showPrint,
    activeSection,
    difficultyRating,
    toggleFullscreen,
    handlePrint,
    setActiveSection,
    setShowToolbar,
    rateDifficulty
  } = useContentUI({ contentType: 'exam' });

  // Helper to toggle toolbar
  const toggleToolbar = () => setShowToolbar(!showToolbar);

  // Handler to change section and update URL
  const handleSectionChange = (newSection: 'exam' | 'discussions' | 'proposals' | 'activity') => {
    setActiveSection(newSection);
    setSearchParams({ tab: newSection });
  };

  // Initialize from URL on mount
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && (tabFromUrl === 'discussions' || tabFromUrl === 'proposals' || tabFromUrl === 'activity' || tabFromUrl === 'exam')) {
      setActiveSection(tabFromUrl as 'exam' | 'discussions' | 'proposals' | 'activity');
    }
  }, []);

  // Sync section from URL changes (browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && (tabFromUrl === 'discussions' || tabFromUrl === 'proposals' || tabFromUrl === 'activity' || tabFromUrl === 'exam') && tabFromUrl !== activeSection) {
      setActiveSection(tabFromUrl as 'exam' | 'discussions' | 'proposals' | 'activity');
    }
  }, [searchParams]);

  // Session History hook
  const { showSessionHistory, fullSessionHistory, loadHistory, closeHistory, setFullSessionHistory } =
    useSessionHistory();
  
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

  // Statistics hook
  const { statistics, loading: statsLoading, refetch: refetchStatistics } = useContentStatistics({
    contentType: 'exam',
    contentId: id,
    enabled: !!id
  });

  // Solution tracking hook
  const {
    showNotification,
    notificationMessage,
    trackSolutionView,
    closeNotification
  } = useSolutionTracking({
    contentType: 'exam',
    contentId: id || '',
    isCompleted: completed,
    onRefetchStatistics: refetchStatistics
  });

  // Solution management hook
  const {
    handleAddSolution: addSolution,
    handleDeleteSolution: deleteSolution,
    isSubmitting: isSolutionSubmitting
  } = useSolutionManagement({
    contentId: id || '',
    onSolutionAdded: () => {
      setSolutionVisible(true);
    },
    onSolutionDeleted: () => {
      if (exam) {
        setExam({ ...exam, solution: undefined });
      }
    }
  });

  // Page time tracker - automatically tracks time spent on this page
  usePageTimeTracker({
    contentType: 'exam',
    contentId: id,
    enabled: !!id  // Track as soon as we have an ID
  });

  // Local state for solution
  const [showSolution, setShowSolution] = useState(false);
  const [solutionVisible, setSolutionVisible] = useState(false);


  // Refs for scroll handling
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasMarkedView = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      if (isAuthenticated) {
        loadExamWithUserStatus(id);
      } else {
        loadExam(id);
      }

      // Mark view only once per exam ID using a Set to track
      if (!hasMarkedView.current.has(id)) {
        hasMarkedView.current.add(id);
        markExamViewed(id).catch(console.error);
      }
    }

    // Add page transition animation
    document.body.classList.add('page-transition');
    return () => {
      document.body.classList.remove('page-transition');
    };
  }, [id, isAuthenticated]);

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

  const handleCommentVote = async (commentId: string, value: VoteValue) => {
    if (!exam) return;

    try {
      const updatedComment = await voteComment(commentId, value);

      const updateComments = (comments: any[]): any[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return updatedComment;
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateComments(comment.replies)
            };
          }
          return comment;
        });
      };

      setExam(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: updateComments(prev.comments)
        };
      });
    } catch (err) {
      console.error('Failed to vote on comment:', err);
    }
  };

  // Handle vote with authentication check
  const handleVote = async (value: VoteValue) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    await handleContentVote(value);
  };


  // Handle save toggle with authentication check
  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    await toggleSave();
  };

  // Timer functions
  const toggleTimer = () => {
    if (isRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  };


  const handleMarkSolutionMatched = async () => {
    if (!id) return;

    const isCurrentlyMatched = optimisticSolutionMatched !== null
      ? optimisticSolutionMatched
      : (statistics?.user_solution_matched || false);

    // Optimistically update UI
    setOptimisticSolutionMatched(!isCurrentlyMatched);

    try {
      // Toggle the solution match on server
      await toggleSolutionMatched('exam', id, isCurrentlyMatched);

      // Refetch statistics to sync with server
      await refetchStatistics();

      // Clear optimistic state when server confirms
      setOptimisticSolutionMatched(null);
    } catch (err) {
      console.error('Failed to toggle solution match:', err);
      // Revert optimistic state on error
      setOptimisticSolutionMatched(null);
      // Refetch to sync with server state
      await refetchStatistics();
    }
  };

  const handleVoteSolution = async (value: VoteValue) => {
    if (!exam?.solution) return;

    const updatedSolution = await voteSolution(exam.solution.id, value);
    if (updatedSolution) {
      setExam(prev => prev ? { ...prev, solution: updatedSolution } : prev);
    }
  };

  const handleAddSolutionWrapper = async (solutionContent: string) => {
    await addSolution(solutionContent, setExam);
  };

  const handleDeleteSolutionWrapper = async () => {
    if (!exam?.solution) return;
    await deleteSolution(exam.solution.id);
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

  // Generate structured data for SEO
  const examType = exam.is_national_exam ? 'Examen National' : 'Examen';
  const breadcrumbData = createBreadcrumbStructuredData([
    { name: 'Accueil', url: '/' },
    { name: 'Examens', url: '/exams' },
    { name: exam.title, url: `/exams/${exam.id}` },
  ]);

  const examStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOccupationalCredential',
    name: exam.title,
    description: exam.content.substring(0, 200).replace(/<[^>]*>/g, ''),
    credentialCategory: exam.is_national_exam ? 'National Exam' : 'Exam',
    educationalLevel: exam.class_levels?.map(level => level.name).join(', ') || 'Secondary Education',
    inLanguage: 'fr',
    competencyRequired: exam.subject?.name || 'Mathématiques',
    dateCreated: exam.created_at,
  };

  // Combine structured data
  const combinedStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [examStructuredData, breadcrumbData],
  };

  return (
    <div className={`min-h-screen bg-gray-50 pb-16 transition-all duration-300 ${fullscreenMode ? 'bg-white' : ''}`}>
      <SEO
        title={`${exam.title} - ${examType} de mathématiques`}
        description={`${examType} de mathématiques${exam.is_national_exam && exam.national_exam_date ? ` - ${formatDate(exam.national_exam_date)}` : ''}. ${exam.content.substring(0, 120).replace(/<[^>]*>/g, '')}`}
        keywords={[
          examType.toLowerCase(),
          'examen mathématiques',
          exam.subject?.name || 'mathématiques',
          ...(exam.class_levels?.map(level => level.name) || []),
          ...(exam.chapters?.map(chapter => chapter.name) || []),
          exam.is_national_exam ? 'bac' : 'test',
          exam.is_national_exam ? 'épreuve nationale' : 'évaluation',
          'préparation examen',
          'annales',
        ]}
        ogType="article"
        ogImage={`/og-exam-${exam.id}.jpg`}
        canonicalUrl={`/exams/${exam.id}`}
        structuredData={combinedStructuredData}
      />
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}

      {/* Solution tracking notification */}
      <Toast
        show={showNotification}
        message={notificationMessage}
        type={completed ? 'success' : 'warning'}
        duration={5000}
        onClose={closeNotification}
      />

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
          toggleSavedForLater={handleToggleSave}
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
          sidebarContent={
            <ExamSidebar
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
          }
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
          {/* Header Section with breadcrumbs, navigation, and tabs */}
          <div ref={headerRef}>
            <ExamHeaderNew
              exam={exam}
              savedForLater={savedForLater}
              loadingStates={loadingStates}
              toggleSavedForLater={handleToggleSave}
              formatTimeAgo={formatTimeAgo}
              isAuthor={isAuthor}
              onPrint={handlePrint}
              activeTab={activeSection as 'exam' | 'discussions' | 'proposals' | 'activity'}
              onTabChange={(tabId) => handleSectionChange(tabId as 'exam' | 'discussions' | 'proposals' | 'activity')}
            />
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
                      {/* Unified container matching ExerciseDetail */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-8">
                        <ExamMainCard
                          exam={exam}
                          handleVote={handleVote}
                          formatTimeAgo={formatTimeAgo}
                        />
                      </div>

                      {/* Solution Section - Only show if solution exists */}
                      {exam.solution && (
                        <>
                          <SolutionSection
                            exercise={exam as any}
                            canEditSolution={(exam.solution && user?.id === exam.solution.author.id) || false}
                            isAuthor={isAuthor}
                            solutionVisible={solutionVisible}
                            showSolution={showSolution}
                            handleSolutionToggle={() => setShowSolution(!showSolution)}
                            toggleSolutionVisibility={(e) => {
                              e.stopPropagation();
                              if (!solutionVisible) {
                                trackSolutionView();
                              }
                              setSolutionVisible(!solutionVisible);
                            }}
                            handleVote={(value, target) => target === 'solution' ? handleVoteSolution(value) : handleVote(value)}
                            handleEditSolution={() => navigate(`/solutions/${exam.solution?.id}/edit`)}
                            handleDeleteSolution={handleDeleteSolutionWrapper}
                            handleAddSolution={handleAddSolutionWrapper}
                            setSolutionVisible={setSolutionVisible}
                            userSolutionMatched={optimisticSolutionMatched !== null ? optimisticSolutionMatched : (statistics?.user_solution_matched || false)}
                            onMarkSolutionMatched={handleMarkSolutionMatched}
                          />
                        </>
                      )}

                      {/* Similar content */}
                      <SimilarExercises contentId={exam.id} contentType="exam" />
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
                          onVoteComment={handleCommentVote}
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
                      <ActivitySection
                        statistics={statistics}
                        loading={statsLoading}
                        contentType="exam"
                        onRemoveSolutionFlag={handleRemoveSolutionFlag}
                      />
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
                      <div className="bg-gradient-to-r from-green-900 to-green-800 text-white p-4">
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
                             variant="ghost" 
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
                             variant="ghost"
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
                             if (id) {
                               loadHistory('exam', id);
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
           onClick={closeHistory}
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
                   onClick={closeHistory}
                   title='Fermer l’historique des sessions'
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
                           const updatedHistory = await getSessionHistoryAPI('exam', id!);
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