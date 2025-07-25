// src/pages/learningpaths/CreateLearningPath.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { getSubjects, getClassLevels } from '@/lib/api';
import { createLearningPath, updateLearningPath, getLearningPath } from '@/lib/api/LearningPathApi';
import { SubjectModel, ClassLevelModel } from '@/types';

interface FormData {
  title: string;
  description: string;
  subject: string;
  class_level: string[];
  estimated_hours: number;
  is_active: boolean;
}

export const CreateLearningPath: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    subject: '',
    class_level: [],
    estimated_hours: 0,
    is_active: true
  });

  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevelModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is superuser
  useEffect(() => {
    if (!user?.is_superuser) {
      navigate('/learning-paths');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchInitialData();
    if (isEditMode) {
      fetchLearningPath();
    }
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [subjectsData, classLevelsData] = await Promise.all([
        getSubjects(),
        getClassLevels()
      ]);
      setSubjects(subjectsData);
      setClassLevels(classLevelsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLearningPath = async () => {
    if (!id) return;
    
    try {
      const data = await getLearningPath(id);
      setFormData({
        title: data.title,
        description: data.description,
        subject: data.subject.id,
        class_level: data.class_level.map(cl => cl.id),
        estimated_hours: data.estimated_hours,
        is_active: data.is_active
      });
    } catch (err) {
      console.error('Failed to fetch learning path:', err);
      setError('Failed to load learning path');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.subject || formData.class_level.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      if (isEditMode) {
        await updateLearningPath(id!, formData);
      } else {
        const result = await createLearningPath(formData);
        // Navigate to the newly created learning path
        navigate(`/learning-paths/${result.id}`);
        return;
      }
      
      navigate('/learning-paths');
    } catch (err) {
      console.error('Failed to save learning path:', err);
      setError('Failed to save learning path. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClassLevelToggle = (classLevelId: string) => {
    setFormData(prev => ({
      ...prev,
      class_level: prev.class_level.includes(classLevelId)
        ? prev.class_level.filter(id => id !== classLevelId)
        : [...prev.class_level, classLevelId]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/learning-paths')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Learning Paths
            </Button>
            
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit Learning Path' : 'Create New Learning Path'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditMode 
                ? 'Update the learning path details below' 
                : 'Create a structured learning experience for students'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              {/* Title */}
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Mastering Calculus Fundamentals"
                  className="mt-1"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide a detailed description of what students will learn..."
                  className="mt-1 h-32"
                />
              </div>

              {/* Subject */}
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Class Levels */}
              <div>
                <Label>Class Levels *</Label>
                <p className="text-sm text-gray-600 mb-3">
                  Select all class levels this learning path is suitable for
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {classLevels.map(level => (
                    <label
                      key={level.id}
                      className={cn(
                        "flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors",
                        formData.class_level.includes(level.id)
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                          : "bg-white border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={formData.class_level.includes(level.id)}
                        onChange={() => handleClassLevelToggle(level.id)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{level.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Estimated Hours */}
              <div>
                <Label htmlFor="hours">Estimated Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    estimated_hours: parseFloat(e.target.value) || 0 
                  })}
                  className="mt-1"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Total estimated time to complete this learning path
                </p>
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="active">Active Status</Label>
                  <p className="text-sm text-gray-600">
                    Inactive paths won't be visible to students
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/learning-paths')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditMode ? 'Update' : 'Create'} Learning Path
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Next Steps Info */}
          {!isEditMode && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Next Steps
              </h3>
              <p className="text-blue-800">
                After creating the learning path, you'll be able to:
              </p>
              <ul className="mt-2 space-y-1 text-blue-800">
                <li>• Add chapters with video lessons</li>
                <li>• Create quizzes for each chapter</li>
                <li>• Upload resources and materials</li>
                <li>• Set prerequisites and learning objectives</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};