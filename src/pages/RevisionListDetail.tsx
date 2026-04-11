import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getRevisionList,
  removeItemFromRevisionList,
  updateRevisionList,
  getRevisionListStatistics,
  type RevisionList,
  type RevisionListItem,
  type RevisionListStatistics
} from '@/lib/api';
import {
  ArrowLeft,
  Trash2,
  Edit2,
  Save,
  X,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  ListX,
  Printer,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Content } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { ExerciseRenderer } from '@/components/content/viewer/ExerciseRenderer';
import { ContentPreview } from '@/components/editor';

export const RevisionListDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [list, setList] = useState<RevisionList | null>(null);
  const [statistics, setStatistics] = useState<RevisionListStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showAllSolutions, setShowAllSolutions] = useState(false);

  useEffect(() => {
    if (id) {
      loadList();
    }
  }, [id]);

  const loadList = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getRevisionList(parseInt(id));
      setList(data);
      setEditName(data.name);
      setEditDescription(data.description);

      try {
        const stats = await getRevisionListStatistics(parseInt(id));
        setStatistics(stats);
      } catch (statsError) {
        console.error('Failed to load statistics:', statsError);
      }
    } catch (error) {
      console.error('Failed to load revision list:', error);
      if (user?.username) {
        navigate(`/profile/${user.username}`);
      } else {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!id || !list) return;
    if (!confirm('Êtes-vous sûr de vouloir retirer cet élément de la liste ?')) return;

    try {
      await removeItemFromRevisionList(parseInt(id), itemId);
      await loadList();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleUpdateList = async () => {
    if (!id) return;

    try {
      await updateRevisionList(parseInt(id), {
        name: editName,
        description: editDescription
      });
      setIsEditing(false);
      await loadList();
    } catch (error) {
      console.error('Failed to update list:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Facile';
      case 'medium': return 'Moyen';
      case 'hard': return 'Difficile';
      default: return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-emerald-600';
      case 'medium': return 'text-amber-600';
      case 'hard': return 'text-rose-600';
      default: return 'text-slate-500';
    }
  };

  const getTypeAccent = (contentTypeName: string) => {
    if (contentTypeName === 'exam') return 'bg-violet-600';
    return 'bg-blue-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-12 h-12 border-2 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-500 text-sm">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full border border-slate-200"
        >
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ListX className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Liste non trouvée</h2>
          <p className="text-slate-500 mb-6 text-sm">Cette liste n'existe pas ou a été supprimée.</p>
          <Button
            onClick={() => navigate('/revision-lists')}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 ${showAllSolutions ? '' : 'revision-solutions-hidden'}`}>
      {/* Header */}
      <section className="revision-print-hide relative bg-gradient-to-br from-slate-900 to-purple-900 text-white py-10 overflow-hidden">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="revGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#revGrid)" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Back */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
            <Button
              onClick={() => user?.username ? navigate(`/profile/${user.username}?tab=revisionlists`) : navigate('/')}
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Retour aux listes
            </Button>
          </motion.div>

          {/* Title + actions */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            {isEditing ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-white/30 focus:border-white/30 text-lg font-bold"
                  placeholder="Nom de la liste..."
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white/80 placeholder-white/40 focus:ring-2 focus:ring-white/30 resize-none text-sm"
                  rows={2}
                  placeholder="Description..."
                />
                <div className="flex gap-2">
                  <Button onClick={handleUpdateList} className="bg-white/20 hover:bg-white/30 text-white border border-white/30 text-sm">
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Enregistrer
                  </Button>
                  <Button
                    onClick={() => { setIsEditing(false); setEditName(list.name); setEditDescription(list.description); }}
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20 text-sm"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1.5 leading-tight">
                      {list.name}
                    </h1>
                    {list.description && (
                      <p className="text-white/60 text-sm leading-relaxed">{list.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      onClick={() => setShowAllSolutions(!showAllSolutions)}
                      className={`text-sm border ${showAllSolutions
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30'
                        : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      {showAllSolutions ? <Eye className="w-3.5 h-3.5 mr-1.5" /> : <EyeOff className="w-3.5 h-3.5 mr-1.5" />}
                      Solutions
                    </Button>
                    <Button
                      onClick={() => window.print()}
                      className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/20 text-sm"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      Imprimer
                    </Button>
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/20 text-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                      Modifier
                    </Button>
                  </div>
                </div>

                {/* Inline stats */}
                <div className="flex flex-wrap items-center gap-5 mt-5 text-white/70 text-sm">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>{list.item_count} exercice{list.item_count !== 1 ? 's' : ''}</span>
                  </div>
                  {statistics && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>{statistics.completed}/{statistics.total_items} complétés</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" />
                        <span>{statistics.progress_percentage}%</span>
                      </div>
                      {statistics.total_time_seconds > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(statistics.total_time_seconds)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(list.created_at)}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Print-only title block */}
      <div className="revision-print-only">
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', textAlign: 'center', marginBottom: '4px' }}>{list.name}</h1>
        {list.description && <p style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginBottom: '4px' }}>{list.description}</p>}
        <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', marginBottom: '16px' }}>
          {list.item_count} exercice{list.item_count !== 1 ? 's' : ''} · {formatDate(list.created_at)}
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #ddd', marginBottom: '24px' }} />
      </div>

      {/* Exercise cards — feuille de TD */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {list.items && list.items.length > 0 ? (
          <AnimatePresence>
            <div className="flex flex-col gap-8">
              {list.items.map((item, index) => {
                const content = item.content_object as Content;
                if (!content) return null;

                const hasStructure = content.structure && typeof content.structure === 'object';
                const accentColor = getTypeAccent(item.content_type_name);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ delay: index * 0.04 }}
                    className="revision-exercise-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* Top accent */}
                    <div className={`h-1 ${accentColor}`} />

                    {/* Card header */}
                    <div className="px-6 pt-5 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              {item.content_type_name === 'exam' ? 'Examen' : 'Exercice'} {index + 1}
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-slate-900 leading-snug">
                            {content.title}
                          </h2>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="revision-print-hide flex-shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label="Retirer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        {content.subject && (
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            {typeof content.subject === 'string' ? content.subject : content.subject.name}
                          </span>
                        )}
                        {content.difficulty && (
                          <span className={`text-xs font-semibold ${getDifficultyColor(content.difficulty)}`}>
                            {getDifficultyLabel(content.difficulty)}
                          </span>
                        )}
                        {content.class_levels && content.class_levels.length > 0 && (
                          <span className="text-xs text-slate-400">
                            {typeof content.class_levels[0] === 'string' ? content.class_levels[0] : content.class_levels[0].name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-6 border-t border-slate-100" />

                    {/* Rendered content */}
                    <div className="px-6 py-4">
                      {hasStructure ? (
                        <ExerciseRenderer
                          structure={content.structure as any}
                          interactive={false}
                          showAllSolutions={showAllSolutions}
                        />
                      ) : content.content ? (
                        <ContentPreview content={content.content} className="text-slate-800" />
                      ) : (
                        <p className="text-sm text-slate-400 italic">Aucun contenu disponible</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-6 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200"
          >
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
              <ListX className="w-8 h-8 text-slate-400" />
            </div>
            <div className="max-w-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Liste vide</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Ajoutez des exercices depuis les pages d'exercices ou d'examens pour créer votre programme de révision.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/structured/exercises')}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Exercices
              </Button>
              <Button
                onClick={() => navigate('/structured/exams')}
                variant="ghost"
                className="border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
              >
                Examens
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Print + layout styles */}
      <style>{`
        .revision-print-only { display: none; }

        @media print {
          .revision-print-hide { display: none !important; }
          .revision-print-only { display: block !important; padding: 24px 40px 0; }

          body { background: white !important; }
          .min-h-screen { min-height: 0 !important; }
          .max-w-4xl { max-width: 100% !important; }
          .px-4, .sm\\:px-6 { padding-left: 0 !important; padding-right: 0 !important; }
          .py-8 { padding-top: 0 !important; padding-bottom: 0 !important; }

          .revision-exercise-card {
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            margin-bottom: 0 !important;
          }
          .revision-exercise-card:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }

          /* Remove gap in print — page breaks handle separation */
          .flex.flex-col.gap-8 { gap: 0 !important; }

          /* Accent line */
          .revision-exercise-card > div:first-child { height: 4px !important; }

          /* When solutions are hidden, mask solution areas and solution toggle buttons */
          .revision-solutions-hidden .structured-compact-view .border-l-2.border-green-400 { display: none !important; }
          .revision-solutions-hidden .structured-compact-view button { display: none !important; }
        }
      `}</style>
    </div>
  );
};
