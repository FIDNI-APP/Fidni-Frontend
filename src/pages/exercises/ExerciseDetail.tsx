import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { VoteValue } from '@/types';
import { CompletionAnimation } from '@/components/animations/CompletionAnimation';
import { useAuth } from '@/contexts/AuthContext';
import { CommentSection } from '@/components/CommentSection';
import { useAdvancedTimeTracker } from '@/hooks/useAdvancedTimeTracker';
import { voteSolution, getSessionHistory, undoSolutionViewed, toggleSolutionMatched, voteComment } from '@/lib/api';

// Import enhanced components
import { ExerciseHeader } from '@/components/exercise/ExerciseHeader';
import { ExerciseMainCard } from '@/components/exercise/ExerciseMainCard';
import { ProposalsEmptyState } from '@/components/exercise/EmptyStates';
import { SolutionSection } from '@/components/exercise/SolutionSection';
import { SimilarExercises } from '@/components/exercise/SimilarExercises';
import { ExercisePrintView } from '@/components/exercise/ExercisePrintView';
import { ExerciseSidebar } from '@/components/exercise/ExerciseSidebar';

// Import shared components
import { FloatingToolbar } from '@/components/shared/FloatingToolbar';
import { MobileSidebar } from '@/components/shared/MobileSidebar';
import { ActivitySection } from '@/components/activity/ActivitySection';
import { Toast } from '@/components/shared/Toast';

// Import custom hooks
import { useContentLoader } from '@/hooks/content/useContentLoader';
import { useContentProgress } from '@/hooks/useContentProgress';
import { useContentVoting } from '@/hooks/useContentVoting';
import { useCommentManagement } from '@/hooks/content/useCommentManagement';
import { useSolutionManagement } from '@/hooks/content/useSolutionManagement';
import { useUIControls } from '@/hooks/useUIControls';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import { useContentStatistics } from '@/hooks/useContentStatistics';
import { useSolutionTracking } from '@/hooks/useSolutionTracking';
import { usePageTimeTracker } from '@/hooks/usePageTimeTracker';

// Import utilities
import { triggerAnimation } from '@/lib/utils/component-helpers/confetti';
import {
  ArrowLeft,
  Clock,
  Save,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  MessageSquare,
  GitPullRequest,
  Activity,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEO, createExerciseStructuredData, createBreadcrumbStructuredData } from '@/components/SEO';
import { formatTimeAgo } from '@/lib/utils/dateHelpers';

export function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Content loading
  const { content: exercise, setContent: setExercise, loading, error } = useContentLoader({
    contentId: id,
    autoMarkViewed: true
  });

  // Statistics hook
  const { statistics, loading: statsLoading, refetch: refetchStatistics } = useContentStatistics({
    contentType: 'exercise',
    contentId: id,
    enabled: !!id
  });

  // Progress tracking (completed/saved state)
  const {
    completed,
    savedForLater,
    loadingStates,
    markAsCompleted,
    toggleSaved,
    setCompleted,
    setSavedForLater
  } = useContentProgress({
    contentId: id || '',
    initialCompleted: exercise?.user_complete || null,
    initialSaved: exercise?.user_save || false,
    onProgressChange: (status) => {
      if (status === 'success') {
        triggerAnimation(setShowAnimation, 'success');
      } else if (status === 'review') {
        triggerAnimation(setShowAnimation, 'failure');
      }
      // Refetch statistics after any progress change
      refetchStatistics();
    }
  });

  // Voting
  const { handleVote: handleContentVote } = useContentVoting({
    contentId: id || ''
  });

  // Comments
  const { handleAddComment, isSubmitting: isCommentSubmitting } = useCommentManagement({
    contentId: id || '',
    contentType: 'exercise'
  });

  // Solutions
  const {
    handleAddSolution: addSolution,
    handleDeleteSolution: deleteSolution,
    isSubmitting: isSolutionSubmitting
  } = useSolutionManagement({
    contentId: id || '',
    onSolutionAdded: () => {
      triggerAnimation(setShowAnimation, 'success');
      setSolutionVisible(true);
    },
    onSolutionDeleted: () => {
      if (exercise) {
        setExercise({ ...exercise, solution: undefined });
      }
    }
  });

  // UI Controls
  const {
    fullscreenMode,
    showToolbar,
    isSticky,
    showPrint,
    toggleFullscreen,
    toggleToolbar,
    handlePrint
  } = useUIControls();

  // Session history
  const { showSessionHistory, fullSessionHistory, loadHistory, closeHistory, setFullSessionHistory } =
    useSessionHistory();

  // Local state
  const [showSolution, setShowSolution] = useState(false);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [optimisticSolutionMatched, setOptimisticSolutionMatched] = useState<boolean | null>(null);

  // Initialize activeSection from URL or default to 'exercise'
  const [activeSection, setActiveSection] = useState<'exercise' | 'discussions' | 'proposals' | 'activity'>(() => {
    const tab = searchParams.get('tab');
    return (tab === 'discussions' || tab === 'proposals' || tab === 'activity') ? tab : 'exercise';
  });
  const [showAnimation, setShowAnimation] = useState<{ show: boolean; type: 'success' | 'failure' }>({ show: false, type: 'success' });
  const [difficultyRating, setDifficultyRating] = useState<number | null>(null);
  const [undoNotification, setUndoNotification] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  // Time tracking
  const {
    currentTime,
    isRunning,
    sessionStats,
    saving,
    startTimer,
    stopTimer,
    resetTimer,
    saveSession,
    deleteSession,
    formatTime,
    calculateImprovement,
    formatCurrentTime,
    getBestTime,
    getLastTime,
    getAverageTime,
    getSessionCount,
    getTimeComparison
  } = useAdvancedTimeTracker({
    contentType: 'exercise',
    contentId: id || '',
    enabled: !!id && !!exercise
  });

  // Solution tracking hook
  const {
    showNotification,
    notificationMessage,
    trackSolutionView,
    closeNotification
  } = useSolutionTracking({
    contentType: 'exercise',
    contentId: id || '',
    isCompleted: completed,
    onRefetchStatistics: refetchStatistics
  });

  // Page time tracker - automatically tracks time spent on this page
  usePageTimeTracker({
    contentType: 'exercise',
    contentId: id,
    enabled: !!id  // Track as soon as we have an ID
  });

  // Handler to change section and update URL
  const handleSectionChange = (newSection: 'exercise' | 'discussions' | 'proposals' | 'activity') => {
    setActiveSection(newSection);
    setSearchParams({ tab: newSection });
  };

  // Sync section from URL changes (browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && (tabFromUrl === 'discussions' || tabFromUrl === 'proposals' || tabFromUrl === 'activity') && tabFromUrl !== activeSection) {
      setActiveSection(tabFromUrl as 'exercise' | 'discussions' | 'proposals' | 'activity');
    }
  }, [searchParams]);

  // Refs
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync progress state when exercise loads
  useEffect(() => {
    if (exercise) {
      if (exercise.user_complete) setCompleted(exercise.user_complete);
      if (exercise.user_save) setSavedForLater(exercise.user_save);
    }
  }, [exercise?.user_complete, exercise?.user_save]);

  // Handlers
  const handleVote = async (value: VoteValue, target: 'exercise' | 'solution' = 'exercise') => {
    if (target === 'solution' && exercise?.solution) {
      const updatedSolution = await voteSolution(exercise.solution.id, value);
      if (updatedSolution) {
        setExercise(prev => prev ? { ...prev, solution: updatedSolution } : prev);
      }
    } else {
      const updatedExercise = await handleContentVote(value);
      if (updatedExercise) {
        setExercise(updatedExercise);
      }
    }
  };

  const handleAddCommentWrapper = async (content: string, parentId?: string) => {
    if (!exercise) return;
    await handleAddComment(exercise, setExercise, content, parentId);
  };

  const handleCommentVote = async (commentId: string, value: VoteValue) => {
    if (!exercise) return;

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

      setExercise(prev => {
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

  const handleAddSolutionWrapper = async (solutionContent: string) => {
    await addSolution(solutionContent, setExercise);
  };

  const handleDeleteSolutionWrapper = async () => {
    if (!exercise?.solution) return;
    await deleteSolution(exercise.solution.id);
  };


  const saveTimeManually = async () => {
    try {
      const result = await saveSession();
      if (result && sessionStats?.last_session) {
        const improvement = calculateImprovement(
          currentTime,
          sessionStats.last_session.duration_seconds
        );

        if (improvement !== null && improvement > 0) {
          alert(`Bravo! Vous avez amélioré votre temps de ${improvement}% 🎉`);
        } else {
          alert('Session enregistrée avec succès!');
        }
      }
    } catch (err) {
      console.error('Failed to save session manually:', err);
    }
  };

  const rateDifficulty = (rating: number) => {
    setDifficultyRating(rating);
    // TODO: API call
  };

  const handleRemoveSolutionFlag = async () => {
    try {
      await undoSolutionViewed('exercise', id || '');
      setUndoNotification({
        show: true,
        message: 'Le marquage de solution consultée a été supprimé'
      });
      // Refetch statistics to update the UI
      await refetchStatistics();
      // Auto-hide notification after 3 seconds
      setTimeout(() => {
        setUndoNotification({ show: false, message: '' });
      }, 3000);
    } catch (err) {
      console.error('Failed to remove solution flag:', err);
      setUndoNotification({
        show: true,
        message: 'Erreur lors de la suppression du marquage'
      });
      setTimeout(() => {
        setUndoNotification({ show: false, message: '' });
      }, 3000);
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
      await toggleSolutionMatched('exercise', id, isCurrentlyMatched);

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
          <p className="mt-6 text-lg font-medium text-indigo-900">Loading exercise...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !exercise) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pt-10 pb-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white border-l-4 border-red-500 text-red-700 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold">Exercise Unavailable</h3>
            <p className="mt-2 text-base">{error || 'Exercise not found.'}</p>
          </div>
          <div className="mt-8 flex justify-center">
            <Button onClick={() => navigate('/exercises')} className="group">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Exercises
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === exercise.author.id;
  const canEditSolution = exercise.solution && user?.id === exercise.solution.author.id;

  // SEO
  const exerciseStructuredData = createExerciseStructuredData({
    id: String(exercise.id),
    title: exercise.title,
    content: exercise.content,
    author: exercise.author ? { username: exercise.author.username } : undefined,
    created_at: exercise.created_at,
    updated_at: exercise.updated_at,
    class_levels: exercise.class_levels,
    subject: exercise.subject ? { name: exercise.subject.name } : undefined
  });
  const breadcrumbData = createBreadcrumbStructuredData([
    { name: 'Accueil', url: '/' },
    { name: 'Exercices', url: '/exercises' },
    { name: exercise.title, url: `/exercises/${exercise.id}` }
  ]);

  const combinedStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [exerciseStructuredData, breadcrumbData]
  };

  return (
    <div className={`min-h-screen bg-gray-50 pb-16 transition-all duration-300 ${fullscreenMode ? 'bg-white' : ''}`}>
      <SEO
        title={`${exercise.title} - Exercice de mathématiques`}
        description={exercise.content.substring(0, 160).replace(/<[^>]*>/g, '')}
        keywords={['exercice de mathématiques', exercise.subject?.name || 'mathématiques']}
        ogType="article"
        canonicalUrl={`/exercises/${exercise.id}`}
        structuredData={combinedStructuredData}
      />

      <CompletionAnimation
        show={showAnimation.show}
        type={showAnimation.type}
        onComplete={() => setShowAnimation({ show: false, type: 'success' })}
      />

      {/* Solution tracking notification */}
      <Toast
        show={showNotification}
        message={notificationMessage}
        type={completed ? 'success' : 'warning'}
        duration={5000}
        onClose={closeNotification}
      />

      {/* Print view */}
      {showPrint && (
        <div className="hidden print:block">
          <ExercisePrintView exercise={exercise} showSolution={solutionVisible} />
        </div>
      )}

      {/* Main content */}
      <div className="print:hidden">
        {/* Floating toolbar */}
        <FloatingToolbar
          showToolbar={showToolbar}
          toggleToolbar={toggleToolbar}
          timerActive={isRunning}
          toggleTimer={() => (isRunning ? stopTimer() : startTimer())}
          timer={currentTime}
          fullscreenMode={fullscreenMode}
          toggleFullscreen={toggleFullscreen}
          savedForLater={savedForLater}
          toggleSavedForLater={toggleSaved}
          formatTime={formatTime}
        />

        {/* Mobile sidebar */}
        <MobileSidebar
          timer={currentTime}
          timerActive={isRunning}
          toggleTimer={() => (isRunning ? stopTimer() : startTimer())}
          resetTimer={resetTimer}
          difficultyRating={difficultyRating}
          rateDifficulty={rateDifficulty}
          formatTime={formatTime}
          viewCount={exercise.view_count}
          voteCount={exercise.vote_count}
          commentsCount={exercise.comments?.length || 0}
          sidebarContent={
            <ExerciseSidebar
              timer={currentTime}
              timerActive={isRunning}
              toggleTimer={() => (isRunning ? stopTimer() : startTimer())}
              resetTimer={resetTimer}
              difficultyRating={difficultyRating}
              rateDifficulty={rateDifficulty}
              formatTime={formatTime}
              viewCount={exercise.view_count}
              voteCount={exercise.vote_count}
              commentsCount={exercise.comments?.length || 0}
            />
          }
        />

        {/* Sticky header */}
        <div
          className={`fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 transform transition-transform duration-300 ${
            isSticky ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/exercises')}
                className="rounded-full p-2 text-indigo-700 hover:bg-indigo-50"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-medium text-gray-900 line-clamp-1">{exercise.title}</h2>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 lg:px-6 relative">
          <div ref={headerRef}>
            <ExerciseHeader
              exercise={exercise}
              savedForLater={savedForLater}
              loadingStates={loadingStates}
              toggleSavedForLater={toggleSaved}
              formatTimeAgo={formatTimeAgo}
              isAuthor={isAuthor}
              onPrint={handlePrint}
              activeTab={activeSection}
              onTabChange={handleSectionChange}
            />
          </div>

          {/* Main content - Single column with unified container */}
          <div className="w-full relative mt-6">
            <div ref={contentRef}>
              <AnimatePresence mode="wait">
                {activeSection === 'exercise' && (
                  <motion.div
                    key="exercise-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 px-8"
                  >
                    {/* Main Exercise Card - with integrated timer */}
                    <ExerciseMainCard
                      exercise={exercise}
                      completed={completed}
                      markAsCompleted={markAsCompleted}
                      loadingStates={loadingStates}
                      handleVote={handleVote}
                      formatTimeAgo={formatTimeAgo}
                      timer={currentTime}
                      isTimerRunning={isRunning}
                      startTimer={startTimer}
                      stopTimer={stopTimer}
                      resetTimer={resetTimer}
                      saveSession={saveTimeManually}
                      formatCurrentTime={formatCurrentTime}
                      getSessionCount={getSessionCount}
                      loadHistory={() => id && loadHistory('exercise', id)}
                      saving={saving}
                    />

                    {/* Solution Section */}
                    <SolutionSection
                      exercise={exercise}
                      canEditSolution={canEditSolution || false}
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
                      handleVote={handleVote}
                      handleEditSolution={() => navigate(`/solutions/${exercise.solution?.id}/edit`)}
                      handleDeleteSolution={handleDeleteSolutionWrapper}
                      handleAddSolution={handleAddSolutionWrapper}
                      setSolutionVisible={setSolutionVisible}
                      userSolutionMatched={optimisticSolutionMatched !== null ? optimisticSolutionMatched : (statistics?.user_solution_matched || false)}
                      onMarkSolutionMatched={handleMarkSolutionMatched}
                    />

                    {/* Similar content (exercises, lessons, exams) */}
                    <SimilarExercises contentId={String(exercise.id)} contentType="exercise" />
                  </motion.div>
                )}

                {activeSection === 'discussions' && (
                  <motion.div key="discussions-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <CommentSection
                        comments={exercise?.comments || []}
                        onAddComment={handleAddCommentWrapper}
                        onVoteComment={handleCommentVote}
                        onEditComment={async () => Promise.resolve()}
                        onDeleteComment={async () => Promise.resolve()}
                      />
                    </div>
                  </motion.div>
                )}

                {activeSection === 'proposals' && <ProposalsEmptyState />}

                {activeSection === 'activity' && (
                  <ActivitySection
                    statistics={statistics}
                    loading={statsLoading}
                    contentType="exercise"
                    onRemoveSolutionFlag={handleRemoveSolutionFlag}
                  />
                )}
              </AnimatePresence>
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
                    title="Fermer l'historique des sessions"
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
                            const updatedHistory = await getSessionHistory('exercise', id!);
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
}
