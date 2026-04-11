import React, { useEffect, useState } from 'react';
import { X, Clock, Calendar, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';

interface SessionData {
  id: string;
  session_duration: number;
  started_at: string;
  ended_at: string;
  created_at: string;
  session_type: string;
  notes: string;
}

interface SessionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionData[];
  isLoading?: boolean;
  onDeleteSession?: (sessionId: string) => Promise<void>;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  isLoading = false,
  onDeleteSession
}) => {
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    best: 0,
    worst: 0,
    totalTime: 0
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (sessions.length > 0) {
      const durations = sessions.map(s => s.session_duration);
      const total = sessions.length;
      const totalTime = durations.reduce((sum, d) => sum + d, 0);
      const average = Math.floor(totalTime / total);
      const best = Math.min(...durations);
      const worst = Math.max(...durations);

      setStats({ total, average, best, worst, totalTime });
    }
  }, [sessions]);

  const handleDelete = async (sessionId: string) => {
    if (!onDeleteSession) return;
    setDeletingId(sessionId);
    try {
      await onDeleteSession(sessionId);
    } catch (err) {
      console.error('Failed to delete session:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Historique des sessions</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Stats Summary */}
        {sessions.length > 0 && (
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Total sessions</div>
                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Temps total</div>
                <div className="text-2xl font-bold text-slate-900">{formatDuration(stats.totalTime)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Moyenne</div>
                <div className="text-2xl font-bold text-blue-600">{formatDuration(stats.average)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Meilleur temps</div>
                <div className="text-2xl font-bold text-green-600">{formatDuration(stats.best)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div className="overflow-y-auto max-h-[calc(80vh-200px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Aucune session enregistrée
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sessions.map((session, index) => {
                const isImproved = index < sessions.length - 1 && session.session_duration < sessions[index + 1].session_duration;
                const isRegressed = index < sessions.length - 1 && session.session_duration > sessions[index + 1].session_duration;

                return (
                  <div key={session.id} className="px-6 py-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-slate-900">
                            {formatDuration(session.session_duration)}
                          </span>
                          {isImproved && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                              <TrendingUp className="w-3 h-3" />
                              Amélioration
                            </span>
                          )}
                          {isRegressed && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                              <TrendingDown className="w-3 h-3" />
                              Régression
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(session.created_at)}
                        </div>
                        {session.notes && (
                          <div className="mt-2 text-sm text-slate-600 italic">
                            "{session.notes}"
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                          {session.session_type === 'exam' ? 'Examen' : 'Étude'}
                        </div>
                        {onDeleteSession && (
                          <button
                            onClick={() => handleDelete(session.id)}
                            disabled={deletingId === session.id}
                            className="p-1.5 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Supprimer"
                          >
                            {deletingId === session.id ? (
                              <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-600" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionHistoryModal;
