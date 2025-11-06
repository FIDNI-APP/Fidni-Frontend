import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Eye, Share2, Bookmark, MoreHorizontal, GraduationCap, BookOpen, Award, Printer, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Exam, Difficulty } from '@/types';

interface ExamHeaderProps {
  exam: Exam;
  savedForLater: boolean;
  loadingStates: {
    save: boolean;
    progress: boolean;
  };
  toggleSavedForLater: () => Promise<void>;
  formatTimeAgo: (dateString: string) => string;
  isAuthor: boolean;
  onPrint?: () => void;
}

export const ExamHeader: React.FC<ExamHeaderProps> = ({
  exam,
  savedForLater,
  loadingStates,
  toggleSavedForLater,
  formatTimeAgo,
  isAuthor,
  onPrint
}) => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDifficultyColor = (difficulty: Difficulty): string => {
    switch (difficulty) {
      case 'easy':
        return 'from-emerald-500 to-emerald-400 text-white';
      case 'medium':
        return 'from-amber-500 to-amber-400 text-white';
      case 'hard':
        return 'from-rose-500 to-rose-400 text-white';
      default:
        return 'from-gray-500 to-gray-400 text-white';
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: exam?.title || 'Exam',
        text: `Check out this exam: ${exam?.title}`,
        url: window.location.href
      }).catch(err => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying link:', err));
    }
    setShowDropdown(false);
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    }
    setShowDropdown(false);
  };

  const handleEdit = () => {
    navigate(`/exams/${exam.id}/edit`);
    setShowDropdown(false);
  };

  const handleDelete = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet examen ?')) {
      // TODO: Implement delete functionality
      console.log('Delete exam:', exam.id);
    }
    setShowDropdown(false);
  };

  // Format date for display (used for national exam date)
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Date non spécifiée';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className={`bg-gradient-to-r ${exam.is_national_exam ? 'from-gray-800 to-green-900' : 'from-gray-800 to-green-900'} text-white rounded-xl shadow-lg mb-6 relative`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden rounded-xl">
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
        {/* Navigation row */}
        <div className="flex justify-between items-center mb-6">
          <Button 
            onClick={() => navigate("/exams")}
            variant="ghost"
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
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

            {/* More options dropdown */}
            <div className="relative" ref={dropdownRef}>
              <Button
                onClick={() => setShowDropdown(!showDropdown)}
                variant="ghost"
                className="rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>

              {/* Dropdown menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100]">
                  <button
                    onClick={handleShare}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Partager
                  </button>

                  {onPrint && (
                    <button
                      onClick={handlePrint}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimer
                    </button>
                  )}

                  {isAuthor && (
                    <>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={handleEdit}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Modifier
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Exam title and metadata */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold mb-3">{exam.title}</h1>
            
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1.5 text-indigo-300" />
                <span className="text-indigo-100">{exam.author.username}</span>
              </div>
              
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1.5 text-indigo-300" />
                <span className="text-indigo-100">{formatTimeAgo(exam.created_at)}</span>
              </div>
              
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-1.5 text-indigo-300" />
                <span className="text-indigo-100">{exam.view_count} vues</span>
              </div>
            </div>

            {/* National exam badge and date */}
            {exam.is_national_exam && (
              <div className="mt-4">
                <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg inline-flex items-center">
                  <Award className="w-4 h-4 mr-2 text-yellow-300" />
                  <div>
                    <span className="font-medium">Examen National 🇫🇷</span>
                    {exam.national_date && (
                      <span className="ml-2 text-white/90 text-sm">{formatDate(exam.national_date)}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Main Category Tags in header */}
          <div className="flex flex-wrap gap-2">
            {exam.subject && (
              <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
                <BookOpen className="w-4 h-4 mr-1.5 text-indigo-300" />
                {exam.subject.name}
              </span>
            )}
            
            {exam.class_levels && exam.class_levels.length > 0 && (
              <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
                <GraduationCap className="w-4 h-4 mr-1.5 text-indigo-300" />
                {exam.class_levels[0].name}
              </span>
            )}
            
            <span className={`bg-gradient-to-r ${getDifficultyColor(exam.difficulty)} px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5`}>
              <DifficultyIcon difficulty={exam.difficulty} />
              <span>{getDifficultyLabel(exam.difficulty)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components
export const DifficultyIcon = ({ difficulty }: { difficulty: Difficulty }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className="w-4 h-4"
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18"/>
      <path d={
        difficulty === 'easy' 
          ? "M18 17H9V8" 
          : difficulty === 'medium' 
            ? "M18 12H9v-4M9 16v-4" 
            : "M18 8H9v4M9 16v-4M18 12h-4"
      }/>
    </svg>
  );
};

export const getDifficultyLabel = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case 'easy':
      return 'Facile';
    case 'medium':
      return 'Moyen';
    case 'hard':
      return 'Difficile';
    default:
      return difficulty;
  }
};