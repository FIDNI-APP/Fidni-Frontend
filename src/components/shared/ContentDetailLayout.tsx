/**
 * Unified Content Detail Layout
 *
 * Shared layout component for all content detail pages (exercises, exams, lessons).
 * Provides consistent structure and eliminates duplicate layout code.
 */

import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Share2, Printer, Bookmark, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoteButtons } from '@/components/VoteButtons';
import { handleShare } from '@/lib/utils/shareHelpers';
import { formatTimeAgo } from '@/lib/utils/dateHelpers';
import { getDifficultyInfo } from '@/lib/utils/difficultyHelpers';
import type { VoteValue, Difficulty } from '@/types';

interface ContentDetailLayoutProps {
  // Content data
  title: string;
  contentType: 'exercise' | 'exam' | 'lesson';
  difficulty?: Difficulty;
  author?: {
    id: string;
    username: string;
    profile_picture?: string;
  };
  createdAt?: string;
  viewCount?: number;
  voteScore?: number;
  userVote?: VoteValue;

  // User interaction states
  completed?: 'success' | 'review' | null;
  savedForLater?: boolean;
  loadingStates?: {
    progress?: boolean;
    save?: boolean;
  };

  // Handlers
  onVote?: (value: VoteValue) => void;
  onMarkCompleted?: (status: 'success' | 'review') => void;
  onToggleSaved?: () => void;
  onPrint?: () => void;
  onBack?: () => void;

  // Content sections
  header?: ReactNode; // Custom header content
  sidebar?: ReactNode; // Right sidebar content
  children: ReactNode; // Main content area
  footer?: ReactNode; // Footer content

  // Layout options
  showBackButton?: boolean;
  showPrintButton?: boolean;
  showShareButton?: boolean;
  showSaveButton?: boolean;
  showProgressButtons?: boolean;
  fullWidth?: boolean; // No sidebar
}

export function ContentDetailLayout({
  title,
  contentType,
  difficulty,
  author,
  createdAt,
  viewCount,
  voteScore,
  userVote,
  completed,
  savedForLater,
  loadingStates = {},
  onVote,
  onMarkCompleted,
  onToggleSaved,
  onPrint,
  onBack,
  header,
  sidebar,
  children,
  footer,
  showBackButton = true,
  showPrintButton = true,
  showShareButton = true,
  showSaveButton = true,
  showProgressButtons = true,
  fullWidth = false,
}: ContentDetailLayoutProps) {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleShareClick = () => {
    handleShare(title, window.location.href);
  };

  const difficultyInfo = difficulty ? getDifficultyInfo(difficulty) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className={`container mx-auto px-4 py-6 ${fullWidth ? 'max-w-4xl' : 'max-w-7xl'}`}>
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button variant="outline" size="sm" onClick={handleBackClick}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showShareButton && (
              <Button variant="outline" size="sm" onClick={handleShareClick}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            )}
            {showPrintButton && onPrint && (
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
            {showSaveButton && onToggleSaved && (
              <Button
                variant={savedForLater ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleSaved}
                disabled={loadingStates.save}
              >
                <Bookmark className={`w-4 h-4 mr-2 ${savedForLater ? 'fill-current' : ''}`} />
                {savedForLater ? 'Saved' : 'Save'}
              </Button>
            )}
          </div>
        </div>

        {/* Custom Header (if provided) */}
        {header}

        {/* Main Content Grid */}
        <div className={`grid gap-6 ${fullWidth ? 'grid-cols-1' : 'lg:grid-cols-3'}`}>
          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={fullWidth ? 'col-span-1' : 'lg:col-span-2'}
          >
            <div className="bg-white rounded-xl shadow-lg p-8">
              {/* Title and Metadata */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  {difficultyInfo && (
                    <span className={`px-3 py-1 rounded-full font-medium ${difficultyInfo.fullColor}`}>
                      {difficultyInfo.label}
                    </span>
                  )}

                  {author && (
                    <span className="flex items-center gap-2">
                      {author.profile_picture && (
                        <img
                          src={author.profile_picture}
                          alt={author.username}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      {author.username}
                    </span>
                  )}

                  {createdAt && <span>{formatTimeAgo(createdAt)}</span>}

                  {viewCount !== undefined && <span>{viewCount} views</span>}
                </div>
              </div>

              {/* Voting */}
              {onVote && (
                <div className="mb-6 flex items-center gap-4">
                  <VoteButtons
                    voteScore={voteScore || 0}
                    userVote={userVote || 0}
                    onVote={onVote}
                  />
                </div>
              )}

              {/* Progress Buttons */}
              {showProgressButtons && onMarkCompleted && (
                <div className="mb-6 flex gap-3">
                  <Button
                    variant={completed === 'success' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onMarkCompleted('success')}
                    disabled={loadingStates.progress}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {completed === 'success' ? 'Completed' : 'Mark as Complete'}
                  </Button>
                  <Button
                    variant={completed === 'review' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onMarkCompleted('review')}
                    disabled={loadingStates.progress}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {completed === 'review' ? 'Needs Review' : 'Mark for Review'}
                  </Button>
                </div>
              )}

              {/* Main Content */}
              <div className="prose max-w-none">{children}</div>
            </div>

            {/* Footer (tabs, comments, etc.) */}
            {footer}
          </motion.div>

          {/* Sidebar */}
          {!fullWidth && sidebar && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              {sidebar}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
