// src/components/content/ContentListCard.tsx
// Carte d'un exercice, d'un examen ou d'une leçon dans les listes. Pensée pour qu'un élève sache
// en un coup d'œil de quoi il s'agit :
//   - exercice : le début de l'énoncé, rendu comme sur sa page (formules comprises) ;
//   - examen   : la liste de ses exercices avec leur barème ;
//   - leçon    : son sommaire.
// En bas : votes, discussions, vues, et le bouton pour ouvrir. Toute la carte est un lien.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, ListPlus, MessageSquare } from 'lucide-react';
import type { ExamListItem } from '@/types/content';
import type { VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { isModerator } from '@/lib/features';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import { renderContentHtml } from '@/components/editor/TipTapRenderer';
import { exerciseContentAPI, examContentAPI, lessonContentAPI } from '@/lib/api';
import { AddToRevisionListModal } from '@/components/revision/AddToRevisionListModal';
import { labelsFromContent } from '@/components/revision/RevisionLabelPicker';
import {
  BASE_PATH, chapterLabel, facts, levelLabel, progressOf, useBookmark, type ListItem, type ListKind,
} from './listing/listingUtils';
import { BookmarkButton, DifficultyChip, NationalTag, OwnerButtons, ProgressPill } from './listing/ListingParts';

interface ContentListCardProps {
  content: ListItem;
  contentType?: ListKind;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  showSubject?: boolean;
  first?: boolean;
}

const html = (h?: string) => ({ __html: renderContentHtml(h || '') });
const stripTags = (h?: string) => (h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** Début de l'énoncé : contexte et premières questions, numérotées comme sur la page. */
const ExercisePreview: React.FC<{ structure: any }> = ({ structure }) => {
  const rows: React.ReactNode[] = [];
  let q = 0;
  for (const b of structure?.blocks ?? []) {
    if (rows.length >= 4) break;
    if (b?.type === 'section') continue;
    if (b?.type === 'context') {
      if (b.content?.html) rows.push(<div key={b.id} dangerouslySetInnerHTML={html(b.content.html)} />);
      continue;
    }
    q++;
    rows.push(
      <div key={b.id} className="flex gap-1.5">
        <span className="fd-nums font-semibold text-ink shrink-0">{q}.</span>
        <div className="min-w-0 flex-1">
          <div dangerouslySetInnerHTML={html(b.content?.html)} />
          {(b.subQuestions ?? []).slice(0, 2).map((sq: any, i: number) => (
            <div key={sq.id} className="flex gap-1.5">
              <span className="fd-nums text-ink-faint shrink-0">{q}.{i + 1}.</span>
              <div className="min-w-0 flex-1" dangerouslySetInnerHTML={html(sq.content?.html)} />
            </div>
          ))}
        </div>
      </div>,
    );
  }
  return <>{rows}</>;
};

/** Sujet d'examen : un exercice par ligne, avec son barème et sa première phrase. */
const ExamPreview: React.FC<{ structure: any }> = ({ structure }) => {
  const parts: { id: string; title: string; points?: number; first: string }[] = [];
  for (const b of structure?.blocks ?? []) {
    if (b?.type === 'section') parts.push({ id: b.id, title: stripTags(b.content?.html) || `Partie ${parts.length + 1}`, points: b.points, first: '' });
    else if (parts.length && !parts[parts.length - 1].first && b?.content?.html) parts[parts.length - 1].first = b.content.html;
  }
  if (!parts.length) return <ExercisePreview structure={structure} />;
  return (
    <ol className="flex flex-col gap-1.5">
      {parts.slice(0, 4).map((p) => (
        <li key={p.id} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-ink truncate">{p.title}</span>
            {Number(p.points) > 0 && <span className="fd-nums text-[12px] text-ink-faint shrink-0">{String(p.points).replace('.', ',')} pts</span>}
          </div>
          {p.first && <div className="fd-preview-line text-ink-faint" dangerouslySetInnerHTML={html(p.first)} />}
        </li>
      ))}
      {parts.length > 4 && <li className="text-[12px] text-ink-faint">+ {parts.length - 4} autre{parts.length - 4 > 1 ? 's' : ''}</li>}
    </ol>
  );
};

/** Leçon : son sommaire. */
const LessonPreview: React.FC<{ structure: any }> = ({ structure }) => {
  const sections: { id: string; title: string }[] = (structure?.sections ?? []).filter((s: any) => s?.title);
  if (!sections.length) return <div dangerouslySetInnerHTML={html(structure?.sections?.[0]?.content?.html)} />;
  return (
    <ol className="flex flex-col gap-1">
      {sections.slice(0, 5).map((s, i) => (
        <li key={s.id} className="flex gap-2 min-w-0">
          <span className="fd-nums text-ink-faint shrink-0 w-4 text-right">{i + 1}</span>
          <span className="truncate text-ink-soft">{stripTags(s.title)}</span>
        </li>
      ))}
      {sections.length > 5 && <li className="pl-6 text-[12px] text-ink-faint">+ {sections.length - 5} autre{sections.length - 5 > 1 ? 's' : ''} partie{sections.length - 5 > 1 ? 's' : ''}</li>}
    </ol>
  );
};

export const ContentListCard: React.FC<ContentListCardProps> = ({
  content, contentType = 'exercise', onDelete, onEdit, showSubject, first,
}) => {
  const { user, isAuthenticated } = useAuth();
  const { openModal, setInitialTab } = useAuthModal();
  const [revisionOpen, setRevisionOpen] = useState(false);
  const openRevision = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { setInitialTab('signup'); openModal(); return; }
    setRevisionOpen(true);
  };
  const bookmark = useBookmark(content, contentType);
  const path = `${BASE_PATH[contentType]}/${content.id}`;
  const progress = progressOf(content);
  const canManage = user?.id === content.author?.id || isModerator(user);
  const chapter = chapterLabel(content);
  const exam = contentType === 'exam' ? (content as ExamListItem) : null;
  const structure = (content as { structure?: any }).structure;
  const comments = content.comment_count ?? 0;

  const [votes, setVotes] = useState(content.vote_count ?? 0);
  const [myVote, setMyVote] = useState<1 | -1 | 0>((content.user_vote as 1 | -1 | 0) ?? 0);
  useEffect(() => {
    setVotes(content.vote_count ?? 0);
    setMyVote((content.user_vote as 1 | -1 | 0) ?? 0);
  }, [content.vote_count, content.user_vote]);

  const vote = async (value: VoteValue) => {
    if (!isAuthenticated) { openModal(); return; }
    const api = contentType === 'exam' ? examContentAPI : contentType === 'lesson' ? lessonContentAPI : exerciseContentAPI;
    try {
      const r = await api.vote(String(content.id), value);
      setVotes(r.vote_count);
      setMyVote(r.user_vote as 1 | -1 | 0);
    } catch (e) { console.error('Vote', e); }
  };

  const infos = useMemo(() => [
    showSubject && content.subject?.name ? content.subject.name : null,
    levelLabel(content),
    ...facts(content, contentType),
  ].filter(Boolean) as string[], [content, contentType, showSubject]);

  return (
    <article className="group relative h-full flex flex-col rounded-2xl border border-line bg-white transition-[border-color,box-shadow] hover:border-[#d6d2ca] hover:shadow-[0_12px_32px_rgba(20,18,16,.07)]">
      <div className="px-5 pt-4 flex-1 flex flex-col">
        {/* Repères : chapitre, difficulté, état de l'élève ; favori à droite. */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 pt-1">
            {exam?.is_national_exam && <NationalTag year={exam.national_year} />}
            {structure?.a_verifier && (
              <span title="Correction rédigée récemment, en cours de relecture par l’auteur du document"
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-gold-soft text-[11.5px] font-semibold text-gold-strong">
                Correction en vérification
              </span>
            )}
            {chapter && (
              <span className="inline-flex max-w-full items-center px-2 py-0.5 rounded-full bg-[#f2f1ee] text-[11.5px] font-semibold text-ink-muted">
                <span className="truncate">{chapter}</span>
              </span>
            )}
            {'difficulty' in content && <DifficultyChip difficulty={content.difficulty} />}
            <ProgressPill progress={progress} />
          </div>
          <div className="relative z-10 flex items-center -mr-2 -mt-0.5 shrink-0">
            {canManage && (
              <OwnerButtons
                onEdit={onEdit ? () => onEdit(String(content.id)) : undefined}
                onDelete={onDelete ? () => onDelete(String(content.id)) : undefined}
              />
            )}
            {contentType !== 'lesson' && (
              <button type="button" onClick={openRevision} data-tour={first ? 'liste-revision' : undefined}
                className="relative z-10 w-9 h-9 rounded-lg inline-flex items-center justify-center text-ink-faint hover:text-ink hover:bg-[#f2f1ee] transition-colors"
                aria-label="Ajouter à une liste de révision" title="Ajouter à une liste de révision">
                <ListPlus className="w-4 h-4" />
              </button>
            )}
            <BookmarkButton saved={bookmark.saved} busy={bookmark.busy} onClick={bookmark.toggle} />
          </div>
        </div>

        <Link
          to={path}
          className="fd-display mt-2 text-[18.5px] leading-[1.25] font-semibold text-ink line-clamp-2 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand"
        >
          {content.title}
        </Link>
        {infos.length > 0 && (
          <p className="mt-1 text-[12.5px] text-ink-faint fd-nums">{infos.join(' · ')}</p>
        )}

        {/* Aperçu : ce qu'il y a dedans, lisible, coupé en fondu. */}
        {structure && (
          <div className="fd-card-preview mt-3 mb-4 rounded-xl border border-[#efece6] bg-[#fcfbf9] px-4 py-3 text-[13.5px] leading-[1.55] text-ink-soft">
            <div className="fd-card-preview-clip">
              {contentType === 'exam' ? <ExamPreview structure={structure} />
                : contentType === 'lesson' ? <LessonPreview structure={structure} />
                : <ExercisePreview structure={structure} />}
            </div>
          </div>
        )}
      </div>

      {/* Pied : votes, discussions, vues ; bouton d'ouverture. */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-3 border-t border-[#f0ede8]">
        <div data-tour={first ? 'vote' : undefined}>
          <VoteButtons initialVotes={votes} onVote={vote} vertical={false} userVote={myVote} size="sm" />
        </div>
        {comments > 0 && (
          <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-faint fd-nums" title={`${comments} message${comments > 1 ? 's' : ''}`}>
            <MessageSquare className="w-3.5 h-3.5" /> {comments}
          </span>
        )}
        {(content.view_count ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-faint fd-nums" title="Vues">
            <Eye className="w-3.5 h-3.5" /> {content.view_count}
          </span>
        )}
        <Link
          to={path}
          data-tour={first ? 'liste-ouvrir' : undefined}
          className="ml-auto inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] bg-brand text-white text-[13px] font-semibold hover:bg-brand-hover transition-colors"
        >
          {contentType === 'lesson' ? 'Lire' : progress === 'success' ? 'Revoir' : progress === 'review' ? 'Reprendre' : 'Commencer'}
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      {revisionOpen && contentType !== 'lesson' && (
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
