// src/pages/learningPaths/CreatePathChapter.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  Plus,
  X,
  Link,
  PlayCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { createPathChapter, createVideo, getLearningPath } from '@/lib/api/learningpathApi';
import { getChapters } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface VideoForm {
  title: string;
  url: string;
  video_type: 'lesson' | 'summary' | 'exercise' | 'tips';
  duration_seconds: number;
  thumbnail_url?: string;
}

export const CreatePathChapter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [learningPath, setLearningPath] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    learning_path: id,
    chapter_id: '',
    title: '',
    description: '',
    estimated_minutes: 60
  });

  const [videos, setVideos] = useState<VideoForm[]>([
    {
      title: '',
      url: '',
      video_type: 'lesson',
      duration_seconds: 0,
      thumbnail_url: ''
    }
  ]);

  useEffect(() => {
    if (!user?.is_superuser) {
      navigate(`/learning-paths/${id}`);
      return;
    }
    loadData();
  }, [user, id]);

  const loadData = async () => {
    try {
      const pathData = await getLearningPath(id!);
      setLearningPath(pathData);
      
      // Load chapters based on subject and class level
      if (pathData?.subject?.id && pathData?.class_level?.id) {
        const chaptersData = await getChapters(
          pathData.subject.id,
          [pathData.class_level.id],
          [] 
        );
        setChapters(chaptersData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const addVideo = () => {
    setVideos([...videos, {
      title: '',
      url: '',
      video_type: 'lesson',
      duration_seconds: 0,
      thumbnail_url: ''
    }]);
  };

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  const updateVideo = (index: number, field: keyof VideoForm, value: any) => {
    const updatedVideos = [...videos];
    updatedVideos[index] = { ...updatedVideos[index], [field]: value };
    setVideos(updatedVideos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.chapter_id || !formData.title) {
      setError('Please fill in all required fields');
      return;
    }

    if (videos.some(v => !v.title || !v.url || !v.duration_seconds)) {
      setError('Please complete all video information');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Create path chapter
      const chapterResponse = await createPathChapter({
        ...formData,
        learning_path: id
      });
      
      // Create videos for the chapter
      for (const video of videos) {
        await createVideo({
          ...video,
          path_chapter: chapterResponse.id
        });
      }
      
      navigate(`/learning-paths/${id}`);
    } catch (error) {
      setError('Failed to create chapter');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(`/learning-paths/${id}`)}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Learning Path
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Add Chapter</h1>
            {learningPath && (
              <p className="text-gray-600 mt-2">
                Adding to: {learningPath.title}
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Chapter Info Card */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Chapter Information</h2>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-6">
                {/* Select Chapter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Chapter <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.chapter_id}
                    onChange={(e) => {
                      const selectedChapter = chapters.find(c => c.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        chapter_id: e.target.value,
                        title: selectedChapter?.name || ''
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select a chapter</option>
                    {chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chapter Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Custom title for this chapter"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    placeholder="Brief description of what this chapter covers..."
                  />
                </div>

                {/* Estimated Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Estimated Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.estimated_minutes}
                    onChange={(e) => setFormData({ ...formData, estimated_minutes: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Videos Section */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Chapter Videos</h2>
                <Button
                  type="button"
                  onClick={addVideo}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Video
                </Button>
              </div>

              <div className="space-y-4">
                {videos.map((video, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-200 rounded-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-800">
                        <PlayCircle className="w-5 h-5 inline mr-2 text-indigo-600" />
                        Video {index + 1}
                      </h3>
                      {videos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Video Title */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={video.title}
                          onChange={(e) => updateVideo(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Video title"
                        />
                      </div>

                      {/* Video Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={video.video_type}
                          onChange={(e) => updateVideo(index, 'video_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="lesson">Lesson Video</option>
                          <option value="summary">Summary Video</option>
                          <option value="exercise">Exercise Video</option>
                          <option value="tips">Tips & Tricks</option>
                        </select>
                      </div>

                      {/* Video URL */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Video URL <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="url"
                            value={video.url}
                            onChange={(e) => updateVideo(index, 'url', e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="https://youtube.com/watch?v=..."
                          />
                        </div>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (seconds) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={video.duration_seconds}
                          onChange={(e) => updateVideo(index, 'duration_seconds', parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="300"
                        />
                      </div>

                      {/* Thumbnail URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Thumbnail URL
                        </label>
                        <input
                          type="url"
                          value={video.thumbnail_url}
                          onChange={(e) => updateVideo(index, 'thumbnail_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/learning-paths/${id}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Chapter
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};