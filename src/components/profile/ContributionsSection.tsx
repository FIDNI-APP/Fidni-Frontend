// src/components/profile/ContributionsSection.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Content } from '@/types';
import { FileText, Eye, MessageSquare, Calendar, BarChart3, ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContributionsSectionProps {
  success_exercises: {
    exercises: Content[];
  },
  review_exercises: {
    exercises: Content[];
  },
  isLoading: boolean
}

export const ContributionsSection: React.FC<ContributionsSectionProps> = ({ 
  success_exercises,
  review_exercises,
  isLoading 
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 h-24 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const allContributions = [...success_exercises.exercises, ...review_exercises.exercises];

  if (allContributions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <FileText className="w-5 h-5 mr-2 text-indigo-600" />
            My Contributions
          </h2>
        </div>
        <div className="text-center py-10 px-6">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No contributions yet</h3>
          <p className="text-gray-500 mb-6">Start creating exercises to contribute to the community</p>
          <Link to="/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Create New Exercise
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <FileText className="w-5 h-5 mr-2 text-indigo-600" />
            My Contributions
          </h2>
          <Link to="/new" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
            Create New
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {allContributions.slice(0, 6).map((exercise) => (
            <Link 
              to={`/exercises/${exercise.id}`} 
              key={exercise.id}
              className="block bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-indigo-300 rounded-lg p-4 transition-all hover:shadow-md"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{exercise.title}</h3>
                  
                  <div className="flex flex-wrap gap-1 items-center mt-1 text-sm text-gray-500">
                    <time dateTime={exercise.created_at} className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                      {new Date(exercise.created_at).toLocaleDateString()}
                    </time>
                    
                    <span className="mx-1">•</span>
                    
                    <span className="flex items-center">
                      <Eye className="w-3.5 h-3.5 mr-1 text-gray-400" />
                      {exercise.view_count}
                    </span>
                    
                    <span className="mx-1">•</span>
                    
                    <span className="flex items-center">
                      <MessageSquare className="w-3.5 h-3.5 mr-1 text-gray-400" />
                      {(exercise.comments || []).length}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {exercise.subject && (
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs flex items-center">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {exercise.subject.name}
                      </span>
                    )}
                    
                    <span className={`px-2 py-0.5 rounded text-xs flex items-center 
                      ${exercise.difficulty === 'easy' 
                        ? 'bg-green-50 text-green-700' 
                        : exercise.difficulty === 'medium' 
                          ? 'bg-yellow-50 text-yellow-700' 
                          : 'bg-red-50 text-red-700'}`}
                    >
                      <BarChart3 className="w-3 h-3 mr-1" />
                      {exercise.difficulty}
                    </span>
                  </div>
                </div>
                
                <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full flex items-center ml-2">
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {allContributions.length > 6 && (
          <div className="mt-6 text-center">
            <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              View All Contributions ({allContributions.length})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};