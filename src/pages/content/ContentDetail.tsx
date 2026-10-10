/**
 * ContentDetail - Detail page for structured content (exercises, exams, lessons)
 * Uses the structured API endpoints
 *
 * 10/10/2026 : chargement après l'authentification, contenu et progression en parallèle, squelette au
 * lieu du spinner ; solution ouverte enregistrée (SolutionView, une fois par contenu) ; chaque
 * auto-évaluation dit d'où elle vient ; examen national rangé sous « Examens nationaux ».
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  exerciseContentAPI,
  examContentAPI,
  lessonContentAPI,
  getContentStatistics,
  markSolutionViewed,
  undoSolutionViewed,
  voteComment,
  updateComment,
  deleteComment,
  type ContentStatistics
} from '@/lib/api';
import { assessQuestions, saveSessionScore, type AssessSource, type TimerSession } from '@/lib/api/contentItemApi';
import type { VoteValue, Comment } from '@/types';
import type { ContentExercise, ContentExam, ContentLesson, AssessmentStatus, Felt } from '@/types/content';
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
import { contentHub } from '@/components/content/viewer/pageHelpers';
import { hubPath } from '@/lib/api/hubApi';
import { studentLevelSlug } from '@/components/layout/nav';

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
    deleteConfirm: 'Supprimer cet exercice ? C’est définitif.',
    basePath: '/exercises',
    api: exerciseContentAPI,
  },
  exam: {
    title: 'Examen',
    backLabel: 'Retour aux examens',
    deleteConfirm: 'Supprimer cet examen ? C’est définitif.',
    basePath: '/exams',
    api: examContentAPI,
  },
  lesson: {
    title: 'Leçon',
    backLabel: 'Retour aux leçons',
    deleteConfirm: 'Supprimer cette leçon ? C’est définitif.',
    basePath: '/lessons',
    api: lessonContentAPI,
  },
};

interface ContentDetailProps {
  contentType?: ContentType;
}

// Timer hook (enabled : élève connecté, les sessions sont à lui)
const useTimer = (contentId: string | undefined, contentType: ContentType, api: ContentAPI, enabled: boolean) => {
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const timerRef = useRef(timer);
  timerRef.current = timer;

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
      if (!contentId || contentType === 'lesson' || !enabled) { setSessionCount(0); return; }
      try {
        const history = await api.getSessionHistory(contentId);
        setSessionCount(history.sessions?.length || 0);
      } catch {
        setSessionCount(0);
      }
    };
    loadCount();
  }, [contentId, contentType, api, enabled]);

  const startTimer = useCallback(() => {
    if (timerRef.current === 0) trackAction('chrono-demarre');
    setIsTimerRunning(true);
  }, []);
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

  /** Épreuve d'examen terminée : sa durée est enregistrée comme session « exam » ; renvoie son id (pour la note). */
  const saveExamSession = useCallback(async (seconds: number) => {
    if (!contentId || contentType !== 'exam' || seconds <= 0) return null;
    const saved = await api.saveTimerSession(contentId, seconds, 'exam');
    setSessionCount((n) => n + 1);
    return saved?.id ?? saved?.session?.id ?? null;
  }, [contentId, contentType, api]);

  /** Note du passage, mise à jour pendant la correction. */
  const saveExamScore = useCallback(async (sessionId: string | number, score: number, maxScore: number) => {
    if (!contentId || contentType !== 'exam') return;
    await saveSessionScore(contentId, sessionId, score, maxScore);
  }, [contentId, contentType]);

  const loadHistory = useCallback(async () => {
    setShowHistoryModal(true);
  }, []);

  const fetchHistory = useCallback(async (): Promise<TimerSession[]> => {
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
    saveExamScore,
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { openModal, setInitialTab } = useAuthModal();
  const [showReport, setShowReport] = useState(false);
  // Signaler une erreur demande un compte (évite les signalements anonymes en masse).
  // path : question choisie depuis son drapeau (sinon l'élève la choisit dans la fenêtre).
  const [reportPath, setReportPath] = useState('');
  const openReport = (path?: string) => {
    if (!isAuthenticated) { setInitialTab('login'); openModal('signaler'); return; }
    trackAction('signaler-ouvert');
    setReportPath(typeof path === 'string' ? path : '');
    setShowReport(true);
  };

  const [content, setContent] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<'notfound' | 'error' | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [likeCounts, setLikeCounts] = useState({ likes: 0, dislikes: 0 });
  const [userVote, setUserVote] = useState<1 | -1 | 0>(0);
  const [activeTab, setActiveTab] = useState<ContentTab>('exercise');
  const [questionProgress, setQuestionProgress] = useState<Record<string, AssessmentStatus>>({});
  // Date de chaque auto-évaluation (serveur) : une épreuve d'examen refaite ne compte que les siennes.
  const [questionDates, setQuestionDates] = useState<Record<string, string>>({});
  const [savingSession, setSavingSession] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<'success' | 'review' | null>(null);
  // Question ratée (ou exercice échoué) : proposer de le ranger dans « À revoir ».
  const [revisionNudge, setRevisionNudge] = useState(0);
  // La proposition « À revoir » attend une réponse : le ressenti attend son tour (une demande à la fois).
  const [nudgeAsking, setNudgeAsking] = useState(false);
  // Épreuve d'examen en cours : « Où en es-tu ? » est masqué (rien ne doit détourner de la copie).
  const [examRunning, setExamRunning] = useState(false);
  // Résultat donné pendant cette visite (pas celui chargé) : c'est là que le ressenti est demandé.
  const [statusChosen, setStatusChosen] = useState(false);
  useEffect(() => { setStatusChosen(false); }, [id]);

  // Statistics state
  const [statistics, setStatistics] = useState<ContentStatistics | null>(null);
  const [loadingStatistics, setLoadingStatistics] = useState(false);

  // Comments state (placeholder - structured content may not have comments yet)
  const [comments, setComments] = useState<Comment[]>([]);

  // Session history state
  const [sessionHistory, setSessionHistory] = useState<TimerSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const timerHook = useTimer(id, contentType, config.api, isAuthenticated && !authLoading);

  // Page time tracking - automatic time tracking when viewing content
  usePageTimeTracker({
    contentType,
    contentId: id,
    enabled: isAuthenticated
  });

  // Chargement : on attend de savoir si l'élève est connecté (sinon tout se chargeait deux fois), puis
  // contenu et progression en parallèle. Une connexion en cours de route recharge sans squelette.
  const loadedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id || authLoading) return;
    let alive = true;
    const fresh = loadedIdRef.current !== id;
    if (fresh) setIsLoading(true);
    setError(null);
    const wantProgress = isAuthenticated && contentType !== 'lesson';
    Promise.all([
      config.api.get(id),
      wantProgress ? config.api.getProgress(id).catch(() => null) : Promise.resolve(null),
    ])
      .then(([data, progress]) => {
        if (!alive) return;
        loadedIdRef.current = id;
        const d = data as ContentItem & { comments?: Comment[] };
        setContent(d);
        setVoteCount(typeof d.vote_count === 'number' ? d.vote_count : 0);
        setLikeCounts({ likes: d.like_count ?? 0, dislikes: d.dislike_count ?? 0 });
        setUserVote(((d.user_vote ?? 0) as 1 | -1 | 0));
        setIsSaved(Boolean(d.user_save));
        setCompletionStatus(d.user_complete || null);
        completionRef.current = d.user_complete || null;
        // La discussion est dans la même réponse : plus de second appel au chargement.
        setComments(Array.isArray(d.comments) ? d.comments : []);

        const statuses: Record<string, AssessmentStatus> = {};
        const dates: Record<string, string> = {};
        for (const [path, v] of Object.entries(progress?.item_progress ?? {})) {
          if (v && typeof v === 'object' && 'status' in v) {
            statuses[path] = (v as { status: AssessmentStatus }).status;
            const at = (v as { assessed_at?: string }).assessed_at;
            if (at) dates[path] = at;
          }
        }
        progressRef.current = statuses;
        setQuestionProgress(statuses);
        setQuestionDates(dates);

        // Vue : un envoi par contenu et par jour depuis ce navigateur (le serveur dédoublonne aussi).
        if (fresh) {
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
        }
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.status === 404 ? 'notfound' : 'error');
        console.error(err);
      })
      .finally(() => { if (alive) setIsLoading(false); });
    return () => { alive = false; };
  }, [id, config, isAuthenticated, authLoading, contentType, reloadKey]);

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
      openModal('vote');
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
      openModal('favori');
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

  // Solution ouverte : enregistrée une fois par contenu (statistiques « sans regarder la solution »,
  // onglet Activité, rattrapage). Les visiteurs ne laissent pas de trace.
  const solutionMarked = useRef<Set<string>>(new Set());
  const handleSolutionOpen = useCallback(() => {
    if (!isAuthenticated || !id || contentType === 'lesson' || solutionMarked.current.has(id)) return;
    solutionMarked.current.add(id);
    markSolutionViewed(contentType, id).catch(() => { solutionMarked.current.delete(id); });
  }, [isAuthenticated, id, contentType]);

  // Auto-évaluation : un clic par question, « Tout réussi », et le résultat du contenu se déduit tout
  // seul quand toutes les questions sont évaluées (toutes réussies → Réussi, sinon → À revoir).
  const leafPaths = useMemo(
    () => (contentType === 'lesson' ? [] : assessablePaths(content?.structure as unknown as FlexibleExerciseStructure)),
    [content, contentType]);
  const progressRef = useRef(questionProgress);
  progressRef.current = questionProgress;
  const completionRef = useRef(completionStatus);
  completionRef.current = completionStatus;

  // source : d'où vient l'évaluation (question, « Tout réussi », « Tu avais trouvé ? »).
  const applyAssessments = async (changes: AssessChanges, completion?: 'success' | 'review' | null, source: AssessSource = 'question') => {
    if (!isAuthenticated) { openModal('evaluer'); return; }
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
      if (target) setStatusChosen(true);
    }
    if (Object.values(changes).some((s) => s && s !== 'success')) setRevisionNudge((n) => n + 1);
    try {
      const r = await assessQuestions(id, changes, { source, ...(sendCompletion ? { completion: target } : {}) });
      if (r?.item_progress) {
        setQuestionDates(Object.fromEntries(Object.entries(r.item_progress)
          .filter(([, v]) => v?.assessed_at).map(([p, v]) => [p, String(v.assessed_at)])));
      }
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
  const handleQuestionAssess = (path: string, status: AssessmentStatus, source: AssessSource = 'question') =>
    applyAssessments({ [path]: progressRef.current[path] === status ? null : status }, undefined, source);
  const handleAssessMany = (changes: AssessChanges, source: AssessSource = 'question') =>
    applyAssessments(changes, undefined, source);

  // « Où en es-tu ? » : « Tout réussi » coche toutes les questions (re-cliquer les efface) ;
  // « À revoir » ne touche qu'au résultat du contenu. Leçon : « Marquer comme lue ».
  const handleSetCompletion = async (status: 'success' | 'review' | null) => {
    if (!isAuthenticated) { openModal('evaluer'); return; }
    if (!id) return;
    if (leafPaths.length) {
      if (status === 'success') {
        trackAction('tout-reussi');
        await applyAssessments(Object.fromEntries(leafPaths.map((p) => [p, 'success'])), 'success', 'tout');
        return;
      }
      if (status === null && completionRef.current === 'success') {
        await applyAssessments(Object.fromEntries(leafPaths.map((p) => [p, null])), null);
        return;
      }
    }
    const prev = completionStatus;
    setCompletionStatus(status);
    if (status) setStatusChosen(true);
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
      // La prochaine solution ouverte compte de nouveau.
      solutionMarked.current.delete(id);
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
      openModal('commentaire');
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
      openModal('vote');
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

  // Fil d'Ariane de la barre du haut : Section › Niveau › Chapitre (matière unique : pas de « Mathématiques »),
  // vers les pages de niveau et de chapitre. Un sujet du Bac national est rangé sous « Examens nationaux »
  // (et c'est cette entrée du menu qui s'allume). Effacé en quittant la page.
  const { setCrumbs } = useBreadcrumb();
  const studentLevel = studentLevelSlug(user);
  useEffect(() => {
    if (!content) { setCrumbs(null); return; }
    const national = contentType === 'exam' && !!(content as ContentExam).is_national_exam;
    const section = config.basePath.replace(/^\//, '');
    const { level, chapter } = contentHub(content, studentLevel);
    const cl = level ?? content.class_levels?.[0];
    const chap = chapter ?? content.chapters?.[0];
    const query = (f: Record<string, string | undefined>) => {
      const p = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v); });
      return p.toString();
    };
    const crumbs: { label: string; to?: string }[] = [];
    if (national) {
      crumbs.push({ label: 'Examens nationaux', to: '/exams/nationaux' });
      if (cl) crumbs.push({ label: cl.name, to: `/exams/nationaux?${query({ classLevels: String(cl.id) })}` });
    } else {
      const sectionLabel = contentType === 'exercise' ? 'Exercices' : contentType === 'exam' ? 'Examens' : 'Leçons';
      crumbs.push({ label: sectionLabel, to: config.basePath });
      if (cl) crumbs.push({ label: cl.name, to: level ? hubPath(section, level.slug) : `${config.basePath}?${query({ classLevels: String(cl.id) })}` });
      if (chap) {
        crumbs.push({
          label: chap.name,
          to: level && chapter ? hubPath(section, level.slug, chapter.slug)
            : `${config.basePath}?${query({ classLevels: cl ? String(cl.id) : undefined, chapters: String(chap.id) })}`,
        });
      }
    }
    setCrumbs(crumbs, national ? '/exams/nationaux' : null);
    return () => setCrumbs(null);
  }, [content, contentType, config.basePath, setCrumbs, studentLevel]);

  if (isLoading || (authLoading && !content)) {
    return <DetailSkeleton />;
  }

  if (error || !content) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7' }} className="flex items-start justify-center px-4 pt-16">
        <div className="fd-card p-8 text-center max-w-md" role="alert">
          <p className="text-[15px] font-semibold text-ink">
            {error === 'error' ? 'Ce contenu n’a pas pu être chargé.' : 'Ce contenu n’existe pas ou a été retiré.'}
          </p>
          {error === 'error' && <p className="mt-1 text-[13.5px] text-ink-faint">Vérifie ta connexion et réessaie.</p>}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {error === 'error' && (
              <button type="button" className="fd-btn-primary inline-flex" onClick={() => setReloadKey((k) => k + 1)}>Réessayer</button>
            )}
            <Link to={config.basePath} className={error === 'error' ? 'fd-btn-ghost inline-flex' : 'fd-btn-primary inline-flex'}>
              {config.backLabel}
            </Link>
          </div>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-6 sm:py-6">
        {activeTab === 'exercise' && (
          <div className="space-y-4 sm:space-y-6">
            {/* « Où en es-tu ? » en haut de la page, visible dès l'arrivée (Natsu). */}
            {isAuthenticated && !examRunning && (
              <FinishPanel key={content.id} content={content} contentType={contentType} completionStatus={completionStatus}
                onSetCompletion={handleSetCompletion}
                progress={{ assessed: leafPaths.filter((p) => questionProgress[p]).length, total: leafPaths.length }}
                statusChosen={statusChosen}
                canAsk={!nudgeAsking}
                onFelt={(felt: Felt | null) => setContent((prev) => (prev ? { ...prev, felt } as ContentItem : prev))} />
            )}
            {/* « Ce sujet te résiste ? » : carte sous « Où en es-tu ? » sur téléphone, en bas à droite sur ordinateur. */}
            {isAuthenticated && contentType !== 'lesson' && id && (
              <RevisionNudge contentId={id} trigger={revisionNudge} kind={contentType} onAskingChange={setNudgeAsking} />
            )}

            <ContentMainCard
              content={content}
              contentType={contentType}
              voteCount={voteCount}
              likeCount={likeCounts.likes}
              dislikeCount={likeCounts.dislikes}
              userVote={userVote}
              onVote={handleVote}
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
              questionDates={questionDates}
              onQuestionAssess={handleQuestionAssess}
              onAssessMany={handleAssessMany}
              onSaveExamSession={isAuthenticated ? timerHook.saveExamSession : undefined}
              onSaveExamScore={isAuthenticated ? timerHook.saveExamScore : undefined}
              onSolutionOpen={handleSolutionOpen}
              onReport={openReport}
              onExamAttemptChange={setExamRunning}
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
            onRequireLogin={() => openModal('solution')}
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

/** Forme de la page pendant le chargement (en-tête, « Où en es-tu ? », trois questions). */
const DetailSkeleton: React.FC = () => (
  <div style={{ minHeight: '100vh', background: '#faf9f7' }} aria-busy="true" aria-label="Chargement">
    <div className="bg-white border-b border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 rounded bg-[#efece6]" />
          <div className="flex gap-2"><div className="h-8 w-8 rounded-xl bg-[#f2f1ee]" /><div className="h-8 w-8 rounded-xl bg-[#f2f1ee]" /></div>
        </div>
        <div className="mt-4 flex gap-1.5"><div className="h-5 w-16 rounded-full bg-[#f2f1ee]" /><div className="h-5 w-28 rounded-full bg-[#f2f1ee]" /></div>
        <div className="mt-3 h-7 w-4/5 max-w-xl rounded bg-[#efece6]" />
        <div className="mt-2.5 h-4 w-40 rounded bg-[#f2f1ee]" />
        <div className="mt-5 flex gap-1.5"><div className="h-10 w-28 rounded-xl bg-[#f2f1ee]" /><div className="h-10 w-28 rounded-xl bg-[#f2f1ee]" /></div>
      </div>
    </div>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 animate-pulse">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="space-y-4">
          <div className="h-14 rounded-2xl border border-line bg-white" />
          <div className="rounded-2xl border border-line bg-white p-5 sm:p-7 space-y-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-full rounded bg-[#f2f1ee]" />
                <div className="h-4 w-11/12 rounded bg-[#f2f1ee]" />
                <div className="h-4 w-2/3 rounded bg-[#f2f1ee]" />
                <div className="h-6 w-40 rounded-full bg-[#f5f4f1]" />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block h-48 rounded-2xl border border-line bg-white" />
      </div>
    </div>
  </div>
);

export default ContentDetail;
