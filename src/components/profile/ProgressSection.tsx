// src/components/profile/ProgressSection.tsx
import React, { useState } from 'react';
import { Content } from '@/types';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, BookOpen, BarChart3, ChevronRight, Users, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProgressSectionProps {
  successExercises: Content[];
  reviewExercises: Content[];
  isLoading: boolean;
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({ 
  successExercises, 
  reviewExercises, 
  isLoading 
}) => {
  const [activeTab, setActiveTab] = useState<'success' | 'review'>('success');
  
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

  if (successExercises.length === 0 && reviewExercises.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-emerald-600" />
            My Progress
          </h2>
        </div>
        <div className="text-center py-10 px-6">
          <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No tracked progress yet</h3>
          <p className="text-gray-500 mb-6">Start completing exercises to track your progress</p>
          <Link to="/exercises">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Browse Exercises
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const exercises = activeTab === 'success' ? successExercises : reviewExercises;
  const totalCount = successExercises.length + reviewExercises.length;
  const successPercentage = totalCount > 0 ? Math.round((successExercises.length / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-emerald-600" />
            My Progress
          </h2>
          
          {/* Progress summary indicators */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center bg-emerald-50 text-emerald-700 text-sm px-3 py-1 rounded-full">
              <CheckCircle className="w-4 h-4 mr-1.5" />
              {successExercises.length} Completed
            </div>
            <div className="hidden sm:flex items-center bg-amber-50 text-amber-700 text-sm px-3 py-1 rounded-full">
              <XCircle className="w-4 h-4 mr-1.5" />
              {reviewExercises.length} To Review
            </div>
          </div>
        </div>
        
        {/* Progress Visualization */}
        <div className="mb-6 bg-gray-100 p-4 rounded-lg">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Progress Overview</span>
            <span className="text-sm font-medium text-gray-800">{successExercises.length}/{totalCount} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full" 
              style={{ width: `${successPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{successPercentage}% complete</span>
            <span>{totalCount} total exercises</span>
          </div>
        </div>

        <div className="flex border-b border-gray-200 mb-4">
          <button
            className={`flex-1 py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'success'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('success')}
          >
            <div className="flex items-center justify-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Completed ({successExercises.length})
            </div>
          </button>
          <button
            className={`flex-1 py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'review'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('review')}
          >
            <div className="flex items-center justify-center">
              <XCircle className="w-4 h-4 mr-2" />
              To Review ({reviewExercises.length})
            </div>
          </button>
        </div>

        {exercises.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              No exercises {activeTab === 'success' ? 'completed' : 'to review'} yet
            </h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'success' 
                ? 'Mark exercises as completed to see them here' 
                : 'Mark exercises for review to see them here'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exercises.slice(0, 6).map((exercise) => (
              <Link 
                to={`/exercises/${exercise.id}`} 
                key={exercise.id}
                className="block bg-white border border-gray-200 hover:border-indigo-300 rounded-lg p-4 transition-all hover:shadow-md"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{exercise.title}</h3>
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
                      
                      <span className={`px-2 py-0.5 rounded text-xs flex items-center ${
                        activeTab === 'success' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {activeTab === 'success' 
                          ? <CheckCircle className="w-3 h-3 mr-1" /> 
                          : <XCircle className="w-3 h-3 mr-1" />
                        }
                        {activeTab === 'success' ? 'Completed' : 'To Review'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
        
        {exercises.length > 6 && (
          <div className="mt-4 text-center">
            <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              View All {exercises.length} Exercises
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};