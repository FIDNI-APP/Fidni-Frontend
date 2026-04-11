import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Share2, Bookmark, MoreHorizontal, BookOpen, Printer,
  ListPlus, ChevronRight, MessageSquare,
  GitPullRequest, Activity, ArrowLeft, Loader2,
  Pencil, Trash2, BookMarked, CheckCircle2, Circle, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StructuredExercise, StructuredExam, StructuredLesson } from '@/types/structured';
import { AddToRevisionListModal } from '@/components/revision/AddToRevisionListModal';
import { AddToNotebookModal } from '@/components/notebook/AddToNotebookModal';

type StructuredContent = StructuredExercise | StructuredExam | StructuredLesson;

const getContentTypeColors = (contentType: 'exercise' | 'exam' | 'lesson') => {
  switch (contentType) {
    case 'exam':
      return {
        gradient: 'from-violet-600 via-violet-700 to-purple-700',
        text: 'text-white',
        textMuted: 'text-white/70',
        hoverBg: 'hover:bg-white/10',
        activeBg: 'bg-white/20',
        tabActive: 'bg-white text-violet-700',
        tabInactive: 'text-white/70 hover:text-white hover:bg-white/10',
        badge: 'bg-violet-100 text-violet-700',
        badgeInactive: 'bg-white/20 text-white',
      };
    case 'lesson':
      return {
        gradient: 'from-emerald-600 via-emerald-700 to-teal-700',
        text: 'text-white',
        textMuted: 'text-white/70',
        hoverBg: 'hover:bg-white/10',
        activeBg: 'bg-white/20',
        tabActive: 'bg-white text-emerald-700',
        tabInactive: 'text-white/70 hover:text-white hover:bg-white/10',
        badge: 'bg-emerald-100 text-emerald-700',
        badgeInactive: 'bg-white/20 text-white',
      };
    default: // exercise
      return {
        gradient: 'from-blue-600 via-blue-700 to-indigo-700',
        text: 'text-white',
        textMuted: 'text-white/70',
        hoverBg: 'hover:bg-white/10',
        activeBg: 'bg-white/20',
        tabActive: 'bg-white text-blue-700',
        tabInactive: 'text-white/70 hover:text-white hover:bg-white/10',
        badge: 'bg-blue-100 text-blue-700',
        badgeInactive: 'bg-white/20 text-white',
      };
  }
};

interface ContentHeaderProps {
  content: StructuredContent;
  contentType: 'exercise' | 'exam' | 'lesson';
  isSaved: boolean;
  isSaving: boolean;
  onToggleSave: () => Promise<void>;
  isAuthor: boolean;
  onDelete?: () => Promise<void>;
  onPrint?: () => void;
  activeTab: 'exercise' | 'discussions' | 'proposals' | 'activity';
  onTabChange: (tab: 'exercise' | 'discussions' | 'proposals' | 'activity') => void;
  basePath: string;
  commentCount?: number;
  completionStatus?: 'success' | 'review' | null;
  onSetCompletion?: (status: 'success' | 'review' | null) => void;
}

export const ContentHeader: React.FC<ContentHeaderProps> = ({
  content,
  contentType,
  isSaved,
  isSaving,
  onToggleSave,
  isAuthor,
  onDelete,
  onPrint,
  activeTab,
  onTabChange,
  basePath,
  commentCount = 0,
  completionStatus,
  onSetCompletion,
}) => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRevisionListModal, setShowRevisionListModal] = useState(false);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [showCompletionDropdown, setShowCompletionDropdown] = useState(false);
  const completionBtnRef = useRef<HTMLButtonElement>(null);
  const [completionPos, setCompletionPos] = useState({ top: 0, left: 0 });
  const colors = getContentTypeColors(contentType);

  const buildFilterUrl = (filters: { classLevel?: string; subject?: string; subfield?: string; chapter?: string; theorem?: string }) => {
    const params = new URLSearchParams();
    if (filters.classLevel) params.set('classLevels', filters.classLevel);
    if (filters.subject) params.set('subjects', filters.subject);
    if (filters.subfield) params.set('subfields', filters.subfield);
    if (filters.chapter) params.set('chapters', filters.chapter);
    if (filters.theorem) params.set('theorems', filters.theorem);
    return `${basePath}?${params.toString()}`;
  };

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

  const tabs = [
    { id: 'exercise', label: contentType === 'lesson' ? 'Leçon' : 'Exercice', icon: BookOpen },
    { id: 'discussions', label: 'Discussions', icon: MessageSquare, count: commentCount },
    { id: 'proposals', label: 'Solutions', icon: GitPullRequest },
    { id: 'activity', label: 'Activité', icon: Activity }
  ];

  // Hide proposals tab for lessons
  const filteredTabs = contentType === 'lesson'
    ? tabs.filter(t => t.id !== 'proposals')
    : tabs;

  return (
    <div className={`relative bg-gradient-to-r ${colors.gradient}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="headerGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#headerGrid)" />
        </svg>
      </div>

      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(basePath)}
              className={`p-2 -ml-2 rounded-xl ${colors.textMuted} hover:text-white ${colors.hoverBg} transition-colors`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <nav className="hidden md:flex items-center gap-1.5 text-sm">
              <button
                onClick={() => navigate(basePath)}
                className={`${colors.textMuted} hover:text-white transition-colors`}
              >
                {contentType === 'exercise' ? 'Exercices' : contentType === 'exam' ? 'Examens' : 'Leçons'}
              </button>

              {content.class_levels && content.class_levels.length > 0 && (
                <>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                  <button
                    onClick={() => navigate(buildFilterUrl({ classLevel: content.class_levels[0].id.toString() }))}
                    className={`${colors.textMuted} hover:text-white transition-colors`}
                  >
                    {content.class_levels[0].name}
                  </button>
                </>
              )}

              {content.subject && (
                <>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                  <button
                    onClick={() => navigate(buildFilterUrl({
                      ...(content.class_levels?.[0] && { classLevel: content.class_levels[0].id.toString() }),
                      subject: content.subject.id.toString(),
                    }))}
                    className={`${colors.textMuted} hover:text-white transition-colors`}
                  >
                    {content.subject.name}
                  </button>
                </>
              )}

              {content.subfields && content.subfields.length > 0 && (
                <>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                  <button
                    onClick={() => navigate(buildFilterUrl({
                      ...(content.class_levels?.[0] && { classLevel: content.class_levels[0].id.toString() }),
                      ...(content.subject && { subject: content.subject.id.toString() }),
                      subfield: content.subfields[0].id.toString(),
                    }))}
                    className={`${colors.textMuted} hover:text-white transition-colors`}
                  >
                    {content.subfields[0].name}
                  </button>
                </>
              )}

              {content.chapters && content.chapters.length > 0 && (
                <>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                  <button
                    onClick={() => navigate(buildFilterUrl({
                      ...(content.class_levels?.[0] && { classLevel: content.class_levels[0].id.toString() }),
                      ...(content.subject && { subject: content.subject.id.toString() }),
                      ...(content.subfields?.[0] && { subfield: content.subfields[0].id.toString() }),
                      chapter: content.chapters[0].id.toString(),
                    }))}
                    className={`${colors.textMuted} hover:text-white transition-colors truncate max-w-[150px]`}
                  >
                    {content.chapters[0].name}
                  </button>
                </>
              )}

              {content.theorems && content.theorems.length > 0 && (
                <>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                  <button
                    onClick={() => navigate(buildFilterUrl({
                      ...(content.class_levels?.[0] && { classLevel: content.class_levels[0].id.toString() }),
                      ...(content.subject && { subject: content.subject.id.toString() }),
                      ...(content.subfields?.[0] && { subfield: content.subfields[0].id.toString() }),
                      ...(content.chapters?.[0] && { chapter: content.chapters[0].id.toString() }),
                      theorem: content.theorems[0].id.toString(),
                    }))}
                    className={`${colors.textMuted} hover:text-white transition-colors truncate max-w-[150px]`}
                  >
                    {content.theorems[0].name}
                  </button>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Completion dropdown */}
            {onSetCompletion && (
              <div className="relative">
                <Button
                  ref={completionBtnRef}
                  onClick={() => {
                    if (completionBtnRef.current) {
                      const rect = completionBtnRef.current.getBoundingClientRect();
                      setCompletionPos({ top: rect.bottom + 4, left: rect.left });
                    }
                    setShowCompletionDropdown(!showCompletionDropdown);
                  }}
                  variant="ghost"
                  size="sm"
                  className={`rounded-xl gap-2 ${
                    completionStatus === 'success'
                      ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                      : completionStatus === 'review'
                        ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
                        : `${colors.textMuted} hover:text-white ${colors.hoverBg}`
                  }`}
                >
                  {completionStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : completionStatus === 'review' ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {completionStatus === 'success' ? 'Validé' : completionStatus === 'review' ? 'Échoué' : 'Terminer'}
                  </span>
                </Button>

                {showCompletionDropdown && (
                  <>
                    <div
                      className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]"
                      style={{ top: completionPos.top, left: completionPos.left }}
                    >
                      <button
                        onClick={() => {
                          onSetCompletion(completionStatus === 'success' ? null : 'success');
                          setShowCompletionDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                          completionStatus === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'text-slate-600 hover:bg-slate-50 text-emerald-600'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Validé</span>
                      </button>
                      <button
                        onClick={() => {
                          onSetCompletion(completionStatus === 'review' ? null : 'review');
                          setShowCompletionDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                          completionStatus === 'review'
                            ? 'bg-red-100 text-red-700'
                            : 'text-slate-600 hover:bg-slate-50 text-red-600'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Échoué</span>
                      </button>
                    </div>
                    {/* Click-outside backdrop — AFTER dropdown per CLAUDE.md */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowCompletionDropdown(false)} />
                  </>
                )}
              </div>
            )}

            <Button
              onClick={onToggleSave}
              variant="ghost"
              size="sm"
              className={`rounded-xl gap-2 ${colors.textMuted} hover:text-white ${colors.hoverBg} ${
                isSaved ? colors.activeBg : ''
              }`}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
              )}
              <span className="hidden sm:inline">{isSaved ? 'Enregistré' : 'Enregistrer'}</span>
            </Button>

            {contentType === 'lesson' ? (
              <Button
                onClick={() => setShowNotebookModal(true)}
                variant="ghost"
                size="sm"
                className={`rounded-xl gap-2 ${colors.textMuted} hover:text-white ${colors.hoverBg}`}
              >
                <BookMarked className="w-4 h-4" />
                <span className="hidden sm:inline">Cahier</span>
              </Button>
            ) : (
              <Button
                onClick={() => setShowRevisionListModal(true)}
                variant="ghost"
                size="sm"
                className={`rounded-xl gap-2 ${colors.textMuted} hover:text-white ${colors.hoverBg}`}
              >
                <ListPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Liste</span>
              </Button>
            )}

            <div className="relative">
              <Button
                onClick={() => setShowDropdown(!showDropdown)}
                variant="ghost"
                size="sm"
                className={`rounded-xl ${colors.textMuted} hover:text-white ${colors.hoverBg} px-2`}
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>

              {showDropdown && (
                <>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl z-50 py-2 border border-slate-200 overflow-hidden">
                    <button
                      onClick={() => { handleShare(); setShowDropdown(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors text-sm"
                    >
                      <Share2 className="w-4 h-4 text-slate-400" />
                      Partager
                    </button>
                    {onPrint && (
                      <button
                        onClick={() => { onPrint(); setShowDropdown(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors text-sm"
                      >
                        <Printer className="w-4 h-4 text-slate-400" />
                        Imprimer
                      </button>
                    )}
                    {isAuthor && (
                      <>
                        <div className="border-t border-slate-100 my-1" />
                        <button
                          onClick={() => { navigate(`${basePath}/${content.id}/edit`); setShowDropdown(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors text-sm"
                        >
                          <Pencil className="w-4 h-4 text-slate-400" />
                          Modifier
                        </button>
                        <button
                          onClick={() => { setShowDropdown(false); onDelete?.(); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 -mb-4 overflow-x-auto scrollbar-hide">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as any)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all whitespace-nowrap
                  ${isActive ? colors.tabActive : colors.tabInactive}
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-md ${isActive ? colors.badge : colors.badgeInactive}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {contentType !== 'lesson' && (
        <AddToRevisionListModal
          isOpen={showRevisionListModal}
          onClose={() => setShowRevisionListModal(false)}
          contentType={contentType}
          contentId={Number(content.id)}
          contentTitle={content.title}
        />
      )}

      {contentType === 'lesson' && (
        <AddToNotebookModal
          isOpen={showNotebookModal}
          onClose={() => setShowNotebookModal(false)}
          lessonId={String(content.id)}
          lessonTitle={content.title}
          lessonChapters={content.chapters?.map(ch => ({ id: String(ch.id), name: ch.name })) ?? []}
        />
      )}
    </div>
  );
};
