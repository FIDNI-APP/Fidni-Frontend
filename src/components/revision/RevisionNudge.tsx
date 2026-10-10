// Proposition discrète quand l'élève vient de rater une question (ou tout l'exercice) : ranger
// l'exercice dans sa liste « À revoir », en un clic. Une seule fois par exercice ; « Plus tard » ne la
// fait plus revenir pour cet exercice. Sur ordinateur, en bas à droite ; sur téléphone (10/10/2026), une
// carte dans la page, sous « Où en es-tu ? » : fixée en bas, elle cachait la question suivante (et la
// barre d'onglets du téléphone, affichée jusqu'à md).
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ListPlus, Loader2, X } from 'lucide-react';
import { quickAddToRevision } from '@/lib/api/revisionListApi';

const KEY = 'fidni:suggestion-revision';

const seen = (id: string | number): boolean => {
  try { return (JSON.parse(localStorage.getItem(KEY) || '[]') as string[]).includes(String(id)); } catch { return false; }
};
const remember = (id: string | number) => {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]') as string[];
    localStorage.setItem(KEY, JSON.stringify([...all.filter((x) => x !== String(id)), String(id)].slice(-300)));
  } catch { /* stockage indisponible */ }
};

export const RevisionNudge: React.FC<{
  contentId: string | number;
  trigger: number;
  kind: 'exercise' | 'exam';
  /** Vrai tant que la proposition attend une réponse (une seule demande à l'élève à la fois sur la page). */
  onAskingChange?: (asking: boolean) => void;
}> = ({ contentId, trigger, kind, onAskingChange }) => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [listName, setListName] = useState('À revoir');

  // Avant l'affichage (layout effect) : le ressenti du FinishPanel ne clignote pas avant de céder la place.
  useLayoutEffect(() => {
    if (trigger > 0 && !seen(contentId)) { setOpen(true); setState('idle'); }
  }, [trigger, contentId]);

  // Téléphone : la carte s'insère au-dessus de la question que l'élève lit. Les navigateurs sans
  // « scroll anchoring » (Safari) feraient sauter la page : on compense le défilement.
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el || getComputedStyle(el).position === 'fixed') return;
    if (typeof CSS !== 'undefined' && CSS.supports?.('overflow-anchor', 'auto')) return;
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0) window.scrollBy(0, r.height + (parseFloat(getComputedStyle(el).marginTop) || 0));
  }, [open]);

  const asking = open && state !== 'done';
  useLayoutEffect(() => {
    onAskingChange?.(asking);
  }, [asking, onAskingChange]);
  useEffect(() => () => onAskingChange?.(false), [onAskingChange]);

  if (!open) return null;
  const close = () => { remember(contentId); setOpen(false); };
  const add = async () => {
    setState('busy');
    try {
      const r = await quickAddToRevision(Number(contentId));
      setListName(r.list_name);
      setState('done');
      remember(contentId);
    } catch {
      setState('idle');
    }
  };

  return (
    <div ref={ref} role="status" className="relative md:fixed md:bottom-4 md:right-4 md:z-40 md:w-[360px] rounded-2xl border border-line bg-white p-4 shadow-sm md:shadow-[0_16px_40px_rgba(20,18,16,.16)]">
      <button type="button" onClick={close} aria-label="Fermer" className="absolute top-2.5 right-2.5 p-1.5 [@media(pointer:coarse)]:p-2.5 [@media(pointer:coarse)]:top-1 [@media(pointer:coarse)]:right-1 rounded-lg text-ink-faint hover:text-ink hover:bg-[#f2f1ee]">
        <X className="w-4 h-4" />
      </button>
      {state === 'done' ? (
        <>
          <p className="flex items-center gap-2 pr-6 text-[14px] font-semibold text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white"><Check className="w-3.5 h-3.5" strokeWidth={3} /></span>
            Ajouté à « {listName} »
          </p>
          <p className="mt-1.5 text-[13px] text-ink-soft">Tu le retrouveras dans tes révisions, avec les autres exercices à reprendre.</p>
          <Link to="/revision-lists?onglet=listes" onClick={() => setOpen(false)} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-hover hover:underline">
            Voir mes révisions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </>
      ) : (
        <>
          <p className="pr-6 text-[14px] font-semibold text-ink">{kind === 'exam' ? 'Ce sujet' : 'Cet exercice'} te résiste ?</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            Range-le dans ta liste « À revoir » pour le reprendre avant ton prochain devoir.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={add} disabled={state === 'busy'} className="fd-btn-primary">
              {state === 'busy' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4" />}
              Ajouter à « À revoir »
            </button>
            <button type="button" onClick={close} className="min-h-9 px-3 py-2 text-[13px] font-medium text-ink-faint hover:text-ink">Plus tard</button>
          </div>
        </>
      )}
    </div>
  );
};

export default RevisionNudge;
