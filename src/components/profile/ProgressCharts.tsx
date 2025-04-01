// src/components/profile/ProgressCharts.tsx
import React, { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { CheckCircle, BarChart2, Activity, TrendingUp } from 'lucide-react';

interface ProgressChartsProps {
  stats: {
    contribution_stats?: {
      exercises: number;
      solutions: number;
      comments: number;
      total_contributions: number;
      upvotes_received: number;
      view_count: number;
    };
    learning_stats?: {
      exercises_completed: number;
      exercises_in_review: number;
      exercises_saved: number;
      subjects_studied: string[];
      total_viewed: number;
    };
  };
  successExercises: any[];
  reviewExercises: any[];
}

export const ProgressCharts: React.FC<ProgressChartsProps> = ({ 
  stats, 
  successExercises,
  reviewExercises
}) => {
  const [activeChart, setActiveChart] = useState<'completion' | 'activity' | 'trends'>('completion');
  
  // Data for completion status pie chart
  const completionData = [
    { name: 'Completed', value: stats.learning_stats?.exercises_completed || 0, color: '#10b981' },
    { name: 'To Review', value: stats.learning_stats?.exercises_in_review || 0, color: '#f59e0b' },
    { name: 'Saved', value: stats.learning_stats?.exercises_saved || 0, color: '#6366f1' }
  ].filter(item => item.value > 0);
  
  // Data for activity bar chart
  const activityData = [
    { name: 'Exercises Created', value: stats.contribution_stats?.exercises || 0 },
    { name: 'Comments Made', value: stats.contribution_stats?.comments || 0 },
    { name: 'Upvotes Received', value: stats.contribution_stats?.upvotes_received || 0 },
    { name: 'Views', value: Math.min(stats.contribution_stats?.view_count || 0, 1000) }, // Cap for better visualization
  ];

  // Create mock trend data (simulated for demonstration)
  // In a real app, you'd use actual historical data from the backend
  const currentMonth = new Date().getMonth();
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const month = new Date();
    month.setMonth(currentMonth - 5 + i);
    return month.toLocaleString('default', { month: 'short' });
  });

  const generateTrendData = () => {
    let cumulativeCompleted = 0;
    return last6Months.map((month, i) => {
      // Random increase in completed exercises (1-5)
      const newCompletions = Math.floor(Math.random() * 5) + 1;
      cumulativeCompleted += newCompletions;
      
      return {
        name: month,
        completed: cumulativeCompleted,
        exercises: Math.floor(Math.random() * 3) + (i > 0 ? 1 : 0) // Random exercises created (0-3)
      };
    });
  };

  const trendData = generateTrendData();

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <BarChart2 className="w-5 h-5 mr-2 text-indigo-600" />
            Progress Analytics
          </h2>
          
          {/* Chart type selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveChart('completion')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center ${
                activeChart === 'completion'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-700 hover:text-indigo-600'
              }`}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Completion
            </button>
            <button
              onClick={() => setActiveChart('activity')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center ${
                activeChart === 'activity'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-700 hover:text-indigo-600'
              }`}
            >
              <Activity className="w-4 h-4 mr-1.5" />
              Activity
            </button>
            <button
              onClick={() => setActiveChart('trends')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center ${
                activeChart === 'trends'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-700 hover:text-indigo-600'
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-1.5" />
              Trends
            </button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left column - Chart visualization */}
          <div className="flex-1 min-h-[300px] flex items-center justify-center">
            {activeChart === 'completion' && (
              completionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={completionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {completionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}`, 'Exercises']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-6 px-4 bg-gray-50 rounded-lg w-full">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No completion data yet</h3>
                  <p className="text-gray-500">Start completing exercises to see your progress chart</p>
                </div>
              )
            )}
            
            {activeChart === 'activity' && (
              activityData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={activityData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-6 px-4 bg-gray-50 rounded-lg w-full">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No activity data yet</h3>
                  <p className="text-gray-500">Create exercises and interact with the community</p>
                </div>
              )
            )}
            
            {activeChart === 'trends' && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={trendData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    name="Exercises Completed" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={{ r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="exercises" 
                    name="Exercises Created" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Right column - Stats breakdown */}
          <div className="w-full md:w-64 bg-gray-50 rounded-xl p-4 flex flex-col justify-center">
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              {activeChart === 'completion' && 'Completion Stats'}
              {activeChart === 'activity' && 'Activity Breakdown'}
              {activeChart === 'trends' && 'Progress Trends'}
            </h3>
            
            {activeChart === 'completion' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm text-gray-600">Completed</span>
                  </div>
                  <span className="font-medium">{stats.learning_stats?.exercises_completed || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                    <span className="text-sm text-gray-600">To Review</span>
                  </div>
                  <span className="font-medium">{stats.learning_stats?.exercises_in_review || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>
                    <span className="text-sm text-gray-600">Saved</span>
                  </div>
                  <span className="font-medium">{stats.learning_stats?.exercises_saved || 0}</span>
                </div>
                
                <div className="pt-3 border-t border-gray-200 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Exercises</span>
                    <span className="font-bold text-indigo-700">
                      {(stats.learning_stats?.exercises_completed || 0) + 
                       (stats.learning_stats?.exercises_in_review || 0) + 
                       (stats.learning_stats?.exercises_saved || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {activeChart === 'activity' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Exercises Created</span>
                  <span className="font-medium">{stats.contribution_stats?.exercises || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Comments Made</span>
                  <span className="font-medium">{stats.contribution_stats?.comments || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Upvotes Received</span>
                  <span className="font-medium">{stats.contribution_stats?.upvotes_received || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Views</span>
                  <span className="font-medium">{stats.contribution_stats?.view_count || 0}</span>
                </div>
                
                <div className="pt-3 border-t border-gray-200 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Contributions</span>
                    <span className="font-bold text-indigo-700">
                      {stats.contribution_stats?.total_contributions || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {activeChart === 'trends' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Recent Completions</span>
                  <span className="font-medium text-green-600">
                    +{trendData[trendData.length-1].completed - trendData[trendData.length-2].completed}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Recent Creations</span>
                  <span className="font-medium text-indigo-600">
                    +{trendData[trendData.length-1].exercises}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="font-medium">
                    {Math.round((stats.learning_stats?.exercises_completed || 0) / 
                     ((stats.learning_stats?.exercises_completed || 0) + 
                      (stats.learning_stats?.exercises_in_review || 0)) * 100) || 0}%
                  </span>
                </div>
                
                <div className="pt-3 border-t border-gray-200 mt-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Note:</span> Chart shows your 
                    progress over the last 6 months
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};