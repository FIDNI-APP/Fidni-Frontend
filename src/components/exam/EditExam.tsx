import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ContentEditor from '../ContentEditor';
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
          class_level: examData.class_levels?.map(cl => cl.id) || [],
          subject: examData.subject?.id || '',
          subfields: examData.subfields?.map(sf => sf.id) || [],
          difficulty: examData.difficulty,
          chapters: examData.chapters?.map(ch => ch.id) || [],
          theorems: examData.theorems?.map(th => th.id) || [],
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
    <div>
      {/* National Exam Settings */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Award className="mr-2 text-blue-600" />
          Paramètres de l'examen
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="nationalExam"
              checked={isNationalExam}
              onChange={(e) => setIsNationalExam(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="nationalExam" className="ml-2 block text-sm font-medium text-gray-700">
              Ceci est un examen national officiel
            </label>
          </div>
          
          {isNationalExam && (
            <div>
              <label htmlFor="nationalDate" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-blue-600" />
                Date de l'examen national
              </label>
              <input
                type="date"
                id="nationalDate"
                value={nationalDate || ''}
                onChange={(e) => setNationalDate(e.target.value || null)}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Content Editor */}
      <ContentEditor 
        onSubmit={handleSubmit}
        initialValues={initialValues}
      />
    </div>
  );
};