import React from 'react';
import ContentEditorV2 from '@/components/exercise/ContentEditorV2';
import { useNavigate } from 'react-router-dom';
import { createExercise } from '@/lib/api';

export const NewContent = () => {
  const navigate = useNavigate();

  const handleSubmit = async (data: any) => {
    try {
      const response = await createExercise(data);
      console.log('✅ Exercise created, response:', response);
      console.log('📝 Exercise ID:', response.id);

      if (!response.id) {
        console.error('❌ No ID in response! Full response:', response);
        throw new Error('No ID returned from API');
      }

      navigate(`/exercises/${response.id}`);
    } catch (err) {
      console.error('Failed to create exercise:', err);
      throw err;
    }
  };

  return (
    <ContentEditorV2
      contentType="exercise"
      onSubmit={handleSubmit}
    />
  );
};
