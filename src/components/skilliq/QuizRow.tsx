// Petits éléments communs des quiz : écart avec le passage précédent, étiquettes « Nouveau » et « Chapitre
// approfondi », explication d'une question corrigée. Les chapitres eux-mêmes sont des cartes (ChapterCard.tsx).
import React from 'react';
import { Award } from 'lucide-react';
import { t } from '@/i18n';
import { MathText } from './MathText';
import { pct, previousPct, type SkillAssessment } from './types';

/** Explication d'une question corrigée : verte si la réponse est juste, orange sinon (sans réponse compris). */
export const ExplanationBox: React.FC<{ ok: boolean; text?: string; theoremes?: string[]; id?: string; className?: string }> = ({
  ok, text, theoremes = [], id, className = '',
}) => {
  if (!text && !theoremes.length) return null;
  return (
    <section id={id} aria-label={t('Explication')}
      className={`rounded-2xl border p-4 ${ok ? 'border-brand-line bg-brand-soft' : 'border-gold-line bg-gold-soft'} ${className}`}>
      {text && (
        <>
          <h3 className={`text-[11px] font-bold uppercase tracking-[.08em] ${ok ? 'text-brand-hover' : 'text-gold-strong'}`}>{t('Explication')}</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft"><MathText text={text} className="fd-latex" /></p>
        </>
      )}
      {theoremes.length > 0 && (
        <p className={`flex flex-wrap gap-1.5 ${text ? 'mt-3' : ''}`}>
          {theoremes.map((th) => <span key={th} className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11.5px] font-medium text-ink-soft">{th}</span>)}
        </p>
      )}
    </section>
  );
};

/** Écart avec le passage précédent (« +20 pts »), rien au premier passage. */
export const Delta: React.FC<{ a: SkillAssessment; long?: boolean; className?: string }> = ({ a, long = false, className = '' }) => {
  const before = previousPct(a);
  if (before === null) return null;
  const d = pct(a) - before;
  const tone = d > 0 ? 'bg-brand-soft text-brand-hover' : 'bg-[#f2f1ee] text-ink-soft';
  const vars = { signe: d > 0 ? '+' : '−', n: Math.abs(d) };
  const text = d === 0 ? (long ? t('Même score que la dernière fois') : '=')
    : Math.abs(d) > 1
      ? (long ? t('{signe}{n} pts depuis la dernière fois', vars) : t('{signe}{n} pts', vars))
      : (long ? t('{signe}{n} pt depuis la dernière fois', vars) : t('{signe}{n} pt', vars));
  return (
    <span className={`fd-nums inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${tone} ${className}`}
      title={t('Avant : {n} %', { n: before })}>
      {text}<span className="sr-only"> {t('(avant : {n} %)', { n: before })}</span>
    </span>
  );
};

/** Étiquette « Nouveau » : quiz sorti il y a moins de 14 jours, pas encore passé. */
export const NewBadge: React.FC = () => (
  <span className="inline-flex items-center rounded-full bg-gold px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.06em] text-white">{t('Nouveau')}</span>
);

/** Badge « Chapitre approfondi » : l'approfondissement réussi à BADGE_PCT % au moins (dernier passage). */
export const DeepBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11.5px] font-semibold text-gold-strong ring-1 ring-gold-line">
    <Award className="h-3.5 w-3.5" aria-hidden /> {t('Chapitre approfondi')}
  </span>
);
