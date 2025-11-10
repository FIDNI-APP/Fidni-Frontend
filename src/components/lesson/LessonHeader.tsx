import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Bookmark, MoreHorizontal, BookOpen, Printer, ChevronRight, Home, MessageSquare, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lesson } from '@/types';
import { TabNavigation } from '@/components/shared/TabNavigation';
import AddToNotebookButton from '@/components/lesson/AddToNotebookButton';

interface LessonHeaderProps {
  lesson: Lesson;
  lessonId: string;
  savedForLater: boolean;
  loadingStates: {
    save: boolean;
    progress: boolean;
  };
  toggleSavedForLater: () => Promise<void>;
  formatTimeAgo: (dateString: string) => string;
  isAuthor: boolean;
  onPrint?: () => void;
  activeTab: 'lesson' | 'discussions' | 'activity';
  onTabChange: (tab: 'lesson' | 'discussions' | 'activity') => void;
}

export const LessonHeader: React.FC<LessonHeaderProps> = ({
  lesson,
  lessonId,
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
  const buildFilterUrl = (filters: { level?: string; subject?: string; subfield?: string; chapter?: string; theorem?: string }) => {
    const params = new URLSearchParams();
    if (filters.level) params.set('classLevels', filters.level);
    if (filters.subject) params.set('subjects', filters.subject);
    if (filters.subfield) params.set('subfields', filters.subfield);
    if (filters.chapter) params.set('chapters', filters.chapter);
    if (filters.theorem) params.set('theorems', filters.theorem);
    return `/lessons?${params.toString()}`;
  };
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: lesson?.title || 'Lesson',
        text: `Check out this interesting lesson: ${lesson?.title}`,
        url: window.location.href
      }).catch(err => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying link:', err));
    }
  };

  return (
    <div className="liquid-glass liquid-effect bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-xl overflow-hidden shadow-lg mb-6 relative">
      {/* Background Pattern */}
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
              onClick={() => navigate("/lessons")}
              className="hover:text-white transition-colors"
            >
              Leçons
            </button>
            {lesson.class_levels && lesson.class_levels.length > 0 && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                onClick={() => navigate(buildFilterUrl({ level: lesson.class_levels[0].id.toString() }))}
                className="text-white/60 hover:text-white transition-colors"
                >
                {lesson.class_levels[0].name}
                </button>
              </>
            )}
            
            {lesson.subject && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => navigate(buildFilterUrl({ subject: lesson.subject?.id.toString() }))}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {lesson.subject.name}
                </button>
              </>
            )}
            {lesson.subfields && lesson.subfields.length > 0 && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => navigate(buildFilterUrl({ 
                    level: lesson.class_levels[0].id.toString(),
                    subject: lesson.subject?.id.toString(),
                    subfield: lesson.subfields[0].id.toString() }))}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {lesson.subfields[0].name}
                </button>
              </>
            )}
            {lesson.chapters && lesson.chapters.length > 0 && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => navigate(buildFilterUrl({ 
                    level: lesson.class_levels[0].id.toString(),
                    subject: lesson.subject?.id.toString(),
                    subfield: lesson.subfields[0].id.toString() ,
                    chapter: lesson.chapters[0].id.toString() }))}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {lesson.chapters[0].name}
                </button>
              </>
            )}
            {lesson.theorems && lesson.theorems.length > 0 && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => navigate(buildFilterUrl({ 
                    level: lesson.class_levels[0].id.toString(),
                    subject: lesson.subject?.id.toString(),
                    subfield: lesson.subfields[0].id.toString() ,
                    chapter: lesson.chapters[0].id.toString() ,
                    theorem: lesson.theorems[0].id.toString() }))}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {lesson.theorems[0].name}
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Navigation row */}
        <div className="flex justify-between items-center mb-6">
          <Button
            onClick={() => navigate(`/lessons`)}
            variant="ghost"
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
          >
            Retour
          </Button>

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

            {/* Add to Notebook Button */}
            {lessonId && (
              <AddToNotebookButton
                lessonId={lessonId}
              />
            )}

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

        {/* Tab Navigation */}
        <div>
          <TabNavigation
            tabs={[
              { id: 'lesson', label: 'Leçon', icon: <BookOpen className="w-4 h-4" /> },
              { id: 'discussions', label: 'Discussions', icon: <MessageSquare className="w-4 h-4" />, count: lesson.comments?.length || 0 },
              { id: 'activity', label: 'Activité', icon: <Activity className="w-4 h-4" /> }
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => onTabChange(tabId as 'lesson' | 'discussions' | 'activity')}
          />
        </div>
      </div>
    </div>
  );
};
