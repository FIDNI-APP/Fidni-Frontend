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
 * 11/10/2026 : deux blocs. En haut (`placement="top"`), le bandeau « Où en es-tu ? » au-dessus de la
 * feuille, avec la barre des questions réussies / à revoir ; en bas (`"bottom"`), un rappel discret
 * « Tu as fini ? » et « Ranger dans une liste » (ou le cahier). Les suites (ressenti, « Exercice suivant »)
 * s'affichent dans le bloc où l'élève vient d'agir (`followUps`) : une seule demande à la fois sur la page.
 * Les fenêtres de rangement sont dans la page (aussi ouvertes depuis le menu « ⋯ »).
 */
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookMarked, BookOpen, Check, CheckCheck, CheckCircle2, ListPlus, RotateCcw } from 'lucide-react';
import type { ContentExercise, ContentExam, ContentLesson, Felt } from '@/types/content';
import { SplitBar } from '@/components/space/Page';
import { getRecommendations, sendRessenti, type FeltVote, type RecommendedItem } from '@/lib/api/contentItemApi';
import { useFoundPromptOpen } from './pageHelpers';
import { trackAction } from '@/lib/usage';
import { t } from '@/i18n';

type ContentItem = ContentExercise | ContentExam | ContentLesson;
type Status = 'success' | 'review' | null;

interface FinishPanelProps {
  content: ContentItem;
  contentType: 'exercise' | 'exam' | 'lesson';
  completionStatus?: Status;
  onSetCompletion: (status: Status) => void;
  /** Questions évaluées / à évaluer (exercice, examen), dont réussies et à revoir. */
  progress?: { assessed: number; total: number; success?: number; review?: number };
  /** Résultat choisi pendant cette visite (pas celui chargé avec la page) : le ressenti n'est demandé qu'alors. */
  statusChosen?: boolean;
  /** Faux quand une autre demande est déjà affichée (proposition « À revoir »…) : le ressenti attend. */
  canAsk?: boolean;
  /** Ressenti des élèves recalculé après l'avis de l'élève. */
  onFelt?: (felt: Felt | null) => void;
  /** Ranger : liste de révision (exercice, examen) ou cahier (leçon) ; les fenêtres sont dans la page. */
  onCollect?: () => void;
  /** En haut de la page (bandeau) ou en bas (rappel). */
  placement: 'top' | 'bottom';
  /** Ce bloc affiche les suites du résultat (ressenti, contenu suivant) : celui où l'élève vient d'agir. */
  followUps?: boolean;
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
  content, contentType, completionStatus = null, onSetCompletion, progress, statusChosen, canAsk = true, onFelt, onCollect,
  placement, followUps = false,
}) => {
  const isLesson = contentType === 'lesson';
  const top = placement === 'top';
  const toggle = (s: Exclude<Status, null>) => onSetCompletion(completionStatus === s ? null : s);
  const location = useLocation();

  const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-2 sm:px-3.5 text-[13px] sm:text-[13.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';
  const success = completionStatus === 'success';
  const review = completionStatus === 'review';

  const total = progress?.total ?? 0;
  const assessed = progress?.assessed ?? 0;
  const title = success ? (isLesson ? t('Leçon lue') : t('Réussi, c’est noté'))
    : review ? t('À revoir dans 2-3 jours') : t(QUESTION[contentType]);
  const tone = success ? 'text-brand-hover' : review ? 'text-gold-strong' : 'text-ink';
  const statusIcon = success ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
    : review ? <RotateCcw className="h-4 w-4 shrink-0" aria-hidden /> : null;

  // ── Ressenti : quand l'élève vient de donner son résultat (pas à chaque visite d'un contenu déjà fait),
  // si aucune autre question ne l'attend.
  const promptOpen = useFoundPromptOpen();
  // Sans statusChosen : un statut différent de celui de l'arrivée.
  const [initialStatus] = useState(completionStatus);
  const chosen = statusChosen ?? completionStatus !== initialStatus;
  const declared = content.difficulty && DECLARED[content.difficulty] ? t(DECLARED[content.difficulty]) : null;
  const [given, setGiven] = useState<FeltVote | null>(() => readGiven(content.id));
  // L'avis a pu être donné depuis l'autre bloc (haut / bas) : relu quand les suites arrivent ici.
  useEffect(() => { if (followUps) setGiven((g) => g ?? readGiven(content.id)); }, [followUps, content.id]);
  const [thanks, setThanks] = useState(false);
  useEffect(() => {
    if (!thanks) return;
    const t = window.setTimeout(() => setThanks(false), 4000);
    return () => window.clearTimeout(t);
  }, [thanks]);
  const askFelt = followUps && !isLesson && !!completionStatus && chosen && !!declared && !given && canAsk && !promptOpen;
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
  // Chargée seulement dans le bloc qui l'affiche.
  const [next, setNext] = useState<RecommendedItem[]>([]);
  useEffect(() => {
    if (isLesson || !completionStatus || !followUps) { setNext([]); return; }
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
  }, [content.id, contentType, completionStatus, isLesson, followUps]);

  const feltChip = 'inline-flex min-h-10 items-center rounded-full border border-line bg-white px-3.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';
  const successCount = progress?.success ?? 0;
  const reviewCount = progress?.review ?? 0;

  const buttons = (
    <div className={`grid gap-2 sm:flex sm:shrink-0 ${isLesson ? 'grid-cols-1' : 'grid-cols-2'} ${top && !isLesson ? 'min-w-0 flex-1 sm:flex-none' : ''}`}>
      <button type="button" onClick={() => toggle('success')} aria-pressed={success}
        title={success ? t('Clique pour annuler') : undefined}
        className={`${btn} ${success ? 'border-brand bg-brand text-white hover:bg-brand-hover' : 'border-brand-line bg-white text-brand-hover hover:bg-brand-soft'}`}>
        {success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <CheckCheck className="h-4 w-4 shrink-0" />}
        {isLesson ? (success ? t('Lue') : t('Marquer comme lue')) : t('Tout réussi')}
      </button>
      {!isLesson && (
        <button type="button" onClick={() => toggle('review')} aria-pressed={review}
          title={review ? t('Clique pour annuler') : undefined}
          className={`${btn} ${review ? 'border-gold-line bg-gold-soft text-gold-strong' : 'border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`}>
          <RotateCcw className="h-4 w-4 shrink-0" /> {t('À revoir')}
        </button>
      )}
    </div>
  );

  // Ressenti (un geste, puis un merci qui s'efface) et contenu suivant.
  const after = (
    <>
      {askFelt && (
        <div role="group" aria-label={t('La difficulté annoncée était-elle juste ?')} className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          <span className="me-1 text-[13.5px] font-medium text-ink-soft">{t('C’était :')}</span>
          <button type="button" className={feltChip} onClick={() => giveFelt('easier')}>{t('Plus facile')}</button>
          <button type="button" className={feltChip} onClick={() => giveFelt('as_said')}>{t('Comme annoncé ({niveau})', { niveau: declared })}</button>
          <button type="button" className={feltChip} onClick={() => giveFelt('harder')}>{t('Plus dur')}</button>
        </div>
      )}
      {followUps && thanks && given && (
        <p role="status" className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[13px] font-medium text-brand-hover">
          <Check className="h-3.5 w-3.5" /> {t('Merci, ton avis aide à mieux annoncer la difficulté.')}
        </p>
      )}
      {next.length > 0 && (
        <div className="mt-3 flex flex-col gap-0.5 border-t border-line pt-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
          {next.map((item) => {
            const label = item.type === 'lesson' ? t('Revoir le cours') : item.type === 'exam' ? t('Sujet suivant') : t('Exercice suivant');
            return (
              <Link key={item.id} to={`${PATH[item.type] ?? '/exercises'}/${item.id}`}
                state={{ from: location.pathname + location.search }}
                onClick={() => trackAction('suivant-apres-resultat')}
                className="group inline-flex min-h-10 min-w-0 items-center gap-1.5 text-[14px] font-semibold text-brand-hover hover:text-brand">
                {item.type === 'lesson' ? <BookOpen className="h-4 w-4 shrink-0" /> : null}
                <span className="shrink-0">{t('{label} :', { label })}</span>
                <span className="min-w-0 truncate font-medium text-ink-soft group-hover:text-ink">{item.title}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden />
              </Link>
            );
          })}
        </div>
      )}
    </>
  );

  // ── En haut : bandeau compact (téléphone : une ligne, l'énoncé arrive vite).
  if (top) {
    return (
      <section id="ou-en-es-tu" className="scroll-mt-24 rounded-2xl border border-line bg-white px-3 py-2.5 sm:px-5 sm:py-3.5" data-tour="detail-terminer" aria-labelledby="ou-titre">
        <div className="flex items-center gap-2.5 sm:justify-between sm:gap-6">
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{t('Où en es-tu ?')}</p>
            <h2 id="ou-titre" className={`mt-0.5 flex items-center gap-1.5 text-[15px] font-semibold leading-snug ${tone}`}>
              {statusIcon}{title}
            </h2>
            {!isLesson && total >= 2 && (
              <div className="mt-2 flex max-w-md items-center gap-3" data-tour="detail-progression">
                <SplitBar success={successCount} review={reviewCount} total={total} className="w-28 shrink-0 lg:w-36" />
                <p className="min-w-0 truncate text-[12.5px] text-ink-faint fd-nums">
                  {assessed === 0 ? t('{total} questions à évaluer', { total }) : assessed > 1 ? t('{assessed} / {total} évaluées', { assessed, total }) : t('{assessed} / {total} évaluée', { assessed, total })}
                  {successCount > 0 && <> · <span className="text-brand-hover">{successCount > 1 ? t('{n} réussies', { n: successCount }) : t('{n} réussie', { n: successCount })}</span></>}
                  {reviewCount > 0 && <> · <span className="text-gold-strong">{t('{n} à revoir', { n: reviewCount })}</span></>}
                </p>
              </div>
            )}
          </div>
          {/* Téléphone : questions évaluées (ou la question, pour une leçon), puis les boutons. */}
          {isLesson && (
            <p className={`flex min-w-0 flex-1 items-center gap-1.5 text-[13.5px] font-semibold leading-snug sm:hidden ${tone}`}>{statusIcon}{title}</p>
          )}
          {!isLesson && total >= 2 && (
            <p className="shrink-0 text-center leading-tight sm:hidden max-[379px]:hidden" title={t('Questions évaluées')}>
              <span className="block text-[13px] font-semibold text-ink-soft fd-nums">{assessed}/{total}</span>
              <span className="block text-[10.5px] text-ink-faint">{t('évaluées')}</span>
            </p>
          )}
          {buttons}
        </div>
        {!isLesson && (success || review) && (
          <p className={`mt-2 flex items-center gap-1.5 text-[13px] font-medium leading-snug sm:hidden ${tone}`}>{statusIcon}{title}</p>
        )}
        {after}
      </section>
    );
  }

  // ── En bas : rappel, là où l'élève finit, et « Ranger ».
  return (
    <section id="fin" className="scroll-mt-24 rounded-2xl border border-line bg-white px-4 py-3.5 sm:px-6 sm:py-4" aria-labelledby="fin-titre">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <h2 id="fin-titre" className={`flex min-w-0 items-center gap-1.5 text-[15px] font-semibold leading-snug ${tone}`}>
          {statusIcon}{title}
        </h2>
        {buttons}
      </div>
      {after}
      {onCollect && (
        <div className="mt-3 border-t border-line pt-1.5">
          <button type="button" onClick={onCollect} data-tour={isLesson ? 'detail-cahier' : 'detail-liste'}
            className="-ms-1 inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-[13.5px] font-medium text-ink-soft transition-colors hover:text-ink">
            {isLesson ? <BookMarked className="h-4 w-4 text-ink-faint" aria-hidden /> : <ListPlus className="h-4 w-4 text-ink-faint" aria-hidden />}
            {isLesson ? t('Ajouter à mon cahier de cours') : t('Ranger dans une liste de révision')}
          </button>
        </div>
      )}
    </section>
  );
};

export default FinishPanel;
