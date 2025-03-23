import React, { useState } from 'react';
import ContentEditor from '../components/ContentEditor';
import { useNavigate } from 'react-router-dom';
import { createContent } from '../lib/api';
import { ArrowLeft } from 'lucide-react';

export const NewContent = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data : any) => {
    try {
      setError(null);
      await createContent(data);
      navigate('/exercises/');
    } catch (err) {
      console.error('Failed to create content:', err);
      setError('Failed to create content. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Simple Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="flex items-center mb-4">
          <button 
            onClick={() => navigate('/exercises')}
            className="mr-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create New Content</h1>
        </div>

        {/* Error display - if not handled by ContentEditor */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
            <p>{error}</p>
          </div>
        )}

        {/* The ContentEditor component will handle all the content creation flow */}
        <ContentEditor
          onSubmit={handleSubmit}
          initialValues={{
            title: '',
            content: '',
            class_level: [],
            subject: '',
            difficulty: 'easy',
            chapters: [],
          }}
        />
      </div>
    </div>
  );
};