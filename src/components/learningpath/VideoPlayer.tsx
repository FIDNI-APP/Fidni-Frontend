// src/components/learningPath/VideoPlayer.tsx
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
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [watchedSeconds, setWatchedSeconds] = useState(0);

  // Defensive checks for chapter and videos
  if (!chapter || !chapter.videos || chapter.videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white bg-black">
        <p>No videos available for this chapter.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 rounded text-white">Close</button>
      </div>
    );
  }

  const currentVideo = chapter.videos[currentVideoIndex];
  if (!currentVideo) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white bg-black">
        <p>Selected video not found.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 rounded text-white">Close</button>
      </div>
    );
  }

  useEffect(() => {
    // Load saved notes and progress
    if (currentVideo.user_progress) {
      setNotes(currentVideo.user_progress.notes || '');
      setWatchedSeconds(currentVideo.user_progress.watched_seconds);
    }
  }, [currentVideo]);

  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    setProgress(state.played * 100);
    setWatchedSeconds(Math.floor(state.playedSeconds));

    // Update progress every 5 seconds
    if (Math.floor(state.playedSeconds) % 5 === 0) {
      saveProgress(false);
    }

    // Mark as complete when 90% watched
    if (state.played > 0.9 && !currentVideo.user_progress?.is_completed) {
      saveProgress(true);
    }
  };

  const saveProgress = async (isCompleted: boolean = false) => {
    try {
      await updateVideoProgress(currentVideo.id, {
        watched_seconds: watchedSeconds,
        is_completed: isCompleted,
        notes: notes
      });

      if (isCompleted) {
        onVideoComplete(currentVideoIndex);
      }
    } catch (error) {
      console.error('Failed to save video progress:', error);
    }
  };

  const handleVideoEnd = () => {
    saveProgress(true);
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

  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      saveProgress();
      onVideoChange(currentVideoIndex - 1);
    }
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < chapter.videos.length - 1) {
      saveProgress();
      onVideoChange(currentVideoIndex + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              title='Close Video Player'
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-white font-semibold text-lg">{currentVideo.title}</h2>
              <p className="text-gray-400 text-sm">{chapter.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              Video {currentVideoIndex + 1} of {chapter.videos.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Player */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
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
              onEnded={handleVideoEnd}
              controls={false}
              progressInterval={1000}
            />

            {/* Custom Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center gap-3 text-white text-sm mb-2">
                  <span>{formatTime(watchedSeconds)}</span>
                  <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Play/Pause */}
                  <button
                    onClick={() => setPlaying(!playing)}
                    className="text-white hover:text-indigo-400 transition-colors"
                  >
                    {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>

                  {/* Skip buttons */}
                  <button
                  title='Rewind 10 seconds'
                    onClick={() => playerRef.current?.seekTo(watchedSeconds - 10)}
                    className="text-white hover:text-indigo-400 transition-colors"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                  title='Skip Forward'
                    onClick={() => playerRef.current?.seekTo(watchedSeconds + 10)}
                    className="text-white hover:text-indigo-400 transition-colors"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>

                  {/* Volume */}
                  <button
                    onClick={() => setMuted(!muted)}
                    className="text-white hover:text-indigo-400 transition-colors"
                  >
                    {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {/* Previous/Next */}
                  <button
                    onClick={handlePreviousVideo}
                    title='Previous Video'
                    disabled={currentVideoIndex === 0}
                    className="text-white hover:text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNextVideo}
                    title='Next Video'
                    disabled={currentVideoIndex === chapter.videos.length - 1}
                    className="text-white hover:text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Video Info Bar */}
          <div className="bg-gray-900 border-t border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {currentVideo.video_type === 'summary' && (
                  <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
                    Summary Video
                  </span>
                )}
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Notes
                </button>
              </div>
              {currentVideo.user_progress?.is_completed && (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">Completed</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
          {/* Chapter Videos List */}
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-white font-semibold mb-4">Chapter Content</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {chapter.videos.map((video, index) => (
                <button
                  key={video.id}
                  onClick={() => {
                    saveProgress();
                    onVideoChange(index);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    index === currentVideoIndex
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${video.user_progress?.is_completed ? 'text-green-500' : ''}`}>
                      {video.user_progress?.is_completed ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{video.title}</p>
                      <p className="text-sm opacity-70">{video.duration}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Resources */}
          {currentVideo.resources.length > 0 && (
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <div className="space-y-2">
                {currentVideo.resources.map((resource) => (
                  
                    <a
                      key={resource.id}
                      href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-gray-300"
                  >
                    {resource.resource_type === 'pdf' ? (
                      <FileText className="w-5 h-5 text-red-500" />
                    ) : (
                      <Download className="w-5 h-5 text-blue-500" />
                    )}
                    <span className="text-sm">{resource.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          {showNotes && (
            <div className="flex-1 p-4">
              <h3 className="text-white font-semibold mb-4">Your Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => saveProgress()}
                placeholder="Take notes while watching..."
                className="w-full h-full bg-gray-800 text-gray-300 p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};