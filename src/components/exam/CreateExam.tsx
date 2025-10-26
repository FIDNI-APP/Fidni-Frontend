import React from 'react';
import { useNavigate } from 'react-router-dom';
import ContentEditorV2 from '@/components/exercise/ContentEditorV2';
import { createExam } from '@/lib/api/examApi';

export const CreateExam: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (data: any) => {
    try {
      console.log('Creating exam with data:', data);
      const response = await createExam(data);
      console.log('Exam created successfully:', response);
      navigate(`/exams/${response.id}`);
    } catch (error) {
      console.error('Error creating exam:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      throw error;
    }
  };

  return (
    <ContentEditorV2
      contentType="exam"
      onSubmit={handleSubmit}
    />
  );
};