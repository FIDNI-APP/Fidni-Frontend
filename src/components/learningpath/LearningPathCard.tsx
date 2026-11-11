import { confirmer } from '@/lib/confirmer';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  BookOpen, 
  TrendingUp, 
  Play,
  CheckCircle,
  ChevronRight,
  Pencil,
  Trash2
} from 'lucide-react';
import { LearningPath } from '@/types/index';
import { ProgressBadge } from './ProgressBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

interface LearningPathCardProps {
  learningPath: LearningPath;
  onStart?: (pathId: string) => void;
  /** Actions réservées aux admins (la liste les passait déjà, la carte les ignorait). */
  onEdit?: (pathId: string) => void;
  onDelete?: (pathId: string) => void;
  isAdmin?: boolean;
  className?: string;
}

export const LearningPathCard: React.FC<LearningPathCardProps> = ({ 
  learningPath,
  onStart,
  onEdit,
  onDelete,
  isAdmin = false,
  className
}) => {
  const navigate = useNavigate();
  const progress = learningPath.user_progress?.progress_percentage || 0;
  const isStarted = !!learningPath.user_progress;
  const isCompleted = progress === 100;

  const handleCardClick = () => {
    navigate(`/learning-path/${learningPath.id}`);
  };

  const handleStartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Avant : `onStart?.(id) ?? navigate(…)` naviguait aussi quand onStart existait (il renvoie undefined).
    if (onStart) onStart(learningPath.id);
    else navigate(`/learning-path/${learningPath.id}`);
  };

  const difficulty = (() => {
    if (learningPath.estimated_hours < 10) return {
      color: 'text-emerald-600 bg-emerald-50',
      label: t('Débutant')
    };
    if (learningPath.estimated_hours < 30) return {
      color: 'text-amber-600 bg-amber-50',
      label: t('Intermédiaire')
    };
    return {
      color: 'text-rose-600 bg-rose-50',
      label: t('Avancé')
    };
  })();

  return (
    <div 
      className={cn(
        "group relative bg-white rounded-3xl border border-[#f2f1ee] overflow-hidden",
        "hover:shadow-md transition-shadow duration-200 cursor-pointer",
        "flex flex-col h-full",
        className
      )}
      onClick={handleCardClick}
    >
      {/* Progress indicator */}
      {isStarted && (
        <div className="absolute top-0 start-0 end-0 h-1 bg-[#f2f1ee] z-10">
          <div 
            className="h-full bg-brand transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Header with gradient */}
      <div className="relative h-36 bg-ink p-4 flex flex-col">
        <div className="flex justify-between items-start z-10">
          <span className="inline-flex items-center px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-full text-white text-xs font-medium">
            <BookOpen className="w-3 h-3 me-1.5" />
            {learningPath.subject.name}
          </span>
          
          <div className="flex items-center gap-1.5">
            {isCompleted && (
              <span className="inline-flex items-center px-2.5 py-1 bg-emerald-500 rounded-full text-white text-xs font-medium">
                <CheckCircle className="w-3 h-3 me-1.5" />
                {t('Terminé')}
              </span>
            )}
            {isAdmin && onEdit && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(learningPath.id); }}
                className="p-1.5 rounded-full bg-white/15 text-white hover:bg-white/30 transition-colors"
                title={t('Modifier le parcours')}
                aria-label={t('Modifier le parcours {title}', { title: learningPath.title })}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {isAdmin && onDelete && (
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (await confirmer(t('Supprimer le parcours « {title} » ? Cette action est définitive.', { title: learningPath.title }), { action: t('Supprimer'), danger: true })) {
                    onDelete(learningPath.id);
                  }
                }}
                className="p-1.5 rounded-full bg-white/15 text-white hover:bg-red-500/80 transition-colors"
                title={t('Supprimer le parcours')}
                aria-label={t('Supprimer le parcours {title}', { title: learningPath.title })}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <h3 className="mt-auto text-lg font-semibold text-white line-clamp-2">
          {learningPath.title}
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <p className="text-ink-soft text-sm line-clamp-2 mb-3">
          {learningPath.description || t('Un parcours guidé, chapitre par chapitre.')}
        </p>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
          <div className="flex items-center text-ink-faint">
            <Clock className="w-3.5 h-3.5 me-1.5 text-ink-faint" />
            <span>{t('{n}h', { n: learningPath.estimated_hours })}</span>
          </div>
          
          <div className="flex items-center text-ink-faint">
            <BookOpen className="w-3.5 h-3.5 me-1.5 text-ink-faint" />
            <span>{t('{n} chapters', { n: learningPath.total_chapters || learningPath.path_chapters.length })}</span>
          </div>
        </div>

        {/* Difficulty and levels */}
        <div className="flex items-center justify-between mb-4">
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            difficulty.color
          )}>
            <TrendingUp className="w-3 h-3 me-1" />
            {difficulty.label}
          </span>
          
          <div className="flex items-center gap-1">
            {learningPath.class_level.slice(0, 2).map(level => (
              <span 
                key={level.id}
                className="px-1.5 py-0.5 bg-[#f2f1ee] rounded text-xs text-ink-soft"
              >
                {level.name}
              </span>
            ))}
            {learningPath.class_level.length > 2 && (
              <span className="px-1.5 py-0.5 bg-[#f2f1ee] rounded text-xs text-ink-soft">
                +{learningPath.class_level.length - 2}
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        {isStarted && (
          <div className="mb-3">
            <ProgressBadge 
              percentage={progress}
              size="sm"
              showLabel
              className="w-full"
            />
          </div>
        )}

        {/* Action button */}
        <Button
          onClick={handleStartClick}
          className=" bg-brand hover:bg-brand-hover mt-auto w-full"
          size="sm"
        >
          {isCompleted ? (
            <>
              <CheckCircle className="w-4 h-4 me-2" />
              {t('Revoir')}
            </>
          ) : isStarted ? (
            <>
              <Play className="w-4 h-4 me-2" />
              {t('Continuer')}
            </>
          ) : (
            <>
              <Play className="w-4 h-4 me-2" />
              {t('Commencer')}
            </>
          )}
          <ChevronRight className="w-4 h-4 ms-1 opacity-70" />
        </Button>
      </div>
    </div>
  );
};