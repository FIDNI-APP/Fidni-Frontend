import React, { useEffect, useState } from 'react';
import { getSimilarExercises } from '@/lib/api/contentApi';
import { Content } from '@/types';
import { ContentCard } from '@/components/exercise/ContentCard';
import { Layers } from 'lucide-react';

interface SimilarExercisesProps {
  exerciseId: string;
}

export const SimilarExercises: React.FC<SimilarExercisesProps> = ({ exerciseId }) => {
  const [similarExercises, setSimilarExercises] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        setLoading(true);
        const data = await getSimilarExercises(exerciseId);
        setSimilarExercises(data.results);
      } catch (error) {
        console.error('Failed to fetch similar exercises:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilar();
  }, [exerciseId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-800">Exercices similaires</h3>
        </div>
        <p className="text-sm text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (similarExercises.length === 0) {
    return null; // Don't show section if no similar exercises
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-800">Exercices similaires</h3>
        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
          {similarExercises.length}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {similarExercises.map((exercise) => (
          <ContentCard key={exercise.id} content={exercise} contentType="exercise" />
        ))}
      </div>
    </div>
  );
};
