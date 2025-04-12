import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ContentEditor from '@/components/ContentEditor';
import { getLessonById, updateLesson } from '@/lib/api';
import { Lesson } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import 'katex/dist/katex.min.css';

export function EditLesson() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadLesson(id);
    }
  }, [id]);

  const loadLesson = async (lessonId: string) => {
    try {
      setLoading(true);
      const data = await getLessonById(lessonId);
      
      if (user?.id !== data.author.id) {
        // If not the author, redirect back to lessons
        navigate('/lessons');
        return;
      }
      
      setLesson(data);
    } catch (err) {
      console.error('Failed to load lesson:', err);
      setError('Failed to load lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    if (!id) return;

    try {
      // Prepare lesson data without solution or difficulty
      const lessonData = {
        title: data.title,
        content: data.content,
        class_levels: data.class_levels,
        subject: data.subject,
        chapters: data.chapters,
        theorems: data.theorems,
        subfields: data.subfields,
        type: 'lesson'
      };
      
      await updateLesson(id, lessonData);
      navigate(`/lessons/${id}`);
    } catch (err) {
      console.error('Failed to update lesson:', err);
      setError('Failed to update lesson. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4">
          {error || 'Lesson not found'}
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
            onClick={() => navigate('/lessons')}
            className="mr-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Lesson</h1>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
            <p>{error}</p>
          </div>
        )}

        {/* Content Editor */}
        <ContentEditor
          onSubmit={handleSubmit}
          isLesson={true} // Indicate this is a lesson to hide solution & difficulty sections
          initialValues={{
            title: lesson.title,
            content: lesson.content,
            class_level: lesson.class_levels?.map(level => level.id) || [],
            subject: lesson.subject?.id || '',
            chapters: lesson.chapters?.map(chapter => chapter.id) || [],
            theorems: lesson.theorems?.map(theorem => theorem.id) || [],
            subfields: lesson.subject?.subfields?.map(subfield => subfield.id) || [],
          }}
        />
      </div>
    </div>
  );
}