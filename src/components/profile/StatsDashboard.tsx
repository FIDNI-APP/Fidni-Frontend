// src/components/profile/StatsDashboard.tsx
import React from 'react';
import { Activity, BookOpen, ChevronUp, MessageSquare, Eye, CheckCircle, XCircle, Bookmark } from 'lucide-react';

interface StatsDashboardProps {
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
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ 
  contributionStats, 
  learningStats 
}) => {
  return (
    <div className="space-y-6">
      {/* Contribution Stats */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-indigo-600" />
          Contribution Statistics
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard 
            icon={<BookOpen className="w-5 h-5 text-indigo-600" />}
            label="Exercises Created"
            value={contributionStats.exercises}
          />
          
          <StatCard 
            icon={<MessageSquare className="w-5 h-5 text-purple-600" />}
            label="Comments"
            value={contributionStats.comments}
          />
          
          <StatCard 
            icon={<ChevronUp className="w-5 h-5 text-green-600" />}
            label="Upvotes Received"
            value={contributionStats.upvotes_received}
          />
          
          <StatCard 
            icon={<Eye className="w-5 h-5 text-blue-600" />}
            label="Total Views"
            value={contributionStats.view_count}
          />
          
          <StatCard 
            icon={<Activity className="w-5 h-5 text-amber-600" />}
            label="Total Contributions"
            value={contributionStats.total_contributions}
          />
        </div>
      </div>
      
      {/* Learning Stats - Only shown to profile owner */}
      {learningStats && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
            Learning Progress
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard 
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              label="Completed Exercises"
              value={learningStats.exercises_completed}
            />
            
            <StatCard 
              icon={<XCircle className="w-5 h-5 text-red-600" />}
              label="Exercises to Review"
              value={learningStats.exercises_in_review}
            />
            
            <StatCard 
              icon={<Bookmark className="w-5 h-5 text-amber-600" />}
              label="Saved Exercises"
              value={learningStats.exercises_saved}
            />
            
            <StatCard 
              icon={<Eye className="w-5 h-5 text-blue-600" />}
              label="Exercises Viewed"
              value={learningStats.total_viewed}
            />
            
            <div className="col-span-2 bg-indigo-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-indigo-800 mb-2">
                Subjects Studied ({learningStats.subjects_studied.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {learningStats.subjects_studied.map((subject, index) => (
                  <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                    {subject}
                  </span>
                ))}
                {learningStats.subjects_studied.length === 0 && (
                  <span className="text-sm text-indigo-600">No subjects studied yet</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component
const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) => (
  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 transition-all hover:shadow-md">
    <div className="flex items-center mb-2">
      {icon}
      <span className="ml-2 text-sm font-medium text-gray-700">{label}</span>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
  </div>
);