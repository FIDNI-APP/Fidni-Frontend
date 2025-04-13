import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  GraduationCap, 
  Tag, 
  Edit, 
  Printer, 
  Share2, 
  Eye, 
  MessageSquare, 
  BookMarked,
  Sparkles,
  Calendar,
  User,
  ArrowLeft,
  BarChart3,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getLessonById, voteLesson, addComment, voteComment } from '@/lib/api';
import { Lesson, Comment, VoteValue } from '@/types';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { VoteButtons } from '@/components/VoteButtons';
import { CommentSection } from '@/components/CommentSection';
import { LessonTabNavigation } from '@/components/lesson/LessonTabNavigation';
import { ActivityEmptyState } from '@/components/exercise/EmptyStates';
import AddToNotebookButton from '@/components/lesson/AddToNotebookButton';

import { formatDate } from '@/lib/utils';
import '@/lib/styles.css';

export function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'lesson' | 'discussions' | 'activity'>('lesson');
  const [completed, setCompleted] = useState<'success' | 'review' | null>(null);
  const [savedForLater, setSavedForLater] = useState<boolean>(false);
  const [loadingStates, setLoadingStates] = useState({
    progress: false,
    save: false
  });
  const [showPrint, setShowPrint] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchLesson(id);
    }
  }, [id]);

  const fetchLesson = async (lessonId: string) => {
    try {
      setLoading(true);
      const data = await getLessonById(lessonId);
      setLesson(data);
      
      // Set user-specific states if authenticated
      if (isAuthenticated && data.user_complete) {
        setCompleted(data.user_complete);
      }
      if (isAuthenticated && data.user_save) {
        setSavedForLater(data.user_save);
      }
    } catch (err) {
      console.error('Failed to fetch lesson:', err);
      setError('Failed to load the lesson. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (value: VoteValue) => {
    if (!lesson || !id) return;

    try {
      const updatedLesson = await voteLesson(id, value);
      setLesson(updatedLesson);
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleCommentVote = async (commentId: string, value: VoteValue) => {
    if (!lesson) return;

    try {
      const updatedComment = await voteComment(commentId, value);
      
      const updateComments = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return updatedComment;
          }
          if (comment.replies && comment.replies.length > 0) {
            return { ...comment, replies: updateComments(comment.replies) };
          }
          return comment;
        });
      };
      
      setLesson({
        ...lesson,
        comments: updateComments(lesson.comments)
      });
    } catch (err) {
      console.error('Failed to vote on comment:', err);
    }
  };

  const handleAddComment = async (content: string, parentId?: string) => {
    if (!lesson || !id) return;
  
    try {
      const newComment = await addComment(id, content, parentId);
      
      setLesson(prev => {
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

  // Implement progress tracking (Success/Review)
  const markAsCompleted = async (status: 'success' | 'review') => {
    if (!isAuthenticated || !id) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, progress: true }));
      
      if (completed === status) {
        // TODO: Implement API call to remove progress
        setCompleted(null);
      } else {
        // TODO: Implement API call to mark progress
        setCompleted(status);
      }
    } catch (err) {
      console.error('Failed to update progress:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, progress: false }));
    }
  };
  
  // Toggle saved status (Bookmark)
  const toggleSavedForLater = async () => {
    if (!isAuthenticated || !id) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, save: true }));
      
      if (savedForLater) {
        // TODO: Implement API call to unsave
        setSavedForLater(false);
      } else {
        // TODO: Implement API call to save
        setSavedForLater(true);
      }
    } catch (err) {
      console.error('Failed to update saved status:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, save: false }));
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: lesson?.title || 'Math Lesson',
        text: `Check out this math lesson: ${lesson?.title}`,
        url: window.location.href
      }).catch(err => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying link:', err));
    }
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => {
      window.print();
      setShowPrint(false);
    }, 300);
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
          <p className="mt-6 text-lg font-medium text-indigo-900">Loading lesson...</p>
          <div className="mt-2 flex items-center space-x-2">
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
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
                <h3 className="text-lg font-semibold">Lesson Unavailable</h3>
                <p className="mt-2 text-base">{error || 'Lesson not found. Please check the link or try again later.'}</p>
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <Button 
              onClick={() => navigate('/lessons')}
              className="group bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-full shadow-md px-8 py-3 text-lg font-medium transition-all duration-300 hover:shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
              Back to Lessons
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === lesson.author.id;
  const hasTheorems = lesson.theorems && lesson.theorems.length > 0;
  const hasChapters = lesson.chapters && lesson.chapters.length > 0;
  const hasSubfields = lesson.subfields && lesson.subfields.length > 0;


  // Print-only view
  if (showPrint) {
    return (
      <div className="hidden print:block">
        <div className="exercise-print-container">
          <div className="exercise-title">{lesson.title}</div>
          <div className="exercise-metadata">
            <p>
              Subject: {lesson.subject.name} | 
              Class Level: {lesson.class_levels.map(cl => cl.name).join(', ')} | 
              Author: {lesson.author.username} | 
              Date: {formatDate(lesson.created_at)}
            </p>
          </div>
          <div className="exercise-content tiptap-for-print">
            <TipTapRenderer content={lesson.content} />
          </div>
          <div className="print-footer">
            <p>Printed from Fidni - Educational Platform - {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      {/* Print-only view */}
      {showPrint && (
        <div className="hidden print:block">
          <div className="exercise-print-container">
            <div className="exercise-title">{lesson.title}</div>
            <div className="exercise-metadata">
              <p>
                Subject: {lesson.subject.name} | 
                Class Level: {lesson.class_levels.map(cl => cl.name).join(', ')} | 
                Author: {lesson.author.username} | 
                Date: {formatDate(lesson.created_at)}
              </p>
            </div>
            <div className="exercise-content tiptap-for-print">
              <TipTapRenderer content={lesson.content} />
            </div>
            <div className="print-footer">
              <p>Printed from Fidni - Educational Platform - {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Main content - hidden during print */}
      <div className="print:hidden">
        <div className="container mx-auto px-4 lg:px-6 relative">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white rounded-xl shadow-lg mb-6 relative">
            {/* Background Pattern */}
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
                  onClick={() => navigate(-1)}
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
                      <BookMarked className={`w-5 h-5 mr-1.5 ${savedForLater ? 'fill-white' : ''}`} />
                    )}
                    {savedForLater ? 'Enregistré' : 'Enregistrer'}
                  </Button>
                  
                  {/* Add to Notebook Button - AJOUTÉ ICI */}
                  {id && (
                    <AddToNotebookButton 
                      lessonId={id} 
                    />
                  )}
                  
                  {/* Share button */}
                  <Button 
                    onClick={handleShare}
                    variant="ghost"
                    className="rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <Share2 className="w-5 h-5 mr-1.5" />
                    Partager
                  </Button>
                  
                  {/* Edit button for author */}
                  {isAuthor && (
                    <Button 
                      onClick={() => navigate(`/edit-lesson/${lesson.id}`)}
                      variant="ghost"
                      className="rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                    >
                      <Edit className="w-5 h-5 mr-1.5" />
                      Modifier
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Lesson title and metadata */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                <div className="max-w-3xl">
                  <h1 className="text-3xl font-bold mb-3">{lesson.title}</h1>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1.5 text-indigo-300" />
                      <span className="text-indigo-100">{lesson.author.username}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1.5 text-indigo-300" />
                      <span className="text-indigo-100">{formatDate(lesson.created_at)}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-1.5 text-indigo-300" />
                      <span className="text-indigo-100">{lesson.view_count} vues</span>
                    </div>
                  </div>
                </div>
                
                {/* Main Category Tags in header */}
                <div className="flex flex-wrap gap-2">
                  {lesson.subject && (
                    <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
                      <BookOpen className="w-4 h-4 mr-1.5 text-indigo-300" />
                      {lesson.subject.name}
                    </span>
                  )}
                  
                  {lesson.class_levels && lesson.class_levels.length > 0 && (
                    <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
                      <GraduationCap className="w-4 h-4 mr-1.5 text-indigo-300" />
                      {lesson.class_levels[0].name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-800 via-indigo-800 to-indigo-900 text-white px-6 pb-2">
                <LessonTabNavigation
                  activeSection={activeSection}
                  setActiveSection={setActiveSection}
                  commentsCount={lesson.comments?.length || 0}
                />
              </div>
            
          
          {/* Main content grid */}
          <div className="w-full relative">
            <div className="flex flex-col lg:flex-row lg:gap-6">
              {/* Main Content Area */}
              <div className="flex-grow">
                <AnimatePresence mode="wait">
                  {activeSection === 'lesson' && (
                    <motion.div
                      key="lesson-content"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      {/* Lesson Content */}
                      <div className="bg-white rounded-xl shadow-md border border-gray-200  mb-6">
                        <div className="p-6">
                          {/* Tags section */}
                          {(hasChapters || hasTheorems ||hasSubfields) && (
                            <div className="bg-gray-50 -mx-6 -mt-6 px-6 py-4 mb-6 border-b border-gray-200">
                              <div className="flex flex-wrap gap-2">
                                {/* Chapter Tags */}
                                {hasChapters && (
                                  <div className="flex flex-wrap gap-1.5 mr-4">
                                    <span className="flex items-center text-xs text-gray-500 mr-1 whitespace-nowrap">
                                      <Tag className="w-3 h-3 mr-1 text-gray-400" />
                                      Chapitres:
                                    </span>
                                    {lesson.chapters.map((chapter) => (
                                      <span
                                        key={chapter.id}
                                        className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs flex items-center whitespace-nowrap border border-purple-100"
                                      >
                                        {chapter.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {/* Subfields Tags */}

                                {hasSubfields && (
                                  <div className="flex flex-wrap gap-1.5 mr-4">
                                    <span className="flex items-center text-xs text-gray-500 mr-1 whitespace-nowrap">
                                      <Tag className="w-3 h-3 mr-1 text-gray-400" />
                                      Domaines:
                                    </span>
                                    {lesson.subfields.map((subfield) => (
                                      <span
                                        key={subfield.id}
                                        className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs flex items-center whitespace-nowrap border border-purple-100"
                                      >
                                        {subfield.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Theorem Tags */}
                                {hasTheorems && (
                                  <div className="flex flex-wrap gap-1.5">
                                    <span className="flex items-center text-xs text-gray-500 mr-1 whitespace-nowrap">
                                      <BookMarked className="w-3 h-3 mr-1 text-gray-400" />
                                      Théorèmes:
                                    </span>
                                    {lesson.theorems.map((theorem) => (
                                      <span
                                        key={theorem.id}
                                        className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs flex items-center whitespace-nowrap border border-amber-100"
                                      >
                                        {theorem.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="prose max-w-none text-gray-800 mb-6">
                            <TipTapRenderer content={lesson.content} />
                          </div>
                          
                          {/* Footer with votes, progress tracking, etc */}
                          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-4">
                              {/* Vote Buttons */}
                              <VoteButtons
                                initialVotes={lesson.vote_count}
                                onVote={handleVote}
                                vertical={false}
                                userVote={lesson.user_vote}
                                size="sm"
                              />
                              
                              {/* Views count */}
                              <span className="flex items-center gap-1 text-sm text-gray-500">
                                <Eye className="w-4 h-4 text-gray-400" />
                                <span>{lesson.view_count} vues</span>
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
                          comments={lesson.comments || []}
                          onAddComment={handleAddComment}
                          onVoteComment={handleCommentVote}
                          onEditComment={async (commentId: string, content: string) => {
                            // TODO: Implement comment editing logic
                            return Promise.resolve();
                          }}
                          onDeleteComment={async (commentId: string) => Promise.resolve()} // TODO: Implement delete comment logic
                        />
                      </div>
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
              <div className="hidden lg:block lg:w-72 lg:flex-shrink-0 mt-6 lg:mt-0">
                <div 
                  className="lg:sticky lg:top-28"
                  style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}
                >
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden divide-y divide-gray-100">
                    {/* Exercise Statistics */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-800 text-sm mb-2">Statistiques</h3>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Vues</span>
                          <span className="font-medium">{lesson.view_count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Votes</span>
                          <span className="font-medium">{lesson.vote_count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Commentaires</span>
                          <span className="font-medium">{lesson.comments?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Related Lessons Section */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-800 text-sm flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          Leçons similaires
                        </h3>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-indigo-600 h-6 p-0 text-xs hover:bg-transparent hover:text-indigo-800"
                        >
                          Voir plus
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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