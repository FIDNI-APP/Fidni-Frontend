import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, GraduationCap, Award, Sparkles, TrendingUp, CheckCircle } from 'lucide-react';
import { HomeContentCard } from '@/components/HomeContentCard';
import { QuickStatsDashboard } from '@/components/QuickStatsDashboard';
import { Button } from '@/components/ui/button';

import {
  voteExercise,
  voteLesson,
  voteExam,
  getUserDashboardStats,
  getRecommendedContent,
  type DashboardStats
} from '@/lib/api';
import { Content, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/SEO';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';

export function Home() {
  const [featuredExercises, setFeaturedExercises] = useState<Content[]>([]);
  const [featuredLessons, setFeaturedLessons] = useState<Content[]>([]);
  const [featuredExams, setFeaturedExams] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  // Real data from API
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Debug log for state changes
  useEffect(() => {
    console.log('[Home] STATE UPDATE - loading:', loading, 'exercisesCount:', featuredExercises.length, 'lessonsCount:', featuredLessons.length, 'examsCount:', featuredExams.length);
  }, [loading, featuredExercises, featuredLessons, featuredExams]);

  useEffect(() => {
    console.log('[Home] useEffect triggered - authLoading:', authLoading, 'isAuthenticated:', isAuthenticated);
    // Wait for auth to finish loading before fetching content
    if (!authLoading) {
      console.log('[Home] Auth finished loading, fetching content...');
      fetchFeaturedContent();
    } else {
      console.log('[Home] Auth still loading, waiting...');
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    console.log('[Home] Dashboard useEffect - isAuthenticated:', isAuthenticated);
    // Fetch dashboard data only when authenticated
    if (isAuthenticated) {
      console.log('[Home] User authenticated, fetching dashboard data...');
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchFeaturedContent = async () => {
    try {
      console.log('[Home] fetchFeaturedContent START - isAuthenticated:', isAuthenticated);
      setLoading(true);
      console.log('[Home] Loading set to TRUE');

      if (isAuthenticated) {
        console.log('[Home] Fetching RECOMMENDED content for authenticated user...');
        // Use recommendation API for authenticated users
        const recommendedData = await getRecommendedContent();
        console.log('[Home] Recommended data received:', {
          exercises: recommendedData.exercises?.length || 0,
          lessons: recommendedData.lessons?.length || 0,
          exams: recommendedData.exams?.length || 0
        });
        setFeaturedExercises(recommendedData.exercises || []);
        setFeaturedLessons(recommendedData.lessons || []);
        setFeaturedExams(recommendedData.exams || []);
      } else {
        console.log('[Home] Fetching MOST UPVOTED content for non-authenticated user...');
        // Fallback to most upvoted for non-authenticated users
        const { getExercises, getLessons, getExams } = await import('@/lib/api');
        const [exercisesData, lessonsData, examsData] = await Promise.all([
          getExercises({ sort: 'most_upvoted', per_page: 8 }),
          getLessons({ sort: 'most_upvoted', per_page: 8 }),
          getExams({ sort: 'most_upvoted', per_page: 8 }),
        ]);
        console.log('[Home] Most upvoted data received:', {
          exercises: exercisesData.results?.length || 0,
          lessons: lessonsData.results?.length || 0,
          exams: examsData.results?.length || 0
        });
        setFeaturedExercises(exercisesData.results || []);
        setFeaturedLessons(lessonsData.results || []);
        setFeaturedExams(examsData.results || []);
      }
      console.log('[Home] Content set successfully');
    } catch (err) {
      console.error('[Home] ERROR fetching featured content:', err);
      // Set empty arrays on error to show the empty state
      setFeaturedExercises([]);
      setFeaturedLessons([]);
      setFeaturedExams([]);
    } finally {
      console.log('[Home] Loading set to FALSE');
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const stats = await getUserDashboardStats();
      setDashboardStats(stats);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  const handleVote = async (id: string, value: VoteValue, contentType?: 'exercise' | 'lesson' | 'exam') => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      let updatedContent: Content;

      // Determine content type by checking which array contains the item if not provided
      if (!contentType) {
        if (featuredExercises.some(item => item.id.toString()=== id)) {
          contentType = 'exercise';
        } else if (featuredLessons.some(item => item.id.toString() === id)) {
          contentType = 'lesson';
        } else if (featuredExams.some(item => item.id.toString() === id)) {
          contentType = 'exam';
        }
      }

      // Call the appropriate vote function
      if (contentType === 'exercise') {
        updatedContent = await voteExercise(id, value);
        setFeaturedExercises(prev => prev.map(item => item.id.toString() === id ? updatedContent : item));
      } else if (contentType === 'lesson') {
        updatedContent = await voteLesson(id, value);
        setFeaturedLessons(prev => prev.map(item => item.id.toString() === id ? updatedContent : item));
      } else if (contentType === 'exam') {
        updatedContent = await voteExam(id, value);
        setFeaturedExams(prev => prev.map(item => item.id.toString() === id ? updatedContent : item));
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  return (     

    <div className="md:p_26px_36px min-h_100vh p_16px bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <SEO
        title="Fidni - Plateforme d'apprentissage en mathématiques"
        description="Accédez à des exercices, leçons et examens de mathématiques adaptés à votre niveau."
        keywords={['mathématiques', 'exercices', 'leçons', 'examens', 'bac', 'terminale']}
        ogType="website"
        canonicalUrl="/"
      />

      {/* Modern Hero Section with Glassmorphism */}
      <section className="relative px-4 pt-20 pb-32 bg-gradient-to-br from-gray-900 to-purple-800">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-20 -left-20 w-60 h-60 bg-purple-300/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute -bottom-20 right-1/3 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

          {/* Geometric patterns */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Personalized Greeting with better animation */}
            {isAuthenticated && user ? (
              <div className="mb-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white/90 text-sm font-medium animate-fade-in">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Connecté
                </div>
                <h1 className="text-3xl md:text-6xl lg:text-6xl font-extrabold text-white mb-4 animate-fade-in leading-tight">
                  Bonjour, <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">{user.username}</span> 👋
                </h1>
                <p className="text-xl md:text-2xl text-white/90 font-medium animate-fade-in-up animation-delay-100">
                  Continuons votre parcours d'apprentissage
                </p>
              </div>
            ) : (
              <div className="mb-8 space-y-6">
                <h1 className="text-4xl md:text-6xl lg:text-6xl font-extrabold text-white mb-4 animate-fade-in leading-tight">
                  Maîtrisez les <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">mathématiques</span>
                </h1>
                <p className="text-xl md:text-2xl text-white/90 font-medium animate-fade-in-up animation-delay-100 max-w-2xl mx-auto">
                  Des exercices personnalisés, des leçons détaillées et des examens pour réussir
                </p>
              </div>
            )}

            {/* Enhanced Search Bar with Glassmorphism */}
            <div className="relative mb-8 animate-fade-in-up animation-delay-200 z-50">
              <SearchAutocomplete
                placeholder="Rechercher un exercice, une leçon ou un concept..."
                className="max-w-3xl mx-auto"
                inputClassName="w-full px-6 py-5 pr-16 bg-white/95 backdrop-blur-xl border-2 border-white/60 rounded-2xl text-gray-900 placeholder-gray-500 text-lg focus:outline-none focus:ring-4 focus:ring-white/50 focus:border-white transition-all shadow-2xl shadow-black/10 hover:shadow-black/20"
              />
            </div>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
              <Link to="/exercises" className="w-full sm:w-auto">
                <Button 
                className="liquid-glass group w-full bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 hover:from-yellow-300 hover:via-pink-300 hover:to-purple-300 text-purple-900 rounded-xl font-bold text-xl hover:text-white inline-flex items-center justify-center gap-3"
                variant="ghost">
                  <Sparkles className="w-5 h-5" />
                  Commencer un exercice
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              {!isAuthenticated && (
                <Link to="/register" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all inline-flex items-center justify-center gap-2">
                    Créer un compte gratuit
                  </button>
                </Link>
              )}
            </div>

            {/* Trust indicators */}
            {!isAuthenticated && (
              <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-white/80 text-sm animate-fade-in-up animation-delay-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span>100% Gratuit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span>Sans engagement</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span>Accès illimité</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Stats Dashboard with Overlap Effect - Only show for authenticated users */}
      {isAuthenticated && dashboardStats && (
        <section className="px-4 -mt-20 relative z-20">
          <div className="max-w-7xl mx-auto">
            <QuickStatsDashboard
              exercisesStarted={dashboardStats.exercises_started}
              studyTime={dashboardStats.study_time}
              perfectCompletions={dashboardStats.perfect_completions}
              totalExercises={dashboardStats.total_exercises}
              streakDays={dashboardStats.streak_days}
              timeBreakdown={dashboardStats.time_breakdown}
              insights={dashboardStats.insights}
            />
          </div>
        </section>
      )}

      {/* Featured Exercises - Modern Design */}
      <section className={`py-12 px-4 ${isAuthenticated ? 'mt-8' : 'mt-0'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Section Header with Badge */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-900">Recommandé pour vous</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
                  Exercices personnalisés
                </h2>
                <p className="text-base md:text-lg text-gray-600">
                  Sélectionnés selon votre niveau et vos objectifs
                </p>
              </div>
              <Link
                to="/exercises"
                className="hidden md:inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-purple-200 transition-all hover:scale-105 flex-shrink-0"
              >
                Voir tout
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, idx) => (
                <div key={idx} className="animate-pulse">
                  <div className="bg-gray-200 rounded-2xl h-64"></div>
                </div>
              ))}
            </div>
          ) : featuredExercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6 text-center bg-gradient-to-br from-purple-50 to-indigo-50 rounded-3xl border-2 border-dashed border-purple-200">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-400 rounded-full blur-2xl opacity-20"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-purple-600" />
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900 mb-2">Aucun exercice pour le moment</p>
                <p className="text-gray-600 max-w-md mx-auto">
                  Revenez bientôt pour découvrir de nouveaux contenus adaptés à votre profil
                </p>
              </div>
              <Link to="/exercises">
                <button className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all hover:scale-105">
                  Explorer tous les exercices
                </button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {featuredExercises.slice(0, 8).map((exercise, idx) => (
                  <div
                    key={exercise.id}
                    className="animate-fade-in-up hover:scale-[1.02] transition-transform duration-300"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <HomeContentCard content={exercise} onVote={handleVote} />
                  </div>
                ))}
              </div>

              {/* Mobile CTA */}
              <div className="md:hidden mt-8 text-center">
                <Link to="/exercises">
                  <button className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all hover:scale-105 shadow-lg">
                    Voir tous les exercices
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Featured Lessons - Modern Design */}
      {!loading && featuredLessons.length > 0 && (
        <section className="py-12 px-4 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-full mb-4">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-900">Apprentissage</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
                    Leçons populaires
                  </h2>
                  <p className="text-base md:text-lg text-gray-600">
                    Maîtrisez les concepts clés pas à pas
                  </p>
                </div>
                <Link
                  to="/lessons"
                  className="hidden md:inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-blue-700 hover:shadow-lg hover:shadow-indigo-200 transition-all hover:scale-105 flex-shrink-0"
                >
                  Voir tout
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredLessons.slice(0, 8).map((lesson, idx) => (
                <div
                  key={lesson.id}
                  className="animate-fade-in-up hover:scale-[1.02] transition-transform duration-300"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <HomeContentCard content={lesson} onVote={handleVote} />
                </div>
              ))}
            </div>

            <div className="md:hidden mt-8 text-center">
              <Link to="/lessons">
                <button className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all hover:scale-105 shadow-lg">
                  Voir toutes les leçons
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured Exams - Modern Design */}
      {!loading && featuredExams.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-100 to-rose-100 rounded-full mb-4">
                <Award className="w-4 h-4 text-pink-600" />
                <span className="text-sm font-semibold text-pink-900">Validation</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
                    Examens blancs
                  </h2>
                  <p className="text-base md:text-lg text-gray-600">
                    Évaluez votre niveau et identifiez vos lacunes
                  </p>
                </div>
                <Link
                  to="/exams"
                  className="hidden md:inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl font-semibold hover:from-pink-700 hover:to-rose-700 hover:shadow-lg hover:shadow-pink-200 transition-all hover:scale-105 flex-shrink-0"
                >
                  Voir tout
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredExams.slice(0, 8).map((exam, idx) => (
                <div
                  key={exam.id}
                  className="animate-fade-in-up hover:scale-[1.02] transition-transform duration-300"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <HomeContentCard content={exam} onVote={handleVote} />
                </div>
              ))}
            </div>

            <div className="md:hidden mt-8 text-center">
              <Link to="/exams">
                <button className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl font-semibold hover:from-pink-700 hover:to-rose-700 transition-all hover:scale-105 shadow-lg">
                  Voir tous les examens
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section - Modern */}
      <section className="relative py-24 px-4 overflow-hidden bg-gradient-to-br from-gray-900 to-purple-600 mt-16">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white/90 text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4" />
              Rejoignez des milliers d'étudiants
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
              Prêt à exceller en <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">mathématiques</span> ?
            </h2>
            <p className="text-xl md:text-2xl text-white/90 font-medium mb-10 max-w-3xl mx-auto">
              Accédez à des centaines d'exercices, de leçons détaillées et d'examens blancs
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            {isAuthenticated ? (
              <Link to="/exercises" className="w-full sm:w-auto">
                <Button 
                className="liquid-glass group w-full bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 hover:from-yellow-300 hover:via-pink-300 hover:to-purple-300 text-purple-900 rounded-xl font-bold text-xl hover:text-white inline-flex items-center justify-center gap-3"
                variant='ghost'>
                  Continuer l'apprentissage
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register" className="w-full sm:w-auto">
                  <button className="group w-full sm:w-auto px-10 py-5 bg-white text-purple-600 rounded-xl font-bold text-xl hover:bg-gray-50 transition-all hover:scale-105 hover:shadow-2xl shadow-xl inline-flex items-center justify-center gap-3">
                    Commencer gratuitement
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link to="/exercises" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-10 py-5 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all inline-flex items-center justify-center gap-2">
                    Explorer sans compte
                  </button>
                </Link>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-white/90 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-green-900" />
              </div>
              <span className="font-medium">Contenu gratuit</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-green-900" />
              </div>
              <span className="font-medium">Accès illimité</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-green-900" />
              </div>
              <span className="font-medium">Aucune carte bancaire</span>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.05); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out backwards;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        .animation-delay-400 {
          animation-delay: 400ms;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
