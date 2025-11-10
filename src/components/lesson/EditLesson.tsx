import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ContentEditorV2 from '@/components/exercise/ContentEditorV2';
import { getLessonById, updateLesson } from '@/lib/api';
import { Lesson } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

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
      await updateLesson(id, data);
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
    <ContentEditorV2
      contentType="lesson"
      onSubmit={handleSubmit}
      initialValues={{
        title: lesson.title,
        content: lesson.content,
        class_levels: lesson.class_levels?.map(level => level.id) || [],
        subject: lesson.subject?.id || '',
        chapters: lesson.chapters?.map(chapter => chapter.id) || [],
        theorems: lesson.theorems?.map(theorem => theorem.id) || [],
        subfields: lesson.subfields?.map(subfield => subfield.id) || [],
      }}
    />
  );
}