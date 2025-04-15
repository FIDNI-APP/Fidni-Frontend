import React from 'react';
import { Book, BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotebookCard from './NotebookCard';
import { Notebook } from '@/types';

interface NotebooksListViewProps {
  notebooks: Notebook[];
  onSelectNotebook: (id: string) => void;
  onDeleteNotebook: (id: string) => void;
  onCreateNotebook: () => void;
  isLoading?: boolean;
}

const NotebooksListView: React.FC<NotebooksListViewProps> = ({ 
  notebooks, 
  onSelectNotebook, 
  onDeleteNotebook, 
  onCreateNotebook,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Book className="w-5 h-5 mr-2 text-indigo-600" />
          My Notebooks
        </h2>
        <Button 
          onClick={onCreateNotebook}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Notebook
        </Button>
      </div>

      {notebooks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No notebooks yet</h3>
          <p className="text-gray-500 mb-6">Create your first notebook to get started</p>
          <Button 
            onClick={onCreateNotebook}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Notebook
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {notebooks.map((notebook) => (
            <NotebookCard 
              key={notebook.id}
              notebook={notebook}
              onClick={onSelectNotebook}
              onDelete={onDeleteNotebook}
            />
          ))}
          
          {/* Add New Notebook card */}
          <div
            className="cursor-pointer transform transition-all duration-300 hover:-translate-y-1"
            onClick={onCreateNotebook}
          >
            <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 flex flex-col items-center justify-center hover:border-indigo-500 transition-colors">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="font-medium text-gray-800 mb-1">Create New Notebook</h3>
              <p className="text-sm text-gray-500">Add a new subject notebook</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotebooksListView;