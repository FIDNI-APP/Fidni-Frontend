import React from 'react';
import { Play, Clock, CheckCircle, Award, Calendar, Target, TrendingUp, Zap } from 'lucide-react';
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
      {/* Progression principale */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Votre progression</h3>
          <div className="flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
            <TrendingUp className="w-4 h-4 mr-1" />
            {subject.progress}%
          </div>
        </div>
        
        {/* Cercle de progression */}
        <div className="relative flex items-center justify-center mb-6">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-200"
              stroke="currentColor"
              strokeWidth="3"
              fill="transparent"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-blue-500"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${subject.progress}, 100`}
              strokeLinecap="round"
              fill="transparent"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{subject.progress}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="text-2xl font-bold text-emerald-600 mb-1">
              {subject.chapters.filter(c => c.completed).length}
            </div>
            <div className="text-xs text-emerald-700 font-medium">Complétés</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-200">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {subject.chapters.length}
            </div>
            <div className="text-xs text-blue-700 font-medium">Total</div>
          </div>
        </div>
      </div>

      {/* Prochaines leçons */}
      {subject.nextUp && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">À suivre</h3>
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
          </div>
          
          <div className="space-y-3">
            {subject.nextUp.videos.slice(0, 3).map((video, index) => (
              <div
                key={video.id}
                onClick={() => onVideoSelect(video)}
                className="group flex items-center p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/50 hover:from-blue-50 hover:to-indigo-50 border border-slate-200/60 hover:border-blue-300/60 cursor-pointer transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-105 transition-transform shadow-lg">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {video.title}
                  </div>
                  <div className="text-sm text-slate-500 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {video.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planificateur */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
        <div className="flex items-center mb-4">
          <Calendar className="w-5 h-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-bold text-slate-900">Planification</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Heures par semaine
            </label>
            <div className="flex items-center space-x-3">
              <input 
                type="number" 
                defaultValue="4"
                className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex-1">
                <div className="text-sm text-slate-600">≈ Fin le</div>
                <div className="font-semibold text-slate-900">10 Septembre</div>
              </div>
            </div>
          </div>
          
          <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl">
            Planifier le cours
          </button>
        </div>
      </div>

      {/* Examens pratiques */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200/60 p-6">
        <div className="flex items-center mb-4">
          <Award className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-bold text-slate-900">Examens pratiques</h3>
        </div>
        
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Ce cours contient <span className="font-semibold text-purple-600">plusieurs examens</span> pour tester vos compétences.
        </p>
        
        <button className="w-full border-2 border-purple-300 text-purple-700 py-3 px-4 rounded-xl hover:bg-purple-50 transition-all duration-300 font-semibold">
          Voir les examens
        </button>
      </div>
    </div>
  );
};