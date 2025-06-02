// src/pages/LearningPath.tsx
import React, { useState } from 'react';
import { 
  ArrowLeft, Play, Clock, Users, Award, BookOpen, TrendingUp, 
  Star, Zap, Target, Flame, Trophy, Lock, CheckCircle2,
  BarChart3, Calendar, ChevronRight, Sparkles, Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SubjectDashboard } from '@/components/learning/SubjectDashboard';
import { CourseOutline } from '@/components/learning/CourseOutline';
import { VideoPlayer } from '@/components/learning/VideoPlayer';
import { QuizInterface } from '@/components/learning/QuizInterface';
import { mockSubjects } from '@/data/learningData';
import type { Subject, Video, Quiz } from '@/types/learningPath';

const LearningPath: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);

  // Vue principale - liste des matières
  if (!selectedSubject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        {/* Hero Section Enhanced */}
        <div className="relative">
          <div className="max-w-7xl mx-auto px-6 py-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              {/* Animated Badge */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-full border border-white/20 mb-8"
              >
                <Sparkles className="w-5 h-5 text-yellow-400 mr-2 animate-pulse" />
                <span className="text-white font-medium">Nouveau parcours adaptatif disponible</span>
              </motion.div>
              
              <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
                Apprenez à votre
                <span className="block mt-2">
                  <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-x">
                    rythme
                  </span>
                </span>
              </h1>
              
              <p className="text-xl text-slate-200 max-w-3xl mx-auto mb-12 leading-relaxed">
                Des parcours personnalisés qui s'adaptent à votre niveau et vos objectifs. 
                Progressez avec confiance grâce à notre approche pédagogique innovante.
              </p>

              {/* User Stats Bar */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center gap-6 mb-16"
              >
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="text-white font-medium">12 jours de suite</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-medium">Niveau 8</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-white font-medium">85% d'objectifs atteints</span>
                </div>
              </motion.div>

              {/* Interactive Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {[
                  { icon: Brain, value: "AI", label: "Apprentissage adaptatif", color: "from-purple-400 to-pink-400" },
                  { icon: Clock, value: "24/7", label: "Disponible", color: "from-blue-400 to-cyan-400" },
                  { icon: Users, value: "50k+", label: "Étudiants actifs", color: "from-green-400 to-emerald-400" },
                  { icon: Star, value: "4.9", label: "Note moyenne", color: "from-yellow-400 to-orange-400" }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                    <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all">
                      <stat.icon className={`w-8 h-8 mx-auto mb-3 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} />
                      <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-sm text-slate-300">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Courses Section - Completely Redesigned */}
        <div className="relative bg-gradient-to-b from-transparent to-slate-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-20">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-white mb-4">
                Choisissez votre aventure d'apprentissage
              </h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                Chaque parcours est conçu pour vous faire progresser étape par étape
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {mockSubjects.map((subject, index) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  whileHover={{ y: -10 }}
                  onClick={() => setSelectedSubject(subject)}
                  className="group relative cursor-pointer"
                >
                  {/* Card Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
                  
                  {/* Main Card */}
                  <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-3xl overflow-hidden border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300">
                    {/* Progress Ring */}
                    <div className="absolute top-6 right-6">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="4"
                          fill="none"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="url(#gradient)"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - subject.progress / 100)}`}
                          className="transition-all duration-1000 ease-out"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                        {subject.progress}%
                      </div>
                    </div>

                    <div className="p-8">
                      {/* Icon with Animation */}
                      <motion.div 
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl"
                      >
                        <BookOpen className="w-10 h-10 text-white" />
                      </motion.div>

                      <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all">
                        {subject.title}
                      </h3>
                      
                      <p className="text-slate-400 mb-6 line-clamp-2">
                        {subject.description}
                      </p>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                          {subject.chapters.length} chapitres
                        </span>
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                          {subject.totalDuration}
                        </span>
                        {subject.progress > 0 && (
                          <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium">
                            En cours
                          </span>
                        )}
                      </div>
                      
                      {/* Action Button */}
                      <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium group-hover:shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300 flex items-center justify-center gap-2">
                        {subject.progress > 0 ? 'Continuer' : 'Commencer'}
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vue quiz
  if (currentQuiz) {
    return (
      <QuizInterface 
        quiz={currentQuiz}
        onClose={() => setCurrentQuiz(null)}
      />
    );
  }

  // Vue lecteur vidéo
  if (currentVideo) {
    return (
      <VideoPlayer
        video={currentVideo}
        subject={selectedSubject}
        onClose={() => setCurrentVideo(null)}
        onQuizStart={(quiz) => setCurrentQuiz(quiz)}
      />
    );
  }

  // Vue cours principal - Enhanced
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900/50 to-purple-900/50">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-5"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button
              onClick={() => setSelectedSubject(null)}
              className="hover:text-white transition-colors"
            >
              Parcours
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">{selectedSubject.title}</span>
          </nav>
          
          {/* Course Header Card */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 shadow-2xl">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">{selectedSubject.title}</h1>
                    <p className="text-slate-400">{selectedSubject.description}</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Progression globale</span>
                    <span className="text-white font-medium">{selectedSubject.progress}%</span>
                  </div>
                  <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedSubject.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full relative"
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Enhanced Dashboard */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <SubjectDashboard 
              subject={selectedSubject}
              onVideoSelect={setCurrentVideo}
            />
          </motion.div>
          
          {/* Enhanced Course Outline */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3"
          >
            <CourseOutline 
              subject={selectedSubject}
              onVideoSelect={setCurrentVideo}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LearningPath;