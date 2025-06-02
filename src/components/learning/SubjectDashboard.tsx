// src/components/learning/SubjectDashboard.tsx
import React from 'react';
import { 
  Play, Clock, CheckCircle, Award,Trophy , TrendingUp, 
  Zap, Star, Brain, Flame, BookOpen, ArrowUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Subject, Video } from '@/types/learningPath';

interface SubjectDashboardProps {
  subject: Subject;
  onVideoSelect: (video: Video) => void;
}

export const SubjectDashboard: React.FC<SubjectDashboardProps> = ({ 
  subject, 
  onVideoSelect 
}) => {
  return (
    <div className="space-y-6">
      {/* Main Progress Card - Redesigned */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Progression
          </h3>
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
            Niveau 8
          </span>
        </div>
        
        {/* Circular Progress with Animation */}
        <div className="relative flex items-center justify-center mb-6">
          <svg className="w-40 h-40 transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
              fill="none"
            />
            <motion.circle
              cx="80"
              cy="80"
              r="70"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 70}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - subject.progress / 100) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-white">{subject.progress}%</span>
            <span className="text-sm text-slate-400">Complété</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/10 backdrop-blur-sm rounded-2xl p-4 border border-emerald-500/20">
            <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
            <div className="text-2xl font-bold text-white">
              {subject.chapters.filter(c => c.completed).length}
            </div>
            <div className="text-xs text-emerald-300">Terminés</div>
          </div>
          <div className="bg-blue-500/10 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
            <BookOpen className="w-5 h-5 text-blue-400 mb-2" />
            <div className="text-2xl font-bold text-white">
              {subject.chapters.length}
            </div>
            <div className="text-xs text-blue-300">Total</div>
          </div>
        </div>
      </motion.div>

      {/* Streak Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl rounded-3xl border border-orange-500/30 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Série en cours
          </h3>
          <span className="text-3xl font-bold text-orange-400">12</span>
        </div>
        <div className="flex gap-1">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-8 rounded-lg ${
                i < 5 ? 'bg-orange-500' : 'bg-slate-700/50'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Continuez pour maintenir votre série !
        </p>
      </motion.div>

      {/* Next Up Card - Enhanced */}
      {subject.nextUp && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400 animate-pulse" />
              À suivre
            </h3>
            <ArrowUp className="w-5 h-5 text-purple-400 animate-bounce" />
          </div>
          
          <div className="space-y-3">
            {subject.nextUp.videos.slice(0, 3).map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                onClick={() => onVideoSelect(video)}
                whileHover={{ x: 5 }}
                className="group flex items-center p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-purple-500/50 cursor-pointer transition-all"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                    {video.title}
                  </div>
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {video.duration}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Recommendations */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl rounded-3xl border border-blue-500/30 p-6"
      >
        <div className="flex items-center mb-4">
          <Brain className="w-5 h-5 text-blue-400 mr-2" />
          <h3 className="text-lg font-bold text-white">Recommandations IA</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
            <span className="text-sm text-slate-300">Vitesse d'apprentissage</span>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
              ))}
            </div>
          </div>
          
          <div className="p-3 bg-slate-800/50 rounded-xl">
            <p className="text-sm text-slate-300">
              <span className="text-blue-400 font-medium">Conseil :</span> Concentrez-vous sur les exercices pratiques du chapitre 3
            </p>
          </div>
        </div>
      </motion.div>

      {/* Achievement Preview */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 backdrop-blur-xl rounded-3xl border border-yellow-500/30 p-6"
      >
        <div className="flex items-center mb-4">
          <Award className="w-5 h-5 text-yellow-400 mr-2" />
          <h3 className="text-lg font-bold text-white">Prochain badge</h3>
        </div>
        
        <div className="flex items-center gap-4">
         <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
           <Trophy className="w-8 h-8 text-white" />
         </div>
         <div className="flex-1">
           <div className="font-semibold text-white">Expert Mathématiques</div>
           <div className="text-sm text-slate-400">Plus que 2 chapitres</div>
           <div className="mt-2 h-2 bg-slate-700/50 rounded-full overflow-hidden">
             <div className="h-full w-3/4 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>
           </div>
         </div>
       </div>
     </motion.div>
   </div>
 );
};