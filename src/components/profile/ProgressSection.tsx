import React from 'react';
import { Content } from '@/types';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, BookOpen, BarChart3, ChevronRight } from 'lucide-react';
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
  const [activeTab, setActiveTab] = React.useState<'success' | 'review'>('success');
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-emerald-600" />
            My Progress
          </h2>
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

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-emerald-600" />
            My Progress
          </h2>
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
          <div className="text-center py-8 px-4">
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
          <div className="space-y-3">
            {exercises.map((exercise) => (
              <Link 
                to={`/exercises/${exercise.id}`} 
                key={exercise.id}
                className="block bg-white border border-gray-200 hover:border-indigo-300 rounded-lg p-4 transition-all hover:shadow-md"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{exercise.title}</h3>
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
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};