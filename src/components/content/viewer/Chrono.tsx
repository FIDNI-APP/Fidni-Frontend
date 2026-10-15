/**
 * Chronomètre d'un exercice (11/10/2026) : avant, une carte « Temps passé » toujours visible dans une
 * colonne à droite (et sous l'exercice sur téléphone). Maintenant un petit bouton dans la barre de la
 * feuille ; lancé, il devient une pastille avec le temps et ses commandes (pause, reprendre, enregistrer,
 * remettre à zéro). Les temps enregistrés s'ouvrent depuis la pastille ou le menu « ⋯ ».
 */
import React from 'react';
import { Check, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { t } from '@/i18n';

interface ChronoProps {
  timer: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  /** Enregistrer le temps (membre connecté) ; absent : pas de bouton. */
  save?: () => void;
  saving: boolean;
  format: () => string;
  sessionCount: number;
  onOpenHistory: () => void;
}

const iconBtn = 'inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40 sm:h-9 sm:w-9 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10';

export const Chrono: React.FC<ChronoProps> = ({
  timer, isRunning, start, stop, reset, save, saving, format, sessionCount, onOpenHistory,
}) => {
  const history = sessionCount > 0 && (
    <button type="button" onClick={onOpenHistory}
      className="inline-flex min-h-10 items-center px-1.5 text-[12.5px] font-medium text-ink-faint hover:text-ink fd-nums sm:min-h-9 [@media(pointer:coarse)]:min-h-10">
      {t('{n} temps', { n: sessionCount })}
    </button>
  );

  if (!isRunning && timer === 0) {
    return (
      <span className="inline-flex items-center gap-0.5" data-tour="detail-chrono">
        {history}
        <button type="button" onClick={start} title={t('Me chronométrer')} aria-label={t('Lancer le chronomètre')}
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:h-9 [@media(pointer:coarse)]:h-10">
          <Timer className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">{t('Chrono')}</span>
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5" data-tour="detail-chrono">
      {history}
      <span role="timer" aria-live="off"
        className={`inline-flex items-center rounded-full border ps-3 ${isRunning ? 'border-brand-line bg-brand-soft text-brand-hover' : 'border-gold-line bg-gold-soft text-gold-strong'}`}>
        <Timer className="h-3.5 w-3.5" aria-hidden />
        <span className="ms-1.5 min-w-[3.2rem] text-[14px] font-semibold fd-nums">{format()}</span>
        {isRunning ? (
          <button type="button" onClick={stop} aria-label={t('Pause')} title={t('Pause')} className={`${iconBtn} hover:bg-brand-line`}>
            <Pause className="h-4 w-4" />
          </button>
        ) : (
          <>
            <button type="button" onClick={start} aria-label={t('Reprendre')} title={t('Reprendre')} className={`${iconBtn} hover:bg-gold-line`}>
              <Play className="h-4 w-4" />
            </button>
            {save && (
              <button type="button" onClick={save} disabled={saving} aria-label={t('Enregistrer ce temps')} title={t('Enregistrer ce temps')} className={`${iconBtn} hover:bg-gold-line`}>
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Check className="h-4 w-4" />}
              </button>
            )}
            <button type="button" onClick={reset} aria-label={t('Remettre à zéro')} title={t('Remettre à zéro')} className={`${iconBtn} hover:bg-gold-line`}>
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </span>
    </span>
  );
};

export default Chrono;
