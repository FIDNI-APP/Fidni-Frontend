/**
 * Feuille de la page d'une leçon (16/10/2026) : le papier du cahier (marge, trous de reliure) et les annotations de
 * l'élève comme dans le cahier : surligner, stylo, notes, gomme ; enregistrement automatique.
 *  - « Annoter » : connecté, avec une souris, sur un écran assez large, une fois ses annotations chargées
 *    (l'enregistrement remplace toutes celles de la page : jamais à partir d'une liste vide par erreur).
 *  - Annotations rangées à part de celles du cahier (GET/POST /api/lessons/<id>/annotations/) : les positions
 *    sont en px, et la feuille du cahier n'a pas la même largeur.
 *  - Téléphone : feuille sans annotations (placées à la largeur d'un ordinateur), comme dans le cahier.
 */
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PenLine } from 'lucide-react';
import NotebookContent, { type Annotation } from '@/components/notebook/NotebookContent';
import { NOTEBOOK_THEME } from '@/components/notebook/NotebookPaper';
import { PhoneTheme } from '@/components/notebook/SectionContent';
import { useFinePointer } from '@/components/notebook/useFinePointer';
import { usePhone } from '@/components/content/listing/listingUtils';
import { getPageAnnotations, savePageAnnotations } from '@/lib/api/notebookApi';
import { t } from '@/i18n';

// Barre d'outils collée sous la barre du site (comme le sommaire de la leçon sur téléphone).
const SOUS_LA_BARRE = 68;

export const LessonSheet: React.FC<{
  lessonId: string | number;
  isAuthenticated: boolean;
  /** Pied de la feuille (j'aime, signaler). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ lessonId, isAuthenticated, footer, children }) => {
  const phone = usePhone();
  const fine = useFinePointer();
  const [annotations, setAnnotations] = useState<Annotation[] | undefined>(undefined);
  const [annotating, setAnnotating] = useState(false);
  const loaded = annotations !== undefined;
  const canAnnotate = isAuthenticated && fine && !phone && loaded;

  useEffect(() => {
    setAnnotations(undefined);
    setAnnotating(false);
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    getPageAnnotations(lessonId)
      .then((a) => { if (!cancelled) setAnnotations(a as Annotation[]); })
      // Échec : pas de bouton « Annoter » (un enregistrement effacerait celles qu'on n'a pas pu lire).
      .catch(() => {});
    return () => { cancelled = true; };
  }, [lessonId, isAuthenticated]);

  const save = useCallback(async (list: Annotation[]) => {
    try {
      await savePageAnnotations(lessonId, list);
    } catch (e) {
      toast.error(t('Tes annotations n’ont pas pu être enregistrées.'));
      throw e;
    }
  }, [lessonId]);

  return (
    // overflow-clip (et pas hidden) : la barre d'outils reste collée en haut de l'écran pendant la lecture.
    <article className="overflow-clip rounded-2xl border border-line bg-white sm:rounded-3xl print:rounded-none print:border-0">
      {canAnnotate && (
        <div className="flex items-center justify-end gap-2 border-b border-line bg-[#fcfbf9] px-3 py-1.5 print:hidden">
          {!annotating && !!annotations?.length && (
            <span className="fd-nums text-[12px] text-ink-faint">
              {annotations.length > 1 ? t('{n} annotations sur cette leçon', { n: annotations.length }) : t('1 annotation sur cette leçon')}
            </span>
          )}
          <button type="button" onClick={() => setAnnotating((v) => !v)} aria-pressed={annotating} data-tour="lecon-annoter"
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold transition-colors ${
              annotating ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:border-ink hover:text-ink'}`}>
            <PenLine className="h-4 w-4" /> {annotating ? t('Terminer') : t('Annoter')}
          </button>
        </div>
      )}
      <NotebookContent
        key={String(lessonId)}
        content=""
        body={children}
        notebookTheme={phone ? PhoneTheme : NOTEBOOK_THEME}
        onSaveAnnotations={loaded ? save : undefined}
        initialAnnotations={annotations}
        annotating={annotating && canAnnotate}
        showAnnotations={!phone}
        toolbarTop={SOUS_LA_BARRE}
      />
      {footer}
    </article>
  );
};
