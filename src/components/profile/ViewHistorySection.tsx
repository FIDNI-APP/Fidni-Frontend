import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ViewHistoryItem, VoteValue } from '@/types';
import { Clock, History, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { HomeContentCard } from '@/components/HomeContentCard';
import { voteExercise } from '@/lib/api';

interface ViewHistorySectionProps {
  historyItems: ViewHistoryItem[];
  isLoading: boolean;
}

export const ViewHistorySection: React.FC<ViewHistorySectionProps> = ({ historyItems = [], isLoading }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [localHistoryItems, setLocalHistoryItems] = useState<ViewHistoryItem[]>(historyItems || []);

  // Update local state when props change
  useEffect(() => {
    if (historyItems) {
      setLocalHistoryItems(historyItems);
    }
  }, [historyItems]);
  
  const handleVote = async (id: string, value: VoteValue) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    try {
      const updatedExercise = await voteExercise(id, value);
      
      // Update the exercise in the history item that contains it
      setLocalHistoryItems(prevItems =>
        prevItems.map(item =>
          item.content.id === id 
            ? { ...item, content: updatedExercise } 
            : item
        )
      );
    } catch (err) {
      console.error('Failed to vote:', err);
      setError('Failed to register your vote. Please try again.');
    }
  };
  
  const formatTimeSpent = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Display error message if vote fails
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-3 mb-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <History className="w-5 h-5 mr-2 text-indigo-600" />
            Recently Viewed
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 h-20 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (localHistoryItems.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <History className="w-5 h-5 mr-2 text-indigo-600" />
            Recently Viewed
          </h2>
        </div>
        <div className="text-center py-10 px-6">
          <History className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No view history yet</h3>
          <p className="text-gray-500 mb-6">Start exploring exercises to build your history</p>
          <Link to="/exercises">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Browse Exercises
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
            <History className="w-5 h-5 mr-2 text-indigo-600" />
            Historique récent
          </h2>
        </div>

        <div className="space-y-3">
          {localHistoryItems.map((item) => {
            // Safety check to ensure item and content exist
            if (!item || !item.content) {
              console.error('Invalid history item:', item);
              return null;
            }

            return (
              <div key={item.content.id} className="transform hover:scale-105 transition-all duration-300">
                <HomeContentCard
                  content={item.content}
                  onVote={handleVote}
                />
              </div>
            );
          })}
        </div>

        {localHistoryItems.length > 5 && (
          <div className="mt-4 text-center">
            <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              Voir tout l'historique
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};