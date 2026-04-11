// src/components/navbar/NavbarDropdown.tsx - Mega menu with hover for fewer clicks
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, BookOpen, Loader2 } from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { getClassLevels, getSubjects } from '@/lib/api';
import { useFilters } from './FilterContext';

interface NavDropdownProps {
  type: 'exercises' | 'lessons' | 'exams';
  onClose: () => void;
}

interface ClassLevel {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

export const NavDropdown: React.FC<NavDropdownProps> = ({ type, onClose }) => {
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [subjectsByClassLevel, setSubjectsByClassLevel] = useState<Record<string, Subject[]>>({});
  const [loadingClassLevels, setLoadingClassLevels] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState<Record<string, boolean>>({});
  const [hoveredClassLevel, setHoveredClassLevel] = useState<string | null>(null);
  const { setSelectedClassLevel, setSelectedSubject } = useFilters();

  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load all class levels on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingClassLevels(true);
        const data = await getClassLevels();
        setClassLevels(data);

        // Auto-select first class level
        if (data.length > 0) {
          setHoveredClassLevel(data[0].id);
          fetchSubjectsForLevel(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load class levels:', error);
      } finally {
        setLoadingClassLevels(false);
      }
    };

    fetchData();
  }, []);

  const fetchSubjectsForLevel = async (classLevelId: string) => {
    if (subjectsByClassLevel[classLevelId]) return;

    try {
      setLoadingSubjects(prev => ({ ...prev, [classLevelId]: true }));
      const data = await getSubjects([classLevelId]);
      setSubjectsByClassLevel(prev => ({
        ...prev,
        [classLevelId]: data
      }));
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setLoadingSubjects(prev => ({ ...prev, [classLevelId]: false }));
    }
  };

  // Prefetch subjects on hover
  const handleClassLevelHover = (classLevelId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredClassLevel(classLevelId);
      fetchSubjectsForLevel(classLevelId);
    }, 50);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [onClose]);

  const handleSubjectClick = (classLevelId: string, subjectId: string) => {
    setSelectedClassLevel(classLevelId);
    setSelectedSubject(subjectId);

    setTimeout(() => {
      navigate(`/${type}?classLevels=${classLevelId}&subjects=${subjectId}`);
      onClose();
    }, 0);
  };

  const handleViewAllForLevel = (classLevelId: string) => {
    setSelectedClassLevel(classLevelId);
    setSelectedSubject(null);

    setTimeout(() => {
      navigate(`/${type}?classLevels=${classLevelId}`);
      onClose();
    }, 0);
  };

  const handleViewAll = () => {
    setSelectedClassLevel(null);
    setSelectedSubject(null);
    navigate(`/${type}`);
    onClose();
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'exercises':
        return {
          icon: BookOpen,
          title: 'Tous les exercices'
        };
      case 'lessons':
        return {
          icon: LessonIcon,
          title: 'Toutes les leçons'
        };
      case 'exams':
        return {
          icon: APlusIcon,
          title: 'Tous les examens'
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;
  const currentSubjects = hoveredClassLevel ? subjectsByClassLevel[hoveredClassLevel] || [] : [];
  const isLoadingCurrentSubjects = hoveredClassLevel ? loadingSubjects[hoveredClassLevel] : false;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-1 bg-[#1f1f1f] rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden z-50"
      style={{ minWidth: '380px' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 bg-[#252525]">
        <button
          onClick={handleViewAll}
          className="flex items-center gap-2 text-gray-200 hover:text-white transition-colors group"
        >
          <Icon className="w-4 h-4 text-gray-400 group-hover:text-white" />
          <span className="font-medium text-sm">{config.title}</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Exams special option */}
      {type === 'exams' && (
        <div className="px-3 py-2 border-b border-gray-700/50">
          <button
            onClick={() => {
              navigate('/exams?isNational=true');
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
          >
            <APlusIcon className="w-4 h-4 text-indigo-400" />
            <span className="font-medium">Examens Nationaux</span>
          </button>
        </div>
      )}

      {loadingClassLevels ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="flex">
          {/* Class levels column */}
          <div className="w-36 border-r border-gray-700/50 py-2 bg-[#1a1a1a]">
            {classLevels.map((classLevel) => (
              <button
                key={classLevel.id}
                onMouseEnter={() => handleClassLevelHover(classLevel.id)}
                onClick={() => handleViewAllForLevel(classLevel.id)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-all flex items-center justify-between group ${
                  hoveredClassLevel === classLevel.id
                    ? 'bg-gray-700/50 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <span className="font-medium">{classLevel.name}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-all ${
                  hoveredClassLevel === classLevel.id
                    ? 'text-gray-300 translate-x-0.5'
                    : 'text-gray-600 group-hover:text-gray-400'
                }`} />
              </button>
            ))}
          </div>

          {/* Subjects column */}
          <div className="flex-1 py-2 min-h-[180px] max-h-[280px] overflow-y-auto custom-scrollbar">
            {isLoadingCurrentSubjects ? (
              <div className="flex items-center justify-center h-full py-8">
                <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
              </div>
            ) : currentSubjects.length > 0 ? (
              <div className="px-2">
                {currentSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => handleSubjectClick(hoveredClassLevel!, subject.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700/40 hover:text-white transition-all group flex items-center justify-between"
                  >
                    <span>{subject.name}</span>
                    <ChevronRight className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Aucune matière
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(107, 114, 128, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(107, 114, 128, 0.5);
        }
      `}</style>
    </div>
  );
};
