/**
 * ContentDetail - Detail page for structured content (exercises, exams, lessons)
 * Uses the structured API endpoints
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet';
import {
  exerciseContentAPI,
  examContentAPI,
  lessonContentAPI,
  getContentStatistics,
  undoSolutionViewed,
  voteComment,
  updateComment,
  deleteComment,
  type ContentStatistics
} from '@/lib/api';
import type { VoteValue, Comment } from '@/types';
import type { ContentExercise, ContentExam, ContentLesson, AssessmentStatus } from '@/types/content';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { isModerator } from '@/lib/features';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ContentHeader } from '@/components/content/viewer/ContentHeader';
import { ContentMainCard } from '@/components/content/viewer/ContentMainCard';
import { SessionHistoryModal } from '@/components/content/viewer/SessionHistoryModal';
import { ReportContentModal } from '@/components/content/viewer/ReportContentModal';
import { api } from '@/lib/api/apiClient';
import { ActivitySection } from '@/components/activity/ActivitySection';
import { AIVerdictPanel } from '@/components/activity/AIVerdictPanel';
import { CommentSection } from '@/components/interactions/CommentSection';
import { ProposedSolutions } from '@/components/content/viewer/ProposedSolutions';
import { FinishPanel } from '@/components/content/viewer/FinishPanel';
import type { ContentTab } from '@/components/content/viewer/ContentHeader';
import { listProposedSolutions, type ProposedSolution } from '@/lib/api/proposedSolutionsApi';
import { usePageTimeTracker } from '@/hooks/usePageTimeTracker';
import { RevisionNudge } from '@/components/revision/RevisionNudge';
import { SignupBanner } from '@/components/auth/SignupPrompt';
import { questionAnchor, type AssessChanges } from '@/components/content/viewer/ExerciseRenderer';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import { assessablePaths } from '@/lib/utils/contentHelpers';
import { questionNumbering } from '@/lib/reportTargets';
import { trackAction } from '@/lib/usage';
import { SimilarContents } from '@/components/content/viewer/SimilarContents';

type ContentItem = ContentExercise | ContentExam | ContentLesson;

type ContentType = 'exercise' | 'exam' | 'lesson';

type ContentAPI = typeof exerciseContentAPI | typeof examContentAPI | typeof lessonContentAPI;

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
    api: exerciseContentAPI,
  },
  exam: {
    title: 'Examen',
    backLabel: 'Retour aux examens',
    deleteConfirm: 'Etes-vous sur de vouloir supprimer cet examen ?',
    basePath: '/exams',
    api: examContentAPI,
  },
  lesson: {
    title: 'Lecon',
    backLabel: 'Retour aux lecons',
    deleteConfirm: 'Etes-vous sur de vouloir supprimer cette lecon ?',
    basePath: '/lessons',
    api: lessonContentAPI,
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

  /** Épreuve d'examen terminée : sa durée est enregistrée comme session « exam ». */
  const saveExamSession = useCallback(async (seconds: number) => {
    if (!contentId || contentType !== 'exam' || seconds <= 0) return;
    await api.saveTimerSession(contentId, seconds, 'exam');
    const history = await api.getSessionHistory(contentId);
    setSessionCount(history.sessions?.length || 0);
  }, [contentId, contentType, api]);

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
    saveExamSession,
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
  // Lien d'une notification : « ?commentaire=<id>#discussion » ouvre ce commentaire, réponse prête.
  const [searchParams] = useSearchParams();
  const focusCommentId = searchParams.get('commentaire');
  const { user, isAuthenticated } = useAuth();
  const { openModal, setInitialTab } = useAuthModal();
  const [showReport, setShowReport] = useState(false);
  // Signaler une erreur demande un compte (évite les signalements anonymes en masse).
  // path : question choisie depuis son drapeau (sinon l'élève la choisit dans la fenêtre).
  const [reportPath, setReportPath] = useState('');
  const openReport = (path?: string) => {
    if (!isAuthenticated) { setInitialTab('login'); openModal(); return; }
    setReportPath(typeof path === 'string' ? path : '');
    setShowReport(true);
  };

  const [content, setContent] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [likeCounts, setLikeCounts] = useState({ likes: 0, dislikes: 0 });
  const [userVote, setUserVote] = useState<1 | -1 | 0>(0);
  const [activeTab, setActiveTab] = useState<ContentTab>('exercise');
  const [questionProgress, setQuestionProgress] = useState<Record<string, AssessmentStatus>>({});
  const [savingSession, setSavingSession] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<'success' | 'review' | null>(null);
  // Question ratée (ou exercice échoué) : proposer de le ranger dans « À revoir ».
  const [revisionNudge, setRevisionNudge] = useState(0);

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
        setContent(data as ContentItem);
        if ('vote_count' in data && typeof data.vote_count === 'number') setVoteCount(data.vote_count);
        setLikeCounts({ likes: (data as any).like_count ?? 0, dislikes: (data as any).dislike_count ?? 0 });
        if ('user_vote' in data) setUserVote((data.user_vote as 1 | -1 | 0) ?? 0);
        if ('user_save' in data) setIsSaved(Boolean(data.user_save));
        if ('user_complete' in data) setCompletionStatus((data as any).user_complete || null);

        // Vue : un envoi par contenu et par jour depuis ce navigateur (le serveur dédoublonne aussi).
        try {
          const key = `fidni:vue:${id}`;
          const last = Number(localStorage.getItem(key) || 0);
          if (Date.now() - last > 24 * 3600 * 1000) {
            localStorage.setItem(key, String(Date.now()));
            config.api.recordView(id).catch(() => {});
          }
        } catch {
          config.api.recordView(id).catch(() => {});
        }

        // Load existing progress if authenticated
        if (isAuthenticated && contentType !== 'lesson') {
          try {
            const progress = await config.api.getProgress(id);
            if (progress && 'item_progress' in progress && progress.item_progress) {
              // Convert item_progress to questionProgress format
              const converted: Record<string, AssessmentStatus> = {};
              for (const [path, data] of Object.entries(progress.item_progress)) {
                if (data && typeof data === 'object' && 'status' in data) {
                  converted[path] = (data as { status: AssessmentStatus }).status;
                }
              }
              setQuestionProgress(converted);
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

  useEffect(() => { setActiveTab('exercise'); }, [id]);
  // Statistiques : chargées à l'ouverture de l'onglet Activité.
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

  // Solutions des élèves : chargées tout de suite pour la pastille de l'onglet.
  const [proposedSolutions, setProposedSolutions] = useState<ProposedSolution[] | null>(null);
  const loadProposedSolutions = useCallback(async () => {
    if (!id || contentType === 'lesson') return;
    try {
      setProposedSolutions(await listProposedSolutions(id));
    } catch {
      setProposedSolutions([]);
    }
  }, [id, contentType]);
  useEffect(() => { loadProposedSolutions(); }, [loadProposedSolutions]);

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
  // Administrateurs : correction relue → retirer (ou remettre) le bandeau « à vérifier ».
  const handleSetVerified = async (verifie: boolean) => {
    if (!content) return;
    try {
      await api.post(`/contents/${content.id}/verification/`, { verifie });
      setContent((prev) => {
        if (!prev) return prev;
        const structure = { ...((prev as any).structure || {}) };
        if (verifie) delete structure.a_verifier; else structure.a_verifier = true;
        return { ...prev, structure } as ContentItem;
      });
    } catch {
      alert('La mise à jour a échoué. Réessaie.');
    }
  };

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
      if (typeof response.like_count === 'number') setLikeCounts({ likes: response.like_count, dislikes: response.dislike_count ?? 0 });
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

  // Auto-évaluation : un clic par question, « Tout réussi », et le résultat du contenu se déduit tout
  // seul quand toutes les questions sont évaluées (toutes réussies → Réussi, sinon → À revoir).
  const leafPaths = useMemo(
    () => (contentType === 'lesson' ? [] : assessablePaths(content?.structure as unknown as FlexibleExerciseStructure)),
    [content, contentType]);
  const progressRef = useRef(questionProgress);
  progressRef.current = questionProgress;
  const completionRef = useRef(completionStatus);
  completionRef.current = completionStatus;

  const applyAssessments = async (changes: AssessChanges, completion?: 'success' | 'review' | null) => {
    if (!isAuthenticated) { openModal(); return; }
    if (!id) return;
    const before = progressRef.current;
    const beforeCompletion = completionRef.current;
    const next = { ...before };
    for (const [p, s] of Object.entries(changes)) {
      if (s) next[p] = s; else delete next[p];
    }
    let target = completion;
    if (target === undefined && leafPaths.length && leafPaths.every((p) => next[p])) {
      target = leafPaths.every((p) => next[p] === 'success') ? 'success' : 'review';
    }
    const sendCompletion = target !== undefined && target !== beforeCompletion;
    progressRef.current = next;
    setQuestionProgress(next);
    if (sendCompletion) {
      completionRef.current = target ?? null;
      setCompletionStatus(target ?? null);
    }
    if (Object.values(changes).some((s) => s && s !== 'success')) setRevisionNudge((n) => n + 1);
    try {
      await api.post(`/contents/${id}/assess_many/`, sendCompletion ? { assessments: changes, completion: target } : { assessments: changes });
    } catch (err) {
      console.error('Assessment failed:', err);
      setQuestionProgress((cur) => {
        const r = { ...cur };
        for (const p of Object.keys(changes)) {
          if (before[p]) r[p] = before[p]; else delete r[p];
        }
        progressRef.current = r;
        return r;
      });
      if (sendCompletion) {
        completionRef.current = beforeCompletion;
        setCompletionStatus(beforeCompletion);
      }
    }
  };

  // Re-cliquer le choix actif l'efface.
  const handleQuestionAssess = (path: string, status: AssessmentStatus) =>
    applyAssessments({ [path]: progressRef.current[path] === status ? null : status });

  // « Où en es-tu ? » : « Tout réussi » coche toutes les questions (re-cliquer les efface) ;
  // « À revoir » ne touche qu'au résultat du contenu. Leçon : « Marquer comme lue ».
  const handleSetCompletion = async (status: 'success' | 'review' | null) => {
    if (!isAuthenticated) { openModal(); return; }
    if (!id) return;
    if (leafPaths.length) {
      if (status === 'success') {
        trackAction('tout-reussi');
        await applyAssessments(Object.fromEntries(leafPaths.map((p) => [p, 'success'])), 'success');
        return;
      }
      if (status === null && completionRef.current === 'success') {
        await applyAssessments(Object.fromEntries(leafPaths.map((p) => [p, null])), null);
        return;
      }
    }
    const prev = completionStatus;
    setCompletionStatus(status);
    if (status === 'review') setRevisionNudge((n) => n + 1);
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
      throw err;  // la zone d'écriture garde le texte et affiche l'échec
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
      throw err;
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

  // Feed the rich breadcrumb (Section › Niveau › Matière › Chapitre) up to the
  // app TopBar; cleared on unmount so other pages fall back to the route label.
  const { setCrumbs } = useBreadcrumb();
  useEffect(() => {
    if (!content) { setCrumbs(null); return; }
    const cl = content.class_levels?.[0];
    const subj = content.subject;
    const subf = content.subfields?.[0];
    const chap = content.chapters?.[0];
    const buildUrl = (f: { classLevel?: string; subject?: string; subfield?: string; chapter?: string }) => {
      const p = new URLSearchParams();
      if (f.classLevel) p.set('classLevels', f.classLevel);
      if (f.subject) p.set('subjects', f.subject);
      if (f.subfield) p.set('subfields', f.subfield);
      if (f.chapter) p.set('chapters', f.chapter);
      return `${config.basePath}?${p.toString()}`;
    };
    const sectionLabel = contentType === 'exercise' ? 'Exercices' : contentType === 'exam' ? 'Examens' : 'Leçons';
    const cid = cl ? String(cl.id) : undefined;
    const sid = subj ? String(subj.id) : undefined;
    const fid = subf ? String(subf.id) : undefined;
    const crumbs: { label: string; to?: string }[] = [{ label: sectionLabel, to: config.basePath }];
    if (cl) crumbs.push({ label: cl.name, to: buildUrl({ classLevel: cid }) });
    if (subj) crumbs.push({ label: subj.name, to: buildUrl({ classLevel: cid, subject: sid }) });
    if (chap) crumbs.push({ label: chap.name, to: buildUrl({ classLevel: cid, subject: sid, subfield: fid, chapter: String(chap.id) }) });
    setCrumbs(crumbs);
    return () => setCrumbs(null);
  }, [content, contentType, config.basePath, setCrumbs]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7' }} className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1a1a1a' }} />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7' }} className="flex items-center justify-center">
        <div className="fd-card p-8 text-center max-w-md">
          <p style={{ color: '#b91c1c', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            {error || 'Contenu non trouvé'}
          </p>
          <Link to={config.basePath} className="fd-btn-primary inline-flex">
            {config.backLabel}
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = user && content.author?.id === user.id;

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7' }}>
      {/* Titre de l'onglet (le serveur envoie déjà le même titre aux moteurs de recherche : config/seo.py). */}
      <Helmet><title>{`${content.title} – ${config.title} | Fidni`}</title></Helmet>
      {/* Header */}
      <ContentHeader
        content={content}
        contentType={contentType}
        isSaved={isSaved}
        isSaving={isSaving}
        onToggleSave={handleSave}
        isAuthor={!!isAuthor || isModerator(user)}
        onDelete={handleDelete}
        onPrint={() => navigate(`${config.basePath}/${content.id}/pdf`)}
        onReport={openReport}
        onSetVerified={isModerator(user) ? handleSetVerified : undefined}
        activeTab={activeTab}
        onTabChange={(t) => {
          if (t === 'activity') trackAction('onglet-activite');
          if (t === 'proposals') trackAction('onglet-solutions');
          setActiveTab(t);
        }}
        basePath={config.basePath}
        solutionCount={proposedSolutions?.length ?? 0}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'exercise' && (
          <div className="space-y-6">
            {/* « Où en es-tu ? » en haut de la page, visible dès l'arrivée (Natsu). */}
            {isAuthenticated && (
              <FinishPanel content={content} contentType={contentType} completionStatus={completionStatus}
                onSetCompletion={handleSetCompletion}
                progress={{ assessed: leafPaths.filter((p) => questionProgress[p]).length, total: leafPaths.length }} />
            )}

            <ContentMainCard
              content={content}
              contentType={contentType}
              voteCount={voteCount}
              likeCount={likeCounts.likes}
              dislikeCount={likeCounts.dislikes}
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
              onAssessMany={applyAssessments}
              onSaveExamSession={isAuthenticated ? timerHook.saveExamSession : undefined}
              onReport={openReport}
            />

            {/* Contenus semblables : ce qu'on peut faire ensuite (mêmes notions, même chapitre). */}
            {id && <SimilarContents contentId={id} />}

            {/* Discussion sous le contenu (plus d'onglet à part : personne ne l'ouvrait). */}
            <section id="discussion" className="fd-card scroll-mt-20" style={{ padding: 22 }} data-tour="detail-discussion">
              <CommentSection
                comments={comments}
                onAddComment={handleAddComment}
                onVoteComment={handleVoteComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                focusCommentId={focusCommentId}
              />
            </section>
          </div>
        )}

        {activeTab === 'proposals' && contentType !== 'lesson' && id && (
          <ProposedSolutions
            contentId={id}
            solutions={proposedSolutions}
            isAuthenticated={isAuthenticated}
            onRequireLogin={openModal}
            onChanged={loadProposedSolutions}
          />
        )}

        {activeTab === 'activity' && contentType !== 'lesson' && (
          <>
            <ActivitySection
              statistics={statistics}
              loading={loadingStatistics}
              contentType={contentType}
              onRemoveSolutionFlag={handleRemoveSolutionFlag}
              onGoToQuestions={() => { setActiveTab('exercise'); window.scrollTo({ top: 0 }); }}
              totalQuestions={leafPaths.length}
              numbering={questionNumbering(content.structure)}
              onGoToQuestion={(path) => {
                setActiveTab('exercise');
                window.setTimeout(() => document.getElementById(questionAnchor(path))
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
              }}
            />
            {user?.is_superuser && id && <AIVerdictPanel contentId={id} />}
          </>
        )}
      </div>

      {isAuthenticated && contentType !== 'lesson' && id && (
        <RevisionNudge contentId={id} trigger={revisionNudge} kind={contentType} />
      )}
      <SignupBanner contentId={id} />

      <ReportContentModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        contentId={content.id}
        contentTitle={content.title}
        contentType={contentType}
        structure={content.structure}
        initialPath={reportPath}
      />

      {/* Session History Modal */}
      <SessionHistoryModal
        isOpen={timerHook.showHistoryModal}
        onClose={() => timerHook.setShowHistoryModal(false)}
        sessions={sessionHistory}
        isLoading={loadingHistory}
        onDeleteSession={handleDeleteSession}
      />
    </div>
  );
};

export default ContentDetail;
