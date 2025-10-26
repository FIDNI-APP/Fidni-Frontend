// src/components/navbar/NavbarDropdown.tsx - Version complète avec support des examens
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Layers, BookOpen, GraduationCap, Award } from 'lucide-react';
import { getClassLevels, getSubjects } from '@/lib/api';
import { useFilters } from './FilterContext';

interface NavDropdownProps {
  type: 'exercises' | 'lessons' | 'exams';
  onClose: () => void;
}

export const NavDropdown: React.FC<NavDropdownProps> = ({ type, onClose }) => {
  const [classLevels, setClassLevels] = useState<any[]>([]);
  const [subjectsByClassLevel, setSubjectsByClassLevel] = useState<Record<string, any[]>>({});
  const [loadingClassLevels, setLoadingClassLevels] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState<Record<string, boolean>>({});
  const [expandedClassLevel, setExpandedClassLevel] = useState<string | null>(null);
  const { setSelectedClassLevel, setSelectedSubject } = useFilters();
  
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load class levels on component mount
  useEffect(() => {
    const fetchClassLevels = async () => {
      try {
        setLoadingClassLevels(true);
        const data = await getClassLevels();
        setClassLevels(data);
      } catch (error) {
        console.error('Failed to load class levels:', error);
      } finally {
        setLoadingClassLevels(false);
      }
    };

    fetchClassLevels();
  }, []);

  // Fetch subjects when a class level is expanded
  useEffect(() => {
    if (!expandedClassLevel) return;

    const fetchSubjects = async () => {
      if (subjectsByClassLevel[expandedClassLevel]) return;

      try {
        setLoadingSubjects(prev => ({ ...prev, [expandedClassLevel]: true }));
        const data = await getSubjects([expandedClassLevel]);
        setSubjectsByClassLevel(prev => ({
          ...prev,
          [expandedClassLevel]: data
        }));
      } catch (error) {
        console.error('Failed to load subjects:', error);
      } finally {
        setLoadingSubjects(prev => ({ ...prev, [expandedClassLevel]: false }));
      }
    };

    fetchSubjects();
  }, [expandedClassLevel, subjectsByClassLevel]);

  // Handle click outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleClassLevelClick = (classLevelId: string) => {
    setExpandedClassLevel(expandedClassLevel === classLevelId ? null : classLevelId);
  };

  const handleSubjectClick = (classLevelId: string, subjectId: string) => {
    // Set filters in context BEFORE navigation
    setSelectedClassLevel(classLevelId);
    setSelectedSubject(subjectId);
    
    // Small delay to ensure state is updated before navigation
    setTimeout(() => {
      navigate(`/${type}?classLevels=${classLevelId}&subjects=${subjectId}`);
      onClose();
    }, 0);
  };
  
  const handleViewAll = (classLevelId: string) => {
    // Set filter in context before navigation
    setSelectedClassLevel(classLevelId);
    setSelectedSubject(null); // Clear subject filter
    
    setTimeout(() => {
      navigate(`/${type}?classLevels=${classLevelId}`);
      onClose();
    }, 0);
  };

  // Get icon based on type
  const getTypeIcon = () => {
    switch (type) {
      case 'exercises':
        return <BookOpen className="h-4 w-4 mr-2 text-gray-400" />;
      case 'lessons':
        return <GraduationCap className="h-4 w-4 mr-2 text-gray-400" />;
      case 'exams':
        return <Award className="h-4 w-4 mr-2 text-gray-400" />;
      default:
        return null;
    }
  };

  // Get special options for exams
  const renderExamSpecialOptions = () => {
    if (type !== 'exams') return null;

    return (
      <>
        <div className="px-4 py-2 border-b border-gray-700/50">
          <button
            onClick={() => {
              navigate('/exams?isNational=true');
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-white/10 transition-colors flex items-center text-gray-200"
          >
            <Award className="h-4 w-4 mr-2 text-purple-400" />
            Examens Nationaux
          </button>
        </div>
        <div className="px-2 py-1">
          <div className="text-xs text-gray-400 uppercase tracking-wide px-4 py-1">
            Par niveau
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-1 w-64 bg-gray-800/95 backdrop-blur-lg rounded-lg shadow-xl border border-gray-700/50 overflow-hidden z-50"
    >
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {/* Special exam option */}
        {type === 'exams' && (
          <>
            <div className="px-2 pt-2 pb-1">
              <button
                onClick={() => {
                  navigate('/exams?isNational=true');
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
              >
                <Award className="h-3.5 w-3.5 text-purple-400" />
                <span className="font-medium">Examens Nationaux</span>
              </button>
            </div>
            <div className="h-px bg-gray-700/50 mx-2 my-1"></div>
          </>
        )}

        {loadingClassLevels ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-600 border-t-gray-400"></div>
          </div>
        ) : (
          <div className="py-1">
            {classLevels.map((classLevel) => (
              <div key={classLevel.id}>
                <button
                  onClick={() => handleClassLevelClick(classLevel.id)}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                >
                  <span className="font-medium">{classLevel.name}</span>
                  <ChevronRight className={`h-3.5 w-3.5 text-gray-500 transition-transform ${
                    expandedClassLevel === classLevel.id ? 'rotate-90' : ''
                  }`} />
                </button>

                {expandedClassLevel === classLevel.id && (
                  <div className="bg-gray-900/50 py-1">
                    {loadingSubjects[classLevel.id] ? (
                      <div className="flex justify-center py-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-gray-400"></div>
                      </div>
                    ) : subjectsByClassLevel[classLevel.id]?.length > 0 ? (
                      <>
                        {subjectsByClassLevel[classLevel.id].map((subject) => (
                          <button
                            key={subject.id}
                            onClick={() => handleSubjectClick(classLevel.id, subject.id)}
                            className="w-full text-left px-6 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700/30 transition-colors"
                          >
                            {subject.name}
                          </button>
                        ))}
                        <button
                          onClick={() => handleViewAll(classLevel.id)}
                          className="w-full text-left px-6 py-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
                        >
                          Voir tout →
                        </button>
                      </>
                    ) : (
                      <p className="px-6 py-2 text-xs text-gray-500 italic">
                        Aucune matière
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
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
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(107, 114, 128, 0.3) transparent;
        }
      `}</style>
    </div>
  );
};