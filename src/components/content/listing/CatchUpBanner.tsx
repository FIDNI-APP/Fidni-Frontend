/**
 * « Tu as ouvert N exercices sans dire si tu les as réussis » (07/10/2026) : en haut de la liste
 * « Pour toi », les contenus ouverts et travaillés sans « Réussi » ni « À revoir », avec les deux
 * boutons directement sur chaque carte. L'élève rattrape ses oublis d'un clic ; il peut fermer le
 * bandeau (ces contenus ne lui seront plus redemandés ici). Données : GET /api/contents/a-evaluer/
 * (backend things/catch_up.py).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ClipboardCheck, RotateCcw, X } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { trackAction } from '@/lib/usage';

type Kind = 'exercise' | 'exam';
type Result = 'success' | 'review';

interface PendingItem {
  id: number;
  title: string;
  chapter: string | null;
  seen_at: string;
  paths: string[];
  assessed: number;
}

const PATH: Record<Kind, string> = { exercise: '/exercises', exam: '/exams' };
const NOUN: Record<Kind, [string, string]> = { exercise: ['exercice', 'exercices'], exam: ['examen', 'examens'] };
const storageKey = (kind: Kind) => `fidni:rattrapage-ferme:${kind}`;

const readDismissed = (kind: Kind): number[] => {
  try { return JSON.parse(localStorage.getItem(storageKey(kind)) || '[]'); } catch { return []; }
};

const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? 'ouvert aujourd’hui' : days === 1 ? 'ouvert hier' : `ouvert il y a ${days} j`;
};

export const CatchUpBanner: React.FC<{ kind: Kind; onEvaluated?: (id: number, result: Result) => void }> = ({ kind, onEvaluated }) => {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [count, setCount] = useState(0);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [failed, setFailed] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResults({});
    setClosed(false);
    // Ceux écartés en fermant le bandeau ne sont plus redemandés (le serveur ne les compte pas).
    api.get('/contents/a-evaluer/', { params: { type: kind, exclude: readDismissed(kind).join(',') || undefined } })
      .then((r) => {
        if (cancelled) return;
        setItems(r.data.items || []);
        setCount(r.data.count || 0);
      })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [kind]);

  const answered = items.filter((x) => results[x.id]).length;
  const allDone = items.length > 0 && answered === items.length;
  // Tout est rattrapé : un merci, puis le bandeau s'en va.
  useEffect(() => {
    if (!allDone) return;
    const t = window.setTimeout(() => setClosed(true), 2500);
    return () => window.clearTimeout(t);
  }, [allDone]);

  if (closed || items.length === 0) return null;

  const close = () => {
    const ids = Array.from(new Set([...readDismissed(kind), ...items.map((x) => x.id)])).slice(-200);
    try { localStorage.setItem(storageKey(kind), JSON.stringify(ids)); } catch { /* stockage indisponible */ }
    setClosed(true);
  };

  const answer = async (item: PendingItem, result: Result) => {
    setFailed(null);
    setResults((r) => ({ ...r, [item.id]: result }));
    trackAction('rattrapage-liste');
    try {
      if (result === 'success' && item.paths.length) {
        // Comme « Tout réussi » sur la page du contenu : toutes les questions, puis le contenu.
        await api.post(`/contents/${item.id}/assess_many/`, {
          assessments: Object.fromEntries(item.paths.map((p) => [p, 'success'])), completion: 'success',
        });
      } else {
        await api.post(`/contents/${item.id}/mark_progress/`, { status: result });
      }
      onEvaluated?.(item.id, result);
    } catch {
      setResults((r) => { const next = { ...r }; delete next[item.id]; return next; });
      setFailed(item.id);
    }
  };

  const [one, many] = NOUN[kind];
  const btn = 'inline-flex flex-1 items-center justify-center gap-1 h-8 px-3 rounded-lg text-[12.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';

  return (
    <section aria-label={`${many} à évaluer`} className="mb-5 rounded-2xl border border-[#ecdcb6] bg-[#fdfaf3] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold-strong">
          <ClipboardCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-ink">
            {allDone
              ? 'C’est à jour, merci !'
              : `Tu as ouvert ${count} ${count > 1 ? many : one} sans dire si tu ${count > 1 ? 'les as réussis' : 'l’as réussi'}.`}
          </p>
          {!allDone && (
            <p className="mt-0.5 text-[12.5px] text-ink-faint">
              Un clic par carte suffit{count > items.length ? ` (voici les ${items.length} plus récents)` : ''}.
            </p>
          )}
        </div>
        <button type="button" onClick={close} aria-label="Fermer" title="Fermer : ne plus me les demander ici"
          className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-faint hover:bg-white hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const result = results[item.id];
          return (
            <li key={item.id} className="flex flex-col rounded-xl border border-line bg-white px-3.5 py-3">
              <Link to={`${PATH[kind]}/${item.id}`} className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink hover:underline">
                {item.title}
              </Link>
              <p className="mt-0.5 truncate text-[12px] text-ink-faint">
                {[item.chapter, ago(item.seen_at), item.assessed ? `${item.assessed} question${item.assessed > 1 ? 's' : ''} évaluée${item.assessed > 1 ? 's' : ''}` : null]
                  .filter(Boolean).join(' · ')}
              </p>
              <div className="mt-2.5 flex gap-2">
                {result ? (
                  <span role="status" className={`${btn} ${result === 'success' ? 'bg-brand-soft text-brand-hover' : 'bg-[#fbecea] text-[#a23b34]'}`}>
                    {result === 'success' ? <><Check className="h-3.5 w-3.5" /> Réussi</> : <><RotateCcw className="h-3.5 w-3.5" /> À revoir</>}
                  </span>
                ) : (
                  <>
                    <button type="button" onClick={() => answer(item, 'success')}
                      className={`${btn} bg-brand-soft text-brand-hover hover:bg-brand hover:text-white`}>
                      <Check className="h-3.5 w-3.5" /> Réussi
                    </button>
                    <button type="button" onClick={() => answer(item, 'review')}
                      className={`${btn} bg-[#fbecea] text-[#a23b34] hover:bg-[#a23b34] hover:text-white`}>
                      <RotateCcw className="h-3.5 w-3.5" /> À revoir
                    </button>
                  </>
                )}
              </div>
              {failed === item.id && <p className="mt-1.5 text-[12px] text-[#a23b34]">Ça n’a pas marché, réessaie.</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default CatchUpBanner;
