/**
 * Parcours : en-tête — choix niveau / matière, titre du parcours, avancement global et bouton pour reprendre au
 * prochain checkpoint (la vidéo en cours, ou le quiz du chapitre).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isModerator } from '@/lib/features';
import { t } from '@/i18n';
import { quizUrl, videoUrl, type Parcours } from '@/lib/api/parcoursApi';
import type { ParcoursProgress } from './progression';
import { ProgressIndicator } from './ProgressIndicator';
import { LevelSelector, SubjectSelector, type Option } from './Selectors';

export const ParcoursHeader: React.FC<{
  parcours: Parcours | null;
  progress: ParcoursProgress | null;
  levels: Option[];
  subjects: Option[];
  level: string;
  subject: string;
  onLevel: (id: string) => void;
  onSubject: (id: string) => void;
}> = ({ parcours, progress, levels, subjects, level, subject, onLevel, onSubject }) => {
  const { user } = useAuth();
  const next = progress?.next;
  const resume = parcours && next
    ? (next.video ? {
      to: videoUrl(parcours.id, next.step.chapter.id, next.video.video.id),
      label: next.video.percent > 0 ? t('Reprendre') : progress && progress.done === 0 && next.step.index === 0 && next.video.index === 0 ? t('Commencer') : t('Continuer'),
      detail: next.video.video.title,
    } : next.quiz ? { to: quizUrl(parcours.id, next.step.chapter.id), label: t('Passer le quiz'), detail: next.step.chapter.title } : null)
    : null;

  return (
    <header className="mb-6 sm:mb-8">
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <LevelSelector value={level} options={levels} onChange={onLevel} />
        {subjects.length > 0 && <SubjectSelector value={subject} options={subjects} onChange={onSubject} />}
      </div>

      {isModerator(user) && <div role="group" aria-label={t('Gestion des parcours')} className="mb-4 flex flex-wrap gap-2">
        <Link to="/learning-path/create" className="fd-btn-ghost">{t('Créer un parcours')}</Link>
        {parcours && <>
          <Link to={`/learning-path/${parcours.id}/edit`} className="fd-btn-ghost">{t('Modifier le parcours')}</Link>
          <Link to={`/parcours/${parcours.id}/contenu`} className="fd-btn-primary">{t('Gérer les chapitres et vidéos')}</Link>
        </>}
      </div>}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="mb-1.5 text-[13px] font-medium text-ink-faint">{t('Parcours')}</p>
          <h1 dir="auto" className="fd-display text-ink" style={{ fontSize: 'clamp(28px, 3.4vw, 38px)', lineHeight: 1.08 }}>
            {parcours?.title ?? t('Parcours')}
          </h1>
          {parcours?.description && <p dir="auto" className="mt-2 text-[14.5px] leading-relaxed text-ink-faint">{parcours.description}</p>}
        </div>
        {resume && (
          <Link to={resume.to} className="group inline-flex min-h-12 max-w-full shrink-0 items-center gap-3 rounded-xl bg-brand px-5 text-white transition-colors hover:bg-brand-hover lg:max-w-[360px]">
            <Play className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 text-start leading-tight">
              <span className="block text-[14.5px] font-semibold">{resume.label}</span>
              <span dir="auto" className="block truncate text-[12.5px] text-white/80">{resume.detail}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
          </Link>
        )}
      </div>

      {progress && progress.total > 0 && (
        <ProgressIndicator className="mt-5 max-w-2xl" done={progress.done} total={progress.total} percent={progress.percent} />
      )}
      {progress?.finished && (
        <p className="mt-3 text-[13.5px] font-medium text-gold-strong">{t('Parcours terminé : tous les chapitres sont validés.')}</p>
      )}
    </header>
  );
};

export default ParcoursHeader;
