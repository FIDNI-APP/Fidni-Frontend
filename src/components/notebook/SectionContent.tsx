// Un chapitre ouvert dans la liseuse du cahier : ses leçons en onglets, la leçon sur sa feuille, son sommaire,
// « Leçon suivante » en bas. Menu « ⋯ » d'une leçon : ouvrir sa page, la retirer du cahier. « Annoter » n'est
// proposé qu'avec une souris (les outils ne sont pas faits pour le doigt), et seulement une fois les annotations
// chargées : l'enregistrement remplace toutes celles de la leçon, il ne doit jamais partir d'une liste vide par erreur.
// Sur téléphone, les annotations (placées à la largeur d'un ordinateur) ne sont pas affichées.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, ExternalLink, Loader2, MoreHorizontal, PenLine, Trash2 } from 'lucide-react';
import { t } from '@/i18n';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { useLessonOutline } from '@/components/lesson/useLessonOutline';
import { LessonOutlineBar, LessonOutlinePanel } from '@/components/lesson/LessonOutline';
import { getLessonAnnotations, removeFromNotebook, saveLessonAnnotations } from '@/lib/api/notebookApi';
import { usePhone } from '@/components/content/listing/listingUtils';
import NotebookContent, { type Annotation } from './NotebookContent';
import { NOTEBOOK_THEME } from './NotebookPaper';
import type { Id, NbSection } from './notebookModel';

/** Souris (survol + pointeur précis) : seul cas où l'on propose d'annoter. */
function useFinePointer(): boolean {
  const query = '(hover: hover) and (pointer: fine)';
  const [fine, setFine] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setFine(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return fine;
}

const PhoneTheme = { ...NOTEBOOK_THEME, marginLeft: 2 };

const SectionContent: React.FC<{
  notebookId: Id;
  section: NbSection;
  /** Après « Retirer du cahier » : le cahier est rechargé. */
  onRemoved: () => void;
}> = ({ notebookId, section, onRemoved }) => {
  const entries = [...(section.lesson_entries ?? [])].sort((a, b) => (a.page_order ?? 0) - (b.page_order ?? 0));
  const [index, setIndex] = useState(0);
  const entry = entries[Math.min(index, entries.length - 1)];
  const next = entries[Math.min(index, entries.length - 1) + 1];

  const phone = usePhone();
  const phoneRef = useRef(phone);
  phoneRef.current = phone;
  const fine = useFinePointer();
  const [annotating, setAnnotating] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[] | undefined>(undefined);
  const loaded = annotations !== undefined;
  // Annoter : souris, écran assez large (sur téléphone les annotations ne sont pas affichées), annotations chargées.
  const canAnnotate = fine && !phone && loaded;
  const [ready, setReady] = useState(false);
  const [menu, setMenu] = useState(false);
  const [removing, setRemoving] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const outline = useLessonOutline({
    containerRef: contentRef, scrollRoot: scrollEl, topOffset: annotating ? 60 : 12,
    deps: [entry?.id, ready],
  });

  // Nouvelle leçon : squelette, annotations rechargées, retour en haut de la feuille.
  useEffect(() => {
    setReady(false);
    setAnnotations(undefined);
    scrollEl?.scrollTo({ top: 0 });
    if (!entry) return;
    let cancelled = false;
    getLessonAnnotations(String(notebookId), String(section.id), String(entry.id))
      .then((a) => { if (!cancelled) setAnnotations(a as Annotation[]); })
      // Échec : on ne fait pas comme s'il n'y en avait aucune (le prochain enregistrement les effacerait).
      .catch(() => { if (!cancelled && !phoneRef.current) toast.error(t('Tes annotations n’ont pas pu se charger.')); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, notebookId, section.id]);

  const save = useCallback(async (list: Annotation[]) => {
    if (!entry) return;
    try {
      await saveLessonAnnotations(String(notebookId), String(section.id), String(entry.id), list);
    } catch (e) {
      toast.error(t('Tes annotations n’ont pas pu être enregistrées.'));
      throw e;
    }
  }, [notebookId, section.id, entry]);

  const onReady = useCallback(() => {
    window.setTimeout(() => setReady(true), 60);
  }, []);

  const remove = async () => {
    setMenu(false);
    if (!entry || !window.confirm(t('Retirer « {title} » de ton cahier ? La leçon reste sur Fidni.', { title: entry.lesson.title }))) return;
    setRemoving(true);
    try {
      await removeFromNotebook(String(notebookId), String(section.id), String(entry.id));
      toast.success(t('Leçon retirée du cahier'));
      setIndex(0);
      onRemoved();
    } catch {
      toast.error(t('La leçon n’a pas pu être retirée.'));
    } finally {
      setRemoving(false);
    }
  };

  if (!entry) return null;
  const item = 'flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-start text-[13.5px] font-medium transition-colors';
  // Téléphone, une seule leçon : son titre répéterait le chapitre ; le sommaire prend sa place, à côté du « ⋯ ».
  const merged = phone && entries.length === 1 && outline.items.length >= 2;

  // « Annoter » (souris, annotations chargées) et le menu « ⋯ » de la leçon.
  const tools = (
    <>
      {canAnnotate && (
        <button type="button" onClick={() => setAnnotating((v) => !v)} aria-pressed={annotating} data-tour="cahier-annoter"
          className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold transition-colors ${
            annotating ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:border-ink hover:text-ink'}`}>
          <PenLine className="h-4 w-4" /> {annotating ? t('Terminer') : t('Annoter')}
        </button>
      )}
      <button ref={menuBtn} type="button" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu}
        aria-label={t('Actions de la leçon')}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink">
        {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
      </button>
      <FloatingPanel anchorRef={menuBtn} open={menu} onClose={() => setMenu(false)} placement="bottom-end" role="menu"
        className="w-64 rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_32px_rgba(20,18,16,.14)]">
        <Link role="menuitem" to={`/lessons/${entry.lesson.id}`} onClick={() => setMenu(false)}
          className={`${item} text-ink-soft hover:bg-[#f7f6f3] hover:text-ink`}>
          <ExternalLink className="h-4 w-4 text-ink-faint" /> {t('Ouvrir la page de la leçon')}
        </Link>
        <button type="button" role="menuitem" onClick={remove} className={`${item} text-[#a23b34] hover:bg-[#fbecea]`}>
          <Trash2 className="h-4 w-4" /> {t('Retirer du cahier')}
        </button>
      </FloatingPanel>
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {merged ? (
        <div className="flex shrink-0 items-start gap-1.5 border-b border-line bg-white py-1.5 ps-3 pe-1.5">
          <h2 className="sr-only">{entry.lesson.title}</h2>
          <LessonOutlineBar outline={outline} storageKey={`lecon-${entry.lesson.id}`} className="min-w-0 flex-1" />
          {tools}
        </div>
      ) : (
        <>
          {/* Leçons du chapitre */}
          <div className="flex shrink-0 items-center gap-2 border-b border-line bg-white py-1.5 ps-3 pe-1.5 sm:ps-4">
            {entries.length > 1 ? (
              <div role="tablist" aria-label={t('Leçons du chapitre')} className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5 scrollbar-hide">
                {entries.map((e, i) => {
                  const on = e.id === entry.id;
                  return (
                    <button key={e.id} type="button" role="tab" aria-selected={on} onClick={() => setIndex(i)}
                      className={`min-h-10 max-w-[240px] shrink-0 truncate rounded-full px-3 text-[12.5px] font-semibold transition-colors ${
                        on ? 'bg-ink text-white' : 'bg-[#f2f1ee] text-ink-soft hover:text-ink'}`}>
                      {e.lesson.title}
                    </button>
                  );
                })}
              </div>
            ) : (
              <h2 className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{entry.lesson.title}</h2>
            )}
            {tools}
          </div>

          {/* Sommaire de la leçon : barre repliable jusqu'aux très grands écrans (la colonne mangerait la feuille). */}
          <LessonOutlineBar outline={outline} storageKey={`lecon-${entry.lesson.id}`} className="mx-3 mt-2 shrink-0 2xl:hidden" />
        </>
      )}

      <div className="flex min-h-0 flex-1">
        {outline.items.length >= 2 && (
          <aside className="hidden w-[230px] shrink-0 overflow-y-auto border-e border-line bg-[#fcfbf9] px-4 py-5 2xl:block">
            <LessonOutlinePanel outline={outline} storageKey={`lecon-${entry.lesson.id}`} title={t('Dans cette leçon')} />
          </aside>
        )}

        <div ref={setScrollEl} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {!ready && (
            <div className="absolute inset-0 z-30 flex flex-col gap-3 bg-white p-6 ps-16" role="status" aria-label={t('Chargement de la leçon')}>
              {['w-3/4 h-6', 'w-1/2', 'w-5/6', 'w-full h-20 mt-3', 'w-2/3', 'w-3/4', 'w-full h-28 mt-3'].map((c, i) => (
                <div key={i} className={`h-4 animate-pulse rounded bg-[#efece6] ${c}`} />
              ))}
            </div>
          )}
          <div ref={contentRef} className={ready ? '' : 'invisible'}>
            <NotebookContent
              key={entry.id}
              content={entry.lesson.content ?? ''}
              structure={entry.lesson.structure}
              className={phone ? 'py-1' : 'p-6'}
              notebookTheme={phone ? PhoneTheme : NOTEBOOK_THEME}
              onReady={onReady}
              onSaveAnnotations={loaded ? save : undefined}
              initialAnnotations={annotations}
              annotating={annotating && canAnnotate}
              showAnnotations={!phone}
            />
          </div>
          {ready && next && (
            <div className="flex justify-end border-t border-line bg-[#fcfbf9] px-4 py-3">
              <button type="button" onClick={() => setIndex(index + 1)}
                className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-lg px-2 text-[13.5px] font-semibold text-brand-hover hover:underline">
                <span className="shrink-0">{t('Leçon suivante :')}</span>
                <span className="truncate font-medium text-ink-soft">{next.lesson.title}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SectionContent;
