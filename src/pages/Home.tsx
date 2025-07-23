import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, CheckCircle, TrendingUp, Users, ArrowRight, Sparkles, ChevronRight, BookOpen, GraduationCap } from 'lucide-react';
import { HomeContentCard } from '@/components/HomeContentCard';
import { getContents, voteExercise, getClassLevels } from '@/lib/api';
import { Content, VoteValue } from '@/types';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import '@/lib/styles.css';

export function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [popularExercises, setPopularExercises] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [apiStatus, setApiStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [classLevels, setClassLevels] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    fetchPopularExercises();
    testApiConnection();
  }, []);

  const fetchPopularExercises = async () => {
    try {
      setLoading(true);
      const data = await getContents({ 
        sort: 'most_upvoted', 
        type: 'exercise', 
        per_page: 3 
      });
      setPopularExercises(data.results);
    } catch (err) {
      console.error('Failed to fetch popular exercises:', err);
      setError('Failed to load popular exercises. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (id: string, value: VoteValue) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const updatedExercise = await voteExercise(id, value);
      setPopularExercises(prevExercises =>
        prevExercises.map(exercise =>
          exercise.id === id ? updatedExercise : exercise
        )
      );
    } catch (err) {
      console.error('Failed to vote:', err);
      setError('Failed to register your vote. Please try again.');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const testApiConnection = async () => {
    try {
      setApiStatus('loading');
      const levels = await getClassLevels();
      setClassLevels(levels);
      setApiStatus('success');
    } catch (error) {
      console.error('Erreur lors du test de connexion API:', error);
      setApiStatus('error');
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Une erreur est survenue lors de la connexion à l'API");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section - Enhanced with animated particles and better gradient */}
      <section className="bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 px-4 py-20 pt-32 text-center relative overflow-hidden">
        {/* Animated Dots Background */}
        <div className="absolute inset-0 particles-effect opacity-20"></div>
        
        {/* Floating shapes for visual interest */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-20 w-80 h-80 bg-gradient-to-r from-blue-500/20 to-teal-500/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="animate-fade-in-up">

            <span className="text-6xl fjalla-one-regular font-bold bg-gradient-to-r from-yellow-400 via-yellow-600 to-yellow-900 text-transparent bg-clip-text">
              Fidni
            </span>
            <p className="text-2xl text-gray-200 mb-12">
              Progressez en mathématiques avec des exercices adaptés à votre niveau
            </p>
          </div>
          
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-8 animate-fade-in">
            <input
              type="text"
              placeholder="Rechercher un exercice..."
              className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-lg transition-all duration-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button
              type="submit"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300"
              title="Search"
            >
              <Search className="w-6 h-6" />
            </Button>
          </form>

          <Link to="/exercises" className="inline-block animate-bounce-subtle">
  <Button className="group flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-10 py-5 rounded-full text-lg font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-105">
    Commencer à pratiquer
    <ChevronRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
  </Button>
</Link>
        </div>
        
        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="w-full">
            <path fill="#ffffff" fillOpacity="1" d="M0,96L48,85.3C96,75,192,53,288,58.7C384,64,480,96,576,96C672,96,768,64,864,48C960,32,1056,32,1152,42.7C1248,53,1344,75,1392,85.3L1440,96L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
          </svg>
        </div>
      </section>

      {/* Popular Exercises */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div className="flex items-center mb-4 md:mb-0 group">
              <div className="relative">
                <Sparkles className="w-10 h-10 text-yellow-500 mr-3 group-hover:animate-ping absolute opacity-75" />
                <Sparkles className="w-10 h-10 text-yellow-500 mr-3 relative" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 text-transparent bg-clip-text">
                Exercices populaires
              </h2>
            </div>
            <Link 
              to="/exercises" 
              className="group flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-300 font-medium"
            >
              <span className="mr-2">Voir tous les exercices</span>
              <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md p-4 mb-6 shadow-md">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {popularExercises.map(exercise => (
                <div key={exercise.id} className="transform hover:scale-105 transition-all duration-300">
                  <HomeContentCard 
                    content={exercise} 
                    onVote={handleVote}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* Featured Testimonial */}
      

      {/* Why Choose Us - Enhanced with animations and better layout */}
      <section className="py-20 px-4 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-indigo-50 rounded-bl-full opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-purple-50 rounded-tr-full opacity-50"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
            Pourquoi nous choisir
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 text-center hover:transform hover:scale-105 transition-all duration-300 shadow-xl border border-gray-100 group hover:border-indigo-200">
              <div className="w-20 h-20 mx-auto mb-6 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
                <CheckCircle className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Exercices vérifiés par des profs
              </h3>
              <p className="text-gray-600">
                Contenu de qualité validé par des enseignants expérimentés pour garantir la pertinence pédagogique
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 text-center hover:transform hover:scale-105 transition-all duration-300 shadow-xl border border-gray-100 group hover:border-purple-200 md:translate-y-4">
              <div className="w-20 h-20 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-600 transition-colors duration-300">
                <TrendingUp className="w-10 h-10 text-purple-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Progression adaptée
              </h3>
              <p className="text-gray-600">
                Des exercices personnalisés qui évoluent avec votre niveau pour un apprentissage optimal
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 text-center hover:transform hover:scale-105 transition-all duration-300 shadow-xl border border-gray-100 group hover:border-indigo-200">
              <div className="w-20 h-20 mx-auto mb-6 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
                <Users className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Communauté active
              </h3>
              <p className="text-gray-600">
                Échangez et progressez avec d'autres étudiants dans un environnement collaboratif et motivant
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
            Comment ça marche
          </h2>
          
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 hidden md:block"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="relative bg-white rounded-xl p-8 text-center shadow-xl border border-gray-100 z-10">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto -mt-16 mb-6 shadow-lg">1</div>
                <BookOpen className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Choisissez votre matière
                </h3>
                <p className="text-gray-600">
                  Sélectionnez le sujet et le niveau qui vous intéressent parmi notre vaste bibliothèque
                </p>
              </div>
              
              <div className="relative bg-white rounded-xl p-8 text-center shadow-xl border border-gray-100 z-10 md:mt-12">
                <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto -mt-16 mb-6 shadow-lg">2</div>
                <GraduationCap className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Pratiquez régulièrement
                </h3>
                <p className="text-gray-600">
                  Résolvez des exercices de difficulté croissante adaptés à votre progression
                </p>
              </div>
              
              <div className="relative bg-white rounded-xl p-8 text-center shadow-xl border border-gray-100 z-10">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto -mt-16 mb-6 shadow-lg">3</div>
                <TrendingUp className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Suivez vos progrès
                </h3>
                <p className="text-gray-600">
                  Visualisez votre évolution et identifiez vos points forts et axes d'amélioration
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics - Enhanced with animations and better styling */}
      <section className="py-16 px-4 bg-gradient-to-r from-indigo-900 to-purple-900 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white"></div>
          <div className="absolute top-40 right-20 w-20 h-20 rounded-full bg-white"></div>
          <div className="absolute bottom-10 left-1/3 w-30 h-30 rounded-full bg-white"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-300 to-indigo-200 text-transparent bg-clip-text mb-4">1000+</div>
              <div className="text-gray-300 text-lg">Exercices disponibles</div>
            </div>
            <div className="text-center transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-300 to-indigo-200 text-transparent bg-clip-text mb-4">5000+</div>
              <div className="text-gray-300 text-lg">Étudiants actifs</div>
            </div>
            <div className="text-center transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-300 to-indigo-200 text-transparent bg-clip-text mb-4">3000+</div>
              <div className="text-gray-300 text-lg">Solutions détaillées</div>
            </div>
            <div className="text-center transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-300 to-indigo-200 text-transparent bg-clip-text mb-4">85%</div>
              <div className="text-gray-300 text-lg">Taux de réussite</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
            Prêt à améliorer vos compétences en mathématiques?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Rejoignez notre communauté et commencez votre parcours d'apprentissage dès aujourd'hui
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register">
              <button className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full text-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-300">
                S'inscrire gratuitement
              </button>
            </Link>
            <Link to="/exercises">
              <button className="px-8 py-4 bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-full text-lg font-semibold shadow-md transform hover:scale-105 transition-all duration-300">
                Explorer les exercices
              </button>
            </Link>
          </div>
        </div>
      </section>

     

      <style>
        {`
        .particles-effect {
          background-image: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 30px 30px;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.7s ease-out forwards;
        }
        
        .animate-fade-in {
          animation: fadeIn 1s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-bounce-subtle {
          animation: bounceSlight 2s infinite;
        }
        
        @keyframes bounceSlight {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        `}
      </style>
    </div>
  );
}