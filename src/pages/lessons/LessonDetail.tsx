import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getLessonById, voteLesson, addComment, voteComment, saveLesson, unsaveLesson } from '@/lib/api';
import { Lesson, Comment, VoteValue } from '@/types';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { CommentSection } from '@/components/CommentSection';
import { LessonHeader } from '@/components/lesson/LessonHeader';
import { ActivityEmptyState } from '@/components/exercise/EmptyStates';
import { LessonMainCard } from '@/components/lesson/LessonMainCard';
import { SEO, createLessonStructuredData, createBreadcrumbStructuredData } from '@/components/SEO';
import { usePageTimeTracker } from '@/hooks/usePageTimeTracker';
import { SimilarExercises } from '@/components/exercise/SimilarExercises';

import { formatDate } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/utils/dateHelpers';
import '@/lib/styles.css';

export function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize activeSection from URL or default to 'lesson'
  const [activeSection, setActiveSection] = useState<'lesson' | 'discussions' | 'activity'>(() => {
    const tab = searchParams.get('tab');
    return (tab === 'discussions' || tab === 'activity') ? tab : 'lesson';
  });
  const [completed, setCompleted] = useState<'success' | 'review' | null>(null);
  const [savedForLater, setSavedForLater] = useState<boolean>(false);
  const [loadingStates, setLoadingStates] = useState({
    progress: false,
    save: false
  });
  const [showPrint, setShowPrint] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Page time tracker - automatically tracks time spent on this page
  usePageTimeTracker({
    contentType: 'lesson',
    contentId: id,
    enabled: !!id  // Track as soon as we have an ID, don't wait for lesson to load
  });

  // Handler to change section and update URL
  const handleSectionChange = (newSection: 'lesson' | 'discussions' | 'activity') => {
    setActiveSection(newSection);
    setSearchParams({ tab: newSection });
  };

  // Sync section from URL changes (browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && (tabFromUrl === 'discussions' || tabFromUrl === 'activity' || tabFromUrl === 'lesson') && tabFromUrl !== activeSection) {
      setActiveSection(tabFromUrl as 'lesson' | 'discussions' | 'activity');
    }
  }, [searchParams]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      // Set user-specific states - data.user_save will be false if not authenticated
      if (data.user_complete) {
        setCompleted(data.user_complete);
      }
      // Always set savedForLater from the API response
      setSavedForLater(Boolean(data.user_save));
    } catch (err) {
      console.error('Failed to fetch lesson:', err);
      setError('Failed to load the lesson. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (value: VoteValue) => {
    if (!lesson || !id || value === 0) return;

    try {
      const updatedLesson = await voteLesson(id, value as 1 | -1);
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
      const newComment = await addComment('lesson', id, content, parentId || undefined);
      
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

  // Toggle saved status (Bookmark)
  const toggleSavedForLater = async () => {
    if (!isAuthenticated || !id) return;

    try {
      setLoadingStates(prev => ({ ...prev, save: true }));

      if (savedForLater) {
        // Unsave lesson
        await unsaveLesson(id);
        setSavedForLater(false);
      } else {
        // Save lesson
        await saveLesson(id);
        setSavedForLater(true);
      }
    } catch (err) {
      console.error('Failed to update saved status:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, save: false }));
    }
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => {
      window.print();
      setShowPrint(false);
    }, 300);
    setShowDropdown(false);
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

  // Generate structured data for SEO
  const lessonStructuredData = createLessonStructuredData(lesson);
  const breadcrumbData = createBreadcrumbStructuredData([
    { name: 'Accueil', url: '/' },
    { name: 'Leçons', url: '/lessons' },
    { name: lesson.title, url: `/lessons/${lesson.id}` },
  ]);

  // Combine structured data
  const combinedStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [lessonStructuredData, breadcrumbData],
  };

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
    <div className="min-h-screen bg-gray-50 pb-16">
      <SEO
        title={`${lesson.title} - Leçon de mathématiques`}
        description={lesson.content.substring(0, 160).replace(/<[^>]*>/g, '') || `Apprenez avec cette leçon de mathématiques: ${lesson.title}. Explications détaillées et exemples.`}
        keywords={[
          'leçon de mathématiques',
          'cours de maths',
          lesson.subject?.name || 'mathématiques',
          ...(lesson.class_levels?.map(level => level.name) || []),
          ...(lesson.chapters?.map(chapter => chapter.name) || []),
          'apprentissage',
          'théorie mathématique',
        ]}
        ogType="article"
        ogImage={`/og-lesson-${lesson.id}.jpg`}
        canonicalUrl={`/lessons/${lesson.id}`}
        structuredData={combinedStructuredData}
      />
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
          {/* Header with breadcrumbs, navigation, and tabs */}
          <LessonHeader
            lesson={lesson}
            lessonId={id || ''}
            savedForLater={savedForLater}
            loadingStates={loadingStates}
            toggleSavedForLater={toggleSavedForLater}
            formatTimeAgo={formatTimeAgo}
            isAuthor={isAuthor}
            onPrint={handlePrint}
            activeTab={activeSection}
            onTabChange={handleSectionChange}
          />
            
          
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
                      {/* Unified container matching ExerciseDetail */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-8">
                        <LessonMainCard
                          lesson={lesson}
                          handleVote={handleVote}
                          formatTimeAgo={formatTimeAgo}
                        />
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

                {/* Similar content */}
                <SimilarExercises contentId={lesson.id.toString()} contentType="lesson" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS for Enhanced UI */}
      <style>
        {`
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
        `}
      </style>
    </div>
  );
}