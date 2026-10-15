// Temps enregistrés sur un contenu ; pour une épreuve d'examen corrigée, la note du passage
// (« 13/20 en 2 h 47 »), pour voir sa progression d'un passage à l'autre.
import React, { useEffect, useMemo, useState } from 'react';
import { X, Clock, Calendar, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { t, dateLocale } from '@/i18n';

interface SessionData {
  id: string;
  session_duration: number;
  started_at: string;
  ended_at: string;
  created_at: string;
  session_type: string;
  notes: string;
  /** Note d'une épreuve corrigée (null : pas encore corrigée, ou simple chrono). */
  score?: number | null;
  max_score?: number | null;
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
    return t('{h} h {m} min', { h: hours, m: String(minutes).padStart(2, '0') });
  }
  if (minutes > 0) {
    return t('{m} min {s} s', { m: minutes, s: String(secs).padStart(2, '0') });
  }
  return t('{s} s', { s: secs });
};

/** Durée d'une épreuve, comme sur une copie : « 2 h 47 », « 45 min ». */
const shortDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return t('{h} h {m}', { h, m: String(m).padStart(2, '0') });
  return m > 0 ? t('{m} min', { m }) : t('{s} s', { s: seconds });
};

const fmtScore = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const hasScore = (s: SessionData) => typeof s.score === 'number' && typeof s.max_score === 'number' && s.max_score > 0;
/** Note ramenée sur 20 (pour comparer deux passages). */
const on20 = (s: SessionData) => (hasScore(s) ? ((s.score as number) / (s.max_score as number)) * 20 : null);

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t("Aujourd'hui à {heure}", { heure: date.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }) });
  if (diffDays === 1) return t('Hier à {heure}', { heure: date.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }) });
  if (diffDays < 7) return t('Il y a {n} jours', { n: diffDays });
  return date.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
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
    const scored = sessions.filter(hasScore);
    const bestScore = scored.reduce<SessionData | null>((b, s) => (!b || (on20(s) ?? 0) > (on20(b) ?? 0) ? s : b), null);
    return {
      total: sessions.length,
      totalTime,
      average: sessions.length ? Math.floor(totalTime / sessions.length) : 0,
      best: sessions.length ? Math.min(...durations) : 0,
      bestScore,
    };
  }, [sessions]);
  const allExams = sessions.length > 0 && sessions.every((s) => s.session_type === 'exam');

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
  const best = stats.bestScore;
  const tiles = [
    { label: allExams ? t('Passages') : t('Sessions'), value: String(stats.total) },
    best
      ? { label: t('Meilleure note'), value: `${fmtScore(best.score as number)}/${fmtScore(best.max_score as number)}`, highlight: true }
      : { label: t('Temps total'), value: formatDuration(stats.totalTime) },
    { label: t('Moyenne'), value: formatDuration(stats.average) },
    { label: t('Plus rapide'), value: formatDuration(stats.best), highlight: !best },
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
        <div className="px-4 sm:px-6 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h2 id="session-history-title" className="fd-display text-xl font-bold text-ink">{allExams ? t('Tes passages') : t('Temps enregistrés')}</h2>
            <p className="text-sm text-ink-faint mt-0.5">
              {allExams ? t('Tes épreuves sur ce sujet, de la plus récente à la plus ancienne.') : t('Tes sessions sur ce contenu, de la plus récente à la plus ancienne.')}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('Fermer')}
            className="p-2 rounded-lg text-ink-faint hover:text-ink hover:bg-[#f2f1ee] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Résumé */}
        {sessions.length > 0 && (
          <div className="px-4 sm:px-6 py-4 border-b border-line bg-[#faf9f7]">
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
              <p className="font-medium text-ink">{t('Aucune session enregistrée')}</p>
              <p className="text-sm text-ink-faint mt-1">{t('Lance le chronomètre puis enregistre ton temps pour suivre tes progrès.')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {sessions.map((session, index) => {
                const previous = sessions[index + 1];
                const faster = previous && session.session_duration < previous.session_duration;
                const slower = previous && session.session_duration > previous.session_duration;
                // Note : comparée au passage noté précédent (sur 20, pour comparer des barèmes différents).
                const scored = hasScore(session);
                const before = sessions.slice(index + 1).find(hasScore);
                const delta = scored && before ? Math.round(((on20(session) ?? 0) - (on20(before) ?? 0)) * 10) / 10 : 0;

                return (
                  <li key={session.id} className="px-4 sm:px-6 py-3.5 hover:bg-[#faf9f7] transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {scored ? (
                            <span className="fd-nums font-semibold text-ink">
                              {fmtScore(session.score as number)}/{fmtScore(session.max_score as number)}
                              <span className="font-normal text-ink-soft"> {t('en {duree}', { duree: shortDuration(session.session_duration) })}</span>
                            </span>
                          ) : (
                            <span className="fd-nums font-semibold text-ink">{formatDuration(session.session_duration)}</span>
                          )}
                          {delta !== 0 && (
                            <span className={`fd-nums inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              delta > 0 ? 'text-brand-hover bg-brand-soft border border-brand-line' : 'text-ink-faint bg-[#f2f1ee]'}`}
                              title={t('Écart avec le passage précédent, ramené sur 20')}>
                              {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {t('{signe}{n} sur 20', { signe: delta > 0 ? '+' : '−', n: fmtScore(Math.abs(delta)) })}
                            </span>
                          )}
                          {!scored && faster && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-hover bg-brand-soft border border-brand-line px-2 py-0.5 rounded-full">
                              <TrendingUp className="w-3 h-3" /> {t('Plus rapide')}
                            </span>
                          )}
                          {!scored && slower && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-faint bg-[#f2f1ee] px-2 py-0.5 rounded-full">
                              <TrendingDown className="w-3 h-3" /> {t('Plus lent')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-ink-faint mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(session.created_at)}
                          <span aria-hidden>·</span>
                          {session.session_type === 'exam' ? (scored ? t('Épreuve corrigée') : t('Épreuve')) : t('Étude')}
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
                          title={t('Supprimer cette session')}
                          aria-label={t('Supprimer cette session')}
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
