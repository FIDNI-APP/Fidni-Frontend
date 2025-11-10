import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ContentEditorV2 from '@/components/exercise/ContentEditorV2';
import { Award, Calendar, Loader2 } from 'lucide-react';
import { getExamById, updateExam } from '@/lib/api/examApi';
import { Difficulty } from '@/types';

export const EditExam: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<any>(null);
  const [isNationalExam, setIsNationalExam] = useState(false);
  const [nationalDate, setNationalDate] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchExam = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const examData = await getExamById(id);
        
        setInitialValues({
          title: examData.title,
          content: examData.content,
          class_levels: examData.class_levels?.map(cl => cl.id) || [],
          subject: examData.subject?.id || '',
          subfields: examData.subfields?.map(sf => sf.id) || [],
          difficulty: examData.difficulty,
          chapters: examData.chapters?.map(ch => ch.id) || [],
          theorems: examData.theorems?.map(th => th.id) || [],
          is_national_exam: examData.is_national_exam,
          national_year: examData.national_date,
        });
        
        setIsNationalExam(examData.is_national_exam);
        setNationalDate(examData.national_date);
      } catch (err) {
        console.error('Error fetching exam:', err);
        setError('Failed to load exam. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchExam();
  }, [id]);
  
  const handleSubmit = async (data: any) => {
    if (!id) return;
    
    try {
      // Add the national exam data to the submission
      const examData = {
        ...data,
        is_national_exam: isNationalExam,
        national_date: nationalDate
      };
      
      await updateExam(id, examData);
      navigate(`/exams/${id}`);
    } catch (error) {
      console.error('Error updating exam:', error);
      throw error;
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading exam data...</p>
        </div>
      </div>
    );
  }
  
  if (error || !initialValues) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <p className="text-gray-700 mb-4">{error || 'Failed to load exam data'}</p>
          <button
            onClick={() => navigate('/exams')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Return to Exams
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <ContentEditorV2
      contentType="exam"
      onSubmit={handleSubmit}
      initialValues={initialValues}
    />
  );
};