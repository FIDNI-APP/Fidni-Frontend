/**
 * TaxonomyTimeStatsNew - Redesigned time stats with content type breakdown
 * Optimized, user-friendly, and visually coherent design
 */
import React, { useState, useEffect } from 'react';
import { Clock, Search, BookOpen, Layers, FileText, Award, PenTool, GraduationCap, FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { getTaxonomyTimeStats, type TaxonomyTimeItem } from '@/lib/api';

const TAXONOMY_CONFIG = {
  subject: {
    icon: GraduationCap,
    label: 'Matières',
    color: 'bg-blue-500',
    gradient: 'from-blue-500 to-cyan-500',
    hoverBg: 'hover:bg-blue-50',
  },
  subfield: {
    icon: Layers,
    label: 'Sous-domaines',
    color: 'bg-purple-500',
    gradient: 'from-purple-500 to-pink-500',
    hoverBg: 'hover:bg-purple-50',
  },
  chapter: {
    icon: FileText,
    label: 'Chapitres',
    color: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-teal-500',
    hoverBg: 'hover:bg-emerald-50',
  },
  theorem: {
    icon: Award,
    label: 'Théorèmes',
    color: 'bg-amber-500',
    gradient: 'from-amber-500 to-orange-500',
    hoverBg: 'hover:bg-amber-50',
  },
};

const CONTENT_TYPE_CONFIG = {
  exercise: { icon: PenTool, label: 'Exercices', color: 'text-blue-600', bg: 'bg-blue-100' },
  lesson: { icon: BookOpen, label: 'Leçons', color: 'text-green-600', bg: 'bg-green-100' },
  exam: { icon: FileCheck, label: 'Examens', color: 'text-purple-600', bg: 'bg-purple-100' },
};

export const TaxonomyTimeStatsNew: React.FC = () => {
  const [data, setData] = useState<TaxonomyTimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'subject' | 'subfield' | 'chapter' | 'theorem'>('all');

  useEffect(() => {
    loadData();
  }, [filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = filterType !== 'all' ? { taxonomy_type: filterType } : undefined;
      const response = await getTaxonomyTimeStats(params);
      setData(response.results);
    } catch (error) {
      console.error('Failed to load taxonomy time stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return minutes > 0 ? `${minutes}min` : `${seconds}s`;
  };

  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Filter Tabs - Clean and minimal */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-200'
            }`}
          >
            Tous
          </button>
          {Object.entries(TAXONOMY_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setFilterType(key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === key
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-gray-100">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {search ? 'Aucun résultat trouvé' : 'Aucune donnée disponible'}
            </p>
          </div>
        ) : (
          filteredData.map((item) => {
            const config = TAXONOMY_CONFIG[item.taxonomy_type];
            const Icon = config.icon;
            const hasBreakdown = item.exercise_time_seconds > 0 || item.lesson_time_seconds > 0 || item.exam_time_seconds > 0;

            return (
              <div
                key={item.id}
                className="bg-white p-5 rounded-lg border-2 border-gray-100 hover:border-gray-200 transition-colors"
              >
                {/* Header Row */}
                <div className="flex items-center gap-4 mb-3">
                  <div className={`p-2.5 rounded-lg ${config.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                    <p className="text-xs text-gray-500">{config.label.slice(0, -1)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {formatTime(item.total_time_seconds)}
                    </p>
                  </div>
                </div>

                {/* Content Type Breakdown */}
                {hasBreakdown && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                    {item.exercise_time_seconds > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-50">
                        <PenTool className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          {formatTime(item.exercise_time_seconds)}
                        </span>
                        <span className="text-xs text-blue-600">exercices</span>
                      </div>
                    )}
                    {item.lesson_time_seconds > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-green-50">
                        <BookOpen className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-sm font-medium text-green-900">
                          {formatTime(item.lesson_time_seconds)}
                        </span>
                        <span className="text-xs text-green-600">leçons</span>
                      </div>
                    )}
                    {item.exam_time_seconds > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-purple-50">
                        <FileCheck className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">
                          {formatTime(item.exam_time_seconds)}
                        </span>
                        <span className="text-xs text-purple-600">examens</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
