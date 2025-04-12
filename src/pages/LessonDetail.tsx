import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
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
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getLessonById, voteLesson, voteComment } from '@/lib/api';
import { Lesson, Comment, VoteValue } from '@/types';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { VoteButtons } from '@/components/VoteButtons';
import { CommentSection } from '@/components/CommentSection';
import { formatDate } from '@/lib/utils';
import '@/lib/styles.css';

export function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrintView, setShowPrintView] = useState(false);

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
      // Only make API call for non-zero votes
      const updatedLesson = value !== 0 ? await voteLesson(id, value) : null;
      if (updatedLesson) {
        setLesson(updatedLesson);
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleCommentVote = async (commentId: string, value: VoteValue) => {
    if (!lesson) return;

    try {
      const updatedComment = await voteComment(commentId, value);
      
      // Update the comment in the lesson state
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
      // This should be replaced with the actual API call to add a comment
      const response = await fetch(`/api/lessons/${id}/comment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, parent: parentId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      
      const newComment = await response.json();
      
      // Update the comments in the lesson state
      if (parentId) {
        // Add as a reply
        const updateComments = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === parentId) {
              return { 
                ...comment, 
                replies: [...(comment.replies || []), newComment] 
              };
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
      } else {
        // Add as a top-level comment
        setLesson({
          ...lesson,
          comments: [...lesson.comments, newComment]
        });
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    // You could add a toast notification here
    alert('Link copied to clipboard!');
  };

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center pt-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-4xl mx-auto bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
          <p>{error || 'Lesson not found. Please try again later.'}</p>
          <button 
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            onClick={() => navigate('/lessons')}
          >
            Return to Lessons
          </button>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === lesson.author.id;

  // Print-friendly view (hidden until print is triggered)
  if (showPrintView) {
    return (
      <div className="print-only exercise-print-container">
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      {/* Back navigation */}
      <div className="max-w-5xl mx-auto px-4 mb-6">
        <button 
          onClick={() => navigate('/lessons')}
          className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span>Back to Lessons</span>
        </button>
      </div>
      
      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4">
        {/* Lesson Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-xl p-6 text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="smallGrid" width="12" height="12" patternUnits="userSpaceOnUse">
                  <path d="M 12 0 L 0 0 0 12" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#smallGrid)" />
            </svg>
          </div>
          
          <div className="relative z-10">
            {/* Title with Lesson Icon */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">{lesson.title}</h1>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm">
                  <div className="flex items-center text-indigo-100">
                    <BookOpen className="w-4 h-4 mr-1" />
                    <span>{lesson.subject.name}</span>
                  </div>
                  <div className="flex items-center text-indigo-100">
                    <GraduationCap className="w-4 h-4 mr-1" />
                    <span>{lesson.class_levels.map(level => level.name).join(', ')}</span>
                  </div>
                  <div className="flex items-center text-indigo-100">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{formatDate(lesson.created_at)}</span>
                  </div>
                  <div className="flex items-center text-indigo-100">
                    <User className="w-4 h-4 mr-1" />
                    <span>{lesson.author.username}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Chapter and Theorem Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              {lesson.chapters && lesson.chapters.map(chapter => (
                <div 
                  key={chapter.id}
                  className="flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs"
                >
                  <Tag className="w-3 h-3 mr-1" />
                  <span>{chapter.name}</span>
                </div>
              ))}
              
              {lesson.theorems && lesson.theorems.map(theorem => (
                <div 
                  key={theorem.id}
                  className="flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs"
                >
                  <BookMarked className="w-3 h-3 mr-1" />
                  <span>{theorem.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Action Bar */}
        <div className="bg-white border-b border-gray-200 p-4 flex flex-wrap items-center justify-between gap-y-3">
          <div className="flex items-center gap-2">
            <VoteButtons 
              initialVotes={lesson.vote_count} 
              onVote={handleVote}
              userVote={lesson.user_vote}
              vertical={false}
            />
            
            <div className="flex items-center text-gray-500 text-sm">
              <Eye className="w-4 h-4 mr-1" />
              <span>{lesson.view_count} views</span>
            </div>
            
            <div className="flex items-center text-gray-500 text-sm">
              <MessageSquare className="w-4 h-4 mr-1" />
              <span>{lesson.comments?.length || 0} comments</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isAuthor && (
              <Button 
                onClick={() => navigate(`/edit-lesson/${lesson.id}`)}
                variant="outline"
                className="flex items-center"
                size="sm"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
            
            <Button 
              onClick={handlePrint}
              variant="outline"
              className="flex items-center"
              size="sm"
            >
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
            
            <Button 
              onClick={handleShare}
              variant="outline"
              className="flex items-center"
              size="sm"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
        
        {/* Lesson Content */}
        <div className="bg-white px-6 py-8 prose prose-indigo max-w-none">
          <TipTapRenderer content={lesson.content} />
        </div>
        
        {/* Comments Section */}
        <div className="mt-8 bg-white rounded-b-xl p-6 shadow-sm">
          <CommentSection 
            comments={lesson.comments || []}
            onAddComment={handleAddComment}
            onVoteComment={handleCommentVote}
            onEditComment={() => {}} // This would need to be implemented
            onDeleteComment={() => {}} // This would need to be implemented
          />
        </div>
      </div>
    </div>
  );
}