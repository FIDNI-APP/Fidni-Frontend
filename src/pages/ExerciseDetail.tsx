import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Content, Comment, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { CommentSection } from '@/components/CommentSection';
import { useInView } from 'react-intersection-observer';
import Confetti from 'react-confetti';
import { useAuthModal } from '@/components/AuthController';
import { 
  getContentById, 
  voteExercise, 
  addComment, 
  markContentViewed, 
  deleteContent, 
  voteComment, 
  updateComment, 
  deleteComment, 
  deleteSolution, 
  voteSolution, 
  addSolution,
  markExerciseProgress, 
  removeExerciseProgress, 
  saveExercise, 
  unsaveExercise, 
} from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ExerciseHeader } from '@/components/exercise/ExerciseHeader';
import { TabNavigation } from '@/components/exercise/TabNavigation';
import { FloatingToolbar } from '@/components/exercise/FloatingToolbar';
import { ExerciseContent } from '@/components/exercise/ExerciseContent';
import { ExerciseSidebar } from '@/components/exercise/ExerciseSidebar';
import { ProposalsEmptyState, ActivityEmptyState } from '@/components/exercise/EmptyStates';
import { SolutionSection } from '@/components/exercise/SolutionSection';
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
  
  // Refs for scroll handling
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Animation states
  const [headerInViewRef, headerInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [contentInViewRef, contentInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [sidebarInViewRef, sidebarInView] = useInView({ threshold: 0.1, triggerOnce: true });

  useEffect(() => {
    if (id) {
      if (isAuthenticated) {
        loadExerciseWithUserStatus(id);
      } else {
        loadExercise(id);
      }
      markContentViewed(id).catch(console.error);
    }
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
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    
    if (diffSecs < 60) return `Il y a ${diffSecs} seconde${diffSecs > 1 ? 's' : ''}`;
    if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    if (diffWeeks < 4) return `Il y a ${diffWeeks} semaine${diffWeeks > 1 ? 's' : ''}`;
    if (diffMonths < 12) return `Il y a ${diffMonths} mois`;
    return `Il y a ${diffYears} an${diffYears > 1 ? 's' : ''}`;
  };

  const loadExerciseWithUserStatus = async (exerciseId: string) => {
    try {
      setLoading(true);
      
      // Load exercise data
      const exerciseData = await getContentById(exerciseId);
      setExercise(exerciseData);
      
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
  
  const handleVoteComment = async (commentId: string, value: VoteValue) => {
    if (!isAuthenticated || !exercise) {
      openModal();
      return;
    }
  
    try {
      const updatedComment = await voteComment(commentId, value);
      
      const updateCommentInTree = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return updatedComment;
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateCommentInTree(comment.replies)
            };
          }
          return comment;
        });
      };
  
      setExercise(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: updateCommentInTree(prev.comments || [])
        };
      });
    } catch (err) {
      console.error('Failed to vote on comment:', err);
    }
  };
  
  const handleEditComment = async (commentId: string, content: string) => {
    if (!exercise) return;
  
    try {
      const updatedComment = await updateComment(commentId, content);
      
      const updateCommentInTree = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return updatedComment;
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateCommentInTree(comment.replies)
            };
          }
          return comment;
        });
      };
  
      setExercise(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: updateCommentInTree(prev.comments || [])
        };
      });
    } catch (err) {
      console.error('Failed to edit comment:', err);
    }
  };
  
  const handleDeleteComment = async (commentId: string) => {
    if (!exercise) return;
  
    try {
      await deleteComment(commentId);
      
      const removeCommentFromTree = (comments: Comment[]): Comment[] => {
        return comments.filter(comment => {
          if (comment.id === commentId) {
            return false;
          }
          if (comment.replies) {
            comment.replies = removeCommentFromTree(comment.replies);
          }
          return true;
        });
      };
  
      setExercise(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: removeCommentFromTree(prev.comments || [])
        };
      });
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };
  
  const handleDelete = async () => {
    if (!exercise || !window.confirm('Are you sure you want to delete this content?')) {
      return;
    }
  
    try {
      await deleteContent(exercise.id);
      navigate('/exercises');
    } catch (err) {
      console.error('Failed to delete content:', err);
    }
  };
  
  const handleEdit = () => {
    if (exercise) {
      navigate(`/edit/${exercise.id}`);
    }
  };
  
  const toggleSolutionVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSolutionVisible(!solutionVisible);
  };
  
  const handleSolutionToggle = () => {
    setShowSolution(!showSolution);
    if (!solutionVisible) {
      setSolutionVisible(true);
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
    } catch (err) {
      console.error('Failed to add solution:', err);
    }
  };
  
  const handleEditSolution = () => {
    if (exercise?.solution) {
      navigate(`/solutions/${exercise.solution.id}/edit`);
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

  // Implement progress tracking (Réussi/À revoir)
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
  
  // Toggle saved status (Enregistrer)
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


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pt-24 pb-16 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-8 h-8"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
            </div>
          </div>
          <p className="mt-6 text-lg font-medium text-indigo-900">Chargement de l'exercice...</p>
          <p className="text-sm text-indigo-600">Préparation de votre contenu éducatif</p>
        </div>
      </div>
    );
  }

  if (error || !exercise) {
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
                <h3 className="text-lg font-semibold">Exercice indisponible</h3>
                <p className="mt-2 text-base">{error || 'Exercice introuvable. Veuillez vérifier le lien ou réessayer plus tard.'}</p>
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => navigate('/exercises')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-full shadow-md px-8 py-3 text-lg font-medium transition-all duration-300 hover:shadow-lg"
            >
              <svg className="w-5 h-5 mr-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour aux exercices
            </button>
          </div>
        </div>
      </div>
    );
  }
  const handlePrint = () => {
    // Create a temporary iframe to handle the printing
    // This approach isolates the print content and allows us to properly render LaTeX
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    document.body.appendChild(printFrame);
  
    // Wait for the iframe to load before adding content
    printFrame.onload = () => {
      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (!frameDoc) return;
  
      // Add necessary styles to the iframe
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Latin+Modern+Roman&display=swap');
        
        /* Base document styles */
        body {
          font-family: 'Latin Modern Roman', 'Computer Modern', 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.5;
          margin: 0;
          padding: 0 2cm;
          color: black;
          background: white;
        }
        
        /* Print settings */
        @page {
          size: A4;
          margin: 2cm;
        }
        
        /* Typography */
        h1 {
          font-size: 18pt;
          text-align: center;
          margin-bottom: 0.5cm;
          font-weight: bold;
        }
        
        /* Meta information */
        .exercise-metadata {
          text-align: center;
          font-style: italic;
          margin-bottom: 1cm;
          font-size: 10pt;
          color: #333;
        }
        
        /* Content and solution */
        .exercise-content {
          text-align: justify;
          margin-bottom: 1cm;
        }
        
        .solution-section {
          margin-top: 1cm;
          padding-top: 0.5cm;
          border-top: 1pt solid #999;
        }
        
        .solution-title {
          font-size: 14pt;
          text-align: center;
          margin-bottom: 0.5cm;
          font-weight: bold;
        }
        
        /* Footer */
        .print-footer {
          margin-top: 2cm;
          padding-top: 0.5cm;
          border-top: 1pt solid #999;
          text-align: center;
          font-size: 9pt;
          font-style: italic;
        }
        
        /* LaTeX math styling */
        .katex-display {
          margin: 1em 0;
          text-align: center;
        }
        
        .katex {
          font-size: 1.1em;
          text-indent: 0;
        }
      `;
      
      // Import KaTeX CSS
      const katexLink = document.createElement('link');
      katexLink.rel = 'stylesheet';
      katexLink.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
      katexLink.integrity = 'sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntxDrP2e2xz2xzZ4wYYTIe1KvzGJ+KexmF';
      katexLink.crossOrigin = 'anonymous';
      
      // Add styles to iframe head
      frameDoc.head.appendChild(styleSheet);
      frameDoc.head.appendChild(katexLink);
      
      // Set title
      frameDoc.title = `${exercise.title} - ExercicesMaths.ma`;
      
      // Create HTML skeleton
      frameDoc.body.innerHTML = `
        <div class="exercise-print-container">
          <h1>${exercise.title}</h1>
          
          <div class="exercise-metadata">
            <div>Niveau: ${exercise.class_levels?.[0]?.name || 'Non spécifié'}</div>
            <div>Matière: ${exercise.subject?.name || 'Non spécifiée'}</div>
            <div>Difficulté: ${
              exercise.difficulty === 'easy' ? 'Facile' : 
              exercise.difficulty === 'medium' ? 'Moyen' : 'Difficile'
            }</div>
            <div>Date: ${new Date(exercise.created_at).toLocaleDateString()}</div>
          </div>
          
          <div class="exercise-content" id="print-exercise-content"></div>
          
          ${exercise.solution && solutionVisible ? `
            <div class="solution-section">
              <h2 class="solution-title">Solution</h2>
              <div class="solution-content" id="print-solution-content"></div>
            </div>
          ` : ''}
          
          <div class="print-footer">
            <p>Exercice proposé par ${exercise.author.username} • Imprimé le ${new Date().toLocaleDateString()}</p>
            <p>ExercicesMaths.ma</p>
          </div>
        </div>
      `;
      
      // Clone the actual rendered content with LaTeX
      // This is critical: we get the rendered DOM elements instead of just the HTML string
      
      // Find the actual rendered content in the page
      const exerciseContentEl = document.querySelector('.exercise-content-body');
      const solutionContentEl = solutionVisible && exercise.solution ? 
        document.querySelector('.solution-content') : null;
      
      if (exerciseContentEl) {
        // Clone the nodes to preserve the rendered LaTeX
        const clonedContent = exerciseContentEl.cloneNode(true);
        const printContentTarget = frameDoc.getElementById('print-exercise-content');
        if (printContentTarget) {
          printContentTarget.appendChild(clonedContent);
        }
      }
      
      if (solutionContentEl) {
        // Clone the solution nodes to preserve the rendered LaTeX
        const clonedSolution = solutionContentEl.cloneNode(true);
        const printSolutionTarget = frameDoc.getElementById('print-solution-content');
        if (printSolutionTarget) {
          printSolutionTarget.appendChild(clonedSolution);
        }
      }
      
      // Give a moment for styles to apply, then print
      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (err) {
          console.error('Print error:', err);
          // Fallback for browsers that don't support iframe printing
          window.print();
        }
        
        // Clean up after printing (with a delay to ensure print dialog completes)
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 500);
    };
    
    // Set src to trigger onload
    printFrame.src = 'about:blank';
  };
  const isAuthor = user?.id === exercise.author.id;
  const hasSolution = !!exercise.solution;
  const canEditSolution = exercise.solution && user?.id === exercise.solution.author.id;

  return (
    <div className={`min-h-screen bg-gray-50 pt-20 pb-16 transition-all duration-300 ${fullscreenMode ? 'bg-white' : ''}`}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
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
      
      {/* Sticky header (appears on scroll) */}
      <div className={`fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 transform transition-transform duration-300 ${isSticky ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/exercises')}
              className="rounded-full px-3 py-2 text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Retour aux exercices"
              title="Retour aux exercices"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            
            <h2 className="text-lg font-medium text-gray-900 line-clamp-1">
              {exercise.title}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-${
              exercise.difficulty === 'easy' ? 'emerald-500 to-green-500' : 
              exercise.difficulty === 'medium' ? 'amber-500 to-yellow-500' : 
              'rose-500 to-pink-500'
            } text-white`}>
              {exercise.difficulty === 'easy' ? 'Facile' : 
               exercise.difficulty === 'medium' ? 'Moyen' : 
               'Difficile'}
            </span>
            
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>{formatTime(timer)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-6 relative">
        {/* Header component with tabs */}
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
            <div className="flex-grow">
              <AnimatePresence mode="wait">
                {activeSection === 'exercise' && (
                  <motion.div
                    key="exercise-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Exercise Content */}
                    <div ref={contentInViewRef}>
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
                        canEditSolution={canEditSolution}
                        isAuthor={isAuthor}
                        solutionVisible={solutionVisible}
                        showSolution={showSolution}
                        handleSolutionToggle={handleSolutionToggle}
                        toggleSolutionVisibility={toggleSolutionVisibility}
                        handleVote={handleVote}
                        handleEditSolution={handleEditSolution}
                        handleDeleteSolution={handleDeleteSolution}
                        handleAddSolution={handleAddSolution}
                        setSolutionVisible={setSolutionVisible}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Discussions Section */}
                {activeSection === 'discussions' && (
                  <motion.div
                    key="discussions-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6"
                  >
                    <div className="p-6" id="comments">
                      <CommentSection
                        comments={exercise?.comments || []}
                        onAddComment={handleAddComment}
                        onVoteComment={handleVoteComment}
                        onEditComment={handleEditComment}
                        onDeleteComment={handleDeleteComment}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Proposals Section */}
                {activeSection === 'proposals' && (
                  <motion.div
                    key="proposals-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                  >
                    <ProposalsEmptyState />
                  </motion.div>
                )}
                
                {/* Activity Section */}
                {activeSection === 'activity' && (
                  <motion.div
                    key="activity-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                  >
                    <ActivityEmptyState />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Right Sidebar - Only show on larger screens, move to appropriate location on mobile */}
            {!fullscreenMode && (
              <div className="lg:w-72 lg:flex-shrink-0 mt-6 lg:mt-0">
                <div 
                  ref={sidebarInViewRef}
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
  );
}