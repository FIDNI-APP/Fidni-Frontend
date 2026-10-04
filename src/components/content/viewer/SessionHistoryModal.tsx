import React, { useEffect, useMemo, useState } from 'react';
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
    return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  }
  if (minutes > 0) {
    return `${minutes} min ${String(secs).padStart(2, '0')} s`;
  }
  return `${secs} s`;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const durations = sessions.map(s => s.session_duration);
    const totalTime = durations.reduce((sum, d) => sum + d, 0);
    return {
      total: sessions.length,
      totalTime,
      average: sessions.length ? Math.floor(totalTime / sessions.length) : 0,
      best: sessions.length ? Math.min(...durations) : 0,
    };
  }, [sessions]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

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

  // Ne pas utiliser de dégradé Tailwind ici : index.css les force en noir (bandeau noir, texte illisible).
  const tiles = [
    { label: 'Sessions', value: String(stats.total) },
    { label: 'Temps total', value: formatDuration(stats.totalTime) },
    { label: 'Moyenne', value: formatDuration(stats.average) },
    { label: 'Plus rapide', value: formatDuration(stats.best), highlight: true },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-history-title"
        className="bg-white rounded-2xl border border-line shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h2 id="session-history-title" className="fd-display text-xl font-bold text-ink">Temps enregistrés</h2>
            <p className="text-sm text-ink-faint mt-0.5">Tes sessions sur ce contenu, de la plus récente à la plus ancienne.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 rounded-lg text-ink-faint hover:text-ink hover:bg-[#f2f1ee] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Résumé */}
        {sessions.length > 0 && (
          <div className="px-6 py-4 border-b border-line bg-[#faf9f7]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {tiles.map((t) => (
                <div key={t.label} className="rounded-xl border border-line bg-white px-3 py-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{t.label}</div>
                  <div className={`fd-nums text-lg font-bold mt-0.5 ${t.highlight ? 'text-brand' : 'text-ink'}`}>{t.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste des sessions */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-[3px] border-brand-line border-t-brand rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Clock className="w-8 h-8 text-ink-faint mx-auto mb-3" />
              <p className="font-medium text-ink">Aucune session enregistrée</p>
              <p className="text-sm text-ink-faint mt-1">Lance le chronomètre puis enregistre ton temps pour suivre tes progrès.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {sessions.map((session, index) => {
                const previous = sessions[index + 1];
                const faster = previous && session.session_duration < previous.session_duration;
                const slower = previous && session.session_duration > previous.session_duration;

                return (
                  <li key={session.id} className="px-6 py-3.5 hover:bg-[#faf9f7] transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="fd-nums font-semibold text-ink">{formatDuration(session.session_duration)}</span>
                          {faster && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-hover bg-brand-soft border border-brand-line px-2 py-0.5 rounded-full">
                              <TrendingUp className="w-3 h-3" /> Plus rapide
                            </span>
                          )}
                          {slower && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-faint bg-[#f2f1ee] px-2 py-0.5 rounded-full">
                              <TrendingDown className="w-3 h-3" /> Plus lent
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-ink-faint mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(session.created_at)}
                          <span aria-hidden>·</span>
                          {session.session_type === 'exam' ? 'Examen' : 'Étude'}
                        </div>
                        {session.notes && (
                          <p className="mt-1.5 text-sm text-ink-soft italic">« {session.notes} »</p>
                        )}
                      </div>
                      {onDeleteSession && (
                        <button
                          onClick={() => handleDelete(session.id)}
                          disabled={deletingId === session.id}
                          className="p-2 rounded-lg text-ink-faint hover:text-[#a23b34] hover:bg-[#fbecea] transition-colors disabled:opacity-50 flex-shrink-0"
                          title="Supprimer cette session"
                          aria-label="Supprimer cette session"
                        >
                          {deletingId === session.id ? (
                            <div className="w-4 h-4 border-2 border-[#e8c4c0] border-t-[#a23b34] rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionHistoryModal;
