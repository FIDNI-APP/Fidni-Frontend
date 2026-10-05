import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserSavedExercises, getUserSavedLessons, getUserSavedExams } from '@/lib/api/userApi';
import { Bookmark, BookOpen, AlertCircle, PenTool, FileCheck, Search, Loader2, ArrowRight } from 'lucide-react';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { motion } from 'framer-motion';

interface SavedItem {
  id: number;
  title?: string;
  name?: string;
  description?: string;
  content_type?: string;
  subject?: {
    id?: number;
    name?: string;
  } | string;
  difficulty?: string;
  class_level?: {
    id?: number;
    name?: string;
  } | string;
}

type FilterType = 'all' | 'exercise' | 'lesson' | 'exam';

const TYPE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; route: string }> = {
  exercise: { icon: PenTool, label: 'Exercice', route: 'exercises' },
  lesson: { icon: LessonIcon, label: 'Leçon', route: 'lessons' },
  exam: { icon: FileCheck, label: 'Examen', route: 'exams' },
};

const DIFFICULTY_DOT: Record<string, string> = {
  facile: '#1a7a4a',
  moyen: '#b7791f',
  difficile: '#b91c1c',
};

export const SavedItems = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    const fetchSavedItems = async () => {
      try {
        setLoading(true);
        if (user?.username) {
          // Fetch all types of saved items in parallel
          const [exercisesData, lessonsData, examsData] = await Promise.all([
            getUserSavedExercises(user.username).catch(() => []),
            getUserSavedLessons(user.username).catch(() => []),
            getUserSavedExams(user.username).catch(() => [])
          ]);

          // Handle both array and paginated response formats
          const exercises = Array.isArray(exercisesData) ? exercisesData : exercisesData?.results || [];
          const lessons = Array.isArray(lessonsData) ? lessonsData : lessonsData?.results || [];
          const exams = Array.isArray(examsData) ? examsData : examsData?.results || [];

          // Combine and mark each item type
          const allItems = [
            ...exercises.map((item: any) => ({ ...item, content_type: 'exercise' })),
            ...lessons.map((item: any) => ({ ...item, content_type: 'lesson' })),
            ...exams.map((item: any) => ({ ...item, content_type: 'exam' }))
          ];

          setSavedItems(allItems || []);
        }
      } catch (err) {
        setError('Erreur lors du chargement des éléments enregistrés');
        console.error('Error fetching saved items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedItems();
  }, [user, isAuthenticated, authLoading, navigate]);

  const filteredItems = savedItems.filter(item => {
    const matchesType = filterType === 'all' || item.content_type === filterType;
    const matchesSearch = !searchQuery ||
      (item.title || item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const counts = {
    all: savedItems.length,
    exercise: savedItems.filter(i => i.content_type === 'exercise').length,
    lesson: savedItems.filter(i => i.content_type === 'lesson').length,
    exam: savedItems.filter(i => i.content_type === 'exam').length,
  };

  const FILTERS: { key: FilterType; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'exercise', label: 'Exercices', icon: PenTool },
    { key: 'lesson', label: 'Leçons', icon: LessonIcon },
    { key: 'exam', label: 'Examens', icon: FileCheck },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Header */}
      <header className="flex items-center gap-3.5 mb-7">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 44, height: 44, borderRadius: 12, background: '#f2f1ee', border: '1px solid #e7e3dc' }}
        >
          <Bookmark className="w-5 h-5" style={{ color: '#1a1a1a' }} />
        </div>
        <div className="min-w-0">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01em' }}>Favoris</h1>
          <p style={{ fontSize: 13.5, color: '#6b6862', marginTop: 1 }}>
            Tous vos contenus sauvegardés, réunis au même endroit
          </p>
        </div>
      </header>

      {/* Controls */}
      <div className="mb-6 flex flex-col gap-3.5">
        <div className="relative" data-tour="favoris-recherche">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9a958c' }} />
          <input
            type="text"
            placeholder="Rechercher dans vos favoris…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', paddingLeft: 42, paddingRight: 16, height: 44,
              borderRadius: 12, border: '1px solid #e7e3dc', background: '#fff',
              fontSize: 14, color: '#1a1a1a', outline: 'none', transition: 'border-color .15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#1a7a4a'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e7e3dc'; }}
          />
        </div>

        <div className="flex flex-wrap gap-2" data-tour="favoris-filtres">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`fd-pill ${filterType === key ? 'is-active' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {label}
              <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#9a958c' }} />
        </div>
      ) : error ? (
        <div
          className="flex items-center gap-3 p-4"
          style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#b91c1c' }} />
          <span style={{ color: '#991b1b', fontSize: 14 }}>{error}</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className="text-center py-16 px-6"
          style={{ background: '#fff', border: '1px solid #e7e3dc', borderRadius: 16 }}
        >
          <div
            className="mx-auto mb-4 flex items-center justify-center"
            style={{ width: 56, height: 56, borderRadius: 16, background: '#f7f6f3' }}
          >
            <Bookmark className="w-7 h-7" style={{ color: '#cfcdc8' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>
            {searchQuery ? 'Aucun résultat' : 'Aucun favori pour le moment'}
          </h3>
          <p style={{ fontSize: 13.5, color: '#6b6862', marginBottom: 20, maxWidth: 360, marginInline: 'auto' }}>
            {searchQuery
              ? 'Essayez avec d\'autres mots-clés.'
              : 'Enregistrez des exercices, leçons et examens pour les retrouver ici en un clin d\'œil.'}
          </p>
          {!searchQuery && (
            <button className="fd-btn-primary" style={{ margin: '0 auto' }} onClick={() => navigate('/exercises')}>
              <BookOpen className="w-4 h-4" />
              Découvrir les contenus
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map((item, i) => {
            const meta = TYPE_META[item.content_type || 'exercise'] || TYPE_META.exercise;
            const Icon = meta.icon;
            const diffKey = item.difficulty?.toLowerCase() || '';

            return (
              <motion.button
                key={`${item.content_type}-${item.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.2) }}
                onClick={() => navigate(`/${meta.route}/${item.id}`)}
                className="text-left group"
                style={{
                  background: '#fff', border: '1px solid #e7e3dc', borderRadius: 14,
                  padding: 18, cursor: 'pointer', transition: 'border-color .16s, box-shadow .16s, transform .16s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d8d4cc';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(20,18,16,.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e7e3dc';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{ fontSize: 11, fontWeight: 600, color: '#6b6862', textTransform: 'uppercase', letterSpacing: '.04em' }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {meta.label}
                  </span>
                  <Bookmark className="w-4 h-4" style={{ color: '#1a1a1a', fill: '#1a1a1a' }} />
                </div>

                <h3
                  className="line-clamp-2"
                  style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.35, marginBottom: item.description ? 6 : 12, transition: 'color .15s' }}
                >
                  {item.title || item.name || 'Sans titre'}
                </h3>

                {item.description && (
                  <p className="line-clamp-2" style={{ fontSize: 13, color: '#6b6862', marginBottom: 12, lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {item.subject && (
                    <span style={chipStyle}>
                      {typeof item.subject === 'string' ? item.subject : item.subject?.name || 'Matière'}
                    </span>
                  )}
                  {item.class_level && (
                    <span style={chipStyle}>
                      {typeof item.class_level === 'string' ? item.class_level : item.class_level?.name || 'Niveau'}
                    </span>
                  )}
                  {item.difficulty && (
                    <span style={{ ...chipStyle, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: DIFFICULTY_DOT[diffKey] || '#9a958c' }} />
                      {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                    </span>
                  )}
                </div>

                <div
                  className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100"
                  style={{ fontSize: 12, fontWeight: 600, color: '#15633c', transition: 'opacity .16s' }}
                >
                  Ouvrir <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const chipStyle: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 500, color: '#6b6862',
  background: '#f7f6f3', border: '1px solid #f2f1ee',
  padding: '3px 9px', borderRadius: 99,
};
