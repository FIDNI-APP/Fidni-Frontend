/**
 * « Tu as ouvert N exercices sans dire si tu les as réussis » (07/10/2026) : en haut de la liste
 * « Pour toi », les contenus ouverts et travaillés sans « Réussi » ni « À revoir », avec les boutons
 * directement sur chaque carte. L'élève rattrape ses oublis d'un clic.
 * « Pas encore fait » (08/10/2026) : il a seulement regardé, il ne peut pas juger. Comme la croix du
 * bandeau, ça ne le lui redemande plus, sauf s'il y retravaille ensuite (backend things/catch_up.py).
 * Téléphone (10/10/2026) : replié sur une ligne « 3 exercices à évaluer · Évaluer », qui s'ouvre au toucher,
 * pour que la liste commence tout de suite. Sur la page d'un chapitre, seulement ce chapitre (`chapter`).
 * 11/10/2026 : replié aussi sur ordinateur (une ligne calme au-dessus des cartes, plus un bloc de cartes qui
 * repoussait la liste) ; ouvert, une ligne par contenu. « À revoir » en or, comme partout.
 */
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, ChevronDown, ClipboardCheck, Eye, RotateCcw, X } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { assessQuestions } from '@/lib/api/contentItemApi';
import { trackAction } from '@/lib/usage';

type Kind = 'exercise' | 'exam';
type Result = 'success' | 'review';
type Answer = Result | 'not_done';

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

const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? 'ouvert aujourd’hui' : days === 1 ? 'ouvert hier' : `ouvert il y a ${days} j`;
};

/** Ne plus demander ces contenus (« Pas encore fait », ou bandeau fermé). */
const ignore = (ids: number[]) => api.post('/contents/a-evaluer/ignorer/', { ids });

export const CatchUpBanner: React.FC<{
  kind: Kind;
  /** Page d'un chapitre : seulement les contenus de ce chapitre. */
  chapter?: number | null;
  /** Dossiers d'un niveau : seulement les contenus de ce niveau. */
  level?: number | null;
  onEvaluated?: (id: number, result: Result) => void;
}> = ({ kind, chapter, level, onEvaluated }) => {
  const location = useLocation();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [count, setCount] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [failed, setFailed] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);
  // Replié tant que l'élève ne l'ouvre pas : la liste commence tout de suite.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAnswers({});
    setClosed(false);
    api.get('/contents/a-evaluer/', { params: { type: kind, chapter: chapter || undefined, level: level || undefined } })
      .then((r) => {
        if (cancelled) return;
        setItems(r.data.items || []);
        setCount(r.data.count || 0);
      })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [kind, chapter, level]);

  const answered = items.filter((x) => answers[x.id]).length;
  const allDone = items.length > 0 && answered === items.length;
  // Tout est rattrapé : un merci, puis le bandeau s'en va.
  useEffect(() => {
    if (!allDone) return;
    const t = window.setTimeout(() => setClosed(true), 2500);
    return () => window.clearTimeout(t);
  }, [allDone]);

  if (closed || items.length === 0) return null;

  const close = () => {
    const open = items.filter((x) => !answers[x.id]).map((x) => x.id);
    if (open.length) ignore(open).catch(() => {});
    setClosed(true);
  };

  const answer = async (item: PendingItem, value: Answer) => {
    setFailed(null);
    setAnswers((a) => ({ ...a, [item.id]: value }));
    trackAction('rattrapage-liste');
    try {
      if (value === 'not_done') {
        await ignore([item.id]);
      } else if (value === 'success' && item.paths.length) {
        // Comme « Tout réussi » sur la page du contenu : toutes les questions, puis le contenu
        // (QuestionProgress.source = « rattrapage » : on sait d'où vient l'évaluation).
        await assessQuestions(item.id, Object.fromEntries(item.paths.map((p) => [p, 'success'])),
          { completion: 'success', source: 'rattrapage' });
      } else {
        await api.post(`/contents/${item.id}/mark_progress/`, { status: value });
      }
      if (value !== 'not_done') onEvaluated?.(item.id, value);
    } catch {
      setAnswers((a) => { const next = { ...a }; delete next[item.id]; return next; });
      setFailed(item.id);
    }
  };

  const [one, many] = NOUN[kind];
  const btn = 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:min-h-9';
  const DONE: Record<Answer, { cls: string; icon: React.ReactNode; label: string }> = {
    success: { cls: 'bg-brand-soft text-brand-hover', icon: <Check className="h-3.5 w-3.5" />, label: 'Réussi' },
    review: { cls: 'bg-gold-soft text-gold-strong', icon: <RotateCcw className="h-3.5 w-3.5" />, label: 'À revoir' },
    not_done: { cls: 'bg-[#f2f1ee] text-ink-soft', icon: <Eye className="h-3.5 w-3.5" />, label: 'Pas encore fait' },
  };

  const from = location.pathname + location.search;
  const title = allDone ? 'C’est à jour, merci !' : `${count} ${count > 1 ? many : one} à évaluer`;

  return (
    <section aria-label={`${many} à évaluer`} className="mb-5 overflow-hidden rounded-2xl border border-gold-line bg-[#fdfaf3]">
      {/* Une ligne : combien, pourquoi, « Évaluer ». */}
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-strong ring-1 ring-gold-line" aria-hidden>
          <ClipboardCheck className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-faint">
          <b className="block font-semibold text-ink sm:inline">{title}</b>
          {!allDone && (
            <span className="hidden sm:inline">
              {' '}· tu {count > 1 ? 'les as ouverts' : 'l’as ouvert'} sans dire si tu {count > 1 ? 'les as réussis' : 'l’as réussi'}.
            </span>
          )}
        </p>
        {!allDone && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl border border-gold-line bg-white px-3 text-[13px] font-semibold text-ink transition-colors hover:border-gold sm:min-h-9">
            {open ? 'Replier' : 'Évaluer'} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
        <button type="button" onClick={close} aria-label="Fermer" title="Fermer : ne plus me les demander ici"
          className="-mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-white hover:text-ink sm:h-9 sm:w-9">
          <X className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-gold-line/70 bg-white">
          <p className="px-4 pt-3 text-[12.5px] text-ink-faint">
            Un clic par ligne suffit{count > items.length ? ` (voici les ${items.length} plus récents)` : ''}.
          </p>
          <ul className="divide-y divide-[#f0ede8]">
            {items.map((item) => {
              const done = answers[item.id];
              return (
                <li key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <Link to={`${PATH[kind]}/${item.id}`} state={{ from }} className="line-clamp-1 text-[14px] font-semibold leading-snug text-ink hover:underline">
                      {item.title}
                    </Link>
                    <p className="mt-0.5 truncate text-[12px] text-ink-faint">
                      {[item.chapter, ago(item.seen_at), item.assessed ? `${item.assessed} question${item.assessed > 1 ? 's' : ''} évaluée${item.assessed > 1 ? 's' : ''}` : null]
                        .filter(Boolean).join(' · ')}
                    </p>
                    {failed === item.id && <p className="mt-1 text-[12px] text-[#a23b34]">Ça n’a pas marché, réessaie.</p>}
                  </div>
                  {done ? (
                    <div className="shrink-0">
                      <span role="status" className={`${btn} ${DONE[done].cls}`}>{DONE[done].icon} {DONE[done].label}</span>
                      {done === 'not_done' && (
                        <p className="mt-1 max-w-[240px] text-[11.5px] leading-snug text-ink-faint">On te le redemandera quand tu y auras retravaillé.</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <button type="button" onClick={() => answer(item, 'success')}
                        className={`${btn} flex-1 bg-brand-soft text-brand-hover hover:bg-brand hover:text-white sm:flex-none`}>
                        <Check className="h-3.5 w-3.5" /> Réussi
                      </button>
                      <button type="button" onClick={() => answer(item, 'review')}
                        className={`${btn} flex-1 bg-gold-soft text-gold-strong hover:bg-gold hover:text-white sm:flex-none`}>
                        <RotateCcw className="h-3.5 w-3.5" /> À revoir
                      </button>
                      {/* Il l'a seulement regardé : il ne peut pas dire s'il l'a réussi. */}
                      <button type="button" onClick={() => answer(item, 'not_done')} title="Juste regardé, pas encore fait"
                        className={`${btn} w-full font-medium text-ink-faint hover:bg-[#f7f6f3] hover:text-ink sm:w-auto`}>
                        <Eye className="h-3.5 w-3.5" /> Pas encore fait
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};

export default CatchUpBanner;
