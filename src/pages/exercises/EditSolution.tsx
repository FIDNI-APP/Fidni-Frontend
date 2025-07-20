import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MDEditor from '@uiw/react-md-editor';
import { getSolution, updateSolution } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function EditSolution() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadSolution(id);
    }
  }, [id]);

  const loadSolution = async (solutionId: string) => {
    try {
      setLoading(true);
      const solution = await getSolution(solutionId);
      
      // Check if the user is the author
      if (user?.id !== solution.author.id) {
        navigate(-1);
        return;
      }
      
      setContent(solution.content);
    } catch (err) {
      console.error('Failed to load solution:', err);
      setError('Failed to load solution. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !content.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await updateSolution(id, { content });
      navigate(-1);
    } catch (err) {
      console.error('Failed to update solution:', err);
      setError('Failed to update solution. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      <h1 className="text-3xl font-bold mb-8">Edit Solution</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 rounded-md p-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <MDEditor
            value={content}
            onChange={(value) => setContent(value || '')}
            preview="edit"
            height={400}
            textareaProps={{
              placeholder: 'Write your solution here... Use LaTeX with $...$ for inline math or $$...$$ for display math'
            }}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !content.trim()}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}