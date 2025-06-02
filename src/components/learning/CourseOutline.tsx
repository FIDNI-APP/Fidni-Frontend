// src/components/learning/CourseOutline.tsx
import React, { useState } from 'react';
import { 
  ChevronRight, Play, CheckCircle, Clock, FileText, 
  Award, Lock,Brain, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [hoveredChapter, setHoveredChapter] = useState<string | null>(null);

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
      return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    }
    switch (video.type) {
      case 'lesson':
        return <Play className="w-5 h-5 text-blue-400" />;
      case 'lab':
        return <FileText className="w-5 h-5 text-purple-400" />;
      case 'exam':
        return <Award className="w-5 h-5 text-yellow-400" />;
      default:
        return <Play className="w-5 h-5 text-slate-400" />;
    }
  };

  const getVideoTypeGradient = (type: string) => {
    switch (type) {
      case 'lesson': return 'from-blue-500 to-cyan-500';
      case 'lab': return 'from-purple-500 to-pink-500';
      case 'exam': return 'from-yellow-500 to-orange-500';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  const getChapterProgress = (chapter: Chapter) => {
    const completed = chapter.videos.filter(v => v.completed).length;
    return Math.round((completed / chapter.videos.length) * 100);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-8 py-6 border-b border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 animate-pulse"></div>
        <div className="relative flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-blue-400" />
              Plan du cours
            </h2>
            <p className="text-slate-300">
              {subject.chapters.length} chapitres • {subject.totalDuration} de contenu
            </p>
          </div>
          <div className="flex gap-3">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setExpandedChapters(new Set(subject.chapters.map(c => c.id)))}
              className="px-6 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl border border-blue-500/30 transition-all font-medium"
            >
              Tout développer
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setExpandedChapters(new Set())}
              className="px-6 py-2 bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 rounded-xl border border-slate-600/30 transition-all font-medium"
            >
              Tout réduire
            </motion.button>
          </div>
        </div>
      </div>

      {/* Chapters with enhanced design */}
      <div className="divide-y divide-slate-700/30">
        {subject.chapters.map((chapter, index) => (
          <motion.div 
            key={chapter.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group"
            onMouseEnter={() => setHoveredChapter(chapter.id)}
            onMouseLeave={() => setHoveredChapter(null)}
          >
            {/* Chapter Header */}
            <div
              onClick={() => toggleChapter(chapter.id)}
              className={`flex items-center justify-between p-6 cursor-pointer transition-all duration-300 ${
                expandedChapters.has(chapter.id) ? 'bg-slate-800/30' : 'hover:bg-slate-800/20'
              }`}
            >
              <div className="flex items-center space-x-4 flex-1">
                <motion.div 
                  animate={{ rotate: expandedChapters.has(chapter.id) ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0"
                >
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </motion.div>
                
                {/* Chapter Icon/Badge */}
                <div className="relative">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ${
                      chapter.completed 
                        ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                        : chapter.locked
                        ? 'bg-slate-700 text-slate-500'
                        : hoveredChapter === chapter.id
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                        : 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {chapter.completed ? <CheckCircle className="w-7 h-7" /> :
                     chapter.locked ? <Lock className="w-6 h-6" /> :
                     chapter.number}
                  </motion.div>
                  
                  {/* Progress Ring */}
                  {!chapter.completed && !chapter.locked && getChapterProgress(chapter) > 0 && (
                    <svg className="absolute inset-0 w-14 h-14 transform -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r="26"
                        stroke="rgba(59, 130, 246, 0.2)"
                        strokeWidth="2"
                        fill="none"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r="26"
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - getChapterProgress(chapter) / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      CHAPITRE {chapter.number}
                    </span>
                    {chapter.completed && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Complété
                      </motion.div>
                    )}
                    {chapter.locked && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-slate-700/50 text-slate-500 rounded-full text-xs font-semibold">
                        <Lock className="w-3 h-3" />
                        Verrouillé
                      </div>
                    )}
                    {!chapter.completed && !chapter.locked && getChapterProgress(chapter) > 0 && (
                      <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                        {getChapterProgress(chapter)}%
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-lg group-hover:text-blue-300 transition-colors">
                    {chapter.title}
                  </h3>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">{chapter.duration}</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {chapter.videos.filter(v => v.completed).length}/{chapter.videos.length} terminées
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Play className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Chapter Content */}
            <AnimatePresence>
              {expandedChapters.has(chapter.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="bg-slate-900/30 px-6 pb-6">
                    <div className="pl-16 space-y-2 pt-2">
                      {chapter.videos.map((video, videoIndex) => (
                        <motion.div
                          key={video.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: videoIndex * 0.05 }}
                          onClick={() => !chapter.locked && onVideoSelect(video)}
                          whileHover={{ x: 5 }}
                          className={`group/video flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
                            chapter.locked 
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-slate-800/50 cursor-pointer border border-transparent hover:border-slate-700/50'
                          }`}
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="relative">
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getVideoTypeGradient(video.type)} p-0.5`}>
                                <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                                  {getVideoIcon(video)}
                                </div>
                              </div>
                              {video.completed && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="font-semibold text-white group-hover/video:text-blue-300 transition-colors">
                                {video.title}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className={`font-medium ${
                                  video.type === 'lesson' ? 'text-blue-400' :
                                  video.type === 'lab' ? 'text-purple-400' :
                                  'text-yellow-400'
                                }`}>
                                  {video.type === 'lesson' ? 'Cours' :
                                   video.type === 'lab' ? 'Pratique' :
                                   'Examen'}
                                </span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{video.duration}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {video.completed && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
                              <CheckCircle className="w-3 h-3" />
                              Terminé
                            </div>
                          )}
                          
                          {!video.completed && !chapter.locked && (
                            <div className="opacity-0 group-hover/video:opacity-100 transition-opacity">
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};