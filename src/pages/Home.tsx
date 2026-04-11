import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { HomeContentCard } from '@/components/content/HomeContentCard';
import { StudyTimeBreakdown } from '@/components/dashboard/StudyTimeBreakdown';
import { ContentCarousel } from '@/components/ui/ContentCarousel';
// Assurez-vous d'importer votre image ici
import backgroundImage from '@/assets/background_homepage.png';
import { Search } from 'lucide-react';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import { Sparkles } from 'lucide-react';
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
import { SEO } from '@/components/layout/SEO';
// SearchAutocomplete retiré du Hero comme demandé

export function Home() {
  const [featuredExercises, setFeaturedExercises] = useState<Content[]>([]);
  const [featuredLessons, setFeaturedLessons] = useState<Content[]>([]);
  const [featuredExams, setFeaturedExams] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!authLoading) {
      fetchFeaturedContent();
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchFeaturedContent = async () => {
    try {
      setLoading(true);
      if (isAuthenticated) {
        const recommendedData = await getRecommendedContent();
        setFeaturedExercises(recommendedData.exercises || []);
        setFeaturedLessons(recommendedData.lessons || []);
        setFeaturedExams(recommendedData.exams || []);
      } else {
        const { getExercises, getLessons, getExams } = await import('@/lib/api');
        const [exercisesData, lessonsData, examsData] = await Promise.all([
          getExercises({ sort: 'most_upvoted', per_page: 8 }),
          getLessons({ sort: 'most_upvoted', per_page: 8 }),
          getExams({ sort: 'most_upvoted', per_page: 8 }),
        ]);
        setFeaturedExercises(exercisesData.results || []);
        setFeaturedLessons(lessonsData.results || []);
        setFeaturedExams(examsData.results || []);
      }
    } catch (err) {
      console.error('[Home] ERROR fetching featured content:', err);
      setFeaturedExercises([]);
      setFeaturedLessons([]);
      setFeaturedExams([]);
    } finally {
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
      // Logique de détection du type si non fourni
      let type = contentType;
      if (!type) {
         if (featuredExercises.some(item => item.id.toString() === id)) type = 'exercise';
         else if (featuredLessons.some(item => item.id.toString() === id)) type = 'lesson';
         else if (featuredExams.some(item => item.id.toString() === id)) type = 'exam';
      }

      if (type === 'exercise') {
        updatedContent = await voteExercise(id, value);
        setFeaturedExercises(prev => prev.map(item => item.id.toString() === id ? updatedContent : item));
      } else if (type === 'lesson') {
        updatedContent = await voteLesson(id, value);
        setFeaturedLessons(prev => prev.map(item => item.id.toString() === id ? updatedContent : item));
      } else if (type === 'exam') {
        updatedContent = await voteExam(id, value);
        setFeaturedExams(prev => prev.map(item => item.id.toString() === id ? updatedContent : item));
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <SEO
        title="Fidni - Excellence en Mathématiques"
        description="Plateforme moderne d'apprentissage en mathématiques."
        keywords={['mathématiques', 'bac', 'exercices']}
        ogType="website"
        canonicalUrl="/"
      />

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background avec Overlay Progressif */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-[#F8FAFC]"></div>
        </div>

        {/* Formes décoratives animées */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[20%] -right-[5%] w-[30%] h-[30%] bg-indigo-600/20 rounded-full blur-[100px] animation-delay-2000"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            
            {/* Badge Status */}
            <div className="flex justify-center animate-fade-in">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-100 text-xs font-bold tracking-widest uppercase">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                {isAuthenticated ? "Session Active" : "Plateforme d'élite"}
              </span>
            </div>

            {/* Title Section */}
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.1] tracking-tight">
                {isAuthenticated && user ? (
                  <>Bienvenue, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">{user.username}</span></>
                ) : (
                  <>L'Excellence en <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Mathématiques</span></>
                )}
              </h1>
              <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
                Maîtrisez chaque concept avec une approche structurée et des outils de suivi avancés.
              </p>
            </div>

            {/* Actions Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4">
              <Link to="/exercises" className="w-full sm:w-auto">
                <button className="w-full px-12 py-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-900/20 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3">
                  ACCÉDER AUX EXERCICES
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              {!isAuthenticated && (
                <Link to="/register" className="w-full sm:w-auto">
                  <button className="w-full px-12 py-5 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white font-bold rounded-2xl transition-all flex items-center justify-center">
                    CRÉER UN COMPTE
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- DASHBOARD STATS --- */}
      {isAuthenticated && dashboardStats?.time_breakdown && (
        <section className="relative -mt-20 px-4 pb-12 z-20">
          <div className="max-w-7xl mx-auto bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-white/50">
            <StudyTimeBreakdown
              timeBreakdown={dashboardStats.time_breakdown}
              insights={dashboardStats.insights}
            />
          </div>
        </section>
      )}

      {/* --- SECTION 1: EXERCICES (Fond Blanc) --- */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <ContentSectionHeader 
            title="Exercices" 
            subtitle="Bibliothèque" 
            description="Sélection d'exercices adaptés à votre niveau."
            link="/exercises"
            color="blue"
          />

          {loading ? ( <SkeletonLoader /> ) : (
            <ContentCarousel itemsPerView={4}>
              {featuredExercises.map((exercise, idx) => (
                <div key={exercise.id} className="p-2 animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <HomeContentCard content={exercise} onVote={handleVote} />
                </div>
              ))}
            </ContentCarousel>
          )}
           <MobileSeeAllLink link="/exercises" label="tous les exercices" />
        </div>
      </section>

      {/* --- SECTION 2: LEÇONS (Fond légèrement grisé pour casser le blanc) --- */}
      {!loading && featuredLessons.length > 0 && (
        <section className="py-20 px-4 bg-slate-50 border-y border-slate-100">
          <div className="max-w-7xl mx-auto">
            <ContentSectionHeader 
                title="Leçons" 
                subtitle="Cours théoriques" 
                description="Cours détaillés et structurés pour maîtriser les concepts."
                link="/lessons"
                color="indigo"
            />
            <ContentCarousel itemsPerView={4}>
              {featuredLessons.map((lesson, idx) => (
                <div key={lesson.id} className="p-2 animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <HomeContentCard content={lesson} onVote={handleVote} />
                </div>
              ))}
            </ContentCarousel>
            <MobileSeeAllLink link="/lessons" label="toutes les leçons" />
          </div>
        </section>
      )}

      {/* --- SECTION 3: EXAMENS (Retour au fond Blanc) --- */}
      {!loading && featuredExams.length > 0 && (
        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <ContentSectionHeader 
                title="Examens" 
                subtitle="Évaluation" 
                description="Entraînez-vous en conditions réelles d'examen."
                link="/exams"
                color="violet"
            />
            <ContentCarousel itemsPerView={4}>
              {featuredExams.map((exam, idx) => (
                <div key={exam.id} className="p-2 animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <HomeContentCard content={exam} onVote={handleVote} />
                </div>
              ))}
            </ContentCarousel>
            <MobileSeeAllLink link="/exams" label="tous les examens" />
          </div>
        </section>
      )}
      
      {/* Section CTA finale supprimée comme demandé */}

      <style jsx global>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out backwards; }
      `}</style>
    </div>
  );
}

// --- Petits composants pour éviter la répétition du code ---

// Header des sections (Exercices, Leçons...)
function ContentSectionHeader({ title, subtitle, description, link, color }: any) {
    const colors: any = {
        blue: { bg: 'bg-blue-100', text: 'text-blue-900', bar: 'bg-blue-600', btn: 'text-blue-600 border-blue-600 hover:bg-blue-600' },
        indigo: { bg: 'bg-indigo-100', text: 'text-indigo-900', bar: 'bg-indigo-600', btn: 'text-indigo-600 border-indigo-600 hover:bg-indigo-600' },
        violet: { bg: 'bg-violet-100', text: 'text-violet-900', bar: 'bg-violet-600', btn: 'text-violet-600 border-violet-600 hover:bg-violet-600' },
    };
    const c = colors[color];

    return (
        <div className="mb-12 flex items-end justify-between">
            <div>
                <div className={`inline-block px-4 py-1 ${c.bg} ${c.text} text-xs font-bold uppercase tracking-widest mb-4 rounded-md`}>
                    {subtitle}
                </div>
                <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                    {title}
                </h2>
                <div className={`w-16 h-1.5 ${c.bar} mb-4 rounded-full`}></div>
                <p className="text-base text-slate-600 font-medium max-w-md">
                    {description}
                </p>
            </div>
            <Link
                to={link}
                className={`hidden md:inline-flex items-center gap-2 px-6 py-3 border-2 ${c.btn} hover:text-white font-bold text-sm uppercase tracking-wide transition-all rounded-xl`}
            >
                Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}

// Loader
function SkeletonLoader() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, idx) => (
                <div key={idx} className="bg-slate-100 animate-pulse rounded-2xl h-72 border border-slate-200"></div>
            ))}
        </div>
    );
}

// Lien mobile "Voir tout"
function MobileSeeAllLink({ link, label }: any) {
    return (
        <div className="md:hidden mt-8 text-center">
            <Link to={link}>
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all uppercase">
                    Voir {label} <ArrowRight className="w-4 h-4" />
                </button>
            </Link>
        </div>
    );
}