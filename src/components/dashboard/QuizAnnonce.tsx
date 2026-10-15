// Accueil : bandeau « Nouveau · Quiz par chapitre » (13/10/2026), jusqu'à la première ouverture de la page des quiz
// (règles dans components/skilliq/annonce.ts).
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Brain, X } from 'lucide-react';
import { NewBadge } from '@/components/skilliq/QuizRow';
import { fermerBandeauQuiz, useQuizNouveau } from '@/components/skilliq/annonce';
import { trackAction } from '@/lib/usage';
import { t } from '@/i18n';

export const QuizAnnonce: React.FC = () => {
  const { bandeau, nombre, aSonNiveau } = useQuizNouveau();
  if (!bandeau) return null;
  return (
    <section aria-label={t('Nouveau : quiz par chapitre')}
      className="relative flex flex-col gap-3 rounded-2xl border border-gold-line bg-gold-soft py-3.5 ps-4 pe-11 sm:flex-row sm:items-center sm:gap-4 sm:ps-5 sm:pe-12">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gold-strong ring-1 ring-gold-line" aria-hidden>
          <Brain className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold leading-snug text-ink">
            <NewBadge /> {t('Quiz par chapitre')}
          </p>
          <p className="fd-nums mt-0.5 text-[13px] text-ink-soft">
            {nombre > 1
              ? (aSonNiveau ? t('{n} quiz prêts pour ton niveau · corrigés question par question', { n: nombre }) : t('{n} quiz prêts · corrigés question par question', { n: nombre }))
              : (aSonNiveau ? t('{n} quiz prêt pour ton niveau · corrigés question par question', { n: nombre }) : t('{n} quiz prêt · corrigés question par question', { n: nombre }))}
          </p>
        </div>
      </div>
      <Link to="/skill-iq" onClick={() => trackAction('quiz-bandeau')} className="fd-btn-primary min-h-10 shrink-0 self-start sm:self-auto">
        {t('Essayer')} <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
      <button type="button" onClick={fermerBandeauQuiz} aria-label={t('Masquer ce bandeau')}
        className="absolute end-1.5 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint hover:bg-white/70 hover:text-ink">
        <X className="h-4 w-4" />
      </button>
    </section>
  );
};

export default QuizAnnonce;
