// src/components/notebook/NotebookCard.tsx (improved)
import React from 'react';
import { Trash2 } from 'lucide-react';
import { Notebook } from '@/types';

interface NotebookCardProps {
  notebook: Notebook;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotebookCard: React.FC<NotebookCardProps> = ({ notebook, onClick, onDelete }) => {
  // Calculate progress percentage
  const getProgressPercentage = (notebook: Notebook) => {
    if (!notebook.sections || notebook.sections.length === 0) return 0;
    const lessonsCount = notebook.sections.filter(s => s.lesson).length;
    return Math.round((lessonsCount / notebook.sections.length) * 100);
  };

  const progress = getProgressPercentage(notebook);

  return (
    <div 
      className="cursor-pointer group transform transition-all duration-300 hover:-translate-y-1"
      onClick={() => onClick(notebook.id)}
    >
      {/* Notebook cover design - with paper texture and binding */}
      <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg rounded-lg overflow-hidden h-64 flex flex-col">
        {/* Spiral binding */}
        <div className="absolute left-0 top-0 bottom-0 w-6 flex flex-col justify-between py-4 items-center pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-4 h-2 bg-white rounded-full opacity-80"></div>
          ))}
        </div>
        
        {/* Cover content */}
        <div className="flex-1 p-6 pl-10">
          <div className="flex justify-between">
            <h3 className="font-bold text-white text-xl mb-2">{notebook.title}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notebook.id);
              }}
              className="text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete notebook"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-indigo-100 text-sm">{notebook.subject.name}</p>
          <p className="text-indigo-100 text-sm">{notebook.class_level.name}</p>
          
          <div className="mt-6 bg-indigo-800/30 rounded-full h-2.5">
            <div 
              className="bg-yellow-300 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="mt-2 flex justify-between text-xs text-indigo-100">
            <span>Progrès</span>
            <span>
              {notebook.sections?.filter(s => s.lesson).length || 0} / {notebook.sections?.length || 0} lessons
            </span>
          </div>
        </div>
        
        {/* Label on the cover */}
        <div className="bg-white/90 p-3 text-center shadow-inner">
          <p className="font-medium text-indigo-800">{notebook.subject.name}</p>
        </div>
      </div>
    </div>
  );
};

export default NotebookCard;