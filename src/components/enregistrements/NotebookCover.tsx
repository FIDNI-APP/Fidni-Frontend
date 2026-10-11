// Couverture d'un cahier sur l'étagère : dos à l'encre et sa reliure, matière et niveau (repère or), titre serif,
// vrais chiffres (« 7 leçons · 4 chapitres sur 12 »), une case par chapitre du programme (verte = remplie),
// dernier ajout. Toute la carte ouvre le cahier ; Renommer, Imprimer et Supprimer sont dans le menu « ⋯ ».
import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Pencil, Printer, Trash2 } from 'lucide-react';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { ago, plural, summarize, type NbNotebook } from '@/components/notebook/notebookModel';

const MAX_SQUARES = 30;

export const NotebookCover: React.FC<{
  notebook: NbNotebook;
  onRename: () => void;
  onDelete: () => void;
}> = ({ notebook, onRename, onDelete }) => {
  const { lessons, filled, total, last } = summarize(notebook);
  const [menu, setMenu] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const squares = [...(notebook.sections ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, MAX_SQUARES);

  const item = 'flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13.5px] font-medium transition-colors';

  return (
    <li className="relative min-w-0">
      <Link to={`/notebooks?nb=${notebook.id}`}
        className="group flex h-full min-h-[212px] overflow-hidden rounded-2xl border border-line bg-white transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        {/* Dos du cahier : encre et reliure */}
        <span aria-hidden className="flex w-6 shrink-0 flex-col items-center justify-evenly bg-ink py-4">
          {Array.from({ length: 6 }, (_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-paper/30" />)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col px-4 pb-4 pt-3.5">
          <span className="truncate pr-9 text-[10.5px] font-bold uppercase tracking-[.1em] text-gold-strong">
            {notebook.subject?.name} · {notebook.class_level?.name}
          </span>
          <span className="fd-display mt-1.5 line-clamp-2 pr-6 text-[19px] leading-snug text-ink">{notebook.title}</span>
          <span className="fd-nums mt-1.5 text-[12.5px] text-ink-faint">
            {lessons === 0 ? 'Encore vide'
              : <>{plural(lessons, 'leçon')} · {plural(filled, 'chapitre')} sur {total}</>}
          </span>

          <span className="mt-auto pt-4">
            {total > 0 && (
              <span className="flex flex-wrap gap-[3px]" role="img"
                aria-label={`${plural(filled, 'chapitre rempli', 'chapitres remplis')} sur ${total}`}>
                {squares.map((s) => (
                  <span key={s.id} title={s.chapter?.name}
                    className={`h-2 w-2 rounded-[2px] ${s.lesson_entries?.length ? 'bg-brand' : 'bg-[#ebe8e2]'}`} />
                ))}
              </span>
            )}
            <span className="mt-3 block border-t border-line pt-2.5 text-[12px] leading-snug text-ink-faint">
              {last ? (
                <>
                  <span className="block">Dernier ajout, {ago(last.at)}</span>
                  <span className="block truncate font-medium text-ink-soft">{last.title}</span>
                </>
              ) : (
                // La façon de le remplir est dite une fois, sous l'étagère.
                <span className="block">Pas encore de leçon</span>
              )}
            </span>
          </span>
        </span>
      </Link>

      <button ref={menuBtn} type="button" onClick={() => setMenu((v) => !v)}
        aria-haspopup="menu" aria-expanded={menu} aria-label={`Actions du cahier ${notebook.title}`}
        className="absolute right-1.5 top-1.5 inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <MoreHorizontal className="h-5 w-5" />
      </button>
      <FloatingPanel anchorRef={menuBtn} open={menu} onClose={() => setMenu(false)} placement="bottom-end" role="menu"
        className="w-52 rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_32px_rgba(20,18,16,.14)]">
        <button type="button" role="menuitem" className={`${item} text-ink-soft hover:bg-[#f7f6f3] hover:text-ink`}
          onClick={() => { setMenu(false); onRename(); }}>
          <Pencil className="h-4 w-4 text-ink-faint" /> Renommer
        </button>
        <Link role="menuitem" to={`/notebooks/${notebook.id}/pdf`} className={`${item} text-ink-soft hover:bg-[#f7f6f3] hover:text-ink`}
          onClick={() => setMenu(false)}>
          <Printer className="h-4 w-4 text-ink-faint" /> Imprimer
        </Link>
        <span className="my-1 block h-px bg-line" aria-hidden />
        <button type="button" role="menuitem" className={`${item} text-[#a23b34] hover:bg-[#fbecea]`}
          onClick={() => { setMenu(false); onDelete(); }}>
          <Trash2 className="h-4 w-4" /> Supprimer
        </button>
      </FloatingPanel>
    </li>
  );
};

export default NotebookCover;
