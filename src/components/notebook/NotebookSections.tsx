// Chapitres d'un cahier ouvert : ceux qui ont des leçons d'abord (avec leur nombre), puis, repliés,
// les chapitres sans leçon, une ligne chacun qui mène aux leçons de ce chapitre (la consigne est dite une fois).
// Ordinateur : colonne à gauche. Téléphone : un sélecteur pleine largeur qui ouvre une feuille du bas,
// pour laisser toute la largeur à la leçon.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Printer } from 'lucide-react';
import { Sheet } from '@/components/space/Sheet';
import { t } from '@/i18n';
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
  const [showEmpty, setShowEmpty] = useState<boolean | null>(null);
  const expanded = showEmpty ?? filled.length === 0;
  return (
    <div>
      {filled.length > 0 && (
        <>
          <p className="px-3 pb-2 text-[12.5px] font-medium text-ink-faint">{t('Chapitres · {n}', { n: filled.length })}</p>
          <ul className="flex flex-col gap-0.5">
            {filled.map((s) => {
              const on = sameId(s.id, activeId);
              return (
                <li key={s.id}>
                  <button type="button" aria-current={on ? 'true' : undefined}
                    onClick={() => { onSelect(s.id); onPicked?.(); }}
                    className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-start text-[13.5px] transition-colors ${
                      on ? 'bg-brand-soft font-semibold text-brand-hover' : 'font-medium text-ink-soft hover:bg-[#f7f6f3] hover:text-ink'}`}>
                    <span className="min-w-0 flex-1 break-words py-1.5 leading-snug">{s.chapter?.name}</span>
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
        <div className={filled.length ? 'mt-3 border-t border-line pt-2' : undefined}>
          <button type="button" onClick={() => setShowEmpty(!expanded)} aria-expanded={expanded}
            className="flex min-h-10 w-full items-center gap-1.5 rounded-lg px-3 text-start text-[12.5px] font-semibold text-ink-faint hover:text-ink">
            <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden />
            {t('Chapitres sans leçon ({n})', { n: empty.length })}
          </button>
          {expanded && (
            <>
              <p className="px-3 pb-1 text-[12px] leading-snug text-ink-faint">{t('Touche un chapitre pour trouver ses leçons.')}</p>
              <ul className="flex flex-col gap-0.5">
                {empty.map((s) => (
                  <li key={s.id}>
                    <Link to={chapterLessonsPath(notebook, s.chapter)} onClick={onPicked}
                      aria-label={t('{name} : trouver une leçon', { name: s.chapter?.name })}
                      className="group/ch flex min-h-10 items-center gap-2 rounded-xl px-3 text-[13px] text-ink-faint transition-colors hover:bg-[#f7f6f3] hover:text-ink focus-visible:bg-[#f7f6f3] focus-visible:text-ink">
                      <span className="min-w-0 flex-1 break-words py-1.5 leading-snug">{s.chapter?.name}</span>
                      <span className="hidden shrink-0 text-[12px] font-semibold text-brand-hover group-hover/ch:inline group-focus-visible/ch:inline">{t('Trouver une leçon')}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#cfcdc8] group-hover/ch:text-brand-hover group-focus-visible/ch:text-brand-hover" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
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
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [open]);

  return (
    <>
      {/* Téléphone : sélecteur de chapitre (et impression) */}
      <div className="flex items-stretch border-b border-line bg-white md:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
        className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 px-4 text-start">
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-medium text-ink-faint">
            {active ? t('Chapitre {position} sur {total}', { position, total: filled.length }) : t('Chapitres du programme')}
          </span>
          <span className="block break-words text-[14px] font-semibold text-ink">
            {active ? active.chapter?.name : t('{count} à remplir', { count: plural(empty.length, 'chapitre') })}
          </span>
        </span>
        {active && <span className="fd-nums shrink-0 text-[12px] text-ink-faint">{plural(active.lesson_entries.length, 'leçon')}</span>}
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
      </button>
      {props.printTo && (
        <Link to={props.printTo} data-tour="cahier-imprimer" aria-label={t('Imprimer le cahier')} title={t('Imprimer le cahier')}
          className="flex w-[52px] shrink-0 items-center justify-center border-s border-line text-ink-faint hover:bg-[#f7f6f3] hover:text-ink">
          <Printer className="h-[18px] w-[18px]" />
        </Link>
      )}
      </div>

      {/* Ordinateur : colonne des chapitres */}
      <nav aria-label={t('Chapitres du cahier')} className="hidden h-full w-[264px] overflow-y-auto border-e border-line bg-white px-2 py-4 md:block">
        <ChapterList {...props} />
      </nav>

      <Sheet open={open} onClose={() => setOpen(false)} title={notebook.title}
        subtitle={t('Chapitres du cahier')} labelId="chapitres-cahier-mobile">
        <ChapterList {...props} onPicked={() => setOpen(false)} />
      </Sheet>
    </>
  );
};

export default NotebookSections;
