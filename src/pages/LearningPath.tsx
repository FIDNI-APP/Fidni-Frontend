import React, { useState } from 'react';
import { ArrowLeft, Play, Clock, Users, Award, BookOpen, TrendingUp } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900">
          <div className="absolute inset-0 bg-black/20"></div>
          
          <div className="relative max-w-7xl mx-auto px-6 py-20">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-400/30 mb-8">
                <BookOpen className="w-4 h-4 text-blue-300 mr-2" />
                <span className="text-blue-100 text-sm font-medium">Parcours d'apprentissage personnalisé</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Maîtrisez vos
                <span className="block bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  compétences
                </span>
              </h1>
              
              <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed">
                Progressez étape par étape avec nos cours structurés et interactifs. 
                Chaque leçon vous rapproche de vos objectifs.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <BookOpen className="w-8 h-8 text-blue-300 mx-auto mb-3" />
                  <div className="text-2xl font-bold text-white mb-1">50+</div>
                  <div className="text-sm text-slate-300">Cours disponibles</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <Clock className="w-8 h-8 text-blue-300 mx-auto mb-3" />
                  <div className="text-2xl font-bold text-white mb-1">200+</div>
                  <div className="text-sm text-slate-300">Heures de contenu</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <Users className="w-8 h-8 text-blue-300 mx-auto mb-3" />
                  <div className="text-2xl font-bold text-white mb-1">10k+</div>
                  <div className="text-sm text-slate-300">Étudiants actifs</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <TrendingUp className="w-8 h-8 text-blue-300 mx-auto mb-3" />
                  <div className="text-2xl font-bold text-white mb-1">95%</div>
                  <div className="text-sm text-slate-300">Taux de réussite</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cours */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Choisissez votre parcours</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Sélectionnez une matière pour commencer votre apprentissage structuré
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockSubjects.map((subject) => (
              <div
                key={subject.id}
                onClick={() => setSelectedSubject(subject)}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-slate-200/60 hover:border-blue-300/60"
              >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Badge de progression */}
                <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {subject.progress}% complété
                </div>

                <div className="relative p-8">
                  {/* Icône */}
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {subject.title}
                  </h3>
                  
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    {subject.description}
                  </p>
                  
                  {/* Barre de progression */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-slate-600 mb-2">
                      <span>Progression</span>
                      <span className="font-semibold">{subject.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${subject.progress}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Métadonnées */}
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{subject.chapters.length} chapitres</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{subject.totalDuration}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-blue-600 group-hover:translate-x-1 transition-transform duration-300">
                      <span className="font-medium mr-1">Continuer</span>
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
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

  // Vue cours principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header avec navigation */}
        <div className="mb-8">
          <button
            onClick={() => setSelectedSubject(null)}
            className="group flex items-center text-slate-600 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Retour aux cours</span>
          </button>
          
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{selectedSubject.title}</h1>
                <p className="text-slate-600 text-lg">{selectedSubject.description}</p>
              </div>
              
              <div className="text-right">
                <div className="inline-flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 mb-2">
                  <Award className="w-4 h-4 mr-2" />
                  <span className="font-semibold">{selectedSubject.progress}% complété</span>
                </div>
                <div className="text-sm text-slate-500">Durée totale: {selectedSubject.totalDuration}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Dashboard - colonne de gauche */}
          <div className="lg:col-span-1">
            <SubjectDashboard 
              subject={selectedSubject}
              onVideoSelect={setCurrentVideo}
            />
          </div>
          
          {/* Contenu principal */}
          <div className="lg:col-span-3">
            <CourseOutline 
              subject={selectedSubject}
              onVideoSelect={setCurrentVideo}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningPath;