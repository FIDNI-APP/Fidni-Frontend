import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Content, VoteValue } from '@/types';  // Added VoteValue import
import { BookOpen, Calendar, ChevronRight, Eye, BarChart3, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HomeContentCard } from '@/components/HomeContentCard';
import { useAuth } from '@/contexts/AuthContext';
import { voteExercise } from '@/lib/api';

interface SavedExercisesSectionProps {
  exercises: Content[];
  isLoading: boolean;
}

export const SavedExercisesSection: React.FC<SavedExercisesSectionProps> = ({ exercises, isLoading }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [localExercises, setLocalExercises] = useState<Content[]>(exercises); // Added local state
  const [error, setError] = useState<string | null>(null); // Added error state

  // Update local state when props change
  React.useEffect(() => {
    setLocalExercises(exercises);
    console.log("Setting local exercises:", exercises);

  }, [exercises]);
  const handleVote = async (id: string, value: VoteValue) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    try {
      const updatedExercise = await voteExercise(id, value);
      setLocalExercises(prevExercises =>
        prevExercises.map(exercise =>
          exercise.id === id ? updatedExercise : exercise
        )
      );
    } catch (err) {
      console.error('Failed to vote:', err);
      setError('Failed to register your vote. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <Bookmark className="w-5 h-5 mr-2 text-indigo-600" />
            Saved Exercises
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

  if (localExercises.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <Bookmark className="w-5 h-5 mr-2 text-indigo-600" />
            Saved Exercises
          </h2>
        </div>
        <div className="text-center py-10 px-6">
          <Bookmark className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No saved exercises yet</h3>
          <p className="text-gray-500 mb-6">Save exercises to access them quickly later</p>
          <Link to="/exercises">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Browse Exercises
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Display error message if vote fails
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-3 mb-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <Bookmark className="w-5 h-5 mr-2 text-indigo-600" />
            Saved Exercises
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {localExercises.map((exercise) => (
            <div key={exercise.id} className="transform hover:scale-105 transition-all duration-300">
              <HomeContentCard 
                content={exercise} 
                onVote={handleVote}
              />
            </div>
          ))}
        </div>

        {localExercises.length > 5 && (
          <div className="mt-4 text-center">
            <Link to="/saved">
              <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                View All Saved Exercises
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};