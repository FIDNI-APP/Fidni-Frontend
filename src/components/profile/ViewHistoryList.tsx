// src/components/profile/ViewHistoryList.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ViewHistoryItem } from '@/types';
import { formatDistance } from 'date-fns';
import { Eye, Clock, CheckCircle, XCircle } from 'lucide-react';

interface ViewHistoryListProps {
  items: ViewHistoryItem[];
}

export const ViewHistoryList: React.FC<ViewHistoryListProps> = ({ items }) => {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">View History</h2>
        
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No history yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <Link 
                key={`${item.content.id}-${item.viewed_at}`}
                to={`/exercises/${item.content.id}`}
                className="block py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.content_title}</h3>
                    <div className="flex items-center mt-1 gap-3">
                      <span className="text-xs text-gray-500">
                        {formatDistance(new Date(item.viewed_at), new Date(), { addSuffix: true })}
                      </span>
                      
                      <span className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTime(item.time_spent)}
                      </span>
                      
                      {item.completed && (
                        <span className="flex items-center text-xs text-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      item.content_difficulty === 'easy' 
                        ? 'bg-green-100 text-green-800' 
                        : item.content_difficulty === 'medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {item.content_difficulty}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};