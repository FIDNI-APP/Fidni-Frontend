// src/components/content/ContentListCard.tsx
// Carte d'un exercice, d'un examen ou d'une leçon dans les listes (refaite le 11/10/2026 pour alléger :
// moins d'étiquettes, de couleurs et de boutons). L'élève y lit, de haut en bas :
//   1. où il en est (✓ Réussi, ↻ À revoir, « 1/3 questions », ◌ À faire) et « • Nouveau » ; à droite, « Liste »
//      et favori ;
//   2. le titre ;
//   3. le chapitre (lien, sauf dans son propre dossier), la difficulté (et le ressenti des élèves s'il diffère),
//      le nombre de questions, la durée ; le niveau seulement s'il ne va pas de soi ; puis, avec le tri « Pour
//      toi », pourquoi on le lui propose (« Suite de ton travail ») ;
//   4. un aperçu discret : début de l'énoncé, exercices d'un sujet (barème), sommaire d'une leçon ;
//   5. en pied : j'aime / je n'aime pas (discrets) et UNE façon d'ouvrir (« Commencer », « Reprendre »…).
// Toute la carte est un lien ; elle transmet l'adresse de la liste (state.from) pour que le retour y ramène.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ListPlus, MessageSquare, Sparkles } from 'lucide-react';
import type { ExamListItem } from '@/types/content';
import type { VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { isModerator } from '@/lib/features';
import { exerciseContentAPI, examContentAPI, lessonContentAPI } from '@/lib/api';
import { AddToRevisionListModal } from '@/components/revision/AddToRevisionListModal';
import { labelsFromContent } from '@/components/revision/RevisionLabelPicker';
import {
  BASE_PATH, chapterHref, chapterLabel, facts, levelLabel, progressOf, questionProgress, structureOf, useBookmark,
  type ListItem, type ListKind,
} from './listing/listingUtils';
import { CardPreview } from './listing/CardPreview';
import { BookmarkButton, CardStatus, DifficultyChip, OwnerButtons, QuietVotes, cardIconBtn } from './listing/ListingParts';
import { NewTag, isNewContent } from './NewBadge';

interface ContentListCardProps {
  content: ListItem;
  contentType?: ListKind;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  showSubject?: boolean;
  first?: boolean;
  /** Niveau de la page affichée (page de niveau) : le lien du chapitre y reste, le niveau ne se répète pas. */
  levelSlug?: string | null;
  /** Le niveau va de soi (un seul niveau filtré) : on ne le répète pas sur chaque carte. */
  hideLevel?: boolean;
  /** Dossier d'une année du Bac : « Bac national 2024 » va de soi. */
  hideNational?: boolean;
}

const kindWordOf = (kind: ListKind) => (kind === 'lesson' ? 'cours' : kind === 'exam' ? 'devoirs' : 'exercices');

function reasonText(reason: string | null | undefined, chapter: string | null, review: boolean): string | null {
  if (!reason) return null;
  if (review && /retravailler/i.test(reason)) return null;
  const short = chapter ? reason.replace(` · ${chapter}`, '') : reason;
  return short.trim() || null;
}

export const ContentListCard: React.FC<ContentListCardProps> = ({
  content, contentType = 'exercise', onDelete, onEdit, showSubject, first, levelSlug, hideLevel, hideNational,
}) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  // Le retour de la page du contenu ramène à cette liste (mêmes filtres, même position).
  const from = location.pathname + location.search;
  const { openModal, setInitialTab } = useAuthModal();
  const [revisionOpen, setRevisionOpen] = useState(false);
  const openRevision = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { setInitialTab('signup'); openModal('liste-revision'); return; }
    setRevisionOpen(true);
  };
  const bookmark = useBookmark(content, contentType);
  const path = `${BASE_PATH[contentType]}/${content.id}`;
  const progress = progressOf(content);
  const lesson = contentType === 'lesson';
  const started = lesson ? null : questionProgress(content);
  const canManage = user?.id === content.author?.id || isModerator(user);
  const chapter = chapterLabel(content, levelSlug);
  const chapterTo = chapterHref(content, contentType, levelSlug);
  // Dans le dossier de son chapitre, le chapitre va de soi.
  const inOwnFolder = !!chapterTo && chapterTo === location.pathname;
  const exam = contentType === 'exam' ? (content as ExamListItem) : null;
  const structure = structureOf(content);
  const reason = reasonText(content.recommendation_reason, chapter, progress === 'review');
  const felt = content.felt ?? null;
  const comments = content.comment_count ?? 0;

  const [counts, setCounts] = useState({ likes: content.like_count ?? 0, dislikes: content.dislike_count ?? 0 });
  const [myVote, setMyVote] = useState<1 | -1 | 0>((content.user_vote as 1 | -1 | 0) ?? 0);
  useEffect(() => {
    setCounts({ likes: content.like_count ?? 0, dislikes: content.dislike_count ?? 0 });
    setMyVote((content.user_vote as 1 | -1 | 0) ?? 0);
  }, [content.like_count, content.dislike_count, content.user_vote]);

  const vote = async (value: VoteValue) => {
    if (!isAuthenticated) { openModal('vote'); return; }
    const before = { counts, myVote };
    // Affichage immédiat (re-toucher retire le vote), corrigé ensuite par la réponse du serveur.
    const next = { ...counts };
    if (myVote === 1) next.likes -= 1;
    if (myVote === -1) next.dislikes -= 1;
    if (myVote !== value) { if (value === 1) next.likes += 1; else next.dislikes += 1; }
    setCounts({ likes: Math.max(0, next.likes), dislikes: Math.max(0, next.dislikes) });
    setMyVote(myVote === value ? 0 : value);
    const api = contentType === 'exam' ? examContentAPI : contentType === 'lesson' ? lessonContentAPI : exerciseContentAPI;
    try {
      const r = await api.vote(String(content.id), value);
      if (typeof r.like_count === 'number') setCounts({ likes: r.like_count, dislikes: r.dislike_count ?? 0 });
      setMyVote(r.user_vote as 1 | -1 | 0);
    } catch (e) {
      console.error('Vote', e);
      setCounts(before.counts);
      setMyVote(before.myVote);
    }
  };

  // Repères en une ligne : nombre de questions, durée ; niveau et matière seulement s'ils ne vont pas de soi.
  const infos = useMemo(() => [
    showSubject && content.subject?.name ? content.subject.name : null,
    ...facts(content, contentType),
    levelSlug || hideLevel ? null : levelLabel(content),
  ].filter(Boolean) as string[], [content, contentType, showSubject, levelSlug, hideLevel]);

  // « Nouveau » : calculé une fois (lit le stockage du navigateur).
  const isNew = useMemo(() => isNewContent(content as { id: string | number; created_at?: string }), [content]);
  const meta: React.ReactNode[] = [
    chapter && !inOwnFolder ? (chapterTo ? (
      <Link to={chapterTo} title={`Tous les ${kindWordOf(contentType)} de ce chapitre`}
        className="relative z-10 max-w-full truncate font-semibold text-ink-soft underline decoration-line underline-offset-[3px] transition-colors before:absolute before:-inset-y-3 before:inset-x-0 before:content-[''] hover:text-ink hover:decoration-ink-faint">
        {chapter}
      </Link>
    ) : <span className="max-w-full truncate font-semibold text-ink-soft">{chapter}</span>) : null,
    exam?.is_national_exam && !hideNational ? <span className="font-semibold text-gold-strong">Bac national{exam.national_year ? ` ${exam.national_year}` : ''}</span> : null,
    'difficulty' in content && content.difficulty ? <DifficultyChip difficulty={content.difficulty} felt={felt} interactive plain /> : null,
    infos.length ? <span className="fd-nums">{infos.join(' · ')}</span> : null,
    structure?.a_verifier ? (
      <span title="Correction rédigée récemment, en cours de relecture par l’auteur du document" className="font-medium text-gold-strong">
        Correction en vérification
      </span>
    ) : null,
  ].filter(Boolean);
  const cta = lesson ? 'Lire' : progress === 'success' ? 'Revoir' : progress === 'review' || started ? 'Reprendre' : 'Commencer';

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-line bg-white transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus-within:border-[#cfc9bf]">
      <div className="flex flex-1 flex-col px-4 pt-3 sm:px-5 sm:pt-3.5">
        {/* 1. Où il en est, pourquoi on le lui propose ; « Liste » et favori à droite. */}
        <div className="flex min-h-10 items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-x-2.5 gap-y-1 overflow-hidden">
            <CardStatus progress={progress} started={started} lesson={lesson} signedIn={isAuthenticated} />
            {isNew && <NewTag />}
          </div>
          <div className="relative z-10 -mr-2 flex shrink-0 items-center">
            {canManage && (
              <OwnerButtons
                onEdit={onEdit ? () => onEdit(String(content.id)) : undefined}
                onDelete={onDelete ? () => onDelete(String(content.id)) : undefined}
              />
            )}
            {!lesson && (
              <button type="button" onClick={openRevision} data-tour={first ? 'liste-revision' : undefined}
                className={`${cardIconBtn} text-ink-faint hover:bg-[#f2f1ee] hover:text-ink`}
                aria-label="Ajouter à une liste de révision" title="Ajouter à une liste de révision">
                <ListPlus className="h-[18px] w-[18px]" />
              </button>
            )}
            <BookmarkButton saved={bookmark.saved} busy={bookmark.busy} onClick={bookmark.toggle} className="!h-10 !w-10 !rounded-xl sm:!h-9 sm:!w-9" />
          </div>
        </div>

        {/* 2. Titre : le lien de toute la carte. */}
        <Link
          to={path}
          state={{ from }}
          className="fd-display mt-0.5 text-[18px] font-semibold leading-[1.28] text-ink line-clamp-2 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand/50"
        >
          {content.title}
        </Link>

        {/* 3. Chapitre, difficulté, repères : des groupes espacés (pas de point qui pend en fin de ligne). */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-faint">
          {meta.map((node, i) => <React.Fragment key={i}>{node}</React.Fragment>)}
        </div>
        {/* « Pour toi » : pourquoi on le lui propose. */}
        {reason && (
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-brand-hover" title={content.recommendation_reason ?? undefined}>
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{reason}</span>
          </p>
        )}

        {/* 4. Aperçu : ce qu'il y a dedans, en retrait, coupé en fondu. */}
        {structure && (
          <div className="fd-card-preview mt-3 border-l-2 border-[#efece6] pl-3 text-[13px] leading-[1.55] text-ink-faint">
            <div className="max-h-[66px] overflow-hidden sm:max-h-[86px]"
              style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)', maskImage: 'linear-gradient(to bottom, #000 55%, transparent)' }}>
              <CardPreview structure={structure} kind={contentType} total={exam?.section_count} />
            </div>
          </div>
        )}
        <div className="min-h-3 flex-1" />
      </div>

      {/* 5. Pied : avis discrets, une seule façon d'ouvrir. */}
      <div className="flex items-center gap-1 border-t border-[#f0ede8] px-2.5 py-1.5 sm:px-3">
        <div data-tour={first ? 'vote' : undefined} className="flex items-center">
          <QuietVotes likes={counts.likes} dislikes={counts.dislikes} userVote={myVote} onVote={vote} />
        </div>
        {comments > 0 && (
          <span className="ml-1 inline-flex items-center gap-1 text-[12.5px] text-ink-faint fd-nums" title={`${comments} message${comments > 1 ? 's' : ''}`}>
            <MessageSquare className="h-3.5 w-3.5" aria-hidden /> {comments}
            <span className="sr-only">message{comments > 1 ? 's' : ''}</span>
          </span>
        )}
        {/* Pas un second lien : le titre couvre toute la carte (un seul arrêt au clavier). */}
        <span
          data-tour={first ? 'liste-ouvrir' : undefined}
          aria-hidden
          className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-soft px-3.5 text-[13px] font-semibold text-brand-hover transition-colors group-hover:bg-brand group-hover:text-white sm:h-9"
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      {revisionOpen && !lesson && (
        <AddToRevisionListModal
          isOpen={revisionOpen}
          onClose={() => setRevisionOpen(false)}
          contentType={contentType}
          contentId={Number(content.id)}
          contentTitle={content.title}
          contentLabels={labelsFromContent(content)}
        />
      )}
    </article>
  );
};

export default ContentListCard;
