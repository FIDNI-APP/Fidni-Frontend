// src/components/learningPath/VideoPlayer.tsx
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Volume2,
  Maximize,
  ChevronLeft,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  video: any;
  chapter: any;
  onComplete: (videoId: string) => void;
  onBack: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  chapter,
  onComplete,
  onBack
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(video.completed);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoEnd = () => {
    if (!completed) {
      setCompleted(true);
      onComplete(video.id);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setProgress((current / duration) * 100);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{video.title}</h1>
              <p className="text-gray-600">{chapter.title}</p>
            </div>
          </div>
          
          {completed && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Complété</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Player */}
      <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
        <div className="relative aspect-video">
          {/* Placeholder for actual video */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
            <div className="text-center text-white">
              <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-16 h-16" />
              </div>
              <p className="text-xl">Vidéo: {video.title}</p>
              <p className="text-sm text-white/70 mt-2">Durée: {video.duration}</p>
            </div>
          </div>
          
          <video
            ref={videoRef}
            className="w-full h-full hidden"
            onEnded={handleVideoEnd}
            onTimeUpdate={handleTimeUpdate}
          >
            <source src={video.url} type="video/mp4" />
          </video>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 px-6 py-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="text-white hover:text-indigo-400 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8" />
                )}
              </button>
              
              <button className="text-white hover:text-indigo-400 transition-colors" title='Reculer 10 secondes'>
                <SkipForward className="w-6 h-6" />
              </button>
              
              <button className="text-white hover:text-indigo-400 transition-colors" title='Volume'>
                <Volume2 className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-white text-sm">
                0:00 / {video.duration}
              </span>
              
              <button className="text-white hover:text-indigo-400 transition-colors" title='Plein écran'>
                <Maximize className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Navigation */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {chapter.videos
          .filter((v: any) => v.id !== video.id)
          .slice(0, 2)
          .map((nextVideo: any) => (
            <motion.div
              key={nextVideo.id}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-lg shadow-md p-4 cursor-pointer"
              onClick={() => onBack()}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{nextVideo.title}</h3>
                 <p className="text-sm text-gray-600">{nextVideo.duration}</p>
               </div>
             </div>
           </motion.div>
         ))}
     </div>
   </div>
 );
};