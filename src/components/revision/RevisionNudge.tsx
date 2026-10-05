// Proposition discrète, en bas à droite, quand l'élève vient de rater une question (ou tout
// l'exercice) : ranger l'exercice dans sa liste « À revoir », en un clic. Une seule fois par
// exercice ; « Plus tard » ne la fait plus revenir pour cet exercice.
import React, { useEffect, useState } from 'react';
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

export const RevisionNudge: React.FC<{ contentId: string | number; trigger: number; kind: 'exercise' | 'exam' }> = ({ contentId, trigger, kind }) => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [listName, setListName] = useState('À revoir');

  useEffect(() => {
    if (trigger > 0 && !seen(contentId)) { setOpen(true); setState('idle'); }
  }, [trigger, contentId]);

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
    <div role="status" className="fixed bottom-4 right-4 left-4 sm:left-auto z-40 sm:w-[360px] rounded-2xl border border-line bg-white p-4 shadow-[0_16px_40px_rgba(20,18,16,.16)]">
      <button type="button" onClick={close} aria-label="Fermer" className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-[#f2f1ee]">
        <X className="w-4 h-4" />
      </button>
      {state === 'done' ? (
        <>
          <p className="flex items-center gap-2 pr-6 text-[14px] font-semibold text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white"><Check className="w-3.5 h-3.5" strokeWidth={3} /></span>
            Ajouté à « {listName} »
          </p>
          <p className="mt-1.5 text-[13px] text-ink-soft">Tu le retrouveras dans tes révisions, avec les autres exercices à reprendre.</p>
          <Link to="/revision-lists" onClick={() => setOpen(false)} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-hover hover:underline">
            Voir mes révisions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </>
      ) : (
        <>
          <p className="pr-6 text-[14px] font-semibold text-ink">{kind === 'exam' ? 'Ce sujet' : 'Cet exercice'} te résiste ?</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            Range-le dans ta liste « À revoir » pour le reprendre avant ton prochain devoir.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={add} disabled={state === 'busy'} className="fd-btn-primary">
              {state === 'busy' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4" />}
              Ajouter à « À revoir »
            </button>
            <button type="button" onClick={close} className="px-3 py-2 text-[13px] font-medium text-ink-faint hover:text-ink">Plus tard</button>
          </div>
        </>
      )}
    </div>
  );
};

export default RevisionNudge;
