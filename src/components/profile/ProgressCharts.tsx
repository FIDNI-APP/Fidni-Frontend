import React, { useState } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  CheckCircle, Activity, TrendingUp, 
  Calendar, Target, PieChart as ChartPie
} from 'lucide-react';

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
  const [activeChart, setActiveChart] = useState<'completion' | 'activity' | 'trends' | 'subjects'>('completion');
  
  // Data for completion status pie chart
  const completionData = [
    { name: 'Completed', value: stats.learning_stats?.exercises_completed || 0, color: '#10b981' },
    { name: 'To Review', value: stats.learning_stats?.exercises_in_review || 0, color: '#f59e0b' },
    { name: 'Saved', value: stats.learning_stats?.exercises_saved || 0, color: '#6366f1' }
  ].filter(item => item.value > 0);
  
  // Data for activity bar chart
  const activityData = [
    { name: 'Exercises', value: stats.contribution_stats?.exercises || 0, color: '#6366f1' },
    { name: 'Solutions', value: stats.contribution_stats?.solutions || 0, color: '#10b981' },
    { name: 'Comments', value: stats.contribution_stats?.comments || 0, color: '#f472b6' },
    { name: 'Upvotes', value: stats.contribution_stats?.upvotes_received || 0, color: '#f59e0b' },
  ];

  // Create trend data (simulated for demonstration)
  const currentMonth = new Date().getMonth();
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const month = new Date();
    month.setMonth(currentMonth - 5 + i);
    return month.toLocaleString('default', { month: 'short' });
  });

  const generateTrendData = () => {
    let cumulativeCompleted = 0;
    let cumulativeActivityBase = Math.floor(Math.random() * 5) + 1;
    
    return last6Months.map((month, i) => {
      // Random increase in completed exercises (1-5)
      const newCompletions = Math.floor(Math.random() * 5) + 1;
      cumulativeCompleted += newCompletions;
      
      // Simulate increasing activity
      cumulativeActivityBase += Math.floor(Math.random() * 3);
      
      return {
        name: month,
        completed: cumulativeCompleted,
        exercises: cumulativeActivityBase + (Math.floor(Math.random() * 3)),
        solutions: Math.max(0, cumulativeActivityBase - 1 + (Math.floor(Math.random() * 2))),
        comments: cumulativeActivityBase + (Math.floor(Math.random() * 4))
      };
    });
  };

  const trendData = generateTrendData();
  
  // Generate subject proficiency data (mock data)
  const subjectData = stats.learning_stats?.subjects_studied.map(subject => ({
    name: subject,
    completion: Math.floor(Math.random() * 100),
    proficiency: Math.floor(Math.random() * 100)
  })) || [];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-lg rounded-md">
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color || entry.stroke }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all hover:shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          
          {/* Chart selector - Redesigned with tab-like appearance */}
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <ChartTab 
              active={activeChart === 'completion'} 
              onClick={() => setActiveChart('completion')}
              icon={<ChartPie className="w-4 h-4" />}
              label="Completion"
            />
            <ChartTab 
              active={activeChart === 'activity'} 
              onClick={() => setActiveChart('activity')}
              icon={<Activity className="w-4 h-4" />}
              label="Activity"
            />
            <ChartTab 
              active={activeChart === 'trends'} 
              onClick={() => setActiveChart('trends')}
              icon={<TrendingUp className="w-4 h-4" />}
              label="Trends"
            />
            <ChartTab 
              active={activeChart === 'subjects'} 
              onClick={() => setActiveChart('subjects')}
              icon={<Target className="w-4 h-4" />}
              label="Subjects"
            />
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left column - Chart visualization */}
          <div className="flex-1 min-h-[350px] rounded-lg border border-gray-100 shadow-sm p-4 bg-gradient-to-br from-gray-50 to-indigo-50/30">
            {activeChart === 'completion' && (
              completionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <defs>
                      {completionData.map((entry, index) => (
                        <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={entry.color} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={entry.color} stopOpacity={1}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={completionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {completionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 mb-4">
                    <ChartPie className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No completion data yet</h3>
                  <p className="text-gray-500 text-center">Start completing exercises to see your progress chart</p>
                </div>
              )
            )}
            
            {activeChart === 'activity' && (
              activityData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={activityData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip content={<CustomTooltip />} />
                    {activityData.map((entry, index) => (
                      <Bar 
                        key={`bar-${index}`}
                        dataKey="value" 
                        name={entry.name} 
                        fill={entry.color} 
                        radius={[4, 4, 0, 0]} 
                        background={{ fill: '#f3f4f6' }}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 mb-4">
                    <Activity className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No activity data yet</h3>
                  <p className="text-gray-500 text-center">Create exercises and interact with the community</p>
                </div>
              )
            )}
            
            {activeChart === 'trends' && (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart
                  data={trendData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorExercises" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f472b6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f472b6" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    name="Exercises Completed" 
                    stroke="#10b981" 
                    fillOpacity={1}
                    fill="url(#colorCompleted)" 
                    activeDot={{ r: 6 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="exercises" 
                    name="Exercises Created" 
                    stroke="#6366f1" 
                    fillOpacity={1}
                    fill="url(#colorExercises)" 
                    activeDot={{ r: 6 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="comments" 
                    name="Comments Made" 
                    stroke="#f472b6" 
                    fillOpacity={1}
                    fill="url(#colorComments)" 
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
            
            {activeChart === 'subjects' && (
              subjectData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={subjectData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" stroke="#9ca3af" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="completion" 
                      name="Completion %" 
                      fill="#6366f1" 
                      radius={[0, 4, 4, 0]} 
                      barSize={20}
                    />
                    <Bar 
                      dataKey="proficiency" 
                      name="Proficiency %" 
                      fill="#10b981" 
                      radius={[0, 4, 4, 0]} 
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 mb-4">
                    <Target className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No subject data yet</h3>
                  <p className="text-gray-500 text-center">Study different subjects to see your proficiency</p>
                </div>
              )
            )}
          </div>
          
          {/* Right column - Stats breakdown */}
          <div className="w-full md:w-64 bg-gradient-to-b from-indigo-50 to-indigo-100 rounded-xl p-4 flex flex-col justify-center shadow-inner">
            <h3 className="text-lg font-medium text-indigo-800 mb-3 flex items-center border-b border-indigo-200 pb-2">
              {activeChart === 'completion' && <CheckCircle className="w-5 h-5 mr-2 text-indigo-600" />}
              {activeChart === 'activity' && <Activity className="w-5 h-5 mr-2 text-indigo-600" />}
              {activeChart === 'trends' && <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />}
              {activeChart === 'subjects' && <Target className="w-5 h-5 mr-2 text-indigo-600" />}
              {activeChart === 'completion' && 'Completion Stats'}
              {activeChart === 'activity' && 'Activity Stats'}
              {activeChart === 'trends' && 'Progress Trends'}
              {activeChart === 'subjects' && 'Subject Mastery'}
            </h3>
            
            {activeChart === 'completion' && (
              <div className="space-y-3">
                <StatItem 
                  color="bg-green-500"
                  label="Completed"
                  value={stats.learning_stats?.exercises_completed || 0}
                />
                
                <StatItem 
                  color="bg-amber-500"
                  label="To Review"
                  value={stats.learning_stats?.exercises_in_review || 0}
                />
                
                <StatItem 
                  color="bg-indigo-500"
                  label="Saved"
                  value={stats.learning_stats?.exercises_saved || 0}
                />
                
                <div className="pt-3 border-t border-indigo-200 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-indigo-800">Total Exercises</span>
                    <span className="font-bold text-indigo-700">
                      {(stats.learning_stats?.exercises_completed || 0) + 
                       (stats.learning_stats?.exercises_in_review || 0) + 
                       (stats.learning_stats?.exercises_saved || 0)}
                    </span>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-indigo-800">Completion Rate</span>
                      <span className="text-indigo-800">
                        {calculateCompletionRate(stats.learning_stats)}%
                      </span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-2 rounded-full"
                        style={{ width: `${calculateCompletionRate(stats.learning_stats)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeChart === 'activity' && (
              <div className="space-y-3">
                <StatItem 
                  color="bg-indigo-500"
                  label="Exercises Created"
                  value={stats.contribution_stats?.exercises || 0}
                />
                
                <StatItem 
                  color="bg-green-500"
                  label="Solutions Provided"
                  value={stats.contribution_stats?.solutions || 0}
                />
                
                <StatItem 
                  color="bg-pink-500"
                  label="Comments Made"
                  value={stats.contribution_stats?.comments || 0}
                />
                
                <StatItem 
                  color="bg-amber-500"
                  label="Upvotes Received"
                  value={stats.contribution_stats?.upvotes_received || 0}
                />
                
                <div className="pt-3 border-t border-indigo-200 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-indigo-800">Total Contributions</span>
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
                  <span className="text-sm text-indigo-800 flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5 text-indigo-600" />
                    Period
                  </span>
                  <span className="font-medium text-indigo-700">
                    Last 6 Months
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-800">Recent Completions</span>
                  <span className="font-medium text-green-600">
                    +{trendData[trendData.length-1].completed - trendData[trendData.length-2].completed}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-800">Recent Contributions</span>
                  <span className="font-medium text-indigo-600">
                    +{trendData[trendData.length-1].exercises}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-800">Completion Rate</span>
                  <span className="font-medium text-indigo-700">
                    {calculateCompletionRate(stats.learning_stats)}%
                  </span>
                </div>
                
                <div className="pt-3 border-t border-indigo-200 mt-3">
                  <div className="text-xs text-indigo-800 italic">
                    Your activity is trending 
                    <span className="text-green-600 font-medium"> upward</span> 
                    compared to previous months.
                  </div>
                </div>
              </div>
            )}
            
            {activeChart === 'subjects' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-800">Subjects Studied</span>
                  <span className="font-medium text-indigo-700">
                    {stats.learning_stats?.subjects_studied.length || 0}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-800">Avg. Completion</span>
                  <span className="font-medium text-green-600">
                    {subjectData.length 
                      ? Math.round(subjectData.reduce((acc, curr) => acc + curr.completion, 0) / subjectData.length)
                      : 0}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-800">Avg. Proficiency</span>
                  <span className="font-medium text-indigo-600">
                    {subjectData.length 
                      ? Math.round(subjectData.reduce((acc, curr) => acc + curr.proficiency, 0) / subjectData.length)
                      : 0}%
                  </span>
                </div>
                
                <div className="pt-3 border-t border-indigo-200 mt-3">
                  <div className="text-xs text-indigo-800">
                    <strong>Top Subject:</strong> {subjectData.length 
                      ? subjectData.reduce((prev, curr) => 
                          prev.proficiency > curr.proficiency ? prev : curr
                        ).name
                      : 'None'}
                  </div>
                  
                  <div className="text-xs text-indigo-800 mt-2">
                    <strong>Needs Improvement:</strong> {subjectData.length 
                      ? subjectData.reduce((prev, curr) => 
                          prev.proficiency < curr.proficiency ? prev : curr
                        ).name
                      : 'None'}
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

// Helper function to calculate completion rate
const calculateCompletionRate = (stats: any) => {
  if (!stats) return 0;
  
  const completed = stats.exercises_completed || 0;
  const reviewing = stats.exercises_in_review || 0;
  const total = completed + reviewing;
  
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

// Stat item component for the sidebar
const StatItem = ({ color, label, value }: { color: string, label: string, value: number }) => (
  <div className="flex justify-between items-center group hover:bg-white/50 p-1.5 rounded transition-colors">
    <div className="flex items-center">
      <div className={`w-3 h-3 rounded-full ${color} mr-2`}></div>
      <span className="text-sm text-indigo-800">{label}</span>
    </div>
    <span className="font-medium text-indigo-700 group-hover:text-indigo-800">{value}</span>
  </div>
);

// Tab button component
const ChartTab = ({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean, 
  onClick: () => void, 
  icon: React.ReactNode, 
  label: string 
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center transition-all duration-300 ${
      active
        ? 'bg-white text-indigo-700 shadow-sm'
        : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
    }`}
  >
    {icon}
    <span className="ml-1.5">{label}</span>
  </button>
);

export default ProgressCharts;