import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getRevisionList,
  removeItemFromRevisionList,
  updateRevisionList,
  getRevisionListStatistics,
  type RevisionList,
  type RevisionListStatistics,
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
  FileDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Content } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { ExerciseRenderer } from '@/components/content/viewer/ExerciseRenderer';

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
      default: return 'text-ink-faint';
    }
  };

  const getTypeAccent = (contentTypeName: string) => {
    if (contentTypeName === 'exam') return 'bg-[#c0892f]';
    return 'bg-[#1a7a4a]';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-12 h-12 border-2 border-line rounded-full"></div>
            <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-t-[#1a7a4a] rounded-full animate-spin"></div>
          </div>
          <p className="text-ink-faint text-sm">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full border border-line"
        >
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ListX className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Liste non trouvée</h2>
          <p className="text-ink-faint mb-6 text-sm">Cette liste n'existe pas ou a été supprimée.</p>
          <Button
            onClick={() => navigate('/revision-lists')}
            className="bg-[#1a7a4a] hover:bg-[#15633c] text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-paper ${showAllSolutions ? '' : 'revision-solutions-hidden'}`}>
      {/* En-tête clair, comme les autres pages (il était violet, rendu noir par le thème). */}
      <section className="revision-print-hide" style={{ background: '#faf9f7', borderBottom: '1px solid #e7e3dc' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-6">
          <button
            onClick={() => navigate('/revision-lists')}
            className="inline-flex items-center gap-1.5 text-sm mb-5"
            style={{ color: '#6b6862' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Mes listes de révision
          </button>

          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#e7e3dc] rounded-xl text-lg font-bold text-[#1a1a1a] focus:outline-none focus:border-[#1a7a4a]"
                placeholder="Nom de la liste..."
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#e7e3dc] rounded-xl text-sm text-[#33302b] resize-none focus:outline-none focus:border-[#1a7a4a]"
                rows={2}
                placeholder="Description..."
              />
              <div className="flex gap-2">
                <button onClick={handleUpdateList} className="fd-btn-primary">
                  <Save className="w-3.5 h-3.5" /> Enregistrer
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditName(list.name); setEditDescription(list.description); }}
                  className="fd-btn-ghost"
                >
                  <X className="w-3.5 h-3.5" /> Annuler
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h1 className="fd-display" style={{ fontSize: 'clamp(24px,3.2vw,32px)', color: '#1a1a1a', lineHeight: 1.15 }}>
                    {list.name}
                  </h1>
                  {list.description && (
                    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: '#6b6862' }}>{list.description}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  <button onClick={() => setIsEditing(true)} className="fd-btn-ghost" title="Renommer la liste" data-tour="revision-modifier">
                    <Edit2 className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button
                    onClick={() => setShowAllSolutions(!showAllSolutions)}
                    data-tour="revision-solutions"
                    className="fd-btn-ghost"
                    aria-pressed={showAllSolutions}
                    style={showAllSolutions ? { borderColor: '#cfe6d8', background: '#eaf3ed', color: '#15633c' } : undefined}
                  >
                    {showAllSolutions ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {showAllSolutions ? 'Solutions affichées' : 'Solutions masquées'}
                  </button>
                  <button
                    onClick={() => navigate(`/revision-lists/${list.id}/pdf${showAllSolutions ? '?solutions=end' : ''}`)}
                    disabled={!list.items?.length}
                    data-tour="revision-pdf"
                    className="fd-btn-primary disabled:opacity-50"
                  >
                    <FileDown className="w-3.5 h-3.5" /> Exporter en PDF
                  </button>
                </div>
              </div>

              {/* Chiffres de la liste */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm" style={{ color: '#6b6862' }}>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span className="fd-nums">{list.item_count}</span> exercice{list.item_count !== 1 ? 's' : ''}
                </span>
                {statistics && (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" style={{ color: '#1a7a4a' }} />
                      <span className="fd-nums">{statistics.completed}/{statistics.total_items}</span> terminés
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      <span className="fd-nums">{Math.round(statistics.progress_percentage)} %</span>
                    </span>
                    {statistics.total_time_seconds > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span className="fd-nums">{formatTime(statistics.total_time_seconds)}</span>
                      </span>
                    )}
                  </>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Créée le {formatDate(list.created_at)}
                </span>
              </div>
            </>
          )}
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
                // Le type réel est dans le contenu (content_type_name vaut toujours « content »).
                const isExam = content.type === 'exam';
                const accentColor = getTypeAccent(isExam ? 'exam' : 'exercise');

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ delay: index * 0.04 }}
                    className="revision-exercise-card bg-white rounded-2xl border border-line shadow-sm overflow-hidden"
                  >
                    {/* Top accent */}
                    <div className={`h-1 ${accentColor}`} />

                    {/* Card header */}
                    <div className="px-6 pt-5 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-bold text-ink-faint uppercase tracking-wider">
                              {isExam ? 'Examen' : 'Exercice'} {index + 1}
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-ink leading-snug">
                            {content.title}
                          </h2>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="revision-print-hide flex-shrink-0 p-1.5 rounded-lg text-[#cfcdc8] hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label="Retirer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        {content.subject && (
                          <span className="text-xs font-semibold text-ink-soft bg-[#f2f1ee] px-2.5 py-0.5 rounded-full">
                            {typeof content.subject === 'string' ? content.subject : content.subject.name}
                          </span>
                        )}
                        {content.difficulty && (
                          <span className={`text-xs font-semibold ${getDifficultyColor(content.difficulty)}`}>
                            {getDifficultyLabel(content.difficulty)}
                          </span>
                        )}
                        {content.class_levels && content.class_levels.length > 0 && (
                          <span className="text-xs text-ink-faint">
                            {typeof content.class_levels[0] === 'string' ? content.class_levels[0] : content.class_levels[0].name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-6 border-t border-[#f2f1ee]" />

                    {/* Rendered content */}
                    <div className="px-6 py-4">
                      {hasStructure ? (
                        <ExerciseRenderer
                          structure={content.structure as any}
                          interactive={false}
                          showAllSolutions={showAllSolutions}
                          compact={false}
                        />
                      ) : (
                        <p className="text-sm text-ink-faint italic">Aucun contenu disponible</p>
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
            className="flex flex-col items-center justify-center py-20 gap-6 text-center bg-white rounded-2xl border-2 border-dashed border-line"
          >
            <div className="w-16 h-16 bg-paper rounded-full flex items-center justify-center">
              <ListX className="w-8 h-8 text-ink-faint" />
            </div>
            <div className="max-w-sm">
              <h3 className="text-lg font-bold text-ink mb-2">Liste vide</h3>
              <p className="text-ink-faint text-sm leading-relaxed">
                Ajoutez des exercices depuis les pages d'exercices ou d'examens pour créer votre programme de révision.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/exercises')}
                className="bg-[#1a7a4a] hover:bg-[#15633c] text-white text-sm"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Exercices
              </Button>
              <Button
                onClick={() => navigate('/exams')}
                variant="ghost"
                className="border-line text-ink-soft hover:bg-paper text-sm"
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
          .revision-solutions-hidden .content-compact-view .border-l-2.border-green-400 { display: none !important; }
          .revision-solutions-hidden .content-compact-view button { display: none !important; }
        }
      `}</style>
    </div>
  );
};
