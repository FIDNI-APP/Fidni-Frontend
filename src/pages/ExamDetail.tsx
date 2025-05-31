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

import { 
  Bookmark, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  Share2, 
  Printer, 
  Clock,
  BarChart3,
  Eye,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Award,
  Calendar,
  GraduationCap,
  BookOpen,
  Save,
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
  const [activeSection, setActiveSection] = useState<'exam' | 'discussions'>('exam');
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
  
  // Time tracking avec le nouveau hook
  const {
    timeStatus,
    currentSessionTime,
    isActive: timerActive,
    loading: timeLoading,
    showResumeDialog,
    startTracking,
    stopTracking,
    saveSession,
    setResumePreference,
    getSessionsHistory,
    handleResumeDialog,
    loadTimeStatus,
    formatTime,
    formatCurrentTime,
    formatTotalTime
  } = useAdvancedTimeTracker({
    contentType: 'exam',
    contentId: id || '',
    autoSaveInterval: 30,
    enabled: !!id && !!exam && isAuthenticated
  });

  // Timer functions - adapted to new hook
  const toggleTimer = () => {
    if (timerActive) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const resetTimer = () => {
    startTracking(false); // Start new session (reset)
  };

  const saveTimeManually = async () => {
    try {
      await saveSession('study', 'Manual save');
    } catch (err) {
      console.error('Failed to save session manually:', err);
    }
  };
  
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
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pt-24 pb-16 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 22H20C21.1 22 22 21.1 22 20V4C22 2.9 21.1 2 20 2H4C2.9 2 2 2.9 2 4V20C2 21.1 2.9 22 4 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 6L9 18L6 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
    <div className={`min-h-screen bg-gray-50 pt-20 pb-16 transition-all duration-300 ${fullscreenMode ? 'bg-white' : ''}`}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      {/* Resume Dialog */}
      {showResumeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Session en cours détectée</h3>
            <p className="text-gray-600 mb-4">
              Vous avez une session de {formatTime(timeStatus?.currentSessionSeconds || 0)} en cours. 
              Que souhaitez-vous faire ?
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => handleResumeDialog('continue')} className="w-full">
                Continuer la session
              </Button>
              <Button onClick={() => handleResumeDialog('save_and_restart')} variant="outline" className="w-full">
                Sauvegarder et recommencer
              </Button>
              <Button onClick={() => handleResumeDialog('restart')} variant="outline" className="w-full">
                Recommencer sans sauvegarder
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Print-only view */}
      {showPrint && (
        <div className="hidden print:block">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-center">{exam.title}</h1>
            
            {exam.is_national_exam && exam.national_date && (
              <div className="text-center mb-6">
                <p className="font-semibold">Examen National du {formatDate(exam.national_date)}</p>
              </div>
            )}
            
            <div className="mb-6 flex flex-wrap justify-center gap-3">
              {exam.subject && (
                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                  Matière: {exam.subject.name}
                </span>
              )}
              {exam.class_levels && exam.class_levels.length > 0 && (
                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                  Niveau: {exam.class_levels[0].name}
                </span>
              )}
              <span className={`px-3 py-1 ${difficultyInfo.bgColor} rounded-full text-sm ${difficultyInfo.textColor}`}>
                Difficulté: {difficultyInfo.label}
              </span>
            </div>
            
            <div className="prose prose-lg max-w-none">
              <TipTapRenderer content={exam.content} />
            </div>
            
            <div className="mt-8 text-sm text-gray-500 text-center">
              <p>Examen créé par {exam.author.username} • Imprimé le {new Date().toLocaleDateString()}</p>
              <p>ExercicesMaths.ma</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Main content - hidden during print */}
      <div className="print:hidden">
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
            <div className={`bg-gradient-to-r ${exam.is_national_exam ? 'from-blue-800 to-blue-600' : 'from-blue-800 via-indigo-800 to-indigo-900'} text-white rounded-xl overflow-hidden shadow-lg mb-6 relative`}>
              {/* Background Pattern - positioned relative to header */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#smallGrid)" />
                </svg>
              </div>

              <div className="px-6 pt-6 pb-4 relative">
                {/* Navigation row */}
                <div className="flex justify-between items-center mb-6">
                  <Button 
                    onClick={() => navigate("/exams")}
                    variant="ghost"
                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Retour
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {/* Save button */}
                    <Button 
                      onClick={toggleSavedForLater}
                      variant="ghost"
                      className={`rounded-lg text-white/80 hover:text-white hover:bg-white/10 ${savedForLater ? 'bg-white/20' : ''}`}
                      disabled={loadingStates.save}
                    >
                      {loadingStates.save ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Bookmark className={`w-5 h-5 mr-1.5 ${savedForLater ? 'fill-white' : ''}`} />
                      )}
                      {savedForLater ? 'Enregistré' : 'Enregistrer'}
                    </Button>
                    
                    {/* Share button */}
                    <Button 
                      onClick={handleShare}
                      variant="ghost"
                      className="rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                    >
                      <Share2 className="w-5 h-5 mr-1.5" />
                      Partager
                    </Button>
                    
                    {/* Print button */}
                    <Button 
                      onClick={handlePrint}
                      variant="ghost"
                      className="rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                    >
                      <Printer className="w-5 h-5 mr-1.5" />
                      Imprimer
                    </Button>
                  </div>
                </div>
                
                {/* Exam title and metadata */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                  <div className="max-w-3xl">
                    <h1 className="text-3xl font-bold mb-3">{exam.title}</h1>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1.5 text-indigo-300" />
                        <span className="text-indigo-100">{exam.view_count} vues</span>
                      </div>
                      
                      <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-1.5 text-indigo-300" />
                        <span className="text-indigo-100">{exam.comments?.length || 0} commentaires</span>
                      </div>
                    </div>
                    
                    {/* National exam badge and date */}
                    {exam.is_national_exam && (
                      <div className="mb-3 bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg inline-flex items-center">
                        <Award className="w-4 h-4 mr-2 text-yellow-300" />
                        <div>
                          <span className="font-medium">Examen National 🇫🇷</span>
                          {exam.national_date && (
                            <span className="ml-2 text-white/90 text-sm">{formatDate(exam.national_date)}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Category Tags */}
                  <div className="flex flex-wrap gap-2">
                    {exam.subject && (
                      <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
                        <BookOpen className="w-4 h-4 mr-1.5 text-indigo-300" />
                        {exam.subject.name}
                      </span>
                    )}
                    
                    {exam.class_levels && exam.class_levels.length > 0 && (
                      <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
                        <GraduationCap className="w-4 h-4 mr-1.5 text-indigo-300" />
                        {exam.class_levels[0].name}
                      </span>
                    )}
                    
                    <span className={`bg-gradient-to-r ${difficultyInfo.color} px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5`}>
                      <BarChart3 className="w-4 h-4" />
                     <span>{difficultyInfo.label}</span>
                   </span>
                 </div>
               </div>
               
               {/* Tab Navigation */}
               <div className="flex overflow-x-auto border-b border-white/20 mt-2">
                 <button
                   onClick={() => setActiveSection('exam')}
                   className={`px-4 py-3 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
                     activeSection === 'exam' 
                       ? 'border-white text-white font-medium' 
                       : 'border-transparent text-white/70 hover:text-white hover:border-white/50'
                   }`}
                 >
                   <Award className="w-4 h-4" />
                   <span>Examen</span>
                 </button>
                 
                 <button
                   onClick={() => setActiveSection('discussions')}
                   className={`px-4 py-3 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
                     activeSection === 'discussions' 
                       ? 'border-white text-white font-medium' 
                       : 'border-transparent text-white/70 hover:text-white hover:border-white/50'
                   }`}
                 >
                   <MessageSquare className="w-4 h-4" />
                   <span>Discussions</span>
                   {exam.comments?.length > 0 && (
                     <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                       activeSection === 'discussions' ? 'bg-white text-indigo-700' : 'bg-white/20 text-white'
                     }`}>
                       {exam.comments.length}
                     </span>
                   )}
                 </button>
               </div>
             </div>
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
                     <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6">
                       <div className="p-6">
                         {/* Content */}
                         <div className="prose max-w-none text-gray-800 mb-6">
                           <TipTapRenderer content={exam.content} />
                         </div>
                         
                         {/* Footer with votes, progress tracking, etc */}
                         <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
                           <div className="flex items-center gap-4">
                             {/* Vote Buttons */}
                             <div className="flex items-center gap-1 text-gray-500">
                               <button
                                 onClick={() => handleVote(1)}
                                 className={`p-1 rounded-md transition-colors ${exam.user_vote === 1 ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'}`}
                                 aria-label="Upvote"
                               >
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                 </svg>
                               </button>
                               <span className="font-medium">{exam.vote_count}</span>
                               <button
                                 onClick={() => handleVote(-1)}
                                 className={`p-1 rounded-md transition-colors ${exam.user_vote === -1 ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'}`}
                                 aria-label="Downvote"
                               >
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                 </svg>
                               </button>
                             </div>
                             
                             {/* Views count */}
                             <span className="flex items-center gap-1 text-sm text-gray-500">
                               <Eye className="w-4 h-4 text-gray-400" />
                               <span>{exam.view_count} vues</span>
                             </span>
                           </div>
                           
                           <div className="flex items-center gap-2">
                             {/* Completion status buttons */}
                             <Button
                               onClick={() => markAsCompleted('success')}
                               variant={completed === 'success' ? "default" : "outline"}
                               size="sm"
                               className={`rounded-lg ${
                                 completed === 'success' 
                                   ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                                   : 'border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
                               }`}
                               disabled={loadingStates.progress}
                             >
                               {loadingStates.progress ? (
                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                               ) : (
                                 <CheckCircle className="w-4 h-4 mr-1.5" />
                               )}
                               Réussi
                             </Button>
                             
                             <Button
                               onClick={() => markAsCompleted("review")}
                               variant={completed === "review" ? "default" : "outline"}
                               size="sm"
                               className={`rounded-lg ${
                                 completed === "review" 
                                   ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                                   : 'border-gray-200 hover:border-rose-300 hover:text-rose-600'
                               }`}
                               disabled={loadingStates.progress}
                             >
                               {loadingStates.progress ? (
                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                               ) : (
                                 <XCircle className="w-4 h-4 mr-1.5" />
                               )}
                               À revoir
                             </Button>
                             
                             {/* Print button */}
                             <Button
                               variant="outline"
                               onClick={handlePrint}
                               className="rounded-lg text-sm"
                               size="sm"
                             >
                               <Printer className="w-4 h-4 mr-1.5" />
                               Imprimer
                             </Button>
                           </div>
                         </div>
                       </div>
                     </div>
                     
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
                         onDeleteComment={async (commentId: string) => Promise.resolve()} // TODO: Implement delete comment logic
                       />
                     </div>
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
                     {/* Timer Section avec nouvelles informations */}
                     <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                       <div className="flex items-center justify-between mb-3">
                         <h3 className="font-medium flex items-center text-sm">
                           <Clock className="w-4 h-4 mr-1.5" />
                           Chronomètre
                         </h3>
                         <div className="text-right">
                           <div className="font-mono text-xl font-bold">{formatCurrentTime()}</div>
                           <div className="text-xs text-white/70">Session</div>
                         </div>
                       </div>
                       
                       {/* Temps total */}
                       <div className="mb-3 text-center">
                         <div className="text-sm text-white/80">Temps total</div>
                         <div className="font-mono text-lg font-semibold">{formatTotalTime()}</div>
                       </div>
                       
                       <div className="flex gap-2 mb-2">
                         <Button 
                           onClick={toggleTimer} 
                           className={`flex-1 h-9 text-sm ${
                             timerActive 
                               ? 'bg-red-500 hover:bg-red-600 border-red-400' 
                               : 'bg-white text-indigo-700 hover:bg-indigo-50'
                           }`}
                         >
                           {timerActive ? 'Pause' : 'Démarrer'}
                         </Button>
                         <Button 
                           onClick={resetTimer} 
                           variant="outline" 
                           className="flex-1 h-9 text-sm bg-indigo-500/20 border-indigo-300/30 text-white hover:bg-indigo-500/30"
                         >
                           Reset
                         </Button>
                       </div>
                       
                       {/* Bouton de sauvegarde manuelle */}
                       <Button
                         onClick={saveTimeManually}
                         variant="outline"
                         size="sm"
                         className="w-full h-8 text-xs bg-white/10 border-white/30 text-white hover:bg-white/20 flex items-center justify-center gap-1"
                       >
                         <Save className="w-3 h-3" />
                         Sauvegarder le temps
                       </Button>
                       
                       {/* Indicateur de dernière sauvegarde */}
                       {timeStatus?.lastSessionStart && (
                         <div className="mt-2 text-xs text-white/60 text-center">
                           Dernière sauvegarde: {new Date(timeStatus.lastSessionStart).toLocaleTimeString()}
                         </div>
                       )}
                       
                       {/* Statut de chargement du temps */}
                       {timeLoading && (
                         <div className="mt-2 text-xs text-white/60 text-center">
                           Synchronisation...
                         </div>
                       )}
                       
                       {/* Préférence de reprise */}
                       {timeStatus && (
                         <div className="mt-2">
                           <div className="text-xs text-white/70 mb-1">Préférence de reprise:</div>
                           <select
                             value={timeStatus.resumePreference}
                             onChange={(e) => setResumePreference(e.target.value as 'continue' | 'restart' | 'ask')}
                             className="w-full text-xs bg-white/10 border-white/30 text-white rounded px-2 py-1"
                           >
                             <option value="ask" className="text-gray-900">Demander</option>
                             <option value="continue" className="text-gray-900">Continuer</option>
                             <option value="restart" className="text-gray-900">Recommencer</option>
                           </select>
                         </div>
                       )}
                     </div>
                     
                     {/* Historique des sessions */}
                     {timeStatus && timeStatus.sessionsCount > 0 && (
                       <div className="p-4">
                         <h3 className="font-medium text-gray-800 text-sm mb-2 flex items-center">
                           <Clock className="w-4 h-4 mr-1" />
                           Historique des sessions
                         </h3>
                         <div className="space-y-2">
                           {timeStatus.recentSessions.slice(0, 3).map((session) => (
                             <div key={session.id} className="flex justify-between text-xs text-gray-600">
                               <span>{formatTime(session.durationSeconds)}</span>
                               <span>{new Date(session.endedAt).toLocaleDateString()}</span>
                             </div>
                           ))}
                         </div>
                         <button
                           onClick={async () => {
                             try {
                               const history = await getSessionsHistory(1, 10);
                               console.log('Session history:', history);
                               // TODO: Show modal with full history
                             } catch (err) {
                               console.error('Failed to get session history:', err);
                             }
                           }}
                           className="w-full mt-2 text-xs text-indigo-600 hover:text-indigo-800"
                         >
                           Voir tout l'historique ({timeStatus.sessionsCount})
                         </button>
                       </div>
                     )}
                     
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
                           <span className="font-medium">{formatTotalTime()}</span>
                         </div>
                         {timeStatus && (
                           <div className="flex justify-between text-sm">
                             <span className="text-gray-600">Sessions</span>
                             <span className="font-medium">{timeStatus.sessionsCount}</span>
                           </div>
                         )}
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
   </div>
 );
}