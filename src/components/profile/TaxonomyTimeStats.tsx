/**
 * TaxonomyTimeStats - Display time spent by taxonomy (subject, chapter, etc.)
 * Simple, sorted list with search/filter capability
 */
import React, { useState, useEffect } from 'react';
import { Clock, Search, BookOpen, Layers, FileText, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { getTaxonomyTimeStats, type TaxonomyTimeItem } from '@/lib/api';

const TAXONOMY_ICONS = {
  subject: BookOpen,
  subfield: Layers,
  chapter: FileText,
  theorem: Award
};

const TAXONOMY_LABELS = {
  subject: 'Matière',
  subfield: 'Sous-domaine',
  chapter: 'Chapitre',
  theorem: 'Théorème'
};

const TAXONOMY_COLORS = {
  subject: 'from-blue-500 to-cyan-500',
  subfield: 'from-purple-500 to-pink-500',
  chapter: 'from-emerald-500 to-teal-500',
  theorem: 'from-amber-500 to-orange-500'
};

export const TaxonomyTimeStats: React.FC = () => {
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
    return `${minutes}min`;
  };

  // Filter by search
  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Temps par sujet</h3>
            <p className="text-sm text-slate-300">Temps passé sur chaque élément</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-b border-slate-200 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tous
          </button>
          {Object.entries(TAXONOMY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterType(key as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === key
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Chargement...</div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            {search ? 'Aucun résultat trouvé' : 'Aucune donnée disponible'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredData.map((item, index) => {
              const Icon = TAXONOMY_ICONS[item.taxonomy_type];
              const gradient = TAXONOMY_COLORS[item.taxonomy_type];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {/* Icon */}
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {TAXONOMY_LABELS[item.taxonomy_type]}
                    </p>
                  </div>

                  {/* Time */}
                  <div className="text-right">
                    <p className="font-bold text-slate-800">
                      {formatTime(item.total_time_seconds)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};
