import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Bookmark, MoreHorizontal, BookOpen, Printer, ListPlus, ChevronRight, Home, MessageSquare, GitPullRequest, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Content } from '@/types';
import { AddToRevisionListModal } from '@/components/revision/AddToRevisionListModal';
import { TabNavigation } from '@/components/shared/TabNavigation';

interface ExerciseHeaderProps {
  exercise: Content;
  savedForLater: boolean;
  loadingStates: {
    save: boolean;
    progress: boolean;
  };
  toggleSavedForLater: () => Promise<void>;
  formatTimeAgo: (dateString: string) => string;
  isAuthor: boolean;
  onPrint?: () => void;
  activeTab: 'exercise' | 'discussions' | 'proposals' | 'activity';
  onTabChange: (tab: 'exercise' | 'discussions' | 'proposals' | 'activity') => void;
}

export const ExerciseHeader: React.FC<ExerciseHeaderProps> = ({
  exercise,
  savedForLater,
  loadingStates,
  toggleSavedForLater,
  formatTimeAgo,
  isAuthor,
  onPrint,
  activeTab,
  onTabChange
}) => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRevisionListModal, setShowRevisionListModal] = useState(false);

  // Build filter params for navigation
  const buildFilterUrl = (filters: { level?: string; subject?: string; subfield?: string; chapter?: string; theorem?: string }) => {
    const params = new URLSearchParams();
    if (filters.level) params.set('classLevels', filters.level);
    if (filters.subject) params.set('subjects', filters.subject);
    if (filters.subfield) params.set('subfields', filters.subfield);
    if (filters.chapter) params.set('chapters', filters.chapter);
    if (filters.theorem) params.set('theorems', filters.theorem);
    return `/exercises?${params.toString()}`;
  };
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: exercise?.title || 'Exercise',
        text: `Check out this interesting exercise !: ${exercise?.title}`,
        url: window.location.href
      }).catch(err => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying link:', err));
    }
  };

  return (
    <div className="liquid-glass liquid-effect bg-gradient-to-r from-gray-700 to-purple-800 text-white rounded-xl overflow-hidden shadow-lg mb-6 relative">
      {/* Background Pattern - positioned relative to header */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#smallGrid)" />
        </svg>
      </div>

      <div className="px-6 pt-6 pb-4 relative">
        {/* Breadcrumb Navigation */}
        <div className="flex justify-between items-center mb-6">
          <nav className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-white/80">
            <button
              onClick={() => navigate("/")}
              className="hover:text-white transition-colors flex items-center"
            >
              <Home className="w-4 h-4" />
            </button>
            <ChevronRight className="w-4 h-4" />
            <button
              onClick={() => navigate("/exercises")}
              className="hover:text-white transition-colors"
            >
              Exercices
            </button>

            {/* Class Level */}
            {exercise.class_levels && exercise.class_levels.length > 0 && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => navigate(buildFilterUrl({ level: exercise.class_levels[0].id.toString() }))}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  {exercise.class_levels[0].name}
                </button>
              </>
            )}

            {/* Subject */}
            {exercise.subject && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => navigate(buildFilterUrl({
                    level: exercise.class_levels?.[0]?.id.toString(),
                    subject: exercise.subject.id.toString()
                  }))}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  {exercise.subject.name}
                </button>
              </>
            )}

            {/* Subfield */}
            {exercise.subfields && exercise.subfields.length > 0 && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => navigate(buildFilterUrl({
                    level: exercise.class_levels?.[0]?.id.toString(),
                    subject: exercise.subject?.id.toString(),
                    subfield: exercise.subfields[0].id.toString()
                  }))}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  {exercise.subfields[0].name}
                </button>
              </>
            )}

            {/* Chapter */}
            {exercise.chapters && exercise.chapters.length > 0 && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => navigate(buildFilterUrl({
                    level: exercise.class_levels?.[0]?.id.toString(),
                    subject: exercise.subject?.id.toString(),
                    subfield: exercise.subfields?.[0]?.id.toString(),
                    chapter: exercise.chapters[0].id.toString()
                  }))}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  {exercise.chapters[0].name}
                </button>
              </>
            )}

            {/* Theorems */}
            {exercise.theorems && exercise.theorems.length > 0 && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => navigate(buildFilterUrl({
                    level: exercise.class_levels?.[0]?.id.toString(),
                    subject: exercise.subject?.id.toString(),
                    subfield: exercise.subfields?.[0]?.id.toString(),
                    chapter: exercise.chapters?.[0]?.id.toString(),
                    theorem: exercise.theorems[0].id.toString()
                  }))}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  {exercise.theorems[0].name}
                </button>
              </>
            )}

            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium line-clamp-1">{exercise.title}</span>
          </nav>

          <div className="flex items-center gap-2">
            {/* Save button */}
            <Button
              onClick={toggleSavedForLater}
              variant="ghost"
              className={`rounded-lg text-white/80 hover:text-white hover:bg-white/10 ${savedForLater ? 'bg-white/20' : ''}`}
              disabled={loadingStates.save}
            >
              {loadingStates.save ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Bookmark className={`w-5 h-5 mr-1.5 ${savedForLater ? 'fill-white' : ''}`} />
              )}
              {savedForLater ? 'Enregistré' : 'Enregistrer'}
            </Button>

            {/* Add to Revision List button - Now visible directly */}
            <Button
              onClick={() => setShowRevisionListModal(true)}
              variant="ghost"
              className="rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            >
              <ListPlus className="w-5 h-5 mr-1.5" />
              <span className="hidden sm:inline">Ajouter à une révision</span>
              <span className="sm:hidden">Liste</span>
            </Button>

            {/* More options dropdown */}
            <div className="relative">
              <Button
                onClick={() => setShowDropdown(!showDropdown)}
                variant="ghost"
                className="rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 py-1">
                  {/* Share option */}
                  <button
                    onClick={() => {
                      handleShare();
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Partager</span>
                  </button>

                  {/* Print option */}
                  {onPrint && (
                    <button
                      onClick={() => {
                        onPrint();
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors border-t"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimer</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Tab Navigation - now in header where title was */}
        <div>
          <TabNavigation
            tabs={[
              { id: 'exercise', label: 'Exercice', icon: <BookOpen className="w-4 h-4" /> },
              {
                id: 'discussions',
                label: 'Discussions',
                icon: <MessageSquare className="w-4 h-4" />,
                count: exercise.comments?.length || 0
              },
              { id: 'proposals', label: 'Solutions alternatives', icon: <GitPullRequest className="w-4 h-4" /> },
              { id: 'activity', label: 'Activité', icon: <Activity className="w-4 h-4" /> }
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => onTabChange(tabId as 'exercise' | 'discussions' | 'proposals' | 'activity')}
          />
        </div>
      </div>

      {/* Add to Revision List Modal */}
      <AddToRevisionListModal
        isOpen={showRevisionListModal}
        onClose={() => setShowRevisionListModal(false)}
        contentType="exercise"
        contentId={exercise.id}
        contentTitle={exercise.title}
      />
    </div>
  );
};