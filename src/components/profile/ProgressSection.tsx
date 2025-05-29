// src/components/profile/ProgressSection.tsx - Version améliorée
import React, { useState } from 'react';
import { Content } from '@/types';
import { Link } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  BookOpen, 
  BarChart3, 
  ChevronRight, 
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Zap,
  Award,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressSectionProps {
  successExercises: Content[];
  reviewExercises: Content[];
  isLoading: boolean;
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({ 
  successExercises, 
  reviewExercises, 
  isLoading 
}) => {
  const [activeTab, setActiveTab] = useState<'success' | 'review'>('success');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'difficulty' | 'subject'>('date');
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded-lg w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (successExercises.length === 0 && reviewExercises.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            Ma Progression
          </h2>
          <p className="text-indigo-100 mt-1">Suivez votre parcours d'apprentissage</p>
        </div>
        
        <div className="p-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 
                       rounded-full flex items-center justify-center mb-6"
          >
            <Trophy className="w-12 h-12 text-indigo-600" />
          </motion.div>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Commencez votre parcours
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Complétez des exercices pour suivre votre progression et identifier les domaines à améliorer
          </p>
          
          <Link to="/exercises">
            <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
              <BookOpen className="w-4 h-4 mr-2" />
              Explorer les exercices
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const exercises = activeTab === 'success' ? successExercises : reviewExercises;
  const totalCount = successExercises.length + reviewExercises.length;
  const successPercentage = totalCount > 0 ? Math.round((successExercises.length / totalCount) * 100) : 0;
  
  // Tri des exercices
  const sortedExercises = [...exercises].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'difficulty':
        const diffOrder = { easy: 0, medium: 1, hard: 2 };
        return diffOrder[b.difficulty] - diffOrder[a.difficulty];
      case 'subject':
        return a.subject.name.localeCompare(b.subject.name);
      default:
        return 0;
    }
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header avec gradient */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Target className="w-6 h-6" />
              Ma Progression
            </h2>
            <p className="text-indigo-100 mt-1">
              {totalCount} exercices • {successPercentage}% de réussite
            </p>
          </div>
          
          {/* Quick stats */}
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{successExercises.length}</div>
              <div className="text-xs text-indigo-200">Complétés</div>
            </div>
            <div className="w-px bg-white/20"></div>
            <div className="text-center">
              <div className="text-3xl font-bold">{reviewExercises.length}</div>
              <div className="text-xs text-indigo-200">À revoir</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Barre de progression visuelle */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progression globale</span>
          <span className="text-sm font-bold text-indigo-600">{successPercentage}%</span>
        </div>
        <div className="relative h-3 bg-white rounded-full overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${successPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
          />
          {/* Marqueurs de progression */}
          <div className="absolute inset-0 flex items-center justify-around">
            {[25, 50, 75].map((milestone) => (
              <div
                key={milestone}
                className={`w-0.5 h-full ${
                  successPercentage >= milestone ? 'bg-white/50' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Badges de progression */}
        <div className="flex justify-between mt-3">
          {[
            { threshold: 0, label: 'Débutant', icon: '🌱' },
            { threshold: 25, label: 'Apprenti', icon: '📚' },
            { threshold: 50, label: 'Confirmé', icon: '🎯' },
            { threshold: 75, label: 'Expert', icon: '🏆' },
          ].map((badge) => (
            <div
              key={badge.threshold}
              className={`text-center transition-all ${
                successPercentage >= badge.threshold
                  ? 'opacity-100 transform scale-100'
                  : 'opacity-40 transform scale-90'
              }`}
            >
              <div className="text-2xl mb-1">{badge.icon}</div>
              <div className="text-xs font-medium text-gray-600">{badge.label}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-6">
        {/* Contrôles de navigation et tri */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          {/* Tabs */}
          <div className="bg-gray-100 rounded-xl p-1 inline-flex">
            <button
              onClick={() => setActiveTab('success')}
              className={`
                relative px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300
                ${activeTab === 'success' ? 'text-white' : 'text-gray-600 hover:text-gray-900'}
              `}
            >
              {activeTab === 'success' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Complétés ({successExercises.length})
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('review')}
              className={`
                relative px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300
                ${activeTab === 'review' ? 'text-white' : 'text-gray-600 hover:text-gray-900'}
              `}
            >
              {activeTab === 'review' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                À revoir ({reviewExercises.length})
              </span>
            </button>
          </div>
          
          {/* Contrôles de vue et tri */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date">Plus récents</option>
              <option value="difficulty">Par difficulté</option>
              <option value="subject">Par matière</option>
            </select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {exercises.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className={`
              w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center
              ${activeTab === 'success' ? 'bg-emerald-100' : 'bg-amber-100'}
            `}>
              {activeTab === 'success' ? (
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              ) : (
                <XCircle className="w-8 h-8 text-amber-600" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              Aucun exercice {activeTab === 'success' ? 'complété' : 'à revoir'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'success' 
                ? 'Les exercices que vous complétez avec succès apparaîtront ici' 
                : 'Les exercices nécessitant plus de pratique apparaîtront ici'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${viewMode}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}
            >
              {sortedExercises.map((exercise, index) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  type={activeTab}
                  viewMode={viewMode}
                  index={index}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
        
        {exercises.length > 6 && (
          <div className="mt-8 text-center">
            <Button variant="outline" className="group">
              Voir tous les exercices ({exercises.length})
              <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Composant pour les cartes d'exercices
const ExerciseCard = ({ 
  exercise, 
  type, 
  viewMode, 
  index 
}: { 
  exercise: Content; 
  type: 'success' | 'review';
  viewMode: 'grid' | 'list';
  index: number;
}) => {
  const difficultyConfig = {
    easy: { label: 'Facile', color: 'emerald', icon: '🌱' },
    medium: { label: 'Moyen', color: 'amber', icon: '🎯' },
    hard: { label: 'Difficile', color: 'red', icon: '🔥' }
  };
  
  const diff = difficultyConfig[exercise.difficulty];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      className="group"
    >
      <Link to={`/exercises/${exercise.id}`}>
        <div className={`
          bg-white border rounded-xl p-5 hover:shadow-md transition-all duration-300
          ${type === 'success' ? 'border-emerald-200 hover:border-emerald-300' : 'border-amber-200 hover:border-amber-300'}
          ${viewMode === 'list' ? 'flex items-center justify-between' : ''}
        `}>
          <div className={viewMode === 'list' ? 'flex-1' : ''}>
            {/* En-tête avec titre et badge de statut */}
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 flex-1">
                {exercise.title}
              </h3>
              <div className={`
                ml-2 px-2 py-1 rounded-full text-xs font-medium
                ${type === 'success' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-amber-100 text-amber-700'}
              `}>
                {type === 'success' ? 'Réussi' : 'À revoir'}
              </div>
            </div>
            
            {/* Métadonnées */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {/* Matière */}
              <div className="flex items-center gap-1.5 text-gray-600">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{exercise.subject.name}</span>
              </div>
              
              {/* Difficulté */}
              <div className={`flex items-center gap-1.5 text-${diff.color}-600`}>
                <span>{diff.icon}</span>
                <span>{diff.label}</span>
              </div>
              
              {/* Date */}
              <div className="flex items-center gap-1.5 text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(exercise.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          {/* Flèche indicatrice */}
          <ChevronRight className={`
            w-5 h-5 text-gray-400 group-hover:text-indigo-600 
            transition-all group-hover:translate-x-1
            ${viewMode === 'list' ? 'ml-4' : 'hidden'}
          `} />
        </div>
      </Link>
    </motion.div>
  );
};