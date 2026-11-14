// src/components/content/ContentListCard.tsx
// Carte d'un exercice, d'un examen ou d'une leçon dans les listes. Pensée pour qu'un élève sache
// en un coup d'œil de quoi il s'agit :
//   - exercice : le début de l'énoncé, rendu comme sur sa page (formules comprises) ;
//   - examen   : la liste de ses exercices avec leur barème ;
//   - leçon    : son sommaire.
// Repères : difficulté et ressenti des élèves, état de l'élève, durée attendue (« ≈ 25 min »). Depuis le 14/11/2026
// (Natsu : « plus stylées et plus informatives ») : type du devoir et année scolaire, enseignants (lien vers tous
// leurs contenus), théorèmes utilisés, résultat de l'élève (« 4 réussies · 1 à revoir ») et DS à venir qui porte
// sur ce chapitre (listing/CardDetails.tsx). On arrive dans une liste par Maths › niveau › chapitre (dossiers) : matière,
// niveau et chapitre n'y sont plus répétés sur chaque carte ; le chapitre reste (lien) dans une liste qui en
// mélange plusieurs (recherche, anciens liens filtrés).
// En bas : votes, discussions, vues, et le bouton pour ouvrir. Toute la carte est un lien ; elle transmet
// l'adresse de la liste (state.from) pour que le retour y ramène.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Eye, ListPlus, MessageSquare } from 'lucide-react';
import type { ExamListItem } from '@/types/content';
import type { VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { isModerator } from '@/lib/features';
import { renderContentHtml } from '@/components/editor/TipTapRenderer';
import { exerciseContentAPI, examContentAPI, lessonContentAPI } from '@/lib/api';
import { AddToRevisionListModal } from '@/components/revision/AddToRevisionListModal';
import { labelsFromContent } from '@/components/revision/RevisionLabelPicker';
import {
  BASE_PATH, cardState, cardTone, chapterHref, chapterLabel, dateLongue, facts, levelLabel, progressOf, questionProgress, structureOf, useBookmark,
  type ListItem, type ListKind, type PreviewStructure,
} from './listing/listingUtils';
import { BookmarkButton, DifficultyChip, NationalTag, OwnerButtons, QuietVotes, StateChip } from './listing/ListingParts';
import { DevoirTag, DsChip, MetaLine, ResultatEleve, TheoremChips } from './listing/CardDetails';
import { dsPourContenu, useProchainsDS } from '@/lib/useProchainsDS';
import { NewBadge, isNewContent } from './NewBadge';
import { t } from '@/i18n';

interface ContentListCardProps {
  content: ListItem;
  contentType?: ListKind;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  showSubject?: boolean;
  first?: boolean;
  /** Niveau de la page affichée (page de niveau) : le lien du chapitre y reste. */
  levelSlug?: string | null;
  /** Liste d'un seul niveau : le niveau n'est pas répété. */
  hideLevel?: boolean;
  /** Liste d'un seul chapitre (dossier) : l'étiquette du chapitre n'est pas répétée. */
  hideChapter?: boolean;
  /** Dossier d'une année du Bac national : l'étiquette « Bac national » n'est pas répétée. */
  hideNational?: boolean;
}

const html = (h?: string) => ({ __html: renderContentHtml(h || '') });
const stripTags = (h?: string) => (h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** Début de l'énoncé : contexte et premières questions, numérotées comme sur la page. */
const ExercisePreview: React.FC<{ structure: PreviewStructure }> = ({ structure }) => {
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
          {(b.subQuestions ?? []).slice(0, 2).map((sq, i) => (
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

/** Sujet d'examen : un exercice par ligne, avec son barème et sa première phrase. `total` : nombre de
 *  parties donné par le serveur (en mode Cartes, la structure n'en contient que le début). */
// Parties montrées dans l'aperçu : deux exercices d'un sujet (c'est ce que la hauteur de l'aperçu laisse lire),
// cinq titres d'une leçon. Le reste est annoncé sous l'aperçu, hors du fondu, pour rester lisible.
const EXAM_PARTS_SHOWN = 2;
const LESSON_PARTS_SHOWN = 5;

const examParts = (structure: PreviewStructure) => {
  const parts: { id: string; title: string; points?: number; first: string }[] = [];
  for (const b of structure?.blocks ?? []) {
    if (b?.type === 'section') parts.push({ id: b.id ?? String(parts.length), title: stripTags(b.content?.html) || t('Partie {n}', { n: parts.length + 1 }), points: b.points, first: '' });
    else if (parts.length && !parts[parts.length - 1].first && b?.content?.html) parts[parts.length - 1].first = b.content.html;
  }
  return parts;
};
const lessonSections = (structure: PreviewStructure) => (structure?.sections ?? []).filter((s) => s?.title);

/** « + 3 autres » sous l'aperçu (sujet d'examen, leçon), ou rien. */
const moreLabel = (kind: ListKind, structure: PreviewStructure, total?: number): string | null => {
  if (kind === 'exam') {
    const n = examParts(structure).length;
    const more = n ? Math.max(n, total ?? 0) - Math.min(n, EXAM_PARTS_SHOWN) : 0;
    return more > 0 ? (more > 1 ? t('+ {n} autres', { n: more }) : t('+ {n} autre', { n: more })) : null;
  }
  if (kind === 'lesson') {
    const more = lessonSections(structure).length - LESSON_PARTS_SHOWN;
    return more > 0 ? (more > 1 ? t('+ {n} autres parties', { n: more }) : t('+ {n} autre partie', { n: more })) : null;
  }
  return null;
};

const ExamPreview: React.FC<{ structure: PreviewStructure }> = ({ structure }) => {
  const parts = examParts(structure);
  if (!parts.length) return <ExercisePreview structure={structure} />;
  return (
    <ol className="flex flex-col gap-2">
      {parts.slice(0, EXAM_PARTS_SHOWN).map((p) => (
        <li key={p.id} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-ink truncate">{p.title}</span>
            {Number(p.points) > 0 && <span className="fd-nums text-[12px] text-ink-faint shrink-0">{t('{n} pts', { n: String(p.points).replace('.', ',') })}</span>}
          </div>
          {p.first && <div className="fd-preview-line text-ink-faint" dangerouslySetInnerHTML={html(p.first)} />}
        </li>
      ))}
    </ol>
  );
};

/** Leçon : son sommaire. */
const LessonPreview: React.FC<{ structure: PreviewStructure }> = ({ structure }) => {
  const sections = lessonSections(structure);
  if (!sections.length) return <div dangerouslySetInnerHTML={html(structure?.sections?.[0]?.content?.html)} />;
  return (
    <ol className="flex flex-col gap-1">
      {sections.slice(0, LESSON_PARTS_SHOWN).map((s, i) => (
        <li key={s.id} className="flex gap-2 min-w-0">
          <span className="fd-nums text-ink-faint shrink-0 w-4 text-end">{i + 1}</span>
          <span className="truncate text-ink-soft">{stripTags(s.title)}</span>
        </li>
      ))}
    </ol>
  );
};

export const ContentListCard: React.FC<ContentListCardProps> = ({
  content, contentType = 'exercise', onDelete, onEdit, showSubject, first, levelSlug, hideLevel, hideChapter, hideNational,
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
  const started = contentType === 'lesson' ? null : questionProgress(content);
  const canManage = user?.id === content.author?.id || isModerator(user);
  const chapter = hideChapter ? null : chapterLabel(content, levelSlug);
  const chapterTo = chapterHref(content, contentType, levelSlug);
  const exam = contentType === 'exam' ? (content as ExamListItem) : null;
  const structure = structureOf(content);
  // Tri « Pour toi » : pourquoi ce contenu est proposé (« À retravailler », « Apprécié des élèves »). « Suite de ton
  // travail · … » est retiré (Natsu, 14/11/2026 : « ne sert à rien » ; le serveur ne l'envoie plus).
  const reason = useMemo(() => {
    const r = content.recommendation_reason;
    if (r?.startsWith('Suite de ton travail')) return null;
    if (!r || !hideChapter) return r;
    const names = new Set((content.chapters ?? []).map((c) => c.name));
    return r.split(' · ').filter((part) => !names.has(part)).join(' · ') || null;
  }, [content.recommendation_reason, content.chapters, hideChapter]);
  const felt = content.felt ?? null;
  const comments = content.comment_count ?? 0;
  // DS à venir qui porte sur un chapitre de ce contenu (une requête pour toute la liste, lib/useProchainsDS).
  const prochainsDS = useProchainsDS();
  const ds = useMemo(() => (contentType === 'lesson' ? null : dsPourContenu(prochainsDS, content)), [prochainsDS, content, contentType]);

  const [counts, setCounts] = useState({ likes: content.like_count ?? 0, dislikes: content.dislike_count ?? 0 });
  const [myVote, setMyVote] = useState<1 | -1 | 0>((content.user_vote as 1 | -1 | 0) ?? 0);
  useEffect(() => {
    setCounts({ likes: content.like_count ?? 0, dislikes: content.dislike_count ?? 0 });
    setMyVote((content.user_vote as 1 | -1 | 0) ?? 0);
  }, [content.like_count, content.dislike_count, content.user_vote]);

  const vote = async (value: VoteValue) => {
    if (!isAuthenticated) { openModal('vote'); return; }
    const api = contentType === 'exam' ? examContentAPI : contentType === 'lesson' ? lessonContentAPI : exerciseContentAPI;
    // Affichage immédiat (re-cliquer retire le vote), corrigé par la réponse du serveur, annulé en cas d'échec.
    const before = { counts, myVote };
    const next = myVote === value ? 0 : value;
    setCounts({
      likes: Math.max(0, counts.likes - (myVote === 1 ? 1 : 0) + (next === 1 ? 1 : 0)),
      dislikes: Math.max(0, counts.dislikes - (myVote === -1 ? 1 : 0) + (next === -1 ? 1 : 0)),
    });
    setMyVote(next);
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

  const infos = useMemo(() => [
    showSubject && content.subject?.name ? content.subject.name : null,
    hideLevel ? null : levelLabel(content),
    ...facts(content, contentType),
  ].filter(Boolean) as string[], [content, contentType, showSubject, hideLevel]);

  // « Nouveau » : calculé une fois (lit le stockage du navigateur).
  const isNew = useMemo(() => isNewContent(content as { id: string | number; created_at?: string }), [content]);
  const more = structure ? moreLabel(contentType, structure, exam?.section_count) : null;
  // Théorèmes du contenu : étiquettes au bas de la carte, au-dessus des « j'aime ».
  const hasTheorems = contentType !== 'lesson' && (content.theorems?.length ?? 0) > 0;
  // Devoir : son étiquette (« DS n° 3 · 2025-2026 ») prend de la place en haut ; le chapitre s'abrège (nom entier au survol).
  const chapterMax = exam && !exam.is_national_exam && content.devoir ? 'max-w-[7.5rem]' : 'max-w-full';
  // Sujet découpé en exercices, leçon avec sommaire : nombre fixe de lignes, pas besoin de fondu.
  const bounded = !!structure && (contentType === 'exam' ? examParts(structure).length > 0 : contentType === 'lesson' ? lessonSections(structure).length > 0 : false);
  // Travail en cours (à revoir, ou commencé sans être réussi) : le bouton passe en plein, c'est l'action attendue.
  const resume = contentType !== 'lesson' && progress !== 'success' && (progress === 'review' || !!started);
  // Où en est l'élève : se voit d'un coup d'œil dans une liste (listingUtils).
  const state = cardState(progress, started, content.user_viewed);
  // Déjà ouvert : grisé pour passer au second plan ; retrouve ses couleurs dès qu'on s'y intéresse (survol, focus).
  const opened = state === 'opened';
  const dim = opened ? 'opacity-70 grayscale transition-[opacity,filter] duration-200 group-hover:opacity-100 group-hover:grayscale-0 group-focus-within:opacity-100 group-focus-within:grayscale-0 contrast-more:opacity-100' : '';

  return (
    // Carte (refonte du 07/11/2026) : un seul cadre (l'aperçu n'est plus une carte dans la carte, juste un filet),
    // pied discret, bouton plein seulement pour « Reprendre ». Appui : la carte s'enfonce un peu (lien principal).
    <article data-etat={state ?? undefined} className={`group relative h-full flex flex-col rounded-2xl border ${cardTone(state, true)} shadow-[0_1px_2px_rgba(20,18,16,.03)] transition-[border-color,box-shadow,transform] duration-200 ease-out hover:shadow-[0_1px_2px_rgba(20,18,16,.04),0_8px_24px_rgba(20,18,16,.06)] has-[.fd-carte-lien:active]:scale-[.985] motion-reduce:has-[.fd-carte-lien:active]:scale-100`}>
      {isNew && <NewBadge />}
      <div className="px-5 pt-5 flex-1 flex flex-col">
        {/* Repères : chapitre, difficulté, état de l'élève ; favori à droite. */}
        <div className="flex items-start justify-between gap-2">
          <div className={`flex items-center gap-1.5 flex-wrap min-w-0 pt-1 ${dim}`}>
            {/* L'état d'abord : toujours au même endroit, il se lit en descendant une colonne de cartes. */}
            <StateChip state={state} started={started} lesson={contentType === 'lesson'} />
            {exam?.is_national_exam && !hideNational && <NationalTag year={exam.national_year} />}
            {exam && !exam.is_national_exam && <DevoirTag devoir={content.devoir} />}
            {chapter && (chapterTo && chapterTo !== location.pathname ? (
              <Link to={chapterTo} title={contentType === 'lesson' ? t('Tous les cours de ce chapitre') : contentType === 'exam' ? t('Tous les devoirs de ce chapitre') : t('Tous les exercices de ce chapitre')}
                className={`relative z-10 inline-flex ${chapterMax} items-center px-2 py-0.5 rounded-md bg-[#f2f1ee] text-[12px] font-medium text-ink-muted hover:bg-[#e9e6e0] hover:text-ink transition-colors before:absolute before:-inset-x-1 before:-inset-y-2 before:content-['']`}>
                <span className="truncate">{chapter}</span>
              </Link>
            ) : (
              <span className={`inline-flex ${chapterMax} items-center px-2 py-0.5 rounded-md bg-[#f2f1ee] text-[12px] font-medium text-ink-muted`}>
                <span className="truncate">{chapter}</span>
              </span>
            ))}
            {'difficulty' in content && <DifficultyChip difficulty={content.difficulty} felt={felt} interactive />}
            {ds && <DsChip test={ds} />}
            {reason && (
              <span className="inline-flex max-w-full min-w-0 items-center px-1 text-[12px] text-ink-faint">
                <span className="truncate">{reason}</span>
              </span>
            )}
          </div>
          <div className="relative z-10 flex items-center -me-2 -mt-0.5 shrink-0">
            {canManage && (
              <OwnerButtons
                onEdit={onEdit ? () => onEdit(String(content.id)) : undefined}
                onDelete={onDelete ? () => onDelete(String(content.id)) : undefined}
              />
            )}
            {contentType !== 'lesson' && (
              <button type="button" onClick={openRevision} data-tour={first ? 'liste-revision' : undefined}
                className="relative z-10 w-10 h-10 sm:w-9 sm:h-9 rounded-lg inline-flex items-center justify-center text-ink-faint hover:text-ink hover:bg-[#f2f1ee] transition-colors"
                aria-label={t('Ajouter à une liste de révision')} title={t('Ajouter à une liste de révision')}>
                <ListPlus className="w-4 h-4" />
              </button>
            )}
            <BookmarkButton saved={bookmark.saved} busy={bookmark.busy} onClick={bookmark.toggle} />
          </div>
        </div>

        <Link
          to={path}
          state={{ from, niveau: levelSlug || undefined }}
          className={`fd-carte-lien fd-display mt-3 text-[18px] leading-[1.25] font-semibold ${opened ? 'text-ink-faint' : 'text-ink'} line-clamp-2 transition-colors group-hover:text-brand-hover after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand`}
        >
          {content.title}
        </Link>
        {/* Signature et faits : enseignants, établissement, questions, durée (date d'ajout en infobulle). */}
        <MetaLine enseignants={content.enseignants} school={content.school} kind={contentType} infos={infos} dim={dim}
          title={content.created_at ? t('Ajouté le {date}', { date: dateLongue(content.created_at) }) : undefined} />
        {/* Résultat de l'élève : « 3 réussies · 1 à revoir » (à la place de l'ancienne barre « 3/6 questions »). */}
        {started && <div className="mt-2"><ResultatEleve progress={started} /></div>}

        {/* Aperçu : ce qu'il y a dedans, lisible, coupé en fondu. */}
        {structure && (
          <div className={`fd-card-preview mt-4 mb-1 border-s-2 border-brand-line ps-4 text-[14.5px] leading-[1.55] text-ink-soft transition-colors duration-200 group-hover:border-brand ${dim}`}>
            {/* Fondu seulement pour un énoncé (longueur libre) ; sujet et leçon montrent un nombre fixe de lignes. */}
            {/* Avec la rangée des théorèmes en bas, l'aperçu raccourcit d'autant : la carte garde sa hauteur. */}
            <div className={bounded ? 'max-h-[160px] overflow-hidden' : 'fd-card-preview-clip'} style={hasTheorems ? { maxHeight: bounded ? 128 : 104 } : undefined}>
              {contentType === 'exam' ? <ExamPreview structure={structure} />
                : contentType === 'lesson' ? <LessonPreview structure={structure} />
                : <ExercisePreview structure={structure} />}
            </div>
            {more && <p className="mt-1 font-sans text-[12px] font-medium text-ink-faint">{more}</p>}
          </div>
        )}
      </div>

      {/* Théorèmes utilisés : au bas de la carte, juste au-dessus des « j'aime ». */}
      {hasTheorems && <div className="px-5 pt-3"><TheoremChips theorems={content.theorems} dim={dim} /></div>}

      {/* Pied : votes, discussions, vues ; bouton d'ouverture. */}
      <div className="relative z-10 flex items-center gap-1 ps-3 pe-4 pt-2 pb-4">
        <div data-tour={first ? 'vote' : undefined}>
          <QuietVotes likes={counts.likes} dislikes={counts.dislikes} onVote={vote} userVote={myVote} />
        </div>
        {comments > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 text-[12.5px] text-ink-faint fd-nums" title={comments > 1 ? t('{n} messages', { n: comments }) : t('{n} message', { n: comments })}>
            <MessageSquare className="w-3.5 h-3.5" aria-hidden /> {comments}
          </span>
        )}
        {(content.view_count ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 text-[12.5px] text-ink-faint fd-nums" title={t('Vues')}>
            <Eye className="w-3.5 h-3.5" aria-hidden /> {content.view_count}
          </span>
        )}
        <Link
          to={path}
          state={{ from, niveau: levelSlug || undefined }}
          data-tour={first ? 'liste-ouvrir' : undefined}
          className={`ms-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap h-10 sm:h-9 px-3.5 rounded-[10px] text-[13px] font-semibold transition-colors ${
            resume
              ? 'bg-brand text-white hover:bg-brand-hover'
              : opened
                ? 'bg-line/70 text-ink-muted group-hover:bg-brand group-hover:text-white'
                : 'bg-[#f2f1ee] text-ink group-hover:bg-brand group-hover:text-white'
          }`}
        >
          {contentType === 'lesson' ? t('Lire') : progress === 'success' ? t('Revoir') : resume ? t('Reprendre') : t('Commencer')}
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
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
