// src/components/profile/ContributionsSection.tsx - Amélioré
import React from 'react';
import { Link } from 'react-router-dom';
import { Content } from '@/types';
import { FileText, Eye, MessageSquare, Calendar, BarChart3, ChevronRight, BookOpen, PlusCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface ContributionsSectionProps {
  success_exercises: { // Assuming these are exercises *created by the user* that are successful
    exercises: Content[];
  },
  review_exercises: { // Exercises created by the user that might be under review or need changes
    exercises: Content[];
  },
  isLoading: boolean;
}

const ContributionCard: React.FC<{ exercise: Content, index: number }> = ({ exercise, index }) => {
  const difficultyMap: { [key: string]: { label: string; color: string; iconColor: string } } = {
    easy: { label: 'Facile', color: 'bg-green-50 text-green-700', iconColor: 'text-green-500' },
    medium: { label: 'Moyen', color: 'bg-yellow-50 text-yellow-700', iconColor: 'text-yellow-500' },
    hard: { label: 'Difficile', color: 'bg-red-50 text-red-700', iconColor: 'text-red-500' },
  };
  const diffInfo = difficultyMap[exercise.difficulty] || { label: exercise.difficulty, color: 'bg-gray-100 text-gray-700', iconColor: 'text-gray-500' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ y: -4, boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.1), 0 4px 6px -4px rgba(99, 102, 241, 0.1)" }} // Indigo shadow
      className="group"
    >
      <Link
        to={`/exercises/${exercise.id}`} // Or a specific "edit contribution" link
        className="block bg-white border border-gray-200 rounded-xl p-5 transition-all duration-300 h-full flex flex-col"
      >
        <div className="flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-md text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
              {exercise.title}
            </h3>
            {/* Optional: Could add a status pill here if applicable, e.g., "Published", "Draft", "Needs Review" */}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 items-center mt-1 mb-3 text-xs text-gray-500">
            <span className="flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
              {new Date(exercise.created_at).toLocaleDateString()}
            </span>
            <span className="flex items-center">
              <Eye className="w-3.5 h-3.5 mr-1 text-gray-400" />
              {exercise.view_count || 0}
            </span>
            <span className="flex items-center">
              <MessageSquare className="w-3.5 h-3.5 mr-1 text-gray-400" />
              {(exercise.comments || []).length}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 items-center text-xs">
            {exercise.subject && (
              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium flex items-center">
                <BookOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                {exercise.subject.name}
              </span>
            )}
            <span className={`${diffInfo.color} px-2.5 py-1 rounded-full font-medium flex items-center`}>
              <BarChart3 className={`w-3.5 h-3.5 mr-1.5 ${diffInfo.iconColor}`} />
              {diffInfo.label}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end items-center">
          <span className="text-xs text-indigo-600 group-hover:text-indigo-700 font-medium">
            Voir Détails
          </span>
          <ChevronRight className="w-4 h-4 ml-1 text-indigo-600 group-hover:text-indigo-700 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
};

export const ContributionsSection: React.FC<ContributionsSectionProps> = ({
  success_exercises, // Assuming these are user's successfully published/accepted exercises
  review_exercises,  // Assuming these are user's exercises needing review or revision
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-7 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 h-40 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Combine and maybe differentiate them visually if needed, or show in tabs
  const allContributions = [...success_exercises.exercises, ...review_exercises.exercises]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Sort by most recent

  if (allContributions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center text-gray-800">
            <FileText className="w-5 h-5 mr-2 text-indigo-600" />
            Mes Contributions
          </h2>
        </div>
        <div className="text-center py-12 px-6 border-2 border-dashed border-gray-200 rounded-xl">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Aucune contribution pour le moment</h3>
          <p className="text-gray-500 mb-6">Partagez votre savoir en créant de nouveaux exercices.</p>
          <Link to="/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <PlusCircle className="w-5 h-5 mr-2" />
              Créer un exercice
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const MAX_DISPLAY = 4; // Show limited items initially

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <h2 className="text-xl font-semibold flex items-center text-gray-800">
            <FileText className="w-5 h-5 mr-2.5 text-indigo-600" />
            Mes Contributions ({allContributions.length})
          </h2>
          <Link to="/new">
            <Button variant="ghost" className="border-indigo-500 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 w-full sm:w-auto">
               <PlusCircle className="w-4 h-4 mr-2" /> Créer
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {allContributions.slice(0, MAX_DISPLAY).map((exercise, index) => (
            <ContributionCard key={exercise.id} exercise={exercise} index={index} />
          ))}
        </div>

        {allContributions.length > MAX_DISPLAY && (
          <div className="mt-8 text-center">
            <Link to="/my-contributions"> {/* Assuming a dedicated page for all contributions */}
              <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                Voir toutes les contributions ({allContributions.length})
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};