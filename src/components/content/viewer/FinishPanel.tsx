/**
 * « Où en es-tu ? » : terminer un contenu (réussi / à retravailler ; lue pour une leçon) et le ranger
 * dans une liste de révision ou un cahier. Avant, c'étaient deux petits boutons de l'en-tête
 * (« Terminer », « Liste ») que les élèves ne remarquaient pas.
 * Bandeau compact en haut de la page (au-dessus du contenu), sur ordinateur comme sur téléphone.
 * Exercice / examen (06/10/2026) : « Tout réussi » coche toutes les questions d'un coup (on décoche
 * ensuite celles qu'on a ratées) ; le résultat se met aussi à jour tout seul quand chaque question
 * est évaluée.
 */
import React, { useState } from 'react';
import { BookMarked, CheckCheck, CheckCircle2, ListPlus, RotateCcw } from 'lucide-react';
import type { ContentExercise, ContentExam, ContentLesson } from '@/types/content';
import { AddToRevisionListModal } from '@/components/revision/AddToRevisionListModal';
import { AddToNotebookModal } from '@/components/notebook/AddToNotebookModal';
import { labelsFromContent } from '@/components/revision/RevisionLabelPicker';

type ContentItem = ContentExercise | ContentExam | ContentLesson;
type Status = 'success' | 'review' | null;

interface FinishPanelProps {
  content: ContentItem;
  contentType: 'exercise' | 'exam' | 'lesson';
  completionStatus?: Status;
  onSetCompletion: (status: Status) => void;
  /** Questions évaluées / à évaluer (exercice, examen). */
  progress?: { assessed: number; total: number };
}

const QUESTION: Record<FinishPanelProps['contentType'], string> = {
  exercise: 'Tu as fini cet exercice ?',
  exam: 'Tu as fini ce sujet ?',
  lesson: 'Tu as lu cette leçon ?',
};

export const FinishPanel: React.FC<FinishPanelProps> = ({ content, contentType, completionStatus = null, onSetCompletion, progress }) => {
  const [listOpen, setListOpen] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const isLesson = contentType === 'lesson';
  const toggle = (s: Exclude<Status, null>) => onSetCompletion(completionStatus === s ? null : s);

  const btn = 'inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-[13.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';
  const success = completionStatus === 'success';
  const review = completionStatus === 'review';

  // Ce que le choix change, dit tout de suite (07/10/2026) : c'est ce qui donne envie de cliquer.
  const status = success
    ? (isLesson ? 'Leçon marquée comme lue.' : 'Réussi : il ne reviendra plus en tête de ta liste.')
    : review ? 'À revoir : on te le reproposera dans 3 jours.' : null;
  const total = progress?.total ?? 0;
  const assessed = progress?.assessed ?? 0;
  const hint = isLesson || total < 2 ? null
    : assessed === 0 ? 'Indique sous chaque question si tu l’as réussie, ou tout d’un coup ici.'
      : assessed < total ? `${assessed} question${assessed > 1 ? 's' : ''} évaluée${assessed > 1 ? 's' : ''} sur ${total}.`
        : null;

  return (
    <>
      <section className="fd-card px-4 py-3.5 sm:px-5" data-tour="detail-terminer">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">Où en es-tu ?</p>
            <p className={`mt-0.5 text-[14.5px] font-semibold ${success ? 'text-brand-hover' : review ? 'text-gold-strong' : 'text-ink'}`}>
              {status ?? QUESTION[contentType]}
            </p>
            {hint && <p className="mt-0.5 text-[12.5px] text-ink-faint fd-nums">{hint}</p>}
          </div>
          <div className={`grid gap-2 sm:flex sm:shrink-0 ${isLesson ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <button type="button" onClick={() => toggle('success')} aria-pressed={success}
              title={success ? 'Cliquer pour annuler' : undefined}
              className={`${btn} ${success ? 'border-brand bg-brand text-white hover:bg-brand-hover' : 'border-brand-line bg-white text-brand-hover hover:bg-brand-soft'}`}>
              {success ? <CheckCircle2 className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />}
              {isLesson ? (success ? 'Lue' : 'Marquer comme lue') : 'Tout réussi'}
            </button>
            {!isLesson && (
              <button type="button" onClick={() => toggle('review')} aria-pressed={review}
                title={review ? 'Cliquer pour annuler' : undefined}
                className={`${btn} ${review ? 'border-gold-line bg-gold-soft text-gold-strong' : 'border-line bg-white text-ink-soft hover:border-[#d6d2ca] hover:text-ink'}`}>
                <RotateCcw className="h-4 w-4" /> À revoir
              </button>
            )}
            {isLesson ? (
              <button type="button" onClick={() => setNotebookOpen(true)} data-tour="detail-cahier"
                className={`${btn} border-line bg-white text-ink-soft hover:border-ink hover:text-ink`}>
                <BookMarked className="h-4 w-4" /> <span className="sm:hidden">Cahier</span><span className="hidden sm:inline">Ajouter à mon cahier</span>
              </button>
            ) : (
              <button type="button" onClick={() => setListOpen(true)} data-tour="detail-liste"
                className={`${btn} border-line bg-white text-ink-soft hover:border-ink hover:text-ink`}>
                <ListPlus className="h-4 w-4" /> <span className="sm:hidden">Liste</span><span className="hidden sm:inline">Ajouter à une liste de révision</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {contentType !== 'lesson' && (
        <AddToRevisionListModal
          isOpen={listOpen}
          onClose={() => setListOpen(false)}
          contentType={contentType}
          contentId={Number(content.id)}
          contentTitle={content.title}
          contentLabels={labelsFromContent(content)}
        />
      )}
      {isLesson && (
        <AddToNotebookModal
          isOpen={notebookOpen}
          onClose={() => setNotebookOpen(false)}
          lessonId={String(content.id)}
          lessonTitle={content.title}
          lessonChapters={content.chapters?.map((ch) => ({ id: String(ch.id), name: ch.name })) ?? []}
          lessonSubject={content.subject ? { id: content.subject.id, name: content.subject.name } : null}
          lessonLevels={(content.class_levels || []).map((l) => ({ id: l.id, name: l.name }))}
        />
      )}
    </>
  );
};

export default FinishPanel;
