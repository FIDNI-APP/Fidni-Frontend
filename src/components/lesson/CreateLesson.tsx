import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentEditor from '@/components/exercise/ContentEditor';
import { createLesson } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import 'katex/dist/katex.min.css';

export function CreateLesson() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      // Prepare lesson data - note we don't include difficulty or solution
      const lessonData = {
        title: data.title,
        content: data.content,
        class_levels: data.class_levels,
        subject: data.subject,
        chapters: data.chapters,
        theorems: data.theorems,
        subfields: data.subfields,
        type: 'lesson' // Specify this is a lesson
      };
      
      const response = await createLesson(lessonData);
      navigate(`/lessons/${response.id}`);
    } catch (err) {
      console.error('Failed to create lesson:', err);
      setError('Failed to create lesson. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Simple Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Error display */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
            <p>{error}</p>
          </div>
        )}

        {/* Content Editor */}
        <ContentEditor
          onSubmit={handleSubmit}
          isLesson={true} // Pass this to ContentEditor to hide solution & difficulty
        />
      </div>
    </div>
  );
}