import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, BookOpen, GraduationCap, Award, TrendingUp, X } from 'lucide-react';
import { getExercises, getLessons, getExams } from '@/lib/api';
import { Content } from '@/types';

interface SearchAutocompleteProps {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onSearch?: (query: string) => void;
  type?: 'exercise' | 'lesson' | 'exam';
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  placeholder = "Rechercher un exercice, une leçon, un théorème...",
  className = "",
  inputClassName = "",
  onSearch,
  type = 'exercise',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    exercises: Content[];
    lessons: Content[];
    exams: Content[];
  }>({
    exercises: [],
    lessons: [],
    exams: [],
  });

  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ exercises: [], lessons: [], exams: [] });
      setIsOpen(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debouncing
    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setIsOpen(true);

      try {
        // Fetch autocomplete results (limit to 5 per type)
        const [exercisesData, lessonsData, examsData] = await Promise.all([
          getExercises({ search: query, per_page: 5 }),
          getLessons({ search: query, per_page: 5 }),
          getExams({ search: query, per_page: 5 }),
        ]);

        setResults({
          exercises: exercisesData.results,
          lessons: lessonsData.results,
          exams: examsData.results,
        });
      } catch (error) {
        console.error('Autocomplete search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      if (onSearch) {
        onSearch(query);
      } else {
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  const handleResultClick = (content: Content, type: 'exercise' | 'lesson' | 'exam') => {
    setIsOpen(false);
    setQuery('');

    // Navigate based on content type
    if (type === 'exercise') {
      navigate(`/exercises/${content.id}`);
    } else if (type === 'lesson') {
      navigate(`/lessons/${content.id}`);
    } else if (type === 'exam') {
      navigate(`/exams/${content.id}`);
    }
  };

  const handleViewAll = () => {
    if (query.trim()) {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const totalResults = results.exercises.length + results.lessons.length + results.exams.length;

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'lesson':
        return <GraduationCap className="w-4 h-4" />;
      case 'exam':
        return <Award className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getContentBadgeColor = (type: string) => {
    switch (type) {
      case 'lesson':
        return 'bg-indigo-100 text-indigo-700';
      case 'exam':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-violet-100 text-violet-700';
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            className={`w-full ${inputClassName} transition-all duration-200 ${isOpen ? 'ring-2 ring-violet-500' : ''}`}
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Search button */}
          <button
            type="submit"
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-white px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 
              ${type === 'exercise' ? 'bg-violet-600 hover:bg-violet-700' : 
                type === 'lesson' ? 'bg-blue-600 hover:bg-blue-700' : 
                'bg-green-600 hover:bg-emerald-700'}`}
            aria-label="Search"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] max-h-[70vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
            </div>
          )}

          {!loading && totalResults === 0 && query.length >= 2 && (
            <div className="py-8 px-4 text-center text-gray-500">
              <Search className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Aucun résultat pour "{query}"</p>
              <p className="text-xs mt-1">Essayez d'autres mots-clés</p>
            </div>
          )}

          {!loading && totalResults > 0 && (
            <>
              {/* Exercises Section */}
              {results.exercises.length > 0 && (
                <div className="border-b border-gray-100">
                  <div className="px-4 py-2.5 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-violet-600" />
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Exercices
                      </span>
                    </div>
                    <span className="text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                      {results.exercises.length}
                    </span>
                  </div>
                  {results.exercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => handleResultClick(exercise, 'exercise')}
                      className="w-full px-4 py-3 hover:bg-violet-50 transition-all duration-150 text-left flex items-start gap-3 group border-b border-gray-50 last:border-0"
                    >
                      <div className="mt-0.5 p-2 rounded-lg bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all duration-150">
                        {getContentIcon('exercise')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-violet-700 transition-colors line-clamp-1">
                          {exercise.title}
                        </p>
                        {exercise.subject && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span className="font-medium">{exercise.subject.name}</span>
                            {exercise.chapters && exercise.chapters.length > 0 && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="truncate">{exercise.chapters[0].name}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Lessons Section */}
              {results.lessons.length > 0 && (
                <div className="border-b border-gray-100">
                  <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Leçons
                      </span>
                    </div>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                      {results.lessons.length}
                    </span>
                  </div>
                  {results.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => handleResultClick(lesson, 'lesson')}
                      className="w-full px-4 py-3 hover:bg-indigo-50 transition-all duration-150 text-left flex items-start gap-3 group border-b border-gray-50 last:border-0"
                    >
                      <div className="mt-0.5 p-2 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-150">
                        {getContentIcon('lesson')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors line-clamp-1">
                          {lesson.title}
                        </p>
                        {lesson.subject && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span className="font-medium">{lesson.subject.name}</span>
                            {lesson.chapters && lesson.chapters.length > 0 && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="truncate">{lesson.chapters[0].name}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Exams Section */}
              {results.exams.length > 0 && (
                <div className="border-b border-gray-100">
                  <div className="px-4 py-2.5 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Examens
                      </span>
                    </div>
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                      {results.exams.length}
                    </span>
                  </div>
                  {results.exams.map((exam) => (
                    <button
                      key={exam.id}
                      onClick={() => handleResultClick(exam, 'exam')}
                      className="w-full px-4 py-3 hover:bg-purple-50 transition-all duration-150 text-left flex items-start gap-3 group border-b border-gray-50 last:border-0"
                    >
                      <div className="mt-0.5 p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-150">
                        {getContentIcon('exam')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors line-clamp-1">
                          {exam.title}
                        </p>
                        {exam.subject && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span className="font-medium">{exam.subject.name}</span>
                            {exam.chapters && exam.chapters.length > 0 && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="truncate">{exam.chapters[0].name}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* View All Results */}
              <button
                onClick={handleViewAll}
                className="w-full px-4 py-3.5 text-center text-sm font-semibold text-violet-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 transition-all duration-150 flex items-center justify-center gap-2 group"
              >
                <TrendingUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Voir tous les résultats</span>
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                  {totalResults}+
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
