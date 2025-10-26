import React from 'react';
import { useNavigate } from 'react-router-dom';
import ContentEditorV2 from '@/components/exercise/ContentEditorV2';
import { createLesson } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import 'katex/dist/katex.min.css';

export function CreateLesson() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (data: any) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await createLesson(data);
      navigate(`/lessons/${response.id}`);
    } catch (err) {
      console.error('Failed to create lesson:', err);
      throw err;
    }
  };

  return (
    <ContentEditorV2
      contentType="lesson"
      onSubmit={handleSubmit}
    />
  );
}
