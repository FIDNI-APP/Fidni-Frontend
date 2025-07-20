import React, { useState } from 'react';
import ContentEditor from '@/components/exercise/ContentEditor';
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