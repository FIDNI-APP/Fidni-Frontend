/**
 * « Où en es-tu ? » : terminer un contenu (réussi / à retravailler ; lue pour une leçon) et le ranger
 * dans une liste de révision ou un cahier. Avant, c'étaient deux petits boutons de l'en-tête
 * (« Terminer », « Liste ») que les élèves ne remarquaient pas.
 * Bandeau compact en haut de la page (au-dessus du contenu), sur ordinateur comme sur téléphone.
 * Exercice / examen (06/10/2026) : « Tout réussi » coche toutes les questions d'un coup (on décoche
 * ensuite celles qu'on a ratées) ; le résultat se met aussi à jour tout seul quand chaque question
 * est évaluée.
 * 10/10/2026 : sur téléphone, une seule ligne (l'énoncé arrive plus haut). Une fois le résultat donné :
 * « C'était : Plus facile · Comme annoncé · Plus dur » (ressenti des élèves, une seule demande à la fois
 * sur la page) et la suite adaptée au résultat (« Exercice suivant », le cours après un échec).
 */
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookMarked, BookOpen, Check, CheckCheck, CheckCircle2, ListPlus, RotateCcw } from 'lucide-react';
import type { ContentExercise, ContentExam, ContentLesson, Felt } from '@/types/content';
import { AddToRevisionListModal } from '@/components/revision/AddToRevisionListModal';
import { AddToNotebookModal } from '@/components/notebook/AddToNotebookModal';
import { labelsFromContent } from '@/components/revision/RevisionLabelPicker';
import { getRecommendations, sendRessenti, type FeltVote, type RecommendedItem } from '@/lib/api/contentItemApi';
import { useFoundPromptOpen } from './pageHelpers';
import { trackAction } from '@/lib/usage';

type ContentItem = ContentExercise | ContentExam | ContentLesson;
type Status = 'success' | 'review' | null;

interface FinishPanelProps {
  content: ContentItem;
  contentType: 'exercise' | 'exam' | 'lesson';
  completionStatus?: Status;
  onSetCompletion: (status: Status) => void;
  /** Questions évaluées / à évaluer (exercice, examen). */
  progress?: { assessed: number; total: number };
  /** Résultat choisi pendant cette visite (pas celui chargé avec la page) : le ressenti n'est demandé qu'alors. */
  statusChosen?: boolean;
  /** Faux quand une autre demande est déjà affichée (proposition « À revoir »…) : le ressenti attend. */
  canAsk?: boolean;
  /** Ressenti des élèves recalculé après l'avis de l'élève. */
  onFelt?: (felt: Felt | null) => void;
}

const QUESTION: Record<FinishPanelProps['contentType'], string> = {
  exercise: 'Tu as fini cet exercice ?',
  exam: 'Tu as fini ce sujet ?',
  lesson: 'Tu as lu cette leçon ?',
};

const DECLARED: Record<string, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };
const PATH: Record<string, string> = { exercise: '/exercises', exam: '/exams', lesson: '/lessons' };

// Avis déjà donnés depuis ce navigateur : on ne redemande pas (le serveur garde un avis par élève).
const FELT_KEY = 'fidni:ressenti';
const readGiven = (id: number | string): FeltVote | null => {
  try { return (JSON.parse(localStorage.getItem(FELT_KEY) || '{}') as Record<string, FeltVote>)[String(id)] ?? null; } catch { return null; }
};
const rememberGiven = (id: number | string, v: FeltVote) => {
  try {
    const all = JSON.parse(localStorage.getItem(FELT_KEY) || '{}') as Record<string, FeltVote>;
    const keys = Object.keys(all);
    if (keys.length > 400) keys.slice(0, keys.length - 400).forEach((k) => delete all[k]);
    all[String(id)] = v;
    localStorage.setItem(FELT_KEY, JSON.stringify(all));
  } catch { /* stockage indisponible */ }
};

export const FinishPanel: React.FC<FinishPanelProps> = ({
  content, contentType, completionStatus = null, onSetCompletion, progress, statusChosen, canAsk = true, onFelt,
}) => {
  const [listOpen, setListOpen] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const isLesson = contentType === 'lesson';
  const toggle = (s: Exclude<Status, null>) => onSetCompletion(completionStatus === s ? null : s);
  const location = useLocation();

  const btn = 'inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 sm:px-3.5 py-2 text-[13px] sm:text-[13.5px] font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';
  const success = completionStatus === 'success';
  const review = completionStatus === 'review';

  const status = success
    ? (isLesson ? 'Leçon marquée comme lue.' : 'Réussi : c’est noté dans ta progression.')
    : review ? 'À revoir : à refaire dans 2-3 jours, on te le rappellera sur l’accueil.' : null;
  const total = progress?.total ?? 0;
  const assessed = progress?.assessed ?? 0;
  const hint = isLesson || total < 2 ? null
    : assessed === 0 ? 'Indique sous chaque question si tu l’as réussie, ou tout d’un coup ici.'
      : assessed < total ? `${assessed} question${assessed > 1 ? 's' : ''} évaluée${assessed > 1 ? 's' : ''} sur ${total}.`
        : null;

  // ── Ressenti : quand l'élève vient de donner son résultat (pas à chaque visite d'un contenu déjà fait),
  // si aucune autre question ne l'attend.
  const promptOpen = useFoundPromptOpen();
  // Sans statusChosen : un statut différent de celui de l'arrivée.
  const [initialStatus] = useState(completionStatus);
  const chosen = statusChosen ?? completionStatus !== initialStatus;
  const declared = content.difficulty ? DECLARED[content.difficulty] : null;
  const [given, setGiven] = useState<FeltVote | null>(() => readGiven(content.id));
  const [thanks, setThanks] = useState(false);
  useEffect(() => {
    if (!thanks) return;
    const t = window.setTimeout(() => setThanks(false), 4000);
    return () => window.clearTimeout(t);
  }, [thanks]);
  const askFelt = !isLesson && !!completionStatus && chosen && !!declared && !given && canAsk && !promptOpen;
  const giveFelt = async (v: FeltVote) => {
    setGiven(v);
    setThanks(true);
    trackAction('ressenti');
    try {
      const r = await sendRessenti(content.id, v);
      rememberGiven(content.id, v);
      onFelt?.(r.ressenti ?? null);
    } catch {
      setGiven(null);
      setThanks(false);
    }
  };

  // ── La suite, selon le résultat : après un échec, pas plus dur et le cours d'abord ; après une réussite, pas plus facile.
  const [next, setNext] = useState<RecommendedItem[]>([]);
  useEffect(() => {
    if (isLesson || !completionStatus) { setNext([]); return; }
    let alive = true;
    getRecommendations(content.id, completionStatus)
      .then((items) => {
        if (!alive) return;
        // Du même type d'abord (un exercice après un exercice), sinon un autre exercice ou sujet.
        const work = items.find((i) => i.type === contentType && i.id !== content.id)
          ?? items.find((i) => i.type !== 'lesson' && i.id !== content.id);
        const lesson = completionStatus === 'review' ? items.find((i) => i.type === 'lesson') : undefined;
        setNext([lesson, work].filter((x): x is RecommendedItem => !!x));
      })
      .catch(() => { if (alive) setNext([]); });
    return () => { alive = false; };
  }, [content.id, contentType, completionStatus, isLesson]);

  const feltChip = 'inline-flex items-center h-8 [@media(pointer:coarse)]:h-9 px-3 rounded-full border border-line bg-white text-[13px] font-medium text-ink-soft hover:border-ink hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';

  return (
    <>
      <section className="fd-card px-3 py-2.5 sm:px-5 sm:py-3.5" data-tour="detail-terminer">
        <div className="flex items-center gap-2.5 sm:gap-3 sm:justify-between">
          <div className="min-w-0 hidden sm:block">
            <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">Où en es-tu ?</p>
            <p className={`mt-0.5 text-[14.5px] font-semibold ${success ? 'text-brand-hover' : review ? 'text-gold-strong' : 'text-ink'}`}>
              {status ?? QUESTION[contentType]}
            </p>
            {hint && <p className="mt-0.5 text-[12.5px] text-ink-faint fd-nums">{hint}</p>}
          </div>
          {/* Téléphone : une seule ligne (questions évaluées, puis les boutons). */}
          {!isLesson && total >= 2 && (
            <p className="sm:hidden max-[379px]:hidden shrink-0 leading-tight text-center" title="Questions évaluées">
              <span className="block fd-nums text-[13px] font-semibold text-ink-soft">{assessed}/{total}</span>
              <span className="block text-[10.5px] text-ink-faint">évaluées</span>
            </p>
          )}
          <div className={`grid flex-1 gap-2 sm:flex sm:flex-none sm:shrink-0 ${isLesson ? 'grid-cols-[1fr_auto]' : 'grid-cols-[1fr_1fr_auto]'}`}>
            <button type="button" onClick={() => toggle('success')} aria-pressed={success}
              title={success ? 'Cliquer pour annuler' : undefined}
              className={`${btn} ${success ? 'border-brand bg-brand text-white hover:bg-brand-hover' : 'border-brand-line bg-white text-brand-hover hover:bg-brand-soft'}`}>
              {success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <CheckCheck className="h-4 w-4 shrink-0" />}
              {isLesson ? (success ? 'Lue' : 'Marquer comme lue') : 'Tout réussi'}
            </button>
            {!isLesson && (
              <button type="button" onClick={() => toggle('review')} aria-pressed={review}
                title={review ? 'Cliquer pour annuler' : undefined}
                className={`${btn} ${review ? 'border-gold-line bg-gold-soft text-gold-strong' : 'border-line bg-white text-ink-soft hover:border-[#d6d2ca] hover:text-ink'}`}>
                <RotateCcw className="h-4 w-4 shrink-0" /> À revoir
              </button>
            )}
            {isLesson ? (
              <button type="button" onClick={() => setNotebookOpen(true)} data-tour="detail-cahier" aria-label="Ajouter à mon cahier"
                className={`${btn} border-line bg-white text-ink-soft hover:border-ink hover:text-ink`}>
                <BookMarked className="h-4 w-4" /> <span className="sm:hidden">Cahier</span><span className="hidden sm:inline">Ajouter à mon cahier</span>
              </button>
            ) : (
              <button type="button" onClick={() => setListOpen(true)} data-tour="detail-liste" aria-label="Ajouter à une liste de révision"
                title="Ajouter à une liste de révision"
                className={`${btn} min-w-10 border-line bg-white text-ink-soft hover:border-ink hover:text-ink`}>
                <ListPlus className="h-4 w-4" /> <span className="hidden sm:inline">Ajouter à une liste de révision</span>
              </button>
            )}
          </div>
        </div>

        {status && (
          <p className={`sm:hidden mt-2 text-[13px] font-medium leading-snug ${success ? 'text-brand-hover' : 'text-gold-strong'}`}>{status}</p>
        )}

        {/* Ressenti : un geste, puis un merci qui s'efface. */}
        {askFelt && (
          <div role="group" aria-label="La difficulté annoncée était-elle juste ?" className="mt-2.5 pt-2.5 border-t border-line flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[13px] font-medium text-ink-soft">C’était :</span>
            <button type="button" className={feltChip} onClick={() => giveFelt('easier')}>Plus facile</button>
            <button type="button" className={feltChip} onClick={() => giveFelt('as_said')}>Comme annoncé ({declared})</button>
            <button type="button" className={feltChip} onClick={() => giveFelt('harder')}>Plus dur</button>
          </div>
        )}
        {thanks && given && (
          <p role="status" className="mt-2.5 pt-2.5 border-t border-line flex items-center gap-1.5 text-[13px] font-medium text-brand-hover">
            <Check className="h-3.5 w-3.5" /> Merci, ton avis aide à mieux annoncer la difficulté.
          </p>
        )}

        {next.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-line flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {next.map((item) => {
              const label = item.type === 'lesson' ? 'Revoir le cours' : item.type === 'exam' ? 'Sujet suivant' : 'Exercice suivant';
              return (
                <Link key={item.id} to={`${PATH[item.type] ?? '/exercises'}/${item.id}`}
                  state={{ from: location.pathname + location.search }}
                  onClick={() => trackAction('suivant-apres-resultat')}
                  className="group inline-flex min-h-9 min-w-0 items-center gap-1.5 text-[13.5px] font-semibold text-brand-hover hover:text-brand">
                  {item.type === 'lesson' ? <BookOpen className="h-4 w-4 shrink-0" /> : null}
                  <span className="shrink-0">{label} :</span>
                  <span className="min-w-0 truncate font-medium text-ink-soft group-hover:text-ink">{item.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {contentType !== 'lesson' && (
        <AddToRevisionListModal
          isOpen={listOpen}
          onClose={() => setListOpen(false)}
          contentType={contentType}
          contentId={Number(content.id)}
          contentTitle={content.title}
          contentLabels={labelsFromContent(content)}
        />
      )}
      {isLesson && (
        <AddToNotebookModal
          isOpen={notebookOpen}
          onClose={() => setNotebookOpen(false)}
          lessonId={String(content.id)}
          lessonTitle={content.title}
          lessonChapters={content.chapters?.map((ch) => ({ id: String(ch.id), name: ch.name })) ?? []}
          lessonSubject={content.subject ? { id: content.subject.id, name: content.subject.name } : null}
          lessonLevels={(content.class_levels || []).map((l) => ({ id: l.id, name: l.name }))}
        />
      )}
    </>
  );
};

export default FinishPanel;
