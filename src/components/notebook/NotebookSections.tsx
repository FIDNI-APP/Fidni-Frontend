// Chapitres d'un cahier ouvert : ceux qui ont des leçons d'abord (avec leur nombre), puis, repliés,
// les chapitres sans leçon, une ligne chacun qui mène aux leçons de ce chapitre (la consigne est dite une fois).
// Ordinateur : colonne à gauche. Téléphone : un sélecteur pleine largeur qui ouvre une feuille du bas,
// pour laisser toute la largeur à la leçon.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Printer, X } from 'lucide-react';
import { chapterLessonsPath, plural, sameId, splitSections, type Id, type NbNotebook } from './notebookModel';

interface Props {
  notebook: NbNotebook;
  activeId: Id | null;
  onSelect: (id: Id) => void;
  /** Version à imprimer : sur téléphone, son bouton est à côté du sélecteur (l'en-tête du cahier y est masqué). */
  printTo?: string;
}

const ChapterList: React.FC<Props & { onPicked?: () => void }> = ({ notebook, activeId, onSelect, onPicked }) => {
  const { filled, empty } = splitSections(notebook);
  return (
    <div>
      {filled.length > 0 && (
        <>
          <p className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-[.1em] text-ink-faint">Chapitres · {filled.length}</p>
          <ul className="flex flex-col gap-0.5">
            {filled.map((s) => {
              const on = sameId(s.id, activeId);
              return (
                <li key={s.id}>
                  <button type="button" aria-current={on ? 'true' : undefined}
                    onClick={() => { onSelect(s.id); onPicked?.(); }}
                    className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-[13.5px] transition-colors ${
                      on ? 'bg-brand-soft font-semibold text-brand-hover' : 'font-medium text-ink-soft hover:bg-[#f7f6f3] hover:text-ink'}`}>
                    <span className="min-w-0 flex-1 truncate">{s.chapter?.name}</span>
                    <span className={`fd-nums shrink-0 rounded-full px-1.5 text-[11px] font-semibold ${on ? 'bg-white/80' : 'bg-[#f2f1ee] text-ink-faint'}`}
                      aria-label={plural(s.lesson_entries.length, 'leçon')}>
                      {s.lesson_entries.length}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {empty.length > 0 && (
        <details className={`group ${filled.length ? 'mt-3 border-t border-line pt-2' : ''}`} open={filled.length === 0}>
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold text-ink-faint hover:text-ink [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden />
            Chapitres sans leçon ({empty.length})
          </summary>
          <p className="px-3 pb-1 text-[12px] leading-snug text-ink-faint">Touche un chapitre pour trouver ses leçons.</p>
          <ul className="flex flex-col gap-0.5">
            {empty.map((s) => (
              <li key={s.id}>
                <Link to={chapterLessonsPath(notebook, s.chapter)} onClick={onPicked}
                  aria-label={`${s.chapter?.name} : trouver une leçon`}
                  className="group/ch flex min-h-10 items-center gap-2 rounded-xl px-3 text-[13px] text-ink-faint transition-colors hover:bg-[#f7f6f3] hover:text-ink focus-visible:bg-[#f7f6f3] focus-visible:text-ink">
                  <span className="min-w-0 flex-1 truncate">{s.chapter?.name}</span>
                  <span className="hidden shrink-0 text-[12px] font-semibold text-brand-hover group-hover/ch:inline group-focus-visible/ch:inline">Trouver une leçon</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#cfcdc8] group-hover/ch:text-brand-hover group-focus-visible/ch:text-brand-hover" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

const NotebookSections: React.FC<Props> = (props) => {
  const { notebook, activeId } = props;
  const [open, setOpen] = useState(false);
  const { filled, empty } = splitSections(notebook);
  const active = filled.find((s) => sameId(s.id, activeId)) ?? null;
  const position = active ? filled.indexOf(active) + 1 : 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Téléphone : sélecteur de chapitre (et impression) */}
      <div className="flex items-stretch border-b border-line bg-white md:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
        className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 px-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-bold uppercase tracking-[.1em] text-gold-strong">
            {active ? `Chapitre ${position} sur ${filled.length}` : 'Chapitres du programme'}
          </span>
          <span className="block truncate text-[14px] font-semibold text-ink">
            {active ? active.chapter?.name : `${plural(empty.length, 'chapitre')} à remplir`}
          </span>
        </span>
        {active && <span className="fd-nums shrink-0 text-[12px] text-ink-faint">{plural(active.lesson_entries.length, 'leçon')}</span>}
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
      </button>
      {props.printTo && (
        <Link to={props.printTo} data-tour="cahier-imprimer" aria-label="Imprimer le cahier" title="Imprimer le cahier"
          className="flex w-[52px] shrink-0 items-center justify-center border-l border-line text-ink-faint hover:bg-[#f7f6f3] hover:text-ink">
          <Printer className="h-[18px] w-[18px]" />
        </Link>
      )}
      </div>

      {/* Ordinateur : colonne des chapitres */}
      <nav aria-label="Chapitres du cahier" className="hidden h-full w-[264px] overflow-y-auto border-r border-line bg-white px-2 py-4 md:block">
        <ChapterList {...props} />
      </nav>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-[rgba(20,18,16,.4)] md:hidden" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Chapitres du cahier" onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80dvh] flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-12px_40px_rgba(20,18,16,.18)]">
            <div className="flex shrink-0 items-center gap-2 border-b border-line py-2 pl-5 pr-2">
              <p className="fd-display min-w-0 flex-1 truncate text-[19px] text-ink">{notebook.title}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-2 pb-5 pt-3">
              <ChapterList {...props} onPicked={() => setOpen(false)} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default NotebookSections;
