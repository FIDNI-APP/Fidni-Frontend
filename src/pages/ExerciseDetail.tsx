import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Tag, 
  ChevronDown, 
  Lightbulb, 
  Award, 
  MessageSquare, 
  GitPullRequest, 
  Activity, 
  BookOpen,
  GraduationCap,
  BarChart3,
  Clock,
  User,
  PenSquare,
  Timer,
  Bookmark,
  CheckCircle,
  XCircle,
  ThumbsUp,
  Share2,
  Heart,
  Star,
  Eye,
  Maximize2,
  Minimize2,
  Copy,
  Send,
  Calendar,
  Printer,
  Play,
  Pause,
  Layers,
  BookMarked,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getContentById, voteExercise, addComment, markContentViewed, deleteContent, voteComment, updateComment, deleteComment, deleteSolution, voteSolution, addSolution } from '@/lib/api';
import { Content, Comment, VoteValue, Difficulty } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { VoteButtons } from '@/components/VoteButtons';
import DualPaneEditor from '@/components/editor/DualPaneEditor';
import { CommentSection } from '@/components/CommentSection';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { AnimatePresence, motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Confetti from 'react-confetti';

export function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [exercise, setExercise] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [solution, setSolution] = useState('');
  const [activeSection, setActiveSection] = useState<'exercise' | 'discussions' | 'proposals' | 'activity'>('exercise');
  
  // User interaction states
  const [timer, setTimer] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [savedForLater, setSavedForLater] = useState<boolean>(false);
  const [difficultyRating, setDifficultyRating] = useState<number | null>(null);
  const [fullscreenMode, setFullscreenMode] = useState<boolean>(false);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const [isSticky, setIsSticky] = useState<boolean>(false);
  const [showAllTags, setShowAllTags] = useState<boolean>(false);
  
  // Refs for scroll handling
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Animation states
  const [headerInViewRef, headerInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [contentInViewRef, contentInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [sidebarInViewRef, sidebarInView] = useInView({ threshold: 0.1, triggerOnce: true });

  useEffect(() => {
    if (id) {
      loadExercise(id);
      markContentViewed(id).catch(console.error);
    }
  }, [id]);

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


  const getDifficultyColor = (difficulty: Difficulty): string => {
    switch (difficulty) {
      case 'easy':
        return 'from-emerald-500 to-emerald-400 text-white';
      case 'medium':
        return 'from-amber-500 to-amber-400 text-white';
      case 'hard':
        return 'from-rose-500 to-rose-400 text-white';
      default:
        return 'from-gray-500 to-gray-400 text-white';
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
      navigate('/login');
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
  
  const getDifficultyLabel = (difficulty: Difficulty): string => {
    switch (difficulty) {
      case 'easy':
        return 'Facile';
      case 'medium':
        return 'Moyen';
      case 'hard':
        return 'Difficile';
      default:
        return difficulty;
    }
  };
  
  const getDifficultyIcon = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return <BarChart3 className="w-4 h-4" />;
      case 'medium':
        return (
          <div className="flex">
            <BarChart3 className="w-4 h-4" />
          </div>
        );
      case 'hard':
        return (
          <div className="flex">
            <BarChart3 className="w-4 h-4" />
          </div>
        );
      default:
        return <BarChart3 className="w-4 h-4" />;
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

  const handleVote = async (value: VoteValue, target: 'exercise' | 'solution' = 'exercise') => {
    if (!isAuthenticated || !id) {
      navigate('/login');
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

  // Other handler methods remain the same...
  // For brevity, I'm not including all the handlers, but they would remain unchanged

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

  const toggleSavedForLater = () => {
    setSavedForLater(!savedForLater);
    // API call would go here
  };

  const markAsCompleted = (status: boolean) => {
    setCompleted(status);
    // API call would go here
  };

  const rateDifficulty = (rating: number) => {
    setDifficultyRating(rating);
    // API call would go here
  };
  const toggleFullscreen = () => {
    setFullscreenMode(!fullscreenMode);
  };
  const toggleToolbar = () => {
    setShowToolbar(!showToolbar);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pt-24 pb-16 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-8 h-8" />
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
            <Button 
              onClick={() => navigate('/exercises')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-full shadow-md px-8 py-6 text-lg font-medium transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
            >
              <ArrowLeft className="w-5 h-5 mr-4" />
              Retour aux exercices
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === exercise.author.id;
  const hasSolution = !!exercise.solution;
  const canEditSolution = exercise.solution && user?.id === exercise.solution.author.id;

  // Check if the content has theorems and subfields
  const hasTheorems = exercise.theorems && exercise.theorems.length > 0;
  const hasSubfields = exercise.subfields && exercise.subfields.length > 0;
  const hasChapters = exercise.chapters && exercise.chapters.length > 0;

  return (
    <div className={`min-h-screen bg-gray-50 pt-20 pb-16 transition-all duration-300 ${fullscreenMode ? 'bg-white' : ''}`}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      {/* Floating toolbar */}
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-full shadow-lg transition-all duration-300 ${showToolbar ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center p-1">
          <Button 
            onClick={toggleTimer}
            variant="ghost"
            className="rounded-full p-3 hover:bg-indigo-50"
            title={timerActive ? "Pause" : "Start timer"}
          >
            {timerActive ? <Pause className="w-5 h-5 text-red-500" /> : <Play className="w-5 h-5 text-indigo-600" />}
          </Button>
          
          <div className="px-3 font-mono text-lg font-medium text-indigo-900">
            {formatTime(timer)}
          </div>
          
          <div className="h-5 w-px bg-gray-200 mx-1"></div>
          
          <Button 
            onClick={toggleFullscreen}
            variant="ghost"
            className={`rounded-full p-3 ${fullscreenMode ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-indigo-50 text-gray-600'}`}
            title={fullscreenMode ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {fullscreenMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
          
          <Button 
            onClick={handlePrint}
            variant="ghost"
            className="rounded-full p-3 hover:bg-indigo-50 text-gray-600"
            title="Print"
          >
            <Printer className="w-5 h-5" />
          </Button>
          
          <div className="h-5 w-px bg-gray-200 mx-1"></div>
          
          <Button 
            onClick={() => markAsCompleted(true)}
            variant="ghost"
            className={`rounded-full p-3 ${completed ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-indigo-50 text-gray-600'}`}
            title="Mark as completed"
          >
            <CheckCircle className="w-5 h-5" />
          </Button>
          
          <Button 
            onClick={toggleSavedForLater}
            variant="ghost"
            className={`rounded-full p-3 ${savedForLater ? 'bg-amber-100 text-amber-600' : 'hover:bg-indigo-50 text-gray-600'}`}
            title={savedForLater ? "Saved" : "Save for later"}
          >
            <Bookmark className={`w-5 h-5 ${savedForLater ? 'fill-amber-500' : ''}`} />
          </Button>
          
          <div className="h-5 w-px bg-gray-200 mx-1"></div>
          
          <Button 
            onClick={toggleToolbar}
            variant="ghost"
            className="rounded-full p-3 hover:bg-indigo-50 text-gray-600"
            title="Hide toolbar"
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 transition-all duration-300 ${fullscreenMode ? 'max-w-none px-0 sm:px-0' : ''}`}>
        {/* Sticky header (appears on scroll) */}
        <div className={`fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 transform transition-transform duration-300 ${isSticky ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/exercises')}
                variant="ghost"
                className="rounded-full px-3 py-2 text-indigo-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <h2 className="text-lg font-medium text-gray-900 line-clamp-1">
                {exercise.title}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getDifficultyColor(exercise.difficulty)}`}>
                {getDifficultyLabel(exercise.difficulty)}
              </span>
              
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>{formatTime(timer)}</span>
              </div>
            </div>
          </div>
        </div>
      
        {/* Layout using flexbox to position button left of container */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start mt-4">
          {/* Back button to the left of the container */}
          <div className="mt-1">
            <Button 
              onClick={() => navigate('/exercises')}
              variant="outline"
              className="rounded-lg border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux exercices
            </Button>
          </div>
          
          {/* Main content grid */}
          <div className="flex-1">
            <div className="grid grid-cols-12 gap-6">
              {/* Main Content Area - Widened */}
              <div className={`col-span-12 ${fullscreenMode ? 'lg:col-span-12' : 'lg:col-span-9'}`}>
                {/* Exercise Header Card */}
                <motion.div 
                  ref={headerRef}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6"
                >
                  <div className="p-6">
                    <div className="flex flex-col gap-5">
                      {/* Title with Solution Indicator (if available) and Save Button */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex items-start gap-2">
                          {/* Simple lightbulb solution indicator, only shown if solution exists */}
                          {hasSolution && (
                            <Lightbulb className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
                          )}
                          <div>
                            <h1 className="text-2xl leading-tight font-bold text-gray-900">
                              {exercise.title}
                            </h1>
                            {/* Date moved near title */}
                            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{new Date(exercise.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right side buttons - Save Flag button */}
                        <div className="flex items-center">
                          <Button 
                            onClick={toggleSavedForLater}
                            variant="ghost"
                            className="rounded-full p-2"
                            title={savedForLater ? "Unsave" : "Save for later"}
                          >
                            <Bookmark className={`w-5 h-5 ${savedForLater ? 'text-indigo-600 fill-indigo-600' : 'text-gray-400 hover:text-indigo-600'}`} />
                          </Button>
                          
                          {/* Edit/Delete buttons for author */}
                          {isAuthor && (
                            <div className="flex ml-2">
                              <Button 
                                variant="outline" 
                                onClick={() => navigate(`/edit/${exercise.id}`)}
                                className="rounded-lg text-indigo-700 border-indigo-200"
                                size="sm"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => deleteContent(exercise.id)}
                                className="rounded-lg text-red-600 border-red-200 ml-2"
                                size="sm"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Main Category Tags - Subject, Class Level, and Difficulty */}
                      <div className="flex flex-wrap gap-2">
                        {/* Subject Badge */}
                        {exercise.subject && (
                          <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md text-sm font-medium">
                            {exercise.subject.name}
                          </span>
                        )}
                        
                        {/* Class Level Badges */}
                        {exercise.class_levels && exercise.class_levels.map((tag) => (
                          <span
                            key={tag.id}
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-sm font-medium flex items-center"
                          >
                            <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                            {tag.name}
                          </span>
                        ))}
                        
                        {/* Difficulty Badge */}
                        <span 
                          className={`bg-gradient-to-r ${getDifficultyColor(exercise.difficulty)} px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1.5`}
                        >
                          {getDifficultyIcon(exercise.difficulty)}
                          <span>{getDifficultyLabel(exercise.difficulty)}</span>
                        </span>
                      </div>

                      {/* New Tag Section - All Categories with Heading and Organization */}
                      {(hasSubfields || hasChapters || hasTheorems) && (
                        <div className="mt-2 pb-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5" />
                              Tags
                            </h3>
                            {(hasSubfields && exercise.subfields.length > 3) || 
                             (hasChapters && exercise.chapters.length > 3) || 
                             (hasTheorems && exercise.theorems.length > 3) && (
                              <Button
                                variant="ghost"
                                onClick={() => setShowAllTags(!showAllTags)}
                                size="sm"
                                className="h-6 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-0"
                              >
                                {showAllTags ? 'Voir moins' : 'Voir tous'}
                              </Button>
                            )}
                          </div>
                          
                          {/* Tag Groups with Visual Separation and Better Organization */}
                          <div className="flex flex-col gap-2">
                            {/* Chapter Tags */}
                            {hasChapters && (
                              <div className="flex flex-wrap gap-1.5">
                                <span className="flex items-center text-xs text-gray-500 mr-1 whitespace-nowrap">
                                  <Tag className="w-3 h-3 mr-1 text-gray-400" />
                                  Chapitres:
                                </span>
                                {exercise.chapters
                                  .slice(0, showAllTags ? exercise.chapters.length : 3)
                                  .map((chapter) => (
                                    <span
                                      key={chapter.id}
                                      className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs flex items-center whitespace-nowrap border border-purple-100"
                                    >
                                      {chapter.name}
                                    </span>
                                  ))}
                                {!showAllTags && exercise.chapters.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{exercise.chapters.length - 3} autres
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Subfield Tags */}
                            {hasSubfields && (
                              <div className="flex flex-wrap gap-1.5">
                                <span className="flex items-center text-xs text-gray-500 mr-1 whitespace-nowrap">
                                  <Layers className="w-3 h-3 mr-1 text-gray-400" />
                                  Sous-domaines:
                                </span>
                                {exercise.subfields
                                  .slice(0, showAllTags ? exercise.subfields.length : 3)
                                  .map((subfield) => (
                                    <span
                                      key={subfield.id}
                                      className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center whitespace-nowrap border border-blue-100"
                                    >
                                      {subfield.name}
                                    </span>
                                  ))}
                                {!showAllTags && exercise.subfields.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{exercise.subfields.length - 3} autres
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Theorem Tags */}
                            {hasTheorems && (
                              <div className="flex flex-wrap gap-1.5">
                                <span className="flex items-center text-xs text-gray-500 mr-1 whitespace-nowrap">
                                  <BookMarked className="w-3 h-3 mr-1 text-gray-400" />
                                  Théorèmes:
                                </span>
                                {exercise.theorems
                                  .slice(0, showAllTags ? exercise.theorems.length : 3)
                                  .map((theorem) => (
                                    <span
                                      key={theorem.id}
                                      className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs flex items-center whitespace-nowrap border border-amber-100"
                                    >
                                      {theorem.name}
                                    </span>
                                  ))}
                                {!showAllTags && exercise.theorems.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{exercise.theorems.length - 3} autres
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Tab Navigation */}
                  <div className="border-t border-gray-100">
                    <div className="flex overflow-x-auto">
                      <TabButton 
                        active={activeSection === 'exercise'} 
                        onClick={() => setActiveSection('exercise')}
                        icon={<BookOpen className="w-4 h-4" />}
                        label="Exercice"
                      />
                      
                      <TabButton 
                        active={activeSection === 'discussions'} 
                        onClick={() => setActiveSection('discussions')}
                        icon={<MessageSquare className="w-4 h-4" />}
                        label="Discussions"
                        count={exercise.comments?.length}
                      />
                      
                      <TabButton 
                        active={activeSection === 'proposals'} 
                        onClick={() => setActiveSection('proposals')}
                        icon={<GitPullRequest className="w-4 h-4" />}
                        label="Solutions alternatives"
                      />
                      
                      <TabButton 
                        active={activeSection === 'activity'} 
                        onClick={() => setActiveSection('activity')}
                        icon={<Activity className="w-4 h-4" />}
                        label="Activité"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                  {activeSection === 'exercise' && (
                    <motion.div
                      key="exercise-content"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Exercise Content Card */}
                      <motion.div 
                        ref={contentInViewRef}
                        className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden mb-6"
                      >
                        <div className="p-6">
                          <div className="prose max-w-none text-gray-800 mb-6">
                            <TipTapRenderer content={exercise.content} />
                          </div>
                          
                          {/* Footer with votes, views, etc */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                              {/* Vote Buttons */}
                              <VoteButtons
                                initialVotes={exercise.vote_count}
                                onVote={(value) => handleVote(value, 'exercise')}
                                vertical={false}
                                userVote={exercise.user_vote}
                                size="sm"
                              />
                              
                              {/* Views count */}
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Eye className="w-4 h-4 text-gray-400" />
                                <span>{exercise.view_count} vues</span>
                              </span>
                            </div>
                            
                            {/* Print button */}
                            <Button
                              variant="outline"
                              onClick={handlePrint}
                              className="rounded text-sm h-8 px-3"
                              size="sm"
                            >
                              <Printer className="w-4 h-4 mr-1.5" />
                              Imprimer
                            </Button>
                          </div>
                        </div>
                      </motion.div>

                      {/* Solution Section */}
                      {hasSolution ? (
                        <motion.div
                          className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden mb-6"
                        >
                          <div 
                            className={`px-6 py-4 cursor-pointer ${solutionVisible ? 'bg-indigo-100' : 'bg-gray-100'} hover:bg-gray-200 border-gray-300 transition-colors `}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSolutionVisible(!solutionVisible);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${solutionVisible ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                                  <Lightbulb className={`w-5 h-5 ${solutionVisible ? 'text-indigo-600' : 'text-gray-600'}`} />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold">Solution</h3>
                                  <p className="text-sm text-gray-500">Cliquez pour {solutionVisible ? 'masquer' : 'afficher'} la solution</p>
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSolutionVisible(!solutionVisible);
                                }}
                                className="text-gray-500 hover:text-indigo-600 h-9 w-9 p-0 rounded-full"
                              >
                                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${solutionVisible ? "rotate-180" : ""}`} />
                              </Button>
                            </div>
                          </div>

                          <AnimatePresence>
                            {solutionVisible && exercise.solution && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                                  <div className="prose max-w-none text-gray-800">
                                    <TipTapRenderer content={exercise.solution.content} />
                                  </div>
                                  <div className="mt-4 flex items-center justify-between">
                                    <VoteButtons
                                      initialVotes={exercise.solution.vote_count}
                                      onVote={(value) => handleVote(value, 'solution')}
                                      vertical={false}
                                      userVote={exercise.solution.user_vote}
                                      size="sm"
                                    />
                                    
                                    {canEditSolution && (
                                      <div className="flex items-center gap-2">
                                        <Button 
                                          variant="outline" 
                                          onClick={() => navigate(`/solutions/${exercise.solution?.id}/edit`)}
                                          className="text-indigo-600 border-indigo-200 rounded h-8"
                                          size="sm"
                                        >
                                          <Edit className="w-3.5 h-3.5 mr-1" />
                                          Modifier
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          onClick={() => deleteSolution(exercise.solution?.id ?? '')}
                                          className="text-red-600 border-red-200 rounded h-8"
                                          size="sm"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                                          Supprimer
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ) : isAuthor ? (
                        /* Add Solution Section for Author */
                        <motion.div
                          className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6"
                        >
                          <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                              <div className="p-3 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100">
                                <PenSquare className="w-5 h-5 text-indigo-600" />
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold">Ajouter une solution</h3>
                                <p className="text-sm text-gray-500 mt-1">Partagez votre solution pour aider les autres</p>
                              </div>
                            </div>
                            
                            <DualPaneEditor 
                              content={solution} 
                              setContent={setSolution} 
                            />
                            
                            <div className="mt-6 flex justify-end">
                              <Button
                                onClick={() => handleAddSolution(solution)}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md rounded-full px-6 py-2.5 font-medium transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
                                disabled={!solution.trim()}
                              >
                                <Lightbulb className="w-4 h-4 mr-2" />
                                Publier la solution
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        /* No Solution Message for non-authors */
                        <motion.div
                          className="bg-white rounded-3xl shadow-md overflow-hidden mb-6"
                        >
                          <div className="px-6 py-6 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-amber-100">
                              <Lightbulb className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800">Aucune solution disponible</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                L'auteur n'a pas encore publié de solution pour cet exercice.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

            {/* Discussions Section - With animation */}
            {activeSection === 'discussions' && (
              <motion.div
                key="discussions-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden mb-6"
              >
                <div className="p-8" id="comments">
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

            {/* Other sections with animations */}
            {activeSection === 'proposals' && (
              <motion.div
                key="proposals-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden mb-6"
              >
                <div className="p-8 text-center py-20">
                  <GitPullRequest className="w-16 h-16 text-indigo-200 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Solutions alternatives</h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    Cette fonctionnalité sera bientôt disponible. Elle permettra aux utilisateurs de proposer leurs propres solutions à cet exercice.
                  </p>
                  <Button 
                    className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium rounded-full px-6"
                  >
                    Être notifié lorsque disponible
                  </Button>
                </div>
              </motion.div>
            )}
            
            {activeSection === 'activity' && (
              <motion.div
                key="activity-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden mb-6"
              >
                <div className="p-8 text-center py-20">
                  <Activity className="w-16 h-16 text-indigo-200 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Activité</h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    Le journal d'activité pour cet exercice sera bientôt disponible, montrant les votes, commentaires et autres interactions.
                  </p>
                  <Button 
                    className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium rounded-full px-6"
                  >
                    Explorer d'autres exercices
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Right Sidebar - Enhanced with better styling and animations */}
        {!fullscreenMode && (
                <div className="col-span-12 lg:col-span-3 transform translate-x-12">
                  <motion.div 
                    ref={sidebarInViewRef}
                    className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-28 divide-y divide-gray-100"
                  >
                    {/* Timer Section - Adjusted for narrower sidebar */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center text-sm">
                          <Timer className="w-4 h-4 mr-1.5" />
                          Chronomètre
                        </h3>
                        <div className="font-mono text-xl font-bold">{formatTime(timer)}</div>
                      </div>
                      <div className="flex gap-2">
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
                          Réinitialiser
                        </Button>
                      </div>
                    </div>
                    
                    {/* Status Buttons Section - Adjusted for narrower sidebar */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsUp className="w-4 h-4 text-indigo-600" />
                        <span className="font-medium text-gray-800 text-sm">Suivi de progression</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => markAsCompleted(true)} 
                          variant={completed === true ? "default" : "outline"} 
                          className={`flex-1 h-9 text-sm ${
                            completed === true 
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                              : 'border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5" />
                          Réussi
                        </Button>
                        <Button 
                          onClick={() => markAsCompleted(false)} 
                          variant={completed === false ? "default" : "outline"} 
                          className={`flex-1 h-9 text-sm ${
                            completed === false 
                              ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                              : 'border-gray-200 hover:border-rose-300 hover:text-rose-600'
                          }`}
                        >
                          <XCircle className="w-4 h-4 mr-1.5" />
                          À revoir
                        </Button>
                      </div>
                    </div>
                    
                    {/* Difficulty Rating - Adjusted for narrower sidebar */}
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
                    
                    {/* Exercise Statistics - Adjusted for narrower sidebar */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-800 text-sm mb-2">Statistiques</h3>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Vues</span>
                          <span className="font-medium">{exercise.view_count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Votes</span>
                          <span className="font-medium">{exercise.vote_count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Commentaires</span>
                          <span className="font-medium">{exercise.comments?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Related Exercises Section - Adjusted for narrower sidebar */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-800 text-sm flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          Exercices similaires
                        </h3>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-indigo-600 h-6 p-0 text-xs hover:bg-transparent hover:text-indigo-800"
                        >
                          Voir plus
                        </Button>
                      </div>
                      
                      {/* Example related exercise cards - more compact */}
                      <div className="space-y-2">
                        <RelatedExerciseCard 
                          title="Probabilités conditionnelles avancées"
                          subject="Mathématiques"
                          difficulty="easy"
                        />
                        <RelatedExerciseCard 
                          title="Loi binomiale et applications"
                          subject="Mathématiques"
                          difficulty="medium"
                        />
                        <RelatedExerciseCard 
                          title="Géométrie dans l'espace"
                          subject="Mathématiques"
                          difficulty="hard"
                        />
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Tab Button Component
function TabButton({ active, onClick, icon, label, count }: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
        active 
          ? 'border-indigo-600 text-indigo-700 bg-indigo-50 font-medium' 
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
          active ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-200 text-gray-700'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// Related Exercise Card Component - More compact for narrower sidebar
function RelatedExerciseCard({ 
  title, 
  subject, 
  difficulty 
}: { 
  title: string; 
  subject: string; 
  difficulty: Difficulty;
}) {
  const getDifficultyColor = (diff: Difficulty): string => {
    switch (diff) {
      case 'easy': return 'bg-emerald-100 text-emerald-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'hard': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getDifficultyLabel = (diff: Difficulty): string => {
    switch (diff) {
      case 'easy': return 'Facile';
      case 'medium': return 'Moyen';
      case 'hard': return 'Difficile';
      default: return diff;
    }
  };
  
  return (
    <div className="group p-2 rounded-lg border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer">
      <h4 className="font-medium text-gray-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">{title}</h4>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded">{subject}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${getDifficultyColor(difficulty)}`}>
          {getDifficultyLabel(difficulty)}
        </span>
      </div>
    </div>
  );
}

