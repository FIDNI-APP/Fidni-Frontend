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
        return <BookOpen className="h-4 w-4 mr-2 text-indigo-300" />;
      case 'lessons':
        return <GraduationCap className="h-4 w-4 mr-2 text-indigo-300" />;
      case 'exams':
        return <Award className="h-4 w-4 mr-2 text-indigo-300" />;
      default:
        return null;
    }
  };

  // Get special options for exams
  const renderExamSpecialOptions = () => {
    if (type !== 'exams') return null;

    return (
      <>
        <div className="px-4 py-2 border-b border-indigo-700/30">
          <button
            onClick={() => {
              navigate('/exams?isNational=true');
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-white/10 transition-colors flex items-center text-gray-200"
          >
            <Award className="h-4 w-4 mr-2 text-yellow-400" />
            Examens Nationaux
          </button>
        </div>
        <div className="px-2 py-1">
          <div className="text-xs text-indigo-300 uppercase tracking-wide px-4 py-1">
            Par niveau
          </div>
        </div>
      </>
    );
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full left-0 mt-2 w-72 bg-indigo-900/95 backdrop-blur-md rounded-xl shadow-xl border border-indigo-700/30 overflow-hidden z-50"
    >
      {/* Subtle decorative element */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl"></div>
      </div>

      <div className="relative max-h-[450px] overflow-y-auto hide-scrollbar">
        {/* Special options for exams */}
        {renderExamSpecialOptions()}
        
        {loadingClassLevels ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-300">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="py-1">
            {classLevels.map((classLevel) => (
              <div key={classLevel.id} className="transition-colors">
                <button
                  onClick={() => handleClassLevelClick(classLevel.id)}
                  className={`flex items-center justify-between w-full px-4 py-2.5 text-base hover:bg-white/5 transition-colors ${
                    expandedClassLevel === classLevel.id ? 'bg-white/10' : ''
                  }`}
                >
                  <div className="flex items-center text-sm">
                    <GraduationCap className="h-4 w-4 mr-2 text-indigo-300" />
                    <span className="font-medium text-gray-200">
                      {classLevel.name}
                    </span>
                  </div>
                  <span className="ml-2">
                    {expandedClassLevel === classLevel.id ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </span>
                </button>
                
                {expandedClassLevel === classLevel.id && (
                  <div className="bg-indigo-800/30 pl-5 pr-2 py-1.5 mx-2 rounded-md mb-1">
                    {loadingSubjects[classLevel.id] ? (
                      <div className="flex items-center justify-center py-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-300"></div>
                      </div>
                    ) : subjectsByClassLevel[classLevel.id]?.length > 0 ? (
                      <>
                        <div className="space-y-1 py-1">
                          {subjectsByClassLevel[classLevel.id].map((subject) => (
                            <button
                              key={subject.id}
                              onClick={() => handleSubjectClick(classLevel.id, subject.id)}
                              className="w-full text-left px-3 py-1.5 rounded-md text-sm hover:bg-white/10 transition-colors flex items-center"
                            >
                              <BookOpen className="h-3.5 w-3.5 mr-2 text-indigo-300" />
                              <span className="text-gray-300">{subject.name}</span>
                            </button>
                          ))}
                        </div>
                        <div className="mt-1 pt-1 border-t border-white/10">
                          <button
                            onClick={() => handleViewAll(classLevel.id)}
                            className="w-full text-left px-3 py-1.5 rounded-md text-xs font-medium hover:bg-white/5  transition-colors text-indigo-300"
                          >
                            Voir tous les {type === 'exercises' ? 'exercices' : type === 'lessons' ? 'cours' : 'examens'} →
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="px-3 py-2 text-xs italic text-gray-400">
                        Aucune matière disponible
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* View all option at the bottom */}
        {type === 'exams' && (
          <div className="border-t border-indigo-700/30 px-4 py-3">
            <button
              onClick={() => {
                navigate('/exams');
                onClose();
              }}
              className="w-full text-center px-3 py-2 rounded-md text-sm font-medium bg-indigo-800/50 hover:bg-indigo-800/70 transition-colors text-gray-200"
            >
              Voir tous les examens
            </button>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};