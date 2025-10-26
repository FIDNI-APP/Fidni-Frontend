// src/components/profile/StatsDashboard.tsx - Version améliorée
import React, { useState } from 'react';
import { 
  Activity, BookOpen, ChevronUp, MessageSquare, Eye, 
  CheckCircle, XCircle, Bookmark, Brain, Award,
  Target, Zap, Star, Clock, BarChart3, Users,
  ArrowUp, ArrowDown, Minus, Trophy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StatsDashboardProps {
  contributionStats: {
    exercises: number;
    solutions: number;
    comments: number;
    total_contributions: number;
    upvotes_received: number;
    view_count: number;
  };
  learningStats?: {
    exercises_completed: number;
    exercises_in_review: number;
    exercises_saved: number;
    subjects_studied: string[];
    total_viewed: number;
  };
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ 
  contributionStats, 
  learningStats 
}) => {
  const [activeSection, setActiveSection] = useState<'contribution' | 'learning'>('contribution');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month');
  
  // Calcul des tendances (simulation pour la démo)
  const getTrend = (value: number) => {
    const random = Math.random();
    if (random > 0.7) return { direction: 'up', percentage: Math.floor(Math.random() * 20) + 5 };
    if (random < 0.3) return { direction: 'down', percentage: Math.floor(Math.random() * 10) + 1 };
    return { direction: 'stable', percentage: 0 };
  };
  
  // Stats de contribution avec métadonnées enrichies
  const contributionItems = [
    {
      id: 'exercises',
      icon: BookOpen,
      label: 'Exercices créés',
      value: contributionStats.exercises,
      color: 'indigo',
      gradient: 'from-indigo-500 to-indigo-600',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      description: 'Exercices partagés avec la communauté',
      trend: getTrend(contributionStats.exercises)
    },
    {
      id: 'comments',
      icon: MessageSquare,
      label: 'Commentaires',
      value: contributionStats.comments,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      description: 'Participations aux discussions',
      trend: getTrend(contributionStats.comments)
    },
    {
      id: 'upvotes',
      icon: ChevronUp,
      label: 'Points de réputation',
      value: contributionStats.upvotes_received,
      color: 'emerald',
      gradient: 'from-emerald-500 to-emerald-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      description: 'Votes positifs reçus',
      trend: getTrend(contributionStats.upvotes_received)
    },
    {
      id: 'views',
      icon: Eye,
      label: 'Vues totales',
      value: contributionStats.view_count,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      description: 'Impact de vos contributions',
      trend: getTrend(contributionStats.view_count)
    },
    {
      id: 'solutions',
      icon: Award,
      label: 'Solutions fournies',
      value: contributionStats.solutions,
      color: 'amber',
      gradient: 'from-amber-500 to-amber-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      description: 'Aide apportée aux autres',
      trend: getTrend(contributionStats.solutions)
    },
    {
      id: 'total',
      icon: Activity,
      label: 'Total contributions',
      value: contributionStats.total_contributions,
      color: 'rose',
      gradient: 'from-rose-500 to-rose-600',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-600',
      borderColor: 'border-rose-200',
      description: 'Engagement global',
      trend: getTrend(contributionStats.total_contributions)
    }
  ];
  
  // Stats d'apprentissage
  const learningItems = learningStats ? [
    {
      id: 'completed',
      icon: CheckCircle,
      label: 'Exercices complétés',
      value: learningStats.exercises_completed,
      color: 'green',
      gradient: 'from-green-500 to-green-600',
      bgLight: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
      description: 'Réussis avec succès',
      trend: getTrend(learningStats.exercises_completed)
    },
    {
      id: 'review',
      icon: XCircle,
      label: 'À revoir',
      value: learningStats.exercises_in_review,
      color: 'amber',
      gradient: 'from-amber-500 to-amber-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      description: 'Nécessitent plus de pratique',
      trend: getTrend(learningStats.exercises_in_review)
    },
    {
      id: 'saved',
      icon: Bookmark,
      label: 'Exercices sauvegardés',
      value: learningStats.exercises_saved,
      color: 'indigo',
      gradient: 'from-indigo-500 to-indigo-600',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      description: 'Pour plus tard',
      trend: getTrend(learningStats.exercises_saved)
    },
    {
      id: 'viewed',
      icon: Eye,
      label: 'Exercices consultés',
      value: learningStats.total_viewed,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      description: 'Exploration totale',
      trend: getTrend(learningStats.total_viewed)
    },
    {
      id: 'subjects',
      icon: Brain,
      label: 'Matières étudiées',
      value: learningStats.subjects_studied.length,
      color: 'violet',
      gradient: 'from-violet-500 to-violet-600',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-600',
      borderColor: 'border-violet-200',
      description: 'Diversité d\'apprentissage',
      trend: getTrend(learningStats.subjects_studied.length)
    }
  ] : [];
  
  const currentItems = activeSection === 'contribution' ? contributionItems : learningItems;
  
  return (
    <div className="space-y-6">
      {/* Header avec sélecteur de section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-1.5 inline-flex">
          <button
            onClick={() => setActiveSection('contribution')}
            className={`
              relative px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300
              ${activeSection === 'contribution' 
                ? 'text-white' 
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {activeSection === 'contribution' && (
              <motion.div
                layoutId="activeSection"
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Contributions
            </span>
          </button>
          
          {learningStats && (
            <button
              onClick={() => setActiveSection('learning')}
              className={`
                relative px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300
                ${activeSection === 'learning' 
                  ? 'text-white' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {activeSection === 'learning' && (
                <motion.div
                  layoutId="activeSection"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Apprentissage
              </span>
            </button>
          )}
        </div>
        
        {/* Sélecteur de période */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm">
          {(['week', 'month', 'year'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedTimeframe(period)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${selectedTimeframe === period
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {period === 'week' ? 'Semaine' : period === 'month' ? 'Mois' : 'Année'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Grille de cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="wait">
          {currentItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className="relative"
            >
              <div className={`
                relative bg-white rounded-2xl shadow-sm hover:shadow-lg 
                transition-all duration-300 overflow-hidden group
                border ${item.borderColor}
                ${hoveredCard === item.id ? 'scale-[1.02]' : ''}
              `}>
                {/* Effet de gradient au survol */}
                <div className={`
                  absolute inset-0 opacity-0 group-hover:opacity-5 
                  bg-gradient-to-br ${item.gradient} 
                  transition-opacity duration-300
                `} />
                
                {/* Contenu de la carte */}
                <div className="relative p-6">
                  {/* En-tête avec icône et tendance */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`
                      w-14 h-14 rounded-2xl ${item.bgLight} 
                      flex items-center justify-center
                      group-hover:scale-110 transition-transform duration-300
                    `}>
                      <item.icon className={`w-7 h-7 ${item.textColor}`} />
                    </div>
                    
                    {/* Indicateur de tendance */}
                    <div className="flex items-center gap-1">
                      {item.trend.direction === 'up' && (
                        <>
                          <ArrowUp className="w-4 h-4 text-green-500" />
                          <span className="text-xs font-medium text-green-600">
                            +{item.trend.percentage}%
                          </span>
                        </>
                      )}
                      {item.trend.direction === 'down' && (
                        <>
                          <ArrowDown className="w-4 h-4 text-red-500" />
                          <span className="text-xs font-medium text-red-600">
                            -{item.trend.percentage}%
                          </span>
                        </>
                      )}
                      {item.trend.direction === 'stable' && (
                        <>
                          <Minus className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">
                            Stable
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Valeur principale avec animation */}
                  <div className="mb-2">
                    <motion.div 
                      className="text-3xl font-bold text-gray-800"
                      initial={{ scale: 1 }}
                      animate={{ scale: hoveredCard === item.id ? 1.05 : 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {item.value.toLocaleString()}
                    </motion.div>
                  </div>
                  
                  {/* Label */}
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    {item.label}
                  </div>
                  
                  {/* Description au survol */}
                  <AnimatePresence>
                    {hoveredCard === item.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs text-gray-500 mt-2"
                      >
                        {item.description}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Barre de progression en bas */}
                <div className="h-1 bg-gray-100">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${item.gradient}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((item.value / 100) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Section des sujets étudiés pour l'apprentissage */}
      {activeSection === 'learning' && learningStats && learningStats.subjects_studied.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-indigo-100"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Matières étudiées
          </h3>
          
          <div className="flex flex-wrap gap-3">
            {learningStats.subjects_studied.map((subject, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="group relative"
              >
                <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-indigo-100 
                            hover:shadow-md transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400"></div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                      {subject}
                    </span>
                  </div>
                </div>
                
                {/* Effet de brillance au survol */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white to-transparent 
                              opacity-0 group-hover:opacity-30 transition-opacity duration-300 
                              transform -skew-x-12 group-hover:animate-shimmer pointer-events-none"></div>
              </motion.div>
            ))}
          </div>
          
          {/* Indicateur de progression globale */}
          <div className="mt-6 bg-white/50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Taux de complétion global</span>
              <span className="text-sm font-bold text-indigo-600">
                {calculateCompletionRate(learningStats)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${calculateCompletionRate(learningStats)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Carte récapitulative des achievements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white relative overflow-hidden"
      >
        {/* Motif de fond */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl transform -translate-x-32 translate-y-32"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Récapitulatif des performances
            </h3>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Période: {
                selectedTimeframe === 'week' ? 'Cette semaine' :
                selectedTimeframe === 'month' ? 'Ce mois' : 'Cette année'
              }</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Metric cards */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-300">Score total</span>
              </div>
              <div className="text-2xl font-bold">
                {contributionStats.upvotes_received * 10 + contributionStats.total_contributions * 5}
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-300">Impact</span>
              </div>
              <div className="text-2xl font-bold">
                {formatNumber(contributionStats.view_count)}
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-300">Taux de succès</span>
              </div>
              <div className="text-2xl font-bold">
                {learningStats ? `${calculateSuccessRate(learningStats)}%` : 'N/A'}
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-300">Objectif</span>
              </div>
              <div className="text-2xl font-bold">
                {getNextMilestone(contributionStats.total_contributions)}
              </div>
            </div>
          </div>
          
          {/* Badges et récompenses */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Badges débloqués</h4>
            <div className="flex gap-3">
              {getBadges(contributionStats, learningStats).map((badge, index) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: badge.earned ? 1 : 0.3, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className={`relative group ${!badge.earned && 'grayscale'}`}
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 
                                flex items-center justify-center text-2xl cursor-pointer
                                hover:scale-110 transition-transform">
                    {badge.icon}
                  </div>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                                opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs rounded-lg py-1 px-2 whitespace-nowrap">
                      {badge.name}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Graphique d'activité (simulation) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Activité récente
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-gray-600">Contributions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-gray-600">Apprentissage</span>
            </div>
          </div>
        </div>
        
        {/* Graphique simple avec barres */}
        <div className="flex items-end justify-between gap-2 h-32">
          {Array.from({ length: 7 }, (_, i) => {
            const contributionHeight = Math.random() * 100;
            const learningHeight = Math.random() * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 items-end h-24">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${contributionHeight}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="flex-1 bg-indigo-500 rounded-t"
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${learningHeight}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 + 0.1 }}
                    className="flex-1 bg-emerald-500 rounded-t"
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

// Helper function to calculate completion rate
const calculateCompletionRate = (stats: any) => {
  const completed = stats.exercises_completed || 0;
  const reviewing = stats.exercises_in_review || 0;
  const total = completed + reviewing;
  
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};
const calculateSuccessRate = (stats: any) => {
  if (!stats) return 0;
  const completed = stats.exercises_completed || 0;
  const total = stats.exercises_completed + stats.exercises_in_review || 0;
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};

const getNextMilestone = (current: number) => {
  const milestones = [10, 25, 50, 100, 250, 500, 1000];
  for (const milestone of milestones) {
    if (current < milestone) return milestone;
  }
  return '∞';
};

const getBadges = (contributionStats: any, learningStats: any) => {
  return [
    {
      id: 'starter',
      name: 'Débutant',
      icon: '🌱',
      earned: true,
      requirement: 'Premier exercice'
    },
    {
      id: 'contributor',
      name: 'Contributeur',
      icon: '✍️',
      earned: contributionStats.total_contributions >= 10,
      requirement: '10 contributions'
    },
    {
      id: 'helper',
      name: 'Entraide',
      icon: '🤝',
      earned: contributionStats.solutions >= 5,
      requirement: '5 solutions'
    },
    {
      id: 'popular',
      name: 'Populaire',
      icon: '⭐',
      earned: contributionStats.upvotes_received >= 50,
      requirement: '50 votes positifs'
    },
    {
      id: 'scholar',
      name: 'Érudit',
      icon: '🎓',
      earned: learningStats?.exercises_completed >= 50,
      requirement: '50 exercices complétés'
    },]}

// Enhanced stat card with color gradient and animation
const StatCard = ({ 
  icon, 
  label, 
  value, 
  bgColor, 
  textColor 
}: { 
  icon: React.ReactNode, 
  label: string, 
  value: number,
  bgColor: string,
  textColor: string
}) => (
  <div className={`bg-gradient-to-br ${bgColor} rounded-lg shadow-md hover:shadow-lg transition-all p-5 hover:-translate-y-1 duration-300`}>
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ${textColor}`}>
        {icon}
      </div>
      <span className={`text-2xl font-bold ${textColor}`}>{value.toLocaleString()}</span>
    </div>
    <div className={`mt-2 ${textColor} text-sm font-medium`}>{label}</div>
  </div>
);

export default StatsDashboard;