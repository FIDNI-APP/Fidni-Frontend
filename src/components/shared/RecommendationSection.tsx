import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BookOpen, PenTool, FileCheck, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/apiClient';
import { Content, Lesson, Exam } from '@/types';

interface RecommendationSectionProps {
  contentType: 'exercise' | 'lesson' | 'exam';
  contentId: string;
}

interface Recommendations {
  exercises?: Content[];
  lessons?: Lesson[];
  exams?: Exam[];
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  contentType,
  contentId
}) => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendations>({});
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/${contentType}s/${contentId}/recommendations/`);
        setRecommendations(response.data);
      } catch (error) {
        console.error('Failed to load recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [contentType, contentId]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'exercise':
        return <PenTool className="w-4 h-4" />;
      case 'lesson':
        return <BookOpen className="w-4 h-4" />;
      case 'exam':
        return <FileCheck className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getContentRoute = (type: string, id: number) => {
    switch (type) {
      case 'exercise':
        return `/exercises/${id}`;
      case 'lesson':
        return `/lessons/${id}`;
      case 'exam':
        return `/exams/${id}`;
      default:
        return '#';
    }
  };

  // Flatten all recommendations into a single array
  const allRecommendations: Array<{ item: any; type: string }> = [
    ...(recommendations.exercises?.map(ex => ({ item: ex, type: 'exercise' })) || []),
    ...(recommendations.lessons?.map(ls => ({ item: ls, type: 'lesson' })) || []),
    ...(recommendations.exams?.map(ex => ({ item: ex, type: 'exam' })) || [])
  ];

  const itemsPerPage = 5;
  const totalPages = Math.ceil(allRecommendations.length / itemsPerPage);
  const canGoNext = currentIndex < totalPages - 1;
  const canGoPrev = currentIndex > 0;

  const handleNext = () => {
    if (canGoNext) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (canGoPrev) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const visibleItems = allRecommendations.slice(
    currentIndex * itemsPerPage,
    (currentIndex + 1) * itemsPerPage
  );

  const renderContentCard = (item: any, type: string) => {
    const typeConfigMap = {
      exercise: {
        label: 'Exercice',
        textColor: 'text-purple-600'
      },
      lesson: {
        label: 'Leçon',
        textColor: 'text-blue-600'
      },
      exam: {
        label: 'Examen',
        textColor: 'text-green-600'
      }
    };

    const typeConfig = typeConfigMap[type as keyof typeof typeConfigMap] || typeConfigMap.exercise;

    return (
      <motion.div
        key={`${type}-${item.id}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={() => navigate(getContentRoute(type, item.id))}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group"
      >
        {/* Type label - minimal */}
        <div className="mb-2">
          <span className={`text-xs font-semibold ${typeConfig.textColor}`}>
            {typeConfig.label}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm leading-tight group-hover:text-gray-700 transition-colors">
          {item.title}
        </h4>

        {/* Metadata - minimal */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {item.subject && (
            <span className="text-gray-600 font-medium">
              {item.subject.name}
            </span>
          )}
          {item.view_count > 0 && (
            <span>
              {item.view_count} vues
            </span>
          )}
          {item.vote_count !== undefined && (
            <span className="font-semibold text-gray-700">
              ↑ {item.vote_count}
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  const hasRecommendations =
    (recommendations.exercises && recommendations.exercises.length > 0) ||
    (recommendations.lessons && recommendations.lessons.length > 0) ||
    (recommendations.exams && recommendations.exams.length > 0);

  if (loading) {
    return (
      <div className="py-6">
        <div className="border-t border-gray-200 mb-6" />
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-gray-200 rounded w-32"></div>
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!hasRecommendations) {
    return null;
  }

  return (
    <div className="py-6">
      <div className="border-t border-gray-200 mb-6" />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Contenu similaire
        </h3>

        {/* Navigation arrows - minimal */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className={`p-2 rounded-lg transition-all ${
              canGoPrev
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`p-2 rounded-lg transition-all ${
              canGoNext
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel container */}
      <div className="overflow-hidden" ref={carouselRef}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <AnimatePresence mode="wait">
            {visibleItems.map(({ item, type }) => (
              <div key={`${type}-${item.id}`}>
                {renderContentCard(item, type)}
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Pagination dots - minimal */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-6 h-2 bg-gray-700'
                  : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
