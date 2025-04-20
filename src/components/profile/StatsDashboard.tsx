import React from 'react';
import { 
  Activity, BookOpen, ChevronUp, MessageSquare, Eye, 
  CheckCircle, XCircle, Bookmark, Brain, Award, TrendingUp 
} from 'lucide-react';

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
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white">
          <h2 className="text-xl font-semibold flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Contribution Statistics
          </h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard 
              icon={<BookOpen className="w-5 h-5 text-white" />}
              label="Exercises Created"
              value={contributionStats.exercises}
              bgColor="from-indigo-500 to-indigo-600"
              textColor="text-white"
            />
            
            <StatCard 
              icon={<MessageSquare className="w-5 h-5 text-white" />}
              label="Comments"
              value={contributionStats.comments}
              bgColor="from-purple-500 to-purple-600"
              textColor="text-white"
            />
            
            <StatCard 
              icon={<ChevronUp className="w-5 h-5 text-white" />}
              label="Upvotes Received"
              value={contributionStats.upvotes_received}
              bgColor="from-emerald-500 to-emerald-600"
              textColor="text-white"
            />
            
            <StatCard 
              icon={<Eye className="w-5 h-5 text-white" />}
              label="Total Views"
              value={contributionStats.view_count}
              bgColor="from-blue-500 to-blue-600"
              textColor="text-white"
            />
            
            <StatCard 
              icon={<Award className="w-5 h-5 text-white" />}
              label="Solutions Provided"
              value={contributionStats.solutions}
              bgColor="from-amber-500 to-amber-600"
              textColor="text-white"
            />
            
            <StatCard 
              icon={<Activity className="w-5 h-5 text-white" />}
              label="Total Contributions"
              value={contributionStats.total_contributions}
              bgColor="from-rose-500 to-rose-600"
              textColor="text-white"
            />
          </div>
        </div>
      </div>
      
      {/* Learning Stats - Only shown to profile owner */}
      {learningStats && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 text-white">
            <h2 className="text-xl font-semibold flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              Learning Progress
            </h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard 
                icon={<CheckCircle className="w-5 h-5 text-white" />}
                label="Completed Exercises"
                value={learningStats.exercises_completed}
                bgColor="from-green-500 to-green-600"
                textColor="text-white"
              />
              
              <StatCard 
                icon={<XCircle className="w-5 h-5 text-white" />}
                label="To Review"
                value={learningStats.exercises_in_review}
                bgColor="from-amber-500 to-amber-600"
                textColor="text-white"
              />
              
              <StatCard 
                icon={<Bookmark className="w-5 h-5 text-white" />}
                label="Saved Exercises"
                value={learningStats.exercises_saved}
                bgColor="from-indigo-500 to-indigo-600"
                textColor="text-white"
              />
              
              <StatCard 
                icon={<Eye className="w-5 h-5 text-white" />}
                label="Exercises Viewed"
                value={learningStats.total_viewed}
                bgColor="from-blue-500 to-blue-600"
                textColor="text-white"
              />
              
              <StatCard 
                icon={<TrendingUp className="w-5 h-5 text-white" />}
                label="Subjects Studied"
                value={learningStats.subjects_studied.length}
                bgColor="from-violet-500 to-violet-600"
                textColor="text-white"
              />
              
              <div className="col-span-3 bg-indigo-50 p-4 rounded-lg shadow-sm border border-indigo-100 hover:shadow-md transition-shadow">
                <h3 className="text-sm font-medium text-indigo-800 mb-2 flex items-center">
                  <BookOpen className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Subjects You're Studying
                </h3>
                <div className="flex flex-wrap gap-2">
                  {learningStats.subjects_studied.map((subject, index) => (
                    <span key={index} className="px-2 py-1 bg-white text-indigo-800 rounded-full text-xs font-medium border border-indigo-200 shadow-sm hover:-translate-y-1 transition-transform">
                      {subject}
                    </span>
                  ))}
                  {learningStats.subjects_studied.length === 0 && (
                    <span className="text-sm text-indigo-600">No subjects studied yet</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Progress bar showing overall completion rate */}
            <div className="mt-6">
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="font-medium text-gray-600">Overall Completion Rate</span>
                <span className="font-medium text-indigo-600">
                  {calculateCompletionRate(learningStats)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="h-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                  style={{ width: `${calculateCompletionRate(learningStats)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Based on exercises completed vs. in review
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to calculate completion rate
const calculateCompletionRate = (stats: any) => {
  const completed = stats.exercises_completed || 0;
  const reviewing = stats.exercises_in_review || 0;
  const total = completed + reviewing;
  
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

// Enhanced stat card with color gradient and animation
const StatCard = ({ 
  icon, 
  label, 
  value, 
  bgColor, 
  textColor 
}: { 
  icon: React.ReactNode, 
  label: string, 
  value: number,
  bgColor: string,
  textColor: string
}) => (
  <div className={`bg-gradient-to-br ${bgColor} rounded-lg shadow-md hover:shadow-lg transition-all p-5 hover:-translate-y-1 duration-300`}>
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ${textColor}`}>
        {icon}
      </div>
      <span className={`text-2xl font-bold ${textColor}`}>{value.toLocaleString()}</span>
    </div>
    <div className={`mt-2 ${textColor} text-sm font-medium`}>{label}</div>
  </div>
);

export default StatsDashboard;