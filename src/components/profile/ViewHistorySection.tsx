import React from 'react';
import { Link } from 'react-router-dom';
import { ViewHistoryItem } from '@/types';
import { Clock, History, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewHistorySectionProps {
  historyItems: ViewHistoryItem[];
  isLoading: boolean;
}

export const ViewHistorySection: React.FC<ViewHistorySectionProps> = ({ historyItems, isLoading }) => {
  const formatTimeSpent = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

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

  if (historyItems.length === 0) {
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
            Recently Viewed
          </h2>
        </div>

        <div className="space-y-3">
          {historyItems.map((item) => (
            <Link 
              to={`/exercises/${item.content.id}`} 
              key={`${item.content.id}-${item.viewed_at}`}
              className="block bg-white border border-gray-200 hover:border-indigo-300 rounded-lg p-4 transition-all hover:shadow-md"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{item.content_title}</h3>
                  <div className="flex items-center text-xs text-gray-500 space-x-3">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-indigo-400" />
                      {formatTimeSpent(item.time_spent)}
                    </span>
                    
                    {item.completed && (
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </span>
                    )}
                    
                    <span className={`px-2 py-0.5 rounded text-xs flex items-center 
                      ${item.content_difficulty === 'easy' 
                        ? 'bg-green-50 text-green-700' 
                        : item.content_difficulty === 'medium' 
                          ? 'bg-yellow-50 text-yellow-700' 
                          : 'bg-red-50 text-red-700'}`}
                    >
                      {item.content_difficulty}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-500 mb-2">
                    {new Date(item.viewed_at).toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {historyItems.length > 5 && (
          <div className="mt-4 text-center">
            <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              View Complete History
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};