// src/pages/learningpaths/CreatePathChapter.tsx
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
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';
import { createPathChapter, createVideo, getLearningPath } from '@/lib/api/LearningPathApi';
import { getChapters } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { VideoType } from '@/types';

interface VideoForm {
  title: string;
  url: string;
  video_type: VideoType;
  duration_seconds: number;
  thumbnail_url?: string;
  order: number; // Added order field
}

export const CreatePathChapter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState('');
  const [learningPath, setLearningPath] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    learning_path: id,
    chapter: '',
    title: '',
    description: '',
    estimated_minutes: 60,
    order: 0 // Added order field
  });

  const [videos, setVideos] = useState<VideoForm[]>([
    {
      title: '',
      url: '',
      video_type: 'lesson',
      duration_seconds: 0,
      thumbnail_url: '',
      order: 0 // Set initial order
    }
  ]);

  useEffect(() => {
    if (!user?.is_superuser) {
      navigate(`/learning-path/${id}`);
      return;
    }
    loadData();
  }, [user, id]);

  const loadData = async () => {
    try {
      setFetchingData(true);
      const pathData = await getLearningPath(id!);
      setLearningPath(pathData);
      
      // Load chapters based on subject and class levels
      if (pathData?.subject?.id && pathData?.class_level) {
        // Extract class level IDs
        const classLevelIds = pathData.class_level.map((level: any) => level.id);
        
        const chaptersData = await getChapters(
          pathData.subject.id,
          classLevelIds,
          [] 
        );
        setChapters(chaptersData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Impossible de charger le parcours. Réessaie.');
    } finally {
      setFetchingData(false);
    }
  };

  const addVideo = () => {
    setVideos([...videos, {
      title: '',
      url: '',
      video_type: 'lesson',
      duration_seconds: 0,
      thumbnail_url: '',
      order: videos.length // Set order to current length
    }]);
  };

  const removeVideo = (index: number) => {
    const updatedVideos = videos.filter((_, i) => i !== index);
    // Update orders after removal
    const reorderedVideos = updatedVideos.map((video, idx) => ({
      ...video,
      order: idx
    }));
    setVideos(reorderedVideos);
  };

  const updateVideo = (index: number, field: keyof VideoForm, value: any) => {
    const updatedVideos = [...videos];
    updatedVideos[index] = { ...updatedVideos[index], [field]: value };
    setVideos(updatedVideos);
  };

const validateForm = (): boolean => {
  if (!formData.chapter || !formData.title) {
    setError('Choisis un chapitre et donne-lui un titre.');
    return false;
  }

  // More comprehensive video validation
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    if (!video.title || !video.url || !video.duration_seconds || video.duration_seconds <= 0) {
      setError(`Vidéo ${i + 1} : remplis le titre, le lien et une durée supérieure à 0.`);
      return false;
    }
  }

  return true;
};

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }

  try {
    setLoading(true);
    setError('');
    
    // Create path chapter
    const chapterResponse = await createPathChapter({
      learning_path: id, // Make sure this is passed correctly
      chapter: formData.chapter,
      title: formData.title,
      description: formData.description,
      order: formData.order
    });
    
    
    // The response should have an ID field based on your serializer
    const chapterId = chapterResponse.id;
    
    if (!chapterId) {
      console.error('No ID found in response:', chapterResponse);
      throw new Error('Le chapitre a été créé, mais le serveur n’a pas renvoyé son identifiant.');
    }
    
    
    // Create videos for the chapter
    for (let i = 0; i < videos.length; i++) {
      try {
        const video = videos[i];
        const videoData = {
          title: video.title,
          url: video.url,
          video_type: video.video_type,
          duration_seconds: video.duration_seconds,
          thumbnail_url: video.thumbnail_url || '',
          order: video.order,
          path_chapter: chapterId // This should now work
        };
        
        await createVideo(videoData);
      } catch (videoError: any) {
        console.error(`Failed to create video ${i + 1}:`, videoError);
        console.error('Video error details:', videoError.response?.data);
        throw new Error(`Impossible de créer la vidéo ${i + 1} : ${videoError.response?.data?.message || videoError.message}`);
      }
    }
    
    // Success feedback before navigation
    setTimeout(() => {
      navigate(`/learning-path/${id}`);
    }, 800);
  } catch (error: any) {
    console.error('Error details:', error.response?.data || error);
    setError(error.response?.data?.message || error.message || 'Impossible de créer le chapitre. Vérifie les champs et réessaie.');
  } finally {
    setLoading(false);
  }
};


  if (fetchingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du parcours…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(`/learning-path/${id}`)}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour au parcours
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Ajouter un chapitre</h1>
            {learningPath && (
              <p className="text-gray-600 mt-2">
                Adding to: <span className="font-semibold">{learningPath.title}</span>
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Chapter Info Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Chapitre</h2>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
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
                    value={formData.chapter} // Change from chapter_id to chapter
                    onChange={(e) => {
                      const selectedChapter = chapters.find(c => c.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        chapter: e.target.value, // Change from chapter_id to chapter
                        title: selectedChapter?.name || ''
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Choisir un chapitre</option>
                    {chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </option>
                    ))}
                  </select>
                  
                  {chapters.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600 flex items-center">
                      <Info className="w-4 h-4 mr-1" />
                      Aucun chapitre disponible : vérifie que le parcours a une matière et un niveau.
                    </p>
                  )}
                </div>

                {/* Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position dans le parcours <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ordre d’apparition du chapitre dans le parcours
                  </p>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre du chapitre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Titre affiché pour ce chapitre"
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
                    placeholder="Ce que couvre ce chapitre, en quelques mots…"
                  />
                </div>

                {/* Estimated Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Durée estimée (minutes)
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
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Vidéos du chapitre</h2>
                <Button
                  type="button"
                  onClick={addVideo}
                  variant="outline"
                  size="sm"
                  className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une vidéo
                </Button>
              </div>

              <div className="space-y-6">
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
                        Vidéo {index + 1}
                      </h3>
                      {videos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Video Title */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Titre <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={video.title}
                          onChange={(e) => updateVideo(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Titre de la vidéo"
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
                          {/* Mêmes valeurs que Video.VIDEO_TYPES côté serveur : « exercise » n'en faisait
                              pas partie et faisait échouer la création de la vidéo. */}
                          <option value="introduction">Introduction</option>
                          <option value="lesson">Vidéo de cours</option>
                          <option value="explanation">Explication / exercice corrigé</option>
                          <option value="demo">Démonstration</option>
                          <option value="tips">Astuces</option>
                          <option value="summary">Vidéo de synthèse</option>
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
                            placeholder="Lien YouTube, Vimeo ou fichier vidéo"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Accepte les liens YouTube, Vimeo, S3 ou directs vers un fichier vidéo
                        </p>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Durée (secondes) <span className="text-red-500">*</span>
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

                      {/* Order */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ordre
                        </label>
                        <input
                          type="number"
                          value={video.order}
                          onChange={(e) => updateVideo(index, 'order', parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>

                      {/* Image d’aperçu (lien) */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Image d’aperçu (lien)
                        </label>
                        <input
                          type="url"
                          value={video.thumbnail_url}
                          onChange={(e) => updateVideo(index, 'thumbnail_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Facultatif : lien vers une image"
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
                onClick={() => navigate(`/learning-path/${id}`)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Création…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Créer le chapitre
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