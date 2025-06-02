import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Play, CheckCircle, Clock, FileText, Award, Lock } from 'lucide-react';
import type { Subject, Video, Chapter } from '@/types/learningPath';

interface CourseOutlineProps {
  subject: Subject;
  onVideoSelect: (video: Video) => void;
}

export const CourseOutline: React.FC<CourseOutlineProps> = ({ 
  subject, 
  onVideoSelect 
}) => {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set(['1']));

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  const getVideoIcon = (video: Video) => {
    if (video.completed) {
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    }
    switch (video.type) {
      case 'lesson':
        return <Play className="w-5 h-5 text-blue-500" />;
      case 'lab':
        return <FileText className="w-5 h-5 text-indigo-500" />;
      case 'exam':
        return <Award className="w-5 h-5 text-purple-500" />;
      default:
        return <Play className="w-5 h-5 text-slate-400" />;
    }
  };

  const getVideoTypeLabel = (type: string) => {
    switch (type) {
      case 'lesson': return 'Cours';
      case 'lab': return 'Pratique';
      case 'exam': return 'Examen';
      default: return 'Contenu';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 px-8 py-6 border-b border-slate-200/60">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Plan du cours</h2>
            <p className="text-slate-600">
              {subject.chapters.length} chapitres • {subject.totalDuration} de contenu
            </p>
          </div>
          <button 
            onClick={() => setExpandedChapters(new Set(subject.chapters.map(c => c.id)))}
            className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all font-medium"
          >
            Tout développer
          </button>
        </div>
      </div>

      {/* Chapitres */}
      <div className="divide-y divide-slate-200/60">
        {subject.chapters.map((chapter, index) => (
          <div key={chapter.id} className="transition-all duration-200">
            {/* En-tête du chapitre */}
            <div
              onClick={() => toggleChapter(chapter.id)}
              className="flex items-center justify-between p-6 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50/30 cursor-pointer group transition-all duration-300"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className="flex items-center space-x-3">
                  <div className={`transition-transform duration-200 ${expandedChapters.has(chapter.id) ? 'rotate-90' : ''}`}>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                  </div>
                  
                  {/* Badge du chapitre */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    chapter.completed 
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : chapter.locked
                      ? 'bg-slate-200 text-slate-500'
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg group-hover:scale-105'
                  }`}>
                    {chapter.completed ? <CheckCircle className="w-6 h-6" /> :
                     chapter.locked ? <Lock className="w-5 h-5" /> :
                     chapter.number}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="text-sm font-bold text-orange-600 tracking-wide">
                      CHAPITRE {chapter.number}
                    </span>
                    {chapter.completed && (
                      <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                        Complété
                      </div>
                    )}
                    {chapter.locked && (
                      <div className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                        Verrouillé
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                    {chapter.title}
                  </h3>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-slate-900 mb-1">{chapter.duration}</div>
                <div className="text-sm text-slate-500">
                  {chapter.videos.filter(v => v.completed).length}/{chapter.videos.length} terminées
                </div>
              </div>
            </div>

            {/* Contenu du chapitre */}
            {expandedChapters.has(chapter.id) && (
              <div className="bg-gradient-to-r from-slate-50/50 to-blue-50/20 px-6 pb-6">
                <div className="pl-16 space-y-2">
                  {chapter.videos.map((video, videoIndex) => (
                    <div
                      key={video.id}
                      onClick={() => !chapter.locked && onVideoSelect(video)}
                      className={`group flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                        chapter.locked 
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-white hover:shadow-md cursor-pointer border border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          {getVideoIcon(video)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold text-slate-900 truncate transition-colors ${
                            !chapter.locked ? 'group-hover:text-blue-600' : ''
                          }`}>
                            {video.title}
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-slate-500">
                            <span className="capitalize font-medium">
                              {getVideoTypeLabel(video.type)}
                            </span>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{video.duration}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {video.completed && (
                        <div className="flex items-center px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Terminé
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};