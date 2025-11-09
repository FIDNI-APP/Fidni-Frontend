import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/apiClient';
import { Content, Lesson, Exam } from '@/types';
import { ContentCard } from '@/components/exercise/ContentCard';

interface SimilarExercisesProps {
  contentId: string;
  contentType: 'exercise' | 'lesson' | 'exam';
}

interface Recommendations {
  exercises?: Content[];
  lessons?: Lesson[];
  exams?: Exam[];
}

export const SimilarExercises: React.FC<SimilarExercisesProps> = ({
  contentId,
  contentType = 'exercise'
}) => {
  const [recommendations, setRecommendations] = useState<Recommendations>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/${contentType}s/${contentId}/recommendations/`);
        setRecommendations(response.data);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [contentType, contentId]);

  // Flatten all recommendations into a single array with type info
  const allContent: Array<{ item: any; type: 'exercise' | 'lesson' | 'exam' }> = [
    ...(recommendations.exercises?.map(ex => ({ item: ex, type: 'exercise' as const })) || []),
    ...(recommendations.lessons?.map(ls => ({ item: ls, type: 'lesson' as const })) || []),
    ...(recommendations.exams?.map(ex => ({ item: ex, type: 'exam' as const })) || [])
  ];

  const totalCount = allContent.length;

  if (loading) {
    return (
      <div className="py-6">
        <div className="border-t border-gray-200 mb-6" />
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Contenu similaire</h3>
        <p className="text-sm text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (totalCount === 0) {
    return null; // Don't show section if no recommendations
  }

  return (
    <div className="py-6">
      <div className="border-t border-gray-200 mb-6" />
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Contenu similaire ({totalCount})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {allContent.map(({ item, type }) => (
          <ContentCard
            key={`${type}-${item.id}`}
            content={item}
            contentType={type}
            onVote={() => {}}
          />
        ))}
      </div>
    </div>
  );
};
