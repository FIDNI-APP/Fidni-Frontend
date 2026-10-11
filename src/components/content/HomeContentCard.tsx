// Carte de contenu de la recherche et de l'accueil des visiteurs. Même langage que les cartes des listes
// (ContentListCard, refaites le 11/10/2026) : type et état en haut, favori à droite ; le titre (toute la carte
// est un lien) ; chapitre, difficulté, niveau ; un aperçu discret ; en pied, les avis et UNE façon d'ouvrir.
import React, { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { Content, VoteValue } from '@/types';
import type { ExerciseListItem, ExamListItem, LessonListItem } from '@/types/content';
import { NewTag, isNewContent } from './NewBadge';
import { BookmarkButton, CardStatus, DifficultyChip, QuietVotes } from './listing/ListingParts';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import {
  saveExercise, unsaveExercise,
  saveLesson, unsaveLesson,
  saveExam, unsaveExam
} from '@/lib/api';
import type { PreviewStructure } from './listing/listingUtils';
// Aperçu chargé à la demande : il embarque KaTeX (~600 Ko) que l'accueil n'a pas à attendre.
// La carte s'affiche tout de suite ; l'aperçu mathématique arrive juste après.
const CardPreview = lazy(() => import('./listing/CardPreview'));

type StructuredListItem = ExerciseListItem | ExamListItem | LessonListItem;
type Kind = 'exercise' | 'lesson' | 'exam';

interface HomeContentCardProps {
  content: Content | StructuredListItem;
  onVote: (id: string, value: VoteValue, contentType?: 'exercise' | 'lesson' | 'exam') => void;
  onSave?: (id: string, saved: boolean) => void;
}

/** Champs lus ici, communs aux deux formes de contenu (recherche, accueil). */
interface CardFields {
  type?: string;
  is_national_exam?: boolean;
  difficulty?: string | null;
  user_complete?: 'success' | 'review' | null;
  user_completed?: boolean;
  structure?: unknown;
  like_count?: number;
  dislike_count?: number;
  user_vote?: number | null;
  comment_count?: number;
  chapters?: (string | { name?: string })[];
  felt?: StructuredListItem['felt'];
}

const BASE: Record<Kind, string> = { exercise: '/exercises', lesson: '/lessons', exam: '/exams' };
const TYPE: Record<Kind, string> = { exercise: 'Exercice', lesson: 'Leçon', exam: 'Devoir' };
const nameOf = (x: unknown) => (typeof x === 'string' ? x : (x as { name?: string } | undefined)?.name ?? '');

export const HomeContentCard: React.FC<HomeContentCardProps> = ({
  content,
  onVote,
  onSave
}) => {
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const c = content as unknown as CardFields;
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (content && 'user_save' in content && content.user_save !== undefined) {
      setIsSaved(Boolean(content.user_save));
    }
  }, [content]);

  const contentType: Kind = c.type === 'exam' || c.type === 'exercise' || c.type === 'lesson' ? c.type
    : c.is_national_exam !== undefined && c.difficulty !== undefined ? 'exam'
      : c.difficulty ? 'exercise' : 'lesson';
  const path = `${BASE[contentType]}/${content.id}`;
  const lesson = contentType === 'lesson';

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { openModal(); return; }
    try {
      setIsSaving(true);
      const contentId = content.id.toString();
      if (isSaved) {
        const fn = contentType === 'lesson' ? unsaveLesson : contentType === 'exam' ? unsaveExam : unsaveExercise;
        await fn(contentId);
        setIsSaved(false);
      } else {
        const fn = contentType === 'lesson' ? saveLesson : contentType === 'exam' ? saveExam : saveExercise;
        await fn(contentId);
        setIsSaved(true);
      }
      if (onSave) onSave(contentId, !isSaved);
    } catch (error) {
      console.error('Error toggling save status:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Votes : affichage immédiat, le parent appelle le serveur (et renvoie les vrais nombres).
  const [counts, setCounts] = useState({ likes: c.like_count ?? 0, dislikes: c.dislike_count ?? 0 });
  const [myVote, setMyVote] = useState<1 | -1 | 0>((c.user_vote ?? 0) as 1 | -1 | 0);
  // Le parent renvoie les nombres du serveur, pas toujours le vote de l'élève : chacun se suit à part.
  useEffect(() => { setCounts({ likes: c.like_count ?? 0, dislikes: c.dislike_count ?? 0 }); }, [c.like_count, c.dislike_count]);
  useEffect(() => { setMyVote((c.user_vote ?? 0) as 1 | -1 | 0); }, [c.user_vote]);
  const vote = (value: 1 | -1) => {
    if (!isAuthenticated) { openModal('vote'); return; }
    const next = { ...counts };
    if (myVote === 1) next.likes -= 1;
    if (myVote === -1) next.dislikes -= 1;
    if (myVote !== value) { if (value === 1) next.likes += 1; else next.dislikes += 1; }
    setCounts({ likes: Math.max(0, next.likes), dislikes: Math.max(0, next.dislikes) });
    setMyVote(myVote === value ? 0 : value);
    onVote(content.id.toString(), value, contentType);
  };

  const progress = c.user_complete === 'success' || c.user_complete === 'review' ? c.user_complete
    : c.user_completed ? 'success' : null;

  const structure = c.structure && typeof c.structure === 'object' ? c.structure as PreviewStructure : null;
  const hasPreview = !!structure && ((structure.blocks?.length ?? 0) > 0 || (structure.sections?.length ?? 0) > 0);

  const chapter = c.chapters?.length ? nameOf(c.chapters[0]) : '';
  const level = content.class_levels && content.class_levels.length > 0 ? nameOf(content.class_levels[0]) : '';
  const comments = c.comment_count ?? 0;
  const isNew = useMemo(() => isNewContent(content as { id: string | number; created_at?: string }), [content]);
  const cta = lesson ? 'Lire' : progress === 'success' ? 'Revoir' : progress === 'review' ? 'Reprendre' : 'Commencer';

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-line bg-white transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)]">
      <div className="flex min-h-0 flex-1 flex-col px-4 pt-3 sm:px-5">
        <div className="flex min-h-10 items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-x-2.5 overflow-hidden">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">
              {c.is_national_exam ? 'Bac national' : TYPE[contentType]}
            </span>
            <CardStatus progress={progress} lesson={lesson} signedIn={false} />
            {isNew && <NewTag />}
          </div>
          <BookmarkButton saved={isSaved} busy={isSaving} onClick={handleSaveClick} className="-mr-2 shrink-0 !h-10 !w-10 !rounded-xl sm:!h-9 sm:!w-9" />
        </div>

        <Link to={path}
          className="fd-display mt-0.5 text-[17.5px] font-semibold leading-[1.28] text-ink line-clamp-2 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand/50">
          {content.title}
        </Link>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-faint">
          {chapter && <span className="max-w-full truncate font-semibold text-ink-soft">{chapter}</span>}
          {c.difficulty && <DifficultyChip difficulty={c.difficulty} felt={c.felt ?? null} plain />}
          {level && <span>{level}</span>}
        </div>

        {hasPreview && structure && (
          <div className="fd-card-preview mt-3 border-l-2 border-[#efece6] pl-3 text-[13px] leading-[1.55] text-ink-faint">
            <div className="max-h-[66px] overflow-hidden sm:max-h-[86px]"
              style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)', maskImage: 'linear-gradient(to bottom, #000 55%, transparent)' }}>
              <Suspense fallback={null}>
                <CardPreview structure={structure} kind={contentType} />
              </Suspense>
            </div>
          </div>
        )}
        <div className="min-h-3 flex-1" />
      </div>

      <div className="flex items-center gap-1 border-t border-[#f0ede8] px-2.5 py-1.5 sm:px-3">
        <QuietVotes likes={counts.likes} dislikes={counts.dislikes} userVote={myVote} onVote={vote} />
        {comments > 0 && (
          <span className="ml-1 inline-flex items-center gap-1 text-[12.5px] text-ink-faint fd-nums" title={`${comments} message${comments > 1 ? 's' : ''}`}>
            <MessageSquare className="h-3.5 w-3.5" aria-hidden /> {comments}
          </span>
        )}
        <span aria-hidden
          className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-soft px-3.5 text-[13px] font-semibold text-brand-hover transition-colors group-hover:bg-brand group-hover:text-white sm:h-9">
          {cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
};
