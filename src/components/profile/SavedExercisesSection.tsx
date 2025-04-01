// src/components/profile/SavedExercisesSection.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Content, VoteValue } from '@/types';
import { BookOpen, Bookmark, Search, ChevronRight } from 'lucide-react';
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
  const [localExercises, setLocalExercises] = useState<Content[]>(exercises);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter exercises based on search query
  const filteredExercises = searchQuery 
    ? localExercises.filter(ex => 
        ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.subject?.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : localExercises;

  // Update local state when props change
  React.useEffect(() => {
    setLocalExercises(exercises);
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
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 h-48 rounded-lg"></div>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold flex items-center">
            <Bookmark className="w-5 h-5 mr-2 text-indigo-600" />
            Saved Exercises
          </h2>
          
          {/* Search input */}
          <div className="relative max-w-xs">
            <input
              type="text"
              placeholder="Search saved exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        
        {filteredExercises.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              No exercises match your search
            </h3>
            <p className="text-gray-500 mb-4">
              Try different keywords or clear your search
            </p>
            <Button 
              variant="outline" 
              onClick={() => setSearchQuery('')}
              className="text-indigo-600"
            >
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExercises.map((exercise) => (
              <div key={exercise.id} className="transform hover:scale-105 transition-all duration-300">
                <HomeContentCard 
                  content={exercise} 
                  onVote={handleVote}
                />
              </div>
            ))}
          </div>
        )}

        {localExercises.length > 9 && (
          <div className="mt-6 text-center">
            <Link to="/saved">
              <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                View All {localExercises.length} Saved Exercises
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};