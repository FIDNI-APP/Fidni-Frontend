// src/components/learningPath/ChapterDetail.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Video, 
  CheckCircle, 
  Clock, 
  ChevronLeft,
  Play,
  FileQuestion,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChapterDetailProps {
  chapter: any;
  onSelectVideo: (video: any) => void;
  onStartQuiz: () => void;
  onBack: () => void;
}

export const ChapterDetail: React.FC<ChapterDetailProps> = ({
  chapter,
  onSelectVideo,
  onStartQuiz,
  onBack
}) => {
  const completedVideos = chapter.videos.filter((v: any) => v.completed).length;
  const totalDuration = chapter.videos.reduce((acc: number, video: any) => {
    const minutes = parseInt(video.duration);
    return acc + minutes;
  }, 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour au parcours
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <Clock className="w-4 h-4 inline mr-1" />
              {totalDuration} minutes au total
            </div>
            <div className="text-sm font-medium text-indigo-600">
              {completedVideos}/{chapter.videos.length} vidéos complétées
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {chapter.title}
        </h1>
        <p className="text-gray-600">{chapter.description}</p>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progression du chapitre</span>
            <span className="font-medium text-indigo-600">{chapter.progress}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${chapter.progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            />
          </div>
        </div>
      </motion.div>

      {/* Learning Objectives */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" />
          Objectifs d'apprentissage
        </h2>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">Comprendre les concepts fondamentaux</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">Maîtriser les techniques de résolution</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">Appliquer les connaissances à des cas pratiques</span>
          </li>
        </ul>
      </motion.div>

      {/* Video List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 mb-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Video className="w-5 h-5 text-indigo-600" />
          Contenu du chapitre
        </h2>

        {chapter.videos.map((video: any, index: number) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            onClick={() => onSelectVideo(video)}
            className={`
              bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all
              hover:shadow-lg hover:scale-[1.02]
              ${video.type === 'summary' ? 'border-2 border-purple-200' : ''}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  ${video.completed 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {video.completed ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {video.duration}
                    </span>
                    {video.type === 'summary' && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        Résumé
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quiz Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-amber-600" />
              Quiz du chapitre
            </h2>
            <p className="text-gray-600">
              Testez vos connaissances avec {chapter.quiz.length} questions
            </p>
          </div>
          
          <Button
            onClick={onStartQuiz}
            disabled={completedVideos < chapter.videos.length}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            {completedVideos < chapter.videos.length 
              ? `Complétez d'abord les vidéos` 
              : 'Commencer le quiz'
            }
          </Button>
        </div>
      </motion.div>
    </div>
  );
};