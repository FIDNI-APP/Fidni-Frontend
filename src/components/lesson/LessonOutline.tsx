/**
 * Sommaire d'une leçon : panneau latéral (ordinateur) et barre repliable (téléphone).
 * - partie en cours surlignée pendant la lecture, clic = on y va ;
 * - progression de lecture et durée estimée ;
 * - « Reprendre » : retour à la dernière partie lue (mémorisée sur cet appareil) ;
 * - lien direct vers une partie (#partie-2-1) : l'adresse suit la lecture, on peut la partager.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, BookmarkCheck, ChevronDown, Clock, ListTree } from 'lucide-react';
import type { OutlineItem } from './useLessonOutline';

interface OutlineState {
  items: OutlineItem[];
  activeId: string | null;
  progress: number;
  minutes: number;
  scrollTo: (id: string, behavior?: ScrollBehavior) => void;
  scrollToTop: () => void;
}

interface Props {
  outline: OutlineState;
  /** Clé de mémorisation de la dernière partie lue (ex. « lecon-95 »). Sans clé : pas de « Reprendre ». */
  storageKey?: string;
  /** L'adresse suit la partie en cours (#partie-2-1) et une adresse avec ancre ouvre la bonne partie. */
  syncHash?: boolean;
  className?: string;
}

const readSaved = (key?: string) => {
  if (!key) return null;
  try { return localStorage.getItem(`fidni:lecture:${key}`); } catch { return null; }
};
const writeSaved = (key: string, id: string | null) => {
  try {
    if (id) localStorage.setItem(`fidni:lecture:${key}`, id);
    else localStorage.removeItem(`fidni:lecture:${key}`);
  } catch { /* stockage indisponible */ }
};

/** Logique partagée des deux affichages : ancre dans l'adresse, reprise de lecture. */
function useOutlineBehaviour({ outline, storageKey, syncHash }: Props) {
  const { items, activeId, scrollTo } = outline;
  const [resumeId, setResumeId] = useState<string | null>(null);
  const started = useRef(false);

  // Premier affichage : ancre de l'adresse, sinon proposition de reprendre.
  useEffect(() => {
    if (started.current || items.length === 0) return;
    started.current = true;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (syncHash && hash && items.some((it) => it.id === hash)) {
      window.setTimeout(() => scrollTo(hash, 'auto'), 50);
      return;
    }
    const saved = readSaved(storageKey);
    if (saved && saved !== items[0].id && items.some((it) => it.id === saved)) setResumeId(saved);
  }, [items, syncHash, storageKey, scrollTo]);

  // Au fil de la lecture : adresse et dernière partie lue.
  useEffect(() => {
    if (!activeId || !started.current) return;
    const timer = window.setTimeout(() => {
      if (syncHash) {
        const url = activeId === items[0]?.id ? window.location.pathname + window.location.search
          : `${window.location.pathname}${window.location.search}#${activeId}`;
        window.history.replaceState(window.history.state, '', url);
      }
      if (storageKey) writeSaved(storageKey, activeId === items[0]?.id ? null : activeId);
      if (resumeId && activeId === resumeId) setResumeId(null);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [activeId, items, syncHash, storageKey, resumeId]);

  const resumeItem = resumeId ? items.find((it) => it.id === resumeId) : undefined;
  return { resumeItem, dismissResume: () => setResumeId(null) };
}

const ProgressLine: React.FC<{ progress: number; minutes: number }> = ({ progress, minutes }) => (
  <div>
    <div className="flex items-center justify-between text-[11.5px] text-ink-faint">
      <span className="fd-nums">{Math.round(progress * 100)} % lu</span>
      {minutes > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden /> {minutes} min</span>}
    </div>
    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#f2f1ee]" aria-hidden>
      <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
    </div>
  </div>
);

const ItemList: React.FC<{ items: OutlineItem[]; activeId: string | null; onPick: (id: string) => void }> = ({ items, activeId, onPick }) => (
  <ol className="relative space-y-0.5 border-l border-line">
    {items.map((it) => {
      const active = it.id === activeId;
      return (
        <li key={it.id}>
          <a
            href={`#${it.id}`}
            onClick={(e) => { e.preventDefault(); onPick(it.id); }}
            aria-current={active ? 'location' : undefined}
            className={`-ml-px flex gap-2 border-l-2 py-1.5 pr-2 leading-snug transition-colors ${
              it.level === 1 ? 'pl-3 text-[13px] font-medium' : 'pl-6 text-[12.5px]'
            } ${active ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:border-ink-faint hover:text-ink'}`}
          >
            <span className="fd-nums shrink-0 text-ink-faint">{it.num}.</span>
            <span className="min-w-0">{it.title}</span>
          </a>
        </li>
      );
    })}
  </ol>
);

/** Panneau latéral collant (ordinateur). */
export const LessonOutlinePanel: React.FC<Props & { title?: string }> = (props) => {
  const { outline, className = '', title = 'Sommaire' } = props;
  const { resumeItem, dismissResume } = useOutlineBehaviour(props);
  if (outline.items.length < 2) return null;
  return (
    <nav aria-label="Sommaire de la leçon" className={`text-sm ${className}`}>
      <p className="mb-3 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-ink-faint">
        <ListTree className="h-3.5 w-3.5" aria-hidden /> {title}
      </p>
      <ProgressLine progress={outline.progress} minutes={outline.minutes} />
      {resumeItem && (
        <button
          type="button"
          onClick={() => { outline.scrollTo(resumeItem.id); dismissResume(); }}
          className="mt-3 flex w-full items-start gap-2 rounded-xl border border-gold-line bg-gold-soft px-3 py-2 text-left text-[12.5px] text-gold-strong hover:border-gold"
        >
          <BookmarkCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span><span className="font-semibold">Reprendre</span> à {resumeItem.num}. {resumeItem.title}</span>
        </button>
      )}
      <div className="mt-4">
        <ItemList items={outline.items} activeId={outline.activeId} onPick={(id) => outline.scrollTo(id)} />
      </div>
      <button type="button" onClick={outline.scrollToTop}
        className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-faint hover:text-ink">
        <ArrowUp className="h-3.5 w-3.5" aria-hidden /> Revenir au début
      </button>
    </nav>
  );
};

/** Barre repliable (téléphone, tablette) : partie en cours + liste au toucher. */
export const LessonOutlineBar: React.FC<Props & { tourId?: string }> = (props) => {
  const { outline, className = '' } = props;
  const { resumeItem, dismissResume } = useOutlineBehaviour({ ...props, syncHash: false });
  const [open, setOpen] = useState(false);
  if (outline.items.length < 2) return null;
  const current = outline.items.find((it) => it.id === outline.activeId) ?? outline.items[0];
  const pick = (id: string) => { outline.scrollTo(id); setOpen(false); dismissResume(); };
  return (
    <div data-tour={props.tourId} className={`rounded-xl border border-line bg-white/95 shadow-[0_2px_10px_rgba(20,18,16,.06)] backdrop-blur ${className}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left">
        <ListTree className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
          <span className="fd-nums text-ink-faint">{current.num}.</span> {current.title}
        </span>
        <span className="fd-nums shrink-0 text-[11.5px] text-ink-faint">{Math.round(outline.progress * 100)} %</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      <div className="h-0.5 overflow-hidden rounded-b-xl bg-[#f2f1ee]" aria-hidden>
        <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${outline.progress * 100}%` }} />
      </div>
      {open && (
        <div className="max-h-[60vh] overflow-y-auto px-3 pb-3 pt-2">
          {resumeItem && (
            <button type="button" onClick={() => pick(resumeItem.id)}
              className="mb-2 flex w-full items-start gap-2 rounded-lg bg-gold-soft px-3 py-2 text-left text-[12.5px] text-gold-strong">
              <BookmarkCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span><span className="font-semibold">Reprendre</span> à {resumeItem.num}. {resumeItem.title}</span>
            </button>
          )}
          <ItemList items={outline.items} activeId={outline.activeId} onPick={pick} />
        </div>
      )}
    </div>
  );
};
