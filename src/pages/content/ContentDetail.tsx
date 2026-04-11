/**
 * ContentDetail - Detail page for structured content (exercises, exams, lessons)
 * Uses the structured API endpoints
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, Sparkles } from 'lucide-react';
import {
  structuredExerciseAPI,
  structuredExamAPI,
  structuredLessonAPI,
  getContentStatistics,
  undoSolutionViewed,
  voteComment,
  updateComment,
  deleteComment,
  type ContentStatistics
} from '@/lib/api';
import type { VoteValue, Comment } from '@/types';
import type { StructuredExercise, StructuredExam, StructuredLesson, AssessmentStatus } from '@/types/structured';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { ContentHeader } from '@/components/content/viewer/ContentHeader';
import { ContentMainCard } from '@/components/content/viewer/ContentMainCard';
import { SessionHistoryModal } from '@/components/content/viewer/SessionHistoryModal';
import { ActivitySection } from '@/components/activity/ActivitySection';
import { CommentSection } from '@/components/interactions/CommentSection';
import { AICorrectionPanel } from '@/components/ai/AICorrectionPanel';
import { usePageTimeTracker } from '@/hooks/usePageTimeTracker';
import { Button } from '@/components/ui/button';

type StructuredContent = StructuredExercise | StructuredExam | StructuredLesson;

type ContentType = 'exercise' | 'exam' | 'lesson';

type ContentAPI = typeof structuredExerciseAPI | typeof structuredExamAPI | typeof structuredLessonAPI;

const CONTENT_TYPE_CONFIG: Record<ContentType, {
  title: string;
  backLabel: string;
  deleteConfirm: string;
  basePath: string;
  api: ContentAPI;
}> = {
  exercise: {
    title: 'Exercice',
    backLabel: 'Retour aux exercices',
    deleteConfirm: 'Etes-vous sur de vouloir supprimer cet exercice ?',
    basePath: '/exercises',
    api: structuredExerciseAPI,
  },
  exam: {
    title: 'Examen',
    backLabel: 'Retour aux examens',
    deleteConfirm: 'Etes-vous sur de vouloir supprimer cet examen ?',
    basePath: '/exams',
    api: structuredExamAPI,
  },
  lesson: {
    title: 'Lecon',
    backLabel: 'Retour aux lecons',
    deleteConfirm: 'Etes-vous sur de vouloir supprimer cette lecon ?',
    basePath: '/lessons',
    api: structuredLessonAPI,
  },
};

interface ContentDetailProps {
  contentType?: ContentType;
}

// Timer hook
const useTimer = (contentId: string | undefined, contentType: ContentType, api: ContentAPI) => {
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Load session count on mount
  useEffect(() => {
    const loadCount = async () => {
      if (!contentId || contentType === 'lesson') return;
      try {
        const history = await api.getSessionHistory(contentId);
        setSessionCount(history.sessions?.length || 0);
      } catch {
        setSessionCount(0);
      }
    };
    loadCount();
  }, [contentId, contentType, api]);

  const startTimer = useCallback(() => setIsTimerRunning(true), []);
  const stopTimer = useCallback(() => setIsTimerRunning(false), []);
  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setTimer(0);
  }, []);

  const formatCurrentTime = useCallback(() => {
    const hours = Math.floor(timer / 3600);
    const minutes = Math.floor((timer % 3600) / 60);
    const seconds = timer % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timer]);

  const saveSession = useCallback(async () => {
    if (timer > 0 && contentId && contentType !== 'lesson') {
      try {
        await api.saveTimerSession(contentId, timer, contentType === 'exam' ? 'exam' : 'study');
        // Reload count after save
        const history = await api.getSessionHistory(contentId);
        setSessionCount(history.sessions?.length || 0);
      } catch (err) {
        console.error('Failed to save session:', err);
        throw err;
      }
    }
  }, [timer, contentId, contentType, api]);

  const getSessionCount = useCallback(() => sessionCount, [sessionCount]);

  const loadHistory = useCallback(async () => {
    setShowHistoryModal(true);
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!contentId || contentType === 'lesson') return [];
    try {
      const history = await api.getSessionHistory(contentId);
      return history.sessions || [];
    } catch {
      return [];
    }
  }, [contentId, contentType, api]);

  return {
    timer,
    isTimerRunning,
    startTimer,
    stopTimer,
    resetTimer,
    formatCurrentTime,
    saveSession,
    getSessionCount,
    loadHistory,
    showHistoryModal,
    setShowHistoryModal,
    fetchHistory
  };
};

export const ContentDetail: React.FC<ContentDetailProps> = ({
  contentType = 'exercise',
}) => {
  const config = CONTENT_TYPE_CONFIG[contentType];
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();

  const [content, setContent] = useState<StructuredContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [userVote, setUserVote] = useState<1 | -1 | 0>(0);
  const [activeTab, setActiveTab] = useState<'exercise' | 'discussions' | 'proposals' | 'activity'>('exercise');
  const [questionProgress, setQuestionProgress] = useState<Record<string, AssessmentStatus>>({});
  const [solutionValidations, setSolutionValidations] = useState<Record<string, string | null>>({});
  const [savingSession, setSavingSession] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<'success' | 'review' | null>(null);

  // Statistics state
  const [statistics, setStatistics] = useState<ContentStatistics | null>(null);
  const [loadingStatistics, setLoadingStatistics] = useState(false);

  // Comments state (placeholder - structured content may not have comments yet)
  const [comments, setComments] = useState<Comment[]>([]);

  // Session history state
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const timerHook = useTimer(id, contentType, config.api);

  // Page time tracking - automatic time tracking when viewing content
  usePageTimeTracker({
    contentType,
    contentId: id,
    enabled: isAuthenticated
  });

  // Load content
  useEffect(() => {
    const loadContent = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);

      try {
        const data = await config.api.get(id);
        setContent(data as StructuredContent);
        if ('vote_count' in data && typeof data.vote_count === 'number') setVoteCount(data.vote_count);
        if ('user_vote' in data) setUserVote((data.user_vote as 1 | -1 | 0) ?? 0);
        if ('user_save' in data) setIsSaved(Boolean(data.user_save));
        if ('user_complete' in data) setCompletionStatus((data as any).user_complete || null);

        // Record view (fire-and-forget, dedup handled by backend)
        config.api.recordView(id).catch(() => {});

        // Load existing progress if authenticated
        if (isAuthenticated && contentType !== 'lesson') {
          try {
            const progress = await config.api.getProgress(id);
            if (progress && 'item_progress' in progress && progress.item_progress) {
              // Convert item_progress to questionProgress format
              const converted: Record<string, AssessmentStatus> = {};
              const validations: Record<string, string | null> = {};
              for (const [path, data] of Object.entries(progress.item_progress)) {
                if (data && typeof data === 'object' && 'status' in data) {
                  converted[path] = (data as { status: AssessmentStatus }).status;
                }
                if (data && typeof data === 'object' && 'solution_validation' in data) {
                  validations[path] = (data as { solution_validation?: string | null }).solution_validation || null;
                }
              }
              setQuestionProgress(converted);
              setSolutionValidations(validations);
            }
          } catch {
            // Progress not started yet, ignore
          }
        }
      } catch (err) {
        setError('Erreur lors du chargement');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [id, config, isAuthenticated, contentType]);

  // Load statistics when activity tab is active
  useEffect(() => {
    const loadStatistics = async () => {
      if (activeTab !== 'activity' || !id || contentType === 'lesson') return;

      setLoadingStatistics(true);
      try {
        const stats = await getContentStatistics(contentType, id);
        setStatistics(stats);
      } catch (err) {
        console.error('Failed to load statistics:', err);
        setStatistics(null);
      } finally {
        setLoadingStatistics(false);
      }
    };

    loadStatistics();
  }, [activeTab, id, contentType]);

  // Load comments on mount to show count in tab
  useEffect(() => {
    const loadComments = async () => {
      if (!id) return;

      try {
        const commentsData = await config.api.getComments(id);
        setComments(commentsData as Comment[]);
      } catch (err) {
        console.error('Failed to load comments:', err);
        setComments([]);
      }
    };

    loadComments();
  }, [id, config.api]);

  // Handle delete
  const handleDelete = async () => {
    if (!id || !content) return;
    if (!confirm(config.deleteConfirm)) return;

    try {
      await config.api.delete(id);
      navigate(config.basePath);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Handle vote
  const handleVote = async (value: VoteValue) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    if (!id) return;

    try {
      const response = await config.api.vote(id, value);
      setVoteCount(response.vote_count);
      setUserVote(response.user_vote as 1 | -1 | 0);
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  // Handle save/unsave
  const handleSave = async () => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    if (!id) return;

    try {
      setIsSaving(true);
      if (isSaved) {
        await config.api.unsave(id);
        setIsSaved(false);
      } else {
        await config.api.save(id);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Save toggle failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle solution toggle
  const handleToggleSolution = () => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    setShowSolution(!showSolution);
  };

  // Handle question-level assessment
  const handleQuestionAssess = async (path: string, status: AssessmentStatus) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    if (!id) return;

    // Optimistic update
    const previousStatus = questionProgress[path];
    const isToggleOff = previousStatus === status;

    setQuestionProgress(prev => {
      if (isToggleOff) {
        const { [path]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [path]: status };
    });

    // Persist to backend
    try {
      if (isToggleOff) {
        await config.api.removeAssessment(id, { item_path: path });
      } else {
        await config.api.assess(id, {
          item_path: path,
          assessment: status,
        });
      }
    } catch (err) {
      console.error('Assessment failed:', err);
      // Rollback on error
      setQuestionProgress(prev => {
        if (previousStatus) {
          return { ...prev, [path]: previousStatus };
        }
        const { [path]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleValidateSolution = async (path: string, validation: string | null) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    if (!id) return;

    // Optimistic update
    const previousValidation = solutionValidations[path];

    setSolutionValidations(prev => {
      if (!validation) {
        const { [path]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [path]: validation };
    });

    // Persist to backend
    try {
      await config.api.validateSolution(id, {
        item_path: path,
        validation,
      });
    } catch (err) {
      console.error('Validation failed:', err);
      // Rollback on error
      setSolutionValidations(prev => {
        if (previousValidation) {
          return { ...prev, [path]: previousValidation };
        }
        const { [path]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Set overall completion status
  const handleSetCompletion = async (status: 'success' | 'review' | null) => {
    if (!isAuthenticated) { openModal(); return; }
    if (!id) return;
    const prev = completionStatus;
    setCompletionStatus(status);
    try {
      if (status === null) {
        await config.api.removeComplete(id);
      } else {
        await config.api.complete(id, status);
      }
    } catch (err) {
      console.error('Completion set failed:', err);
      setCompletionStatus(prev);
    }
  };

  // Save timer session
  const handleSaveSession = async () => {
    setSavingSession(true);
    try {
      await timerHook.saveSession();
    } catch (err) {
      console.error('Failed to save session:', err);
    } finally {
      setSavingSession(false);
    }
  };

  // Load session history when modal opens
  useEffect(() => {
    const loadHistoryData = async () => {
      if (timerHook.showHistoryModal) {
        setLoadingHistory(true);
        const history = await timerHook.fetchHistory();
        setSessionHistory(history);
        setLoadingHistory(false);
      }
    };
    loadHistoryData();
  }, [timerHook.showHistoryModal, timerHook.fetchHistory]);

  // Delete session handler
  const handleDeleteSession = async (sessionId: string) => {
    if (!id || contentType === 'lesson') return;
    try {
      await config.api.deleteSession(id, sessionId);
      // Refresh history
      const history = await timerHook.fetchHistory();
      setSessionHistory(history);
    } catch (err) {
      console.error('Failed to delete session:', err);
      throw err;
    }
  };

  // Remove solution view flag
  const handleRemoveSolutionFlag = async () => {
    if (!id || contentType === 'lesson') return;
    try {
      await undoSolutionViewed(contentType, id);
      if (statistics) {
        setStatistics({ ...statistics, user_viewed_solution: false });
      }
    } catch (err) {
      console.error('Failed to remove solution flag:', err);
    }
  };

  // Comment handlers
  const handleAddComment = async (commentContent: string, parentId?: string, fileIds?: string[]) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    if (!id) return;

    try {
      await config.api.addComment(id, commentContent, parentId, fileIds);
      // Reload comments
      const commentsData = await config.api.getComments(id);
      setComments(commentsData as Comment[]);
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleVoteComment = async (commentId: string, value: VoteValue) => {
    if (!isAuthenticated || !id) {
      openModal();
      return;
    }
    try {
      await voteComment(commentId, value);
      // Reload comments to get updated vote counts
      const commentsData = await config.api.getComments(id);
      setComments(commentsData as Comment[]);
    } catch (err) {
      console.error('Vote comment failed:', err);
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    if (!id) return;
    try {
      await updateComment(commentId, newContent);
      // Reload comments
      const commentsData = await config.api.getComments(id);
      setComments(commentsData as Comment[]);
    } catch (err) {
      console.error('Edit comment failed:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id) return;
    try {
      await deleteComment(commentId);
      // Reload comments
      const commentsData = await config.api.getComments(id);
      setComments(commentsData as Comment[]);
    } catch (err) {
      console.error('Delete comment failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Contenu non trouve'}</p>
          <Link to={config.basePath} className="text-blue-600 hover:underline">
            {config.backLabel}
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = user && content.author?.id === user.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <ContentHeader
        content={content}
        contentType={contentType}
        isSaved={isSaved}
        isSaving={isSaving}
        onToggleSave={handleSave}
        isAuthor={!!isAuthor}
        onDelete={handleDelete}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        basePath={config.basePath}
        commentCount={comments.length}
        completionStatus={completionStatus}
        onSetCompletion={handleSetCompletion}
      />

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'exercise' && (
          <div className="space-y-6">
            {/* Main content */}
            <div>
              <ContentMainCard
                content={content}
                contentType={contentType}
                voteCount={voteCount}
                userVote={userVote}
                onVote={handleVote}
                showSolution={showSolution}
                onToggleSolution={handleToggleSolution}
                isAuthenticated={isAuthenticated}
                timer={timerHook.timer}
                isTimerRunning={timerHook.isTimerRunning}
                startTimer={timerHook.startTimer}
                stopTimer={timerHook.stopTimer}
                resetTimer={timerHook.resetTimer}
                saveSession={handleSaveSession}
                formatCurrentTime={timerHook.formatCurrentTime}
                getSessionCount={timerHook.getSessionCount}
                loadHistory={timerHook.loadHistory}
                saving={savingSession}
                questionProgress={questionProgress}
                onQuestionAssess={handleQuestionAssess}
                solutionValidations={solutionValidations}
                onValidateSolution={handleValidateSolution}
              />

            </div>

            {/* AI Help Card - trigger to open panel */}
            {contentType !== 'lesson' && (
              <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl border border-indigo-200 p-6 hover:shadow-lg transition-all cursor-pointer group" onClick={() => isAuthenticated ? setShowAiPanel(true) : openModal()}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Assistant IA Pédagogique</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Obtenez de l'aide personnalisée, des indices progressifs et une correction détaillée de vos solutions.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-indigo-600 shadow-sm">Indices progressifs</span>
                    <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-purple-600 shadow-sm">Correction IA</span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
                  >
                    {isAuthenticated ? 'Ouvrir' : 'Se connecter'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'discussions' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <CommentSection
              comments={comments}
              onAddComment={handleAddComment}
              onVoteComment={handleVoteComment}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
            />
          </div>
        )}

        {activeTab === 'proposals' && contentType !== 'lesson' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Solutions proposees</h2>
            <p className="text-gray-500 text-center py-8">Aucune solution proposee pour le moment</p>
          </div>
        )}

        {activeTab === 'activity' && contentType !== 'lesson' && (
          <ActivitySection
            statistics={statistics}
            loading={loadingStatistics}
            contentType={contentType}
            onRemoveSolutionFlag={handleRemoveSolutionFlag}
          />
        )}

        {activeTab === 'activity' && contentType === 'lesson' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activite</h2>
            <p className="text-gray-500 text-center py-8">Statistiques non disponibles pour les lecons</p>
          </div>
        )}
      </div>

      {/* Session History Modal */}
      <SessionHistoryModal
        isOpen={timerHook.showHistoryModal}
        onClose={() => timerHook.setShowHistoryModal(false)}
        sessions={sessionHistory}
        isLoading={loadingHistory}
        onDeleteSession={handleDeleteSession}
      />

      {/* AI Correction Panel - Floating */}
      {showAiPanel && contentType !== 'lesson' && isAuthenticated && (
        <AICorrectionPanel
          contentType={contentType}
          contentId={id || ''}
          solution={'solution' in content && content.solution ? (content.solution as any).content : undefined}
          totalPoints={'total_points' in content ? (content.total_points || 20) : 20}
          structure={content.structure as any}
          onExpandToggle={(expanded) => {
            if (!expanded) setShowAiPanel(false);
          }}
        />
      )}
    </div>
  );
};

export default ContentDetail;
