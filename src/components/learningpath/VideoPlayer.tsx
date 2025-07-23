// src/components/learningpath/VideoPlayer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactPlayer from 'react-player';
import { 
  X, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  CheckCircle,
  FileText,
  Download,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  List
} from 'lucide-react';
import { PathChapter } from '@/types/index';
import { updateVideoProgress } from '@/lib/api/learningpathApi';

interface VideoPlayerProps {
  chapter?: PathChapter;
  currentVideoIndex: number;
  onClose: () => void;
  onVideoComplete: (index: number) => void;
  onVideoChange: (index: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  chapter,
  currentVideoIndex,
  onClose,
  onVideoComplete,
  onVideoChange
}) => {
  const playerRef = useRef<ReactPlayer>(null);
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);

  if (!chapter || !chapter.videos || chapter.videos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white text-center">
          <p>No videos available for this chapter.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 rounded text-white">
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentVideo = chapter.videos[currentVideoIndex];
  if (!currentVideo) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white text-center">
          <p>Selected video not found.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 rounded text-white">
            Close
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (currentVideo.user_progress) {
      setWatchedSeconds(currentVideo.user_progress.watched_seconds);
    }
  }, [currentVideo]);

  const handleProgress = (state: { played: number; playedSeconds: number }) => {
    setProgress(state.played * 100);
    setWatchedSeconds(Math.floor(state.playedSeconds));

    if (Math.floor(state.playedSeconds) % 5 === 0) {
      saveProgress(false);
    }

    if (state.played > 0.9 && !currentVideo.user_progress?.is_completed) {
      saveProgress(true);
    }
  };

  const saveProgress = async (isCompleted: boolean = false) => {
    try {
      await updateVideoProgress(currentVideo.id, {
        watched_seconds: watchedSeconds,
        is_completed: isCompleted
      });

      if (isCompleted) {
        onVideoComplete(currentVideoIndex);
      }
    } catch (error) {
      console.error('Failed to save video progress:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Compact Header */}
      <div className="bg-gray-900 px-6 py-3 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-white font-medium text-sm">{currentVideo.title}</h2>
            <p className="text-gray-400 text-xs">{chapter.title}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-xs">
           {currentVideoIndex + 1} of {chapter.videos.length}
         </span>
         <button
           onClick={() => setShowPlaylist(!showPlaylist)}
           className="text-gray-400 hover:text-white transition-colors"
         >
           <List className="w-5 h-5" />
         </button>
       </div>
     </div>

     {/* Video Content */}
     <div className="flex flex-1">
       {/* Video Player */}
       <div className="flex-1 relative bg-black">
         <ReactPlayer
           ref={playerRef}
           url={currentVideo.url}
           playing={playing}
           volume={volume}
           muted={muted}
           width="100%"
           height="100%"
           onProgress={handleProgress}
           onDuration={setDuration}
           onEnded={() => saveProgress(true)}
           controls={false}
           progressInterval={1000}
         />

         {/* Custom Controls */}
         <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
           {/* Progress Bar */}
           <div className="mb-3">
             <div className="flex items-center gap-2 text-white text-xs mb-1">
               <span>{formatTime(watchedSeconds)}</span>
               <div className="flex-1 h-1 bg-gray-700 rounded-full">
                 <div 
                   className="h-full bg-indigo-500 rounded-full transition-all"
                   style={{ width: `${progress}%` }}
                 />
               </div>
               <span>{formatTime(duration)}</span>
             </div>
           </div>

           {/* Controls */}
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <button
                 onClick={() => setPlaying(!playing)}
                 className="text-white hover:text-indigo-400 transition-colors"
               >
                 {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
               </button>

               <button
                 onClick={() => playerRef.current?.seekTo(watchedSeconds - 10)}
                 className="text-white hover:text-indigo-400 transition-colors"
               >
                 <SkipBack className="w-4 h-4" />
               </button>
               
               <button
                 onClick={() => playerRef.current?.seekTo(watchedSeconds + 10)}
                 className="text-white hover:text-indigo-400 transition-colors"
               >
                 <SkipForward className="w-4 h-4" />
               </button>

               <button
                 onClick={() => setMuted(!muted)}
                 className="text-white hover:text-indigo-400 transition-colors"
               >
                 {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
               </button>
             </div>

             <div className="flex items-center gap-3">
               <button
                 onClick={() => currentVideoIndex > 0 && onVideoChange(currentVideoIndex - 1)}
                 disabled={currentVideoIndex === 0}
                 className="text-white hover:text-indigo-400 transition-colors disabled:opacity-50"
               >
                 <ChevronLeft className="w-5 h-5" />
               </button>
               
               <button
                 onClick={() => currentVideoIndex < chapter.videos.length - 1 && onVideoChange(currentVideoIndex + 1)}
                 disabled={currentVideoIndex === chapter.videos.length - 1}
                 className="text-white hover:text-indigo-400 transition-colors disabled:opacity-50"
               >
                 <ChevronRight className="w-5 h-5" />
               </button>
             </div>
           </div>
         </div>
       </div>

       {/* Compact Playlist Sidebar */}
       {showPlaylist && (
         <motion.div
           initial={{ x: 300 }}
           animate={{ x: 0 }}
           exit={{ x: 300 }}
           className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col"
         >
           <div className="p-4 border-b border-gray-800">
             <h3 className="text-white font-medium text-sm">Chapter Videos</h3>
           </div>
           
           <div className="flex-1 overflow-y-auto">
             {chapter.videos.map((video, index) => (
               <button
                 key={video.id}
                 onClick={() => onVideoChange(index)}
                 className={`w-full text-left p-3 border-b border-gray-800 hover:bg-gray-800 transition-colors ${
                   index === currentVideoIndex ? 'bg-gray-800' : ''
                 }`}
               >
                 <div className="flex items-start gap-3">
                   <div className="flex-shrink-0 mt-1">
                     {video.user_progress?.is_completed ? (
                       <CheckCircle className="w-4 h-4 text-green-500" />
                     ) : (
                       <div className={`w-4 h-4 rounded-full border-2 ${
                         index === currentVideoIndex 
                           ? 'border-indigo-500 bg-indigo-500' 
                           : 'border-gray-500'
                       }`} />
                     )}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-white text-sm font-medium mb-1 line-clamp-2">
                       {video.title}
                     </p>
                     <p className="text-gray-400 text-xs">
                       {video.duration}
                     </p>
                   </div>
                 </div>
               </button>
             ))}
           </div>

           {/* Resources */}
           {currentVideo.resources.length > 0 && (
             <div className="p-4 border-t border-gray-800">
               <h4 className="text-white font-medium text-sm mb-3">Resources</h4>
               <div className="space-y-2">
                 {currentVideo.resources.map((resource) => (
                   
                   <a
                     key={resource.id}
                     href={resource.url}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center gap-2 p-2 bg-gray-800 rounded text-gray-300 hover:text-white transition-colors text-sm"
                   >
                     {resource.resource_type === 'pdf' ? (
                       <FileText className="w-4 h-4 text-red-500" />
                     ) : (
                       <Download className="w-4 h-4 text-blue-500" />
                     )}
                     <span className="text-xs truncate">{resource.title}</span>
                   </a>
                 ))}
               </div>
             </div>
           )}
         </motion.div>
       )}
     </div>
   </motion.div>
 );
};