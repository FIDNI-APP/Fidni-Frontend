// src/components/profile/SavedContentSection.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark, FileText, ChevronRight, Search, Star, PenTool, ArrowRight
} from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { motion, AnimatePresence } from 'framer-motion';
import type { Content } from '@/types';

interface SavedContentSectionProps {
  exercises: Content[];
  lessons?: Content[];
  exams?: Content[];
  isLoading?: boolean;
}

type ContentType = 'exercises' | 'lessons' | 'exams';

export const SavedContentSection: React.FC<SavedContentSectionProps> = ({
  exercises = [],
  lessons = [],
  exams = [],
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<ContentType>('exercises');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'exercises' as ContentType, label: 'Exercices', count: exercises.length, data: exercises, icon: PenTool, tint: 'bg-blue-50 text-blue-600', gradient: 'from-blue-600 to-blue-700', accentBg: 'bg-blue-600' },
    { id: 'lessons' as ContentType, label: 'Leçons', count: lessons.length, data: lessons, icon: LessonIcon, tint: 'bg-indigo-50 text-indigo-600', gradient: 'from-indigo-600 to-indigo-700', accentBg: 'bg-indigo-600' },
    { id: 'exams' as ContentType, label: 'Examens', count: exams.length, data: exams, icon: APlusIcon, tint: 'bg-violet-50 text-violet-600', gradient: 'from-violet-600 to-violet-700', accentBg: 'bg-violet-600' }
  ];

  const activeTabData = tabs.find(t => t.id === activeTab)!;
  const totalSaved = exercises.length + lessons.length + exams.length;

  const filteredContent = activeTabData.data.filter(item => {
    if (!searchQuery) return true;
    const title = item.title || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getPath = (type: ContentType, id: number) => {
    const paths = { exercises: '/exercises', lessons: '/lessons', exams: '/exams' };
    return `${paths[type]}/${id}`;
  };

  const getDifficultyConfig = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return { label: 'Facile', bg: 'bg-emerald-500/10', text: 'text-emerald-700', border: 'border-emerald-500/20', dot: 'bg-emerald-500' };
      case 'medium': return { label: 'Moyen', bg: 'bg-amber-500/10', text: 'text-amber-700', border: 'border-amber-500/20', dot: 'bg-amber-500' };
      case 'hard': return { label: 'Difficile', bg: 'bg-rose-500/10', text: 'text-rose-700', border: 'border-rose-500/20', dot: 'bg-rose-500' };
      default: return { label: difficulty || '', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header: total + segmented control + search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-slate-400" />
            <span className="text-2xl font-bold text-slate-900">{totalSaved}</span>
            <span className="text-sm text-slate-500">favoris</span>
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                  }`}>{tab.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-52"
          />
        </div>
      </div>

      {/* List */}
      <AnimatePresence mode="wait">
        {filteredContent.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 p-12 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Star className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Aucun favori</h3>
            <p className="text-slate-500 text-sm mb-5">
              {searchQuery ? 'Aucun résultat pour cette recherche' : `Sauvegardez des ${activeTabData.label.toLowerCase()} pour les retrouver ici`}
            </p>
            <Link
              to={`/${activeTab}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Explorer
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredContent.map((item) => {
              const Icon = activeTabData.icon;
              const diffConfig = item.difficulty ? getDifficultyConfig(item.difficulty) : null;
              return (
                <Link
                  key={item.id}
                  to={getPath(activeTab, item.id)}
                  className="group relative bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-xl hover:shadow-slate-900/10 hover:-translate-y-1 hover:border-slate-300 transition-all duration-300"
                >
                  {/* Top accent line */}
                  <div className={`h-1 bg-gradient-to-r ${activeTabData.gradient}`} />

                  <div className="p-5">
                    {/* Type badge + bookmark */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${activeTabData.tint} text-xs font-semibold tracking-wide`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{activeTabData.label}</span>
                      </div>
                      <Bookmark className="w-4 h-4 text-blue-500 fill-blue-500" />
                    </div>

                    {/* Title */}
                    <h4 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 mb-3 group-hover:text-slate-700 transition-colors">
                      {item.title || 'Sans titre'}
                    </h4>

                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      {item.subject?.name && (
                        <span className="inline-flex items-center px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold">
                          {item.subject.name}
                        </span>
                      )}
                      {diffConfig && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${diffConfig.bg} ${diffConfig.text} ${diffConfig.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${diffConfig.dot}`} />
                          {diffConfig.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
                    <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold text-white ${activeTabData.accentBg} group-hover:shadow-lg group-hover:scale-105 transition-all duration-200`}>
                      <span>Voir</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SavedContentSection;
