import React, { useState, useRef } from 'react';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { Link, useNavigate } from 'react-router-dom';
import {
  Share2, Bookmark, MoreHorizontal, Printer, BookOpen, Lightbulb, BarChart3, ArrowLeft, Loader2,
  Pencil, Trash2, User, Calendar, Eye, GraduationCap, Flag, ShieldQuestion, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContentExercise, ContentExam, ContentLesson } from '@/types/content';
import { DifficultyBars } from '@/components/common/DifficultyBars';

type ContentItem = ContentExercise | ContentExam | ContentLesson;

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
}

// La discussion est sous le contenu, dans l'onglet principal (plus d'onglet Discussions).
export type ContentTab = 'exercise' | 'proposals' | 'activity';

// Light, focus-first header chrome. Shared ghost-button styling (ink on white).
const ghostBtn = 'rounded-xl gap-2 text-[#33302b] hover:bg-[#f7f6f3]';

const DIFFICULTY: Record<string, { label: string; bg: string; text: string }> = {
  easy:   { label: 'Facile',    bg: '#eaf3ed', text: '#15633c' },
  medium: { label: 'Moyen',     bg: '#faf3e2', text: '#9a6e1c' },
  hard:   { label: 'Difficile', bg: '#fbecea', text: '#a23b34' },
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
  padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap',
};

const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} semaine${days >= 14 ? 's' : ''}`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  const years = Math.floor(days / 365);
  return `Il y a ${years} an${years > 1 ? 's' : ''}`;
};

export const ContentHeader: React.FC<ContentHeaderProps> = ({
  content,
  contentType,
  isSaved,
  isSaving,
  onToggleSave,
  isAuthor,
  onDelete,
  onPrint,
  onReport,
  onSetVerified,
  activeTab,
  onTabChange,
  basePath,
  solutionCount = 0,
}) => {
  const navigate = useNavigate();
  // Un examen national revient à sa section ; les autres examens, à la section Examens (devoirs).
  const isNational = contentType === 'exam' && !!(content as any)?.is_national_exam;
  const backPath = isNational ? '/exams/nationaux' : basePath;
  const [showDropdown, setShowDropdown] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: content?.title || 'Content',
        text: `Découvrez: ${content?.title}`,
        url: window.location.href
      }).catch(err => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Lien copié!'))
        .catch(err => console.error('Error copying link:', err));
    }
  };

  // short : libellé sur téléphone, pour que les trois onglets tiennent sur une ligne.
  const tabs: { id: ContentTab; label: string; short?: string; icon: React.ElementType; count?: number }[] = contentType === 'lesson'
    ? [{ id: 'exercise', label: 'Leçon', icon: BookOpen }]
    : [
        { id: 'exercise', label: contentType === 'exam' ? 'Sujet' : 'Exercice', icon: BookOpen },
        { id: 'proposals', label: 'Solutions des élèves', short: 'Solutions', icon: Lightbulb, count: solutionCount },
        { id: 'activity', label: 'Activité', icon: BarChart3 },
      ];

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e7e3dc' }}>
      {/* Même largeur que le contenu en dessous (l'en-tête était plus étroit, donc décalé). */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* Retour nommé + actions */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => navigate(backPath)}
              className="inline-flex items-center gap-1.5 py-1.5 -ml-1 pr-2 rounded-lg text-sm text-[#6b6862] hover:text-[#1a1a1a] transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              {contentType === 'lesson' ? 'Leçons' : isNational ? 'Examens nationaux' : contentType === 'exam' ? 'Examens' : 'Exercices'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Save */}
            <Button
              onClick={onToggleSave}
              data-tour="detail-enregistrer"
              variant="ghost"
              size="sm"
              className={`rounded-xl gap-2 ${isSaved ? 'bg-[#f2f1ee] text-[#000000]' : ghostBtn}`}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />}
              <span className="hidden sm:inline">{isSaved ? 'Enregistré' : 'Enregistrer'}</span>
            </Button>

            {/* More */}
            <div className="relative" ref={moreRef}>
              <Button onClick={() => setShowDropdown(!showDropdown)} variant="ghost" size="sm" className={`rounded-xl px-2 ${ghostBtn}`} data-tour="detail-plus" aria-label="Plus d'options">
                <MoreHorizontal className="w-5 h-5" />
              </Button>

              <FloatingPanel anchorRef={moreRef} open={showDropdown} onClose={() => setShowDropdown(false)} placement="bottom-end"
                className="min-w-48 w-max max-w-[300px] bg-white rounded-xl shadow-xl py-2 border border-[#e7e3dc] overflow-hidden">
                    <button
                      onClick={() => { handleShare(); setShowDropdown(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-ink-soft hover:bg-[#f7f6f3] transition-colors text-sm"
                    >
                      <Share2 className="w-4 h-4 text-ink-faint" /> Partager
                    </button>
                    {onPrint && (
                      <button
                        onClick={() => { onPrint(); setShowDropdown(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-ink-soft hover:bg-[#f7f6f3] transition-colors text-sm"
                      >
                        <Printer className="w-4 h-4 text-ink-faint" /> Imprimer / PDF
                      </button>
                    )}
                    {onReport && (
                      <button
                        onClick={() => { onReport(); setShowDropdown(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-ink-soft hover:bg-[#f7f6f3] transition-colors text-sm"
                      >
                        <Flag className="w-4 h-4 text-ink-faint" /> Signaler une erreur
                      </button>
                    )}
                    {onSetVerified && contentType !== 'lesson' && (
                      <>
                        <div className="border-t border-line my-1" />
                        {(content as any).structure?.a_verifier ? (
                          <button
                            onClick={() => { setShowDropdown(false); onSetVerified(true); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-brand-hover hover:bg-brand-soft transition-colors text-sm font-medium text-left"
                          >
                            <ShieldCheck className="w-4 h-4 shrink-0" /> Marquer la correction comme vérifiée
                          </button>
                        ) : (
                          <button
                            onClick={() => { setShowDropdown(false); onSetVerified(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-ink-soft hover:bg-[#f7f6f3] transition-colors text-sm text-left"
                          >
                            <ShieldQuestion className="w-4 h-4 shrink-0 text-ink-faint" /> Remettre « à vérifier »
                          </button>
                        )}
                      </>
                    )}
                    {isAuthor && (
                      <>
                        <div className="border-t border-line my-1" />
                        <button
                          onClick={() => { navigate(`${basePath}/${content.id}/edit`); setShowDropdown(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-ink-soft hover:bg-[#f7f6f3] transition-colors text-sm"
                        >
                          <Pencil className="w-4 h-4 text-ink-faint" /> Modifier
                        </button>
                        <button
                          onClick={() => { setShowDropdown(false); onDelete?.(); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" /> Supprimer
                        </button>
                      </>
                    )}
              </FloatingPanel>
            </div>
          </div>
        </div>

        {/* Étiquettes, titre et infos : l'identité de la page, au-dessus des onglets. */}
        {(() => {
          const c = content as any;
          const credit: string | undefined = c.structure?.credit;
          const aVerifier: boolean = !!c.structure?.a_verifier;
          const diff = c.difficulty ? DIFFICULTY[c.difficulty] : null;
          const chapters: { id: string | number; name: string; slug?: string }[] = c.chapters || [];
          const level = c.class_levels?.[0];
          const levelName = level ? (typeof level === 'string' ? level : level.name) : null;
          // Étiquettes cliquables : page du niveau, page du chapitre (même rubrique).
          const levelSlug: string | undefined = level && typeof level !== 'string' ? level.slug : undefined;
          const levelUrl = levelSlug ? `${basePath}/niveau/${levelSlug}` : null;
          return (
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                {diff && (
                  <span style={{ ...chipStyle, background: diff.bg, color: diff.text }}>
                    <DifficultyBars difficulty={c.difficulty} />
                    {diff.label}
                  </span>
                )}
                {c.is_national_exam && (
                  <span style={{ ...chipStyle, background: '#faf3e2', color: '#9a6e1c' }}>
                    Examen national{c.national_year ? ` ${c.national_year}` : ''}
                  </span>
                )}
                {chapters.slice(0, 2).map((ch) => (levelUrl && ch.slug ? (
                  <Link key={ch.id} to={`${levelUrl}/${ch.slug}`} title={`Tous les contenus : ${ch.name}`}
                    className="hover:!bg-[#e7e3dc] transition-colors" style={{ ...chipStyle, background: '#f2f1ee', color: '#4b4843' }}>{ch.name}</Link>
                ) : (
                  <span key={ch.id} style={{ ...chipStyle, background: '#f2f1ee', color: '#4b4843' }}>{ch.name}</span>
                )))}
                {chapters.length > 2 && (
                  <span style={{ ...chipStyle, background: '#f2f1ee', color: '#6b6862' }}>+{chapters.length - 2}</span>
                )}
                {levelName && (levelUrl
                  ? <Link to={levelUrl} className="hover:!text-[#1a1a1a] transition-colors" style={{ ...chipStyle, color: '#6b6862', paddingLeft: 4 }}>{levelName}</Link>
                  : <span style={{ ...chipStyle, color: '#6b6862', paddingLeft: 4 }}>{levelName}</span>)}
              </div>
              <h1 className="fd-display" style={{ fontSize: 'clamp(26px, 3.6vw, 36px)', lineHeight: 1.15, color: '#1a1a1a' }}>
                {content.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-sm" style={{ color: '#6b6862' }}>
                {content.author?.username && (content.author.is_deleted ? (
                  <span className="inline-flex items-center gap-1.5 italic">
                    <User className="w-4 h-4" /> Compte supprimé
                  </span>
                ) : (
                  <Link to={`/profile/${content.author.username}`} className="inline-flex items-center gap-1.5 hover:text-[#1a1a1a]">
                    <User className="w-4 h-4" /> {content.author.username}
                  </Link>
                ))}
                {credit && (
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" /> Proposé par {credit}
                  </span>
                )}
                {c.created_at && (
                  <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {timeAgo(c.created_at)}</span>
                )}
                {typeof c.view_count === 'number' && (
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="w-4 h-4" /> {c.view_count} vue{c.view_count > 1 ? 's' : ''}
                  </span>
                )}
                <span className="fd-nums" style={{ color: '#9a958c' }}>#{content.id}</span>
              </div>
              {/* Correction rédigée par Fidni, pas encore relue par l'auteur du document. */}
              {aVerifier && contentType !== 'lesson' && (
                <p className="mt-3 inline-flex items-start gap-2 rounded-xl border border-[#ecdcb4] bg-gold-soft px-3 py-2 text-[13px] text-gold-strong">
                  <ShieldQuestion className="w-4 h-4 mt-px shrink-0" aria-hidden />
                  <span>
                    <strong className="font-semibold">Correction en cours de vérification.</strong>{' '}
                    L’énoncé est celui du document ; la correction est relue par son auteur. Une erreur ? Signale-la en bas de la page.
                  </span>
                </p>
              )}
            </div>
          );
        })()}

        {/* Onglets : celui qui est ouvert est en vert plein, impossible à manquer. */}
        {tabs.length > 1 && (
          <div role="tablist" aria-label="Sections" data-tour="detail-onglets"
            className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-4 scrollbar-hide sm:mx-0 sm:px-0">
            {tabs.map(({ id, label, short, icon: Icon, count }) => {
              const active = activeTab === id;
              return (
                <button key={id} type="button" role="tab" aria-selected={active} onClick={() => onTabChange(id)}
                  className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[14px] sm:px-4 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                    active ? 'bg-brand text-white shadow-sm' : 'bg-[#f2f1ee] text-ink-soft hover:bg-[#e9e6e0] hover:text-ink'
                  }`}>
                  <Icon className="h-4 w-4" aria-hidden />
                  {short ? <><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{label}</span></> : label}
                  {count !== undefined && count > 0 && (
                    <span className={`fd-nums rounded-full px-1.5 text-[12px] font-semibold ${active ? 'bg-white/20 text-white' : 'bg-white text-ink-soft'}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
