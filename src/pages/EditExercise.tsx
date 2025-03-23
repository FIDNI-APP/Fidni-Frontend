import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ContentEditor from '../components/ContentEditor';
import { getContentById, updateContent } from '../lib/api';
import { Content, Difficulty } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import 'katex/dist/katex.min.css';

export function EditExercise() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exercise, setExercise] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadExercise(id);
    }
  }, [id]);

  const loadExercise = async (exerciseId: string) => {
    try {
      setLoading(true);
      const data = await getContentById(exerciseId);
      
      if (user?.id !== data.author.id) {
        navigate('/exercises');
        return;
      }
      
      setExercise(data);
    } catch (err) {
      console.error('Failed to load exercise:', err);
      setError('Failed to load exercise. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    if (!id) return;

    try {
      await updateContent(id, data);
      navigate(`/exercises/${id}`);
    } catch (err) {
      console.error('Failed to update exercise:', err);
      setError('Failed to update exercise. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4">
          {error || 'Exercise not found'}
        </div>
      </div>
    );
  }

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

      
        <ContentEditor
          onSubmit={handleSubmit}
          initialValues={{
            title: exercise.title,
            content: exercise.content,
            class_level: exercise.class_levels?.map(level => level.id) || [],
            subject: exercise.subject?.id || '',
            difficulty: exercise.difficulty as Difficulty,
            chapters: exercise.chapters?.map(chapter => chapter.id) || [],
            solution_content : exercise.solution?.content,
            theorems : exercise.theorems?.map(theorem => theorem.id) || [],
            subfields : exercise.subfields?.map(subfield => subfield.id) || [],

          }}
          
        />
      </div>
    </div>
  );
}
