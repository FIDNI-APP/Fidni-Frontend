/**
 * SavedContentSection - Unified section for saved exercises, lessons, and exams
 * Replaces the old SavedExercisesSection with tabs for all content types
 */
import React, { useState } from 'react';
import { BookOpen, GraduationCap, Award, Bookmark, ChevronRight, Clock, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { Content } from '@/types';

interface SavedContentSectionProps {
  exercises: Content[];
  lessons?: Content[];
  exams?: Content[];
  isLoading?: boolean;
}

type ContentTab = 'exercises' | 'lessons' | 'exams';

export const SavedContentSection: React.FC<SavedContentSectionProps> = ({
  exercises = [],
  lessons = [],
  exams = [],
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<ContentTab>('exercises');

  const tabs = [
    {
      id: 'exercises' as ContentTab,
      label: 'Exercices',
      icon: BookOpen,
      count: exercises.length,
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500',
      data: exercises
    },
    {
      id: 'lessons' as ContentTab,
      label: 'Leçons',
      icon: GraduationCap,
      count: lessons.length,
      color: 'purple',
      gradient: 'from-purple-500 to-pink-500',
      data: lessons
    },
    {
      id: 'exams' as ContentTab,
      label: 'Examens',
      icon: Award,
      count: exams.length,
      color: 'orange',
      gradient: 'from-orange-500 to-red-500',
      data: exams
    }
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);
  const currentData = activeTabData?.data || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <Bookmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Contenu enregistré</h2>
            <p className="text-sm text-purple-100">Vos exercices, leçons et examens sauvegardés</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-gray-50/50">
        <div className="flex gap-2 p-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-md hover:shadow-lg`
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`ml-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-12 h-12 border-3 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          </div>
        ) : currentData.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${activeTabData?.gradient} flex items-center justify-center opacity-20`}>
              {activeTabData && <activeTabData.icon className="w-8 h-8 text-white" />}
            </div>
            <h4 className="text-lg font-semibold text-slate-700 mb-2">
              Aucun {activeTabData?.label.toLowerCase()} enregistré
            </h4>
            <p className="text-sm text-slate-500">
              Enregistrez des {activeTabData?.label.toLowerCase()} pour les retrouver facilement ici
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {currentData.map((item, index) => (
                <ContentCard
                  key={item.id}
                  content={item}
                  type={activeTab}
                  gradient={activeTabData?.gradient || ''}
                  index={index}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

// Content Card Component
interface ContentCardProps {
  content: Content;
  type: ContentTab;
  gradient: string;
  index: number;
}

const ContentCard: React.FC<ContentCardProps> = ({ content, type, gradient, index }) => {
  const getContentPath = () => {
    switch (type) {
      case 'exercises': return `/exercises/${content.id}`;
      case 'lessons': return `/lessons/${content.id}`;
      case 'exams': return `/exams/${content.id}`;
      default: return '#';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <Link
        to={getContentPath()}
        className="block group"
      >
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200">
          {/* Gradient accent bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`}></div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors mb-2 line-clamp-2 text-base">
                  {content.title}
                </h4>
                {content.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
                    {content.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  {content.class_level_names && content.class_level_names.length > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {content.class_level_names[0]}
                    </span>
                  )}
                  {content.subject_name && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg font-medium">
                      <BookOpen className="w-3.5 h-3.5" />
                      {content.subject_name}
                    </span>
                  )}
                  {content.created_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(content.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className="p-2.5 rounded-xl bg-gray-100 group-hover:bg-purple-100 transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
