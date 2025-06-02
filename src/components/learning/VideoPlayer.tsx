import React, { useState } from 'react';
import { 
  ArrowLeft, Settings, Maximize, Volume2, Play, Pause, 
  SkipBack, SkipForward, RotateCcw, CheckCircle 
} from 'lucide-react';
import type { Video, Subject } from '@/types/learningPath';

interface VideoPlayerProps {
  video: Video;
  subject: Subject;
  onClose: () => void;
  onQuizStart: (quiz: any) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  video, 
  subject, 
  onClose, 
  onQuizStart 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(23); // Simulation
  const [currentTime, setCurrentTime] = useState("02:15");

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={onClose}
              className="group flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Retour au cours</span>
            </button>
            
            <div className="border-l border-slate-600 pl-6">
              <div className="text-sm text-slate-400 mb-1">Chapitre 1.2</div>
              <div className="font-bold text-white">{video.title}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Lecteur vidéo principal */}
        <div className="flex-1">
          {/* Zone vidéo */}
          <div className="relative bg-black">
            <div className="aspect-video flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 mx-auto">
                  <Play className="w-12 h-12 text-white ml-1" />
                </div>
                <div className="text-xl font-bold mb-2">{video.title}</div>
                <div className="text-slate-300">{video.duration}</div>
              </div>
            </div>
            
            {/* Overlay de contrôles */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end">
              <div className="w-full p-6">
                {/* Barre de progression */}
                <div className="w-full bg-white/20 rounded-full h-1 mb-4 cursor-pointer">
                  <div 
                    className="bg-blue-500 h-1 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                {/* Contrôles */}
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                    </button>
                    
                    <button className="p-2 hover:bg-white/20 rounded-lg transition-all">
                      <SkipBack className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-white/20 rounded-lg transition-all">
                      <SkipForward className="w-5 h-5" />
                    </button>
                    
                    <span className="text-sm font-mono">{currentTime} / {video.duration}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-sm hover:bg-white/30 transition-all">
                      1.0x
                    </button>
                    <button className="p-2 hover:bg-white/20 rounded-lg transition-all">
                      <Volume2 className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-white/20 rounded-lg transition-all">
                      <Settings className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-white/20 rounded-lg transition-all">
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Informations de la vidéo */}
          <div className="bg-slate-800 p-6">
            <div className="max-w-4xl">
              <h1 className="text-2xl font-bold text-white mb-3">{video.title}</h1>
              <p className="text-slate-300 mb-6">
                Dans cette leçon, nous explorons les concepts fondamentaux et les applications pratiques. 
                Prenez des notes et n'hésitez pas à revoir les passages importants.
              </p>
              
              <div className="flex items-center space-x-4">
                <button className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  <span>Marquer comme terminé</span>
                </button>
                
                <button className="flex items-center space-x-2 px-6 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-all font-semibold">
                  <RotateCcw className="w-5 h-5" />
                  <span>Revoir depuis le début</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
          <div className="p-6">
            {/* Onglets */}
            <div className="flex space-x-1 mb-6 bg-slate-700 rounded-lg p-1">
              <button className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md text-sm font-semibold transition-all">
                RESSOURCES
              </button>
              <button className="flex-1 py-2 px-4 text-slate-400 hover:text-white rounded-md text-sm font-semibold transition-all">
                LEÇONS
              </button>
            </div>
            
            {/* Vidéo actuelle */}
            <div className="mb-6">
              <div className="flex items-center p-4 bg-emerald-600 rounded-xl text-white">
                <Play className="w-5 h-5 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{video.title}</div>
                  <div className="text-emerald-100 text-sm">{video.duration}</div>
                </div>
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              </div>
            </div>
            
            {/* Liste des leçons */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">
                CHAPITRE 2 - {subject.chapters[1]?.title || 'Fonctions linéaires'}
              </h3>
              
              <div className="space-y-2">
                {subject.chapters[0]?.videos.map((v, index) => (
                  <div 
                    key={v.id}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                      v.id === video.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {v.completed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{v.title}</div>
                          <div className="text-xs opacity-75">{v.duration}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Notes section */}
            <div className="mt-8 pt-6 border-t border-slate-700">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">
                NOTES PERSONNELLES
              </h4>
              <textarea 
                placeholder="Ajoutez vos notes sur cette leçon..."
                className="w-full h-32 bg-slate-700 text-slate-300 rounded-lg p-4 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};