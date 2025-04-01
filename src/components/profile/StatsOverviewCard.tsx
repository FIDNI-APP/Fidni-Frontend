// src/components/profile/StatsOverviewCard.tsx
import React from 'react';
import { Activity, BookOpen, ChevronUp, MessageSquare, Eye, CheckCircle, XCircle, Bookmark } from 'lucide-react';

interface StatsOverviewCardProps {
  contributionStats: {
    exercises: number;
    solutions: number;
    comments: number;
    total_contributions: number;
    upvotes_received: number;
    view_count: number;
  };
  learningStats?: {
    exercises_completed: number;
    exercises_in_review: number;
    exercises_saved: number;
    subjects_studied: string[];
    total_viewed: number;
  };
  isLoading: boolean;
}

export const StatsOverviewCard: React.FC<StatsOverviewCardProps> = ({ 
  contributionStats, 
  learningStats,
  isLoading 
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6 w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-indigo-600" />
          Stats Overview
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Contribution stats */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-2xl font-bold text-indigo-700">{contributionStats.exercises}</span>
            </div>
            <p className="text-sm text-indigo-900">Exercises Created</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-purple-700">{contributionStats.comments}</span>
            </div>
            <p className="text-sm text-purple-900">Comments</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <ChevronUp className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-blue-700">{contributionStats.upvotes_received}</span>
            </div>
            <p className="text-sm text-blue-900">Upvotes Received</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Eye className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold text-emerald-700">{contributionStats.view_count}</span>
            </div>
            <p className="text-sm text-emerald-900">Content Views</p>
          </div>

          {/* Learning stats - only shown if available */}
          {learningStats && (
            <>
              <div className="bg-gradient-to-br from-green-50 to-lime-50 rounded-xl p-4 border border-green-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-2xl font-bold text-green-700">{learningStats.exercises_completed}</span>
                </div>
                <p className="text-sm text-green-900">Exercises Completed</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-2xl font-bold text-amber-700">{learningStats.exercises_in_review}</span>
                </div>
                <p className="text-sm text-amber-900">To Review</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Bookmark className="w-5 h-5 text-yellow-600" />
                  </div>
                  <span className="text-2xl font-bold text-yellow-700">{learningStats.exercises_saved}</span>
                </div>
                <p className="text-sm text-yellow-900">Saved Exercises</p>
              </div>

              <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-4 border border-rose-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                    <Activity className="w-5 h-5 text-rose-600" />
                  </div>
                  <span className="text-2xl font-bold text-rose-700">{learningStats.subjects_studied.length}</span>
                </div>
                <p className="text-sm text-rose-900">Subjects Studied</p>
              </div>
            </>
          )}
        </div>

        {learningStats && learningStats.subjects_studied.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-slate-100">
            <h3 className="font-medium text-gray-700 mb-3">Subjects Studied</h3>
            <div className="flex flex-wrap gap-2">
              {learningStats.subjects_studied.map((subject, index) => (
                <span 
                  key={index}
                  className="bg-white text-indigo-700 px-3 py-1 rounded-full text-sm border border-indigo-100 shadow-sm"
                >
                  {subject}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
