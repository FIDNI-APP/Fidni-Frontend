import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentEditor from '../ContentEditor';
import { Award, Calendar } from 'lucide-react';
import { createExam } from '@/lib/api/examApi';
import { Difficulty } from '@/types';

export const CreateExam: React.FC = () => {
  const navigate = useNavigate();
  const [isNationalExam, setIsNationalExam] = useState(false);
  const [nationalDate, setNationalDate] = useState<string | null>(null);
  
  const handleSubmit = async (data: any) => {
    try {
      // Add the national exam data to the submission
      const examData = {
        ...data,
        is_national_exam: isNationalExam,
        national_date: nationalDate
      };
      
      const response = await createExam(examData);
      navigate(`/exams/${response.id}`);
    } catch (error) {
      console.error('Error creating exam:', error);
      throw error;
    }
  };
  
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
        initialValues={{
          title: '',
          content: '',
          class_level: [],
          subject: '',
          subfields: [],
          difficulty: 'medium' as Difficulty,
          chapters: [],
          theorems: [],
        }}
      />
    </div>
  );
};