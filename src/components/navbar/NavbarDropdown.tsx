// src/components/NavDropdown.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Layers, BookOpen, GraduationCap } from 'lucide-react';
import { getClassLevels, getSubjects } from '@/lib/api';
import { useFilters } from './FilterContext';

interface NavDropdownProps {
  type: 'exercises' | 'lessons';
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
    // Convert to numbers if that's what your IDs should be
    const classLevel = Number(classLevelId); // Convert to number
    const subject = Number(subjectId); // Convert to number
    
    // Navigate with the number IDs
    navigate(`/${type}?classLevels=${classLevel}&subjects=${subject}`);
    onClose();
  };
  
  const handleViewAll = (classLevelId: string) => {
    // Convert to number if that's what your IDs should be
    const classLevel = Number(classLevelId); // Convert to number
    
    // Navigate with the number ID
    navigate(`/${type}?classLevels=${classLevel}`);
    onClose();
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
                            View all subjects →
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="px-3 py-2 text-xs italic text-gray-400">
                        No subjects available
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