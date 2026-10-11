/**
 * En-tête de la page d'un contenu (refait le 11/10/2026, identité « encre et papier ») : sur le fond papier,
 * comme les autres pages de l'espace élève.
 *  - une ligne : retour nommé à gauche ; à droite trois boutons calmes (Enregistrer, PDF, ⋯) ;
 *  - repère (or) : nature · chapitre · niveau, puis le titre serif et une ligne d'infos (difficulté, nombre
 *    de questions et durée, auteur, ton résultat) ;
 *  - onglets soulignés (Exercice · Solutions des élèves · Activité) au lieu de trois gros boutons.
 * Le reste (partager, ranger dans une liste ou un cahier, mes temps, signaler, modération) est dans « ⋯ ».
 */
import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookMarked, Bookmark, ChevronLeft, Flag, History, ListPlus, Loader2, MoreHorizontal, Pencil, Printer,
  School, Share2, ShieldCheck, ShieldQuestion, Trash2,
} from 'lucide-react';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import type { ContentExercise, ContentExam, ContentLesson } from '@/types/content';
import { useAuth } from '@/contexts/AuthContext';
import { hubPath } from '@/lib/api/hubApi';
import { studentLevelSlug } from '@/components/layout/nav';
import { DifficultyChip } from '@/components/content/listing/ListingParts';
import { trackAction } from '@/lib/usage';
import { contentHub } from './pageHelpers';

type ContentItem = ContentExercise | ContentExam | ContentLesson;

// La discussion est sous le contenu, dans l'onglet principal (plus d'onglet Discussions).
export type ContentTab = 'exercise' | 'proposals' | 'activity';

interface ContentHeaderProps {
  content: ContentItem;
  contentType: 'exercise' | 'exam' | 'lesson';
  isSaved: boolean;
  isSaving: boolean;
  onToggleSave: () => Promise<void>;
  isAuthor: boolean;
  onDelete?: () => Promise<void>;
  onPrint?: () => void;
  /** Ouvre « Signaler une erreur ». */
  onReport?: () => void;
  /** Administrateurs : marquer la correction vérifiée (true) ou la remettre « à vérifier » (false). */
  onSetVerified?: (verifie: boolean) => void;
  activeTab: ContentTab;
  onTabChange: (tab: ContentTab) => void;
  basePath: string;
  /** Nombre de solutions proposées par les élèves (pastille de l'onglet). */
  solutionCount?: number;
  /** Ranger le contenu : liste de révision (exercice, examen) ou cahier (leçon). */
  onCollect?: () => void;
  /** Temps (exercice) ou passages (examen) enregistrés. */
  sessionCount?: number;
  onOpenHistory?: () => void;
  /** Épreuve en cours : pas d'onglets (les solutions des élèves dévoileraient le corrigé). */
  hideTabs?: boolean;
}

const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} semaine${days >= 14 ? 's' : ''}`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  const years = Math.floor(days / 365);
  return `il y a ${years} an${years > 1 ? 's' : ''}`;
};

const durationLabel = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`;
};

// Boutons de l'en-tête : calmes, 40 px de haut (cible confortable au pouce).
const headBtn = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-[13.5px] font-medium text-ink-soft transition-colors hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60';

const MenuItem: React.FC<{ icon: React.ElementType; onClick: () => void; children: React.ReactNode; tone?: 'danger' | 'brand' }> = ({
  icon: Icon, onClick, children, tone,
}) => (
  <button type="button" role="menuitem" onClick={onClick}
    className={`flex min-h-11 w-full items-center gap-3 px-4 text-left text-[14px] transition-colors ${
      tone === 'danger' ? 'text-[#a23b34] hover:bg-[#fbecea]' : tone === 'brand' ? 'font-medium text-brand-hover hover:bg-brand-soft' : 'text-ink-soft hover:bg-[#f7f6f3] hover:text-ink'}`}>
    <Icon className={`h-4 w-4 shrink-0 ${tone ? '' : 'text-ink-faint'}`} aria-hidden /> {children}
  </button>
);

export const ContentHeader: React.FC<ContentHeaderProps> = ({
  content, contentType, isSaved, isSaving, onToggleSave, isAuthor, onDelete, onPrint, onReport, onSetVerified,
  activeTab, onTabChange, basePath, solutionCount = 0, onCollect, sessionCount = 0,
  onOpenHistory, hideTabs = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const exam = contentType === 'exam' ? (content as ContentExam) : null;
  const isNational = !!exam?.is_national_exam;
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const isLesson = contentType === 'lesson';

  // Retour : arrivé depuis une liste (ou un autre contenu), on y revient tel quel (filtres, position) ;
  // sinon, page du chapitre au niveau de l'élève. Un examen national revient à sa section.
  const from = (location.state as { from?: string } | null)?.from;
  const hub = contentHub(content, studentLevelSlug(user));
  const back = (() => {
    if (isNational) return { to: '/exams/nationaux', label: 'Bac national' };
    const { level, chapter } = hub;
    const section = basePath.replace(/^\//, '');
    if (level && chapter) return { to: hubPath(section, level.slug, chapter.slug), label: chapter.name };
    if (level) return { to: hubPath(section, level.slug), label: level.name };
    return { to: basePath, label: isLesson ? 'Leçons' : contentType === 'exam' ? 'Devoirs (DS)' : 'Exercices' };
  })();
  const goBack = () => {
    trackAction('retour-liste');
    if (from) navigate(-1); else navigate(back.to);
  };

  const handleShare = () => {
    trackAction('partager');
    if (navigator.share) {
      navigator.share({
        title: content?.title || 'Fidni',
        text: `${content?.title} – sur Fidni`,
        url: window.location.href,
      }).catch(() => { /* partage annulé */ });
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Lien copié !'))
        .catch((err) => console.error('Error copying link:', err));
    }
  };
  const pick = (fn?: () => void) => () => { setMenuOpen(false); fn?.(); };

  // ── Repère : nature · chapitre · niveau (liens vers la page du chapitre et du niveau, même rubrique).
  const c = content as ContentItem & { structure?: { credit?: string; a_verifier?: boolean }; school?: { name: string; city?: string } | null };
  const credit = c.structure?.credit;
  const school = c.school;
  const aVerifier = !!c.structure?.a_verifier && !isLesson;
  const level = (hub.level ?? content.class_levels?.[0]) as { name: string; slug?: string } | undefined;
  const levelSlug = level?.slug;
  const levelUrl = levelSlug ? `${basePath}/niveau/${levelSlug}` : null;
  const chapters = (content.chapters || []) as { id: number | string; name: string; slug?: string; class_levels?: { slug?: string }[] }[];
  const chapterAtLevel = (ch: (typeof chapters)[number]) => !ch.class_levels?.length || ch.class_levels.some((l) => l.slug === levelSlug);
  const kind = isLesson ? 'Leçon' : exam ? (isNational ? `Bac national${exam.national_year ? ` ${exam.national_year}` : ''}` : 'Devoir (DS)') : 'Exercice';
  const eyebrowLink = 'underline-offset-4 transition-colors hover:text-gold hover:underline';

  // ── Infos : questions et durée (estimée pour un exercice, celle du sujet pour un examen).
  const items = Number(content.item_count) || 0;
  const minutes = exam ? Number(exam.duration_minutes) || 0 : Number(content.expected_minutes) || 0;
  const sectionCount = isLesson ? ((content.structure as { sections?: unknown[] } | undefined)?.sections?.length ?? 0) : 0;
  const facts = [
    !isLesson && items > 0 ? `${items} question${items > 1 ? 's' : ''}` : null,
    sectionCount > 1 ? `${sectionCount} parties` : null,
    minutes > 0 ? (exam ? durationLabel(minutes) : `≈ ${durationLabel(minutes)}`) : null,
  ].filter(Boolean).join(' · ');

  // short : libellé sur téléphone, pour que les trois onglets tiennent sur une ligne.
  const tabs: { id: ContentTab; label: string; short?: string; count?: number }[] = isLesson ? [] : [
    { id: 'exercise', label: exam ? 'Sujet' : 'Exercice' },
    { id: 'proposals', label: 'Solutions des élèves', short: 'Solutions', count: solutionCount },
    { id: 'activity', label: 'Activité' },
  ];

  return (
    <header className="mb-6 sm:mb-8">
      {/* Retour nommé + actions */}
      <div className="-mx-1 flex items-center justify-between gap-2 print:hidden">
        <button type="button" onClick={goBack} title={from ? 'Revenir à la page précédente' : back.label}
          className="inline-flex min-h-10 min-w-0 items-center gap-1 rounded-lg px-1 text-[13px] font-medium text-ink-faint transition-colors hover:text-ink">
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span className="max-w-[46vw] truncate sm:max-w-xs">{from ? 'Retour' : back.label}</span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={onToggleSave} disabled={isSaving} data-tour="detail-enregistrer" aria-pressed={isSaved}
            aria-label={isSaved ? 'Retirer de mes favoris' : 'Enregistrer dans mes favoris'}
            className={`${headBtn} ${isSaved ? 'text-ink' : ''}`}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />}
            <span className="hidden sm:inline">{isSaved ? 'Enregistré' : 'Enregistrer'}</span>
          </button>
          {onPrint && (
            <button type="button" onClick={onPrint} data-tour={isLesson ? 'lecon-imprimer' : 'detail-imprimer'}
              aria-label={isLesson ? 'Imprimer la leçon' : 'Imprimer ou télécharger en PDF'} className={headBtn}>
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">{isLesson ? 'Imprimer' : 'PDF'}</span>
            </button>
          )}
          <div ref={moreRef}>
            <button type="button" onClick={() => setMenuOpen((o) => !o)} data-tour="detail-plus" aria-label="Plus d'options"
              aria-haspopup="menu" aria-expanded={menuOpen} className={`${headBtn} w-10 px-0`}>
              <MoreHorizontal className="h-5 w-5" />
            </button>
            <FloatingPanel anchorRef={moreRef} open={menuOpen} onClose={() => setMenuOpen(false)} placement="bottom-end" role="menu"
              className="w-max min-w-[240px] max-w-[300px] overflow-hidden rounded-2xl border border-line bg-white py-1.5 shadow-[0_16px_40px_rgba(20,18,16,.14)]">
              <p className="mb-1 border-b border-line px-4 pb-2.5 pt-1.5 text-[12.5px] leading-relaxed text-ink-faint fd-nums">
                {content.author?.username && !content.author.is_deleted ? (
                  <>Par <Link to={`/profile/${content.author.username}`} onClick={() => setMenuOpen(false)} className="font-medium text-ink-soft hover:underline">{content.author.username}</Link> · </>
                ) : null}
                {[
                  content.created_at ? `publié ${timeAgo(content.created_at)}` : null,
                  typeof content.view_count === 'number' ? `${content.view_count} vue${content.view_count > 1 ? 's' : ''}` : null,
                  `n° ${content.id}`,
                ].filter(Boolean).join(' · ')}
              </p>
              <MenuItem icon={Share2} onClick={pick(handleShare)}>Partager</MenuItem>
              {onCollect && (
                <MenuItem icon={isLesson ? BookMarked : ListPlus} onClick={pick(onCollect)}>
                  {isLesson ? 'Ajouter à mon cahier' : 'Ajouter à une liste de révision'}
                </MenuItem>
              )}
              {onOpenHistory && sessionCount > 0 && (
                <MenuItem icon={History} onClick={pick(onOpenHistory)}>
                  {exam ? `Mes passages (${sessionCount})` : `Mes temps enregistrés (${sessionCount})`}
                </MenuItem>
              )}
              {onReport && <MenuItem icon={Flag} onClick={pick(onReport)}>Signaler une erreur</MenuItem>}
              {onSetVerified && !isLesson && (
                <>
                  <div className="my-1 border-t border-line" />
                  {c.structure?.a_verifier
                    ? <MenuItem icon={ShieldCheck} tone="brand" onClick={pick(() => onSetVerified(true))}>Marquer la correction comme vérifiée</MenuItem>
                    : <MenuItem icon={ShieldQuestion} onClick={pick(() => onSetVerified(false))}>Remettre « à vérifier »</MenuItem>}
                </>
              )}
              {isAuthor && (
                <>
                  <div className="my-1 border-t border-line" />
                  <MenuItem icon={Pencil} onClick={pick(() => navigate(`${basePath}/${content.id}/edit`))}>Modifier</MenuItem>
                  <MenuItem icon={Trash2} tone="danger" onClick={pick(() => { onDelete?.(); })}>Supprimer</MenuItem>
                </>
              )}
            </FloatingPanel>
          </div>
        </div>
      </div>

      {/* Repère, titre, infos */}
      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong sm:mt-4">
        <span>{kind}</span>
        {chapters.slice(0, 2).map((ch) => (
          <React.Fragment key={ch.id}>
            <span aria-hidden className="text-gold-line">·</span>
            {levelUrl && ch.slug && chapterAtLevel(ch)
              ? <Link to={`${levelUrl}/${ch.slug}`} title={`Tous les contenus : ${ch.name}`} className={eyebrowLink}>{ch.name}</Link>
              : <span>{ch.name}</span>}
          </React.Fragment>
        ))}
        {chapters.length > 2 && <span className="text-gold-strong/70">+{chapters.length - 2}</span>}
        {level && (
          <>
            <span aria-hidden className="text-gold-line">·</span>
            {levelUrl ? <Link to={levelUrl} className={eyebrowLink}>{level.name}</Link> : <span>{level.name}</span>}
          </>
        )}
      </p>
      <h1 className="fd-display mt-2 text-ink" style={{ fontSize: 'clamp(26px, 3.4vw, 36px)', lineHeight: 1.12 }}>
        {content.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13.5px] text-ink-faint">
        {/* Ressenti des élèves : dans la pastille de difficulté quand il diffère (l'examen le redit dans sa fiche). */}
        {!isLesson && content.difficulty && <DifficultyChip difficulty={content.difficulty} felt={contentType === 'exercise' ? content.felt : null} />}
        {facts && <span className="fd-nums">{facts}</span>}
        {credit
          ? <span>Proposé par {credit}</span>
          : content.author?.is_deleted ? <span className="italic">Compte supprimé</span>
            : content.author?.username && (
              <span className="hidden sm:inline">par <Link to={`/profile/${content.author.username}`} className="text-ink-soft hover:text-ink hover:underline">{content.author.username}</Link></span>
            )}
        {/* Établissement d'origine (champ facultatif de l'assistant « Ajouter un contenu »). */}
        {school?.name && (
          <span className="inline-flex items-center gap-1"><School className="h-3.5 w-3.5" aria-hidden />
            {contentType === 'lesson' ? 'Cours de' : 'Donné au'} {school.name}{school.city ? `, ${school.city}` : ''}
          </span>
        )}
      </div>

      {/* Correction rédigée par Fidni, pas encore relue par l'auteur du document. */}
      {aVerifier && (
        <p className="mt-4 flex max-w-2xl items-start gap-2 rounded-xl border border-gold-line bg-gold-soft px-3 py-2 text-[13px] leading-snug text-gold-strong">
          <ShieldQuestion className="mt-px h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Correction en cours de vérification.</strong>{' '}
            L’énoncé est celui du document ; la correction est relue par son auteur. Une erreur ? Signale-la.
          </span>
        </p>
      )}

      {/* Onglets soulignés : l'énoncé d'abord, le reste à côté, sans voler la vedette. */}
      {tabs.length > 0 && !hideTabs && (
        <div role="tablist" aria-label="Sections" data-tour="detail-onglets"
          className="mt-6 flex gap-6 overflow-x-auto border-b border-line scrollbar-hide sm:gap-8 print:hidden">
          {tabs.map(({ id, label, short, count }) => {
            const active = activeTab === id;
            return (
              <button key={id} type="button" role="tab" aria-selected={active} onClick={() => onTabChange(id)}
                className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 text-[14px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  active ? 'border-ink text-ink' : 'border-transparent text-ink-faint hover:text-ink'}`}>
                {short ? <><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{label}</span></> : label}
                {count !== undefined && count > 0 && (
                  <span className={`rounded-full px-1.5 text-[11.5px] fd-nums ${active ? 'bg-ink text-white' : 'bg-[#f2f1ee] text-ink-faint'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
