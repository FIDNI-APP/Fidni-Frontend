import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Clock,
  BookOpen,
  Users,
  Play,
  ChevronRight,
  CheckCircle,
  Lock,
  TrendingUp,
  Award,
  Plus,
  Star,
  Trophy,
  Trash2, 
  Edit, 
  MoreVertical,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  Timer,
  Brain,
  Video,
  FileText,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  getLearningPath, 
  startLearningPath,
  deleteLearningPath, 
  deletePathChapter 
} from '@/lib/api/LearningPathApi';
import { LearningPath, PathChapter } from '@/types/index';
import { useLearningPathStore } from '@/stores/LearningPathStore';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { motion, AnimatePresence } from 'framer-motion';

// Progress Ring Component
const ProgressRing: React.FC<{ progress: number; size?: number }> = ({ progress, size = 120 }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative">
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-indigo-600 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{progress}%</div>
          <div className="text-xs text-gray-500">Complete</div>
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard: React.FC<{
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
  trend?: number;
}> = ({ icon: Icon, value, label, color, trend }) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          <TrendingUp className={`w-4 h-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
    <div className="text-sm text-gray-600">{label}</div>
  </motion.div>
);

// Enhanced Chapter Card
const ChapterCard: React.FC<{
  chapter: PathChapter;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onStart: () => void;
  isLocked: boolean;
  isCurrent: boolean;
}> = ({ chapter, index, isExpanded, onToggle, onStart, isLocked, isCurrent }) => {
  const progress = chapter.user_progress?.progress_percentage || 0;
  const isCompleted = chapter.user_progress?.is_completed || false;
  const videosCompleted = chapter.videos.filter(v => v.user_progress?.is_completed).length;
  const navigate = useNavigate();
  const [videos, setVideos] = useState(chapter.videos || []);


// load learning path data 
  useEffect(() => {
    if (chapter.videos.length > 0) {
      setVideos(chapter.videos);
    }
  }, [chapter.videos]);
  

  // function loadlearning path data
  const loadLearningPath = async () => {
    try {
      const pathData = await getLearningPath(chapter.learning_path.id);
      setVideos(pathData.path_chapters.find(ch => ch.id === chapter.id)?.videos || []);
    } catch (error) {
      console.error('Failed to load learning path:', error);
    }
  };


  // Handle chapter deletion
const handleDeletePath = async (id: string | null) => {
  if (window.confirm('Are you sure you want to delete this entire learning path? This action cannot be undone.')) {
    try {
      await deleteLearningPath(id!);
      navigate('/learning-paths');
    } catch (error) {
      console.error('Failed to delete learning path:', error);
    }
  }
};

const handleDeleteChapter = async (chapterId: string) => {
  if (window.confirm('Are you sure you want to delete this chapter? This action cannot be undone.')) {
    try {
      await deletePathChapter(chapterId);
      // Refresh the learning path data
      loadLearningPath();
    } catch (error) {
      console.error('Failed to delete chapter:', error);
    }
  }
};
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`bg-white rounded-xl overflow-hidden transition-all ${
        isCurrent ? 'ring-2 ring-indigo-500 shadow-lg' : 'shadow-sm hover:shadow-md'
      }`}
    >
      <div
        onClick={onToggle}
        className="p-6 cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                isCompleted ? 'bg-green-100 text-green-700' : 
                isCurrent ? 'bg-indigo-100 text-indigo-700' : 
                'bg-gray-100 text-gray-700'
              }`}>
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : index + 1}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{chapter.title}</h3>
              {isCurrent && (
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                  Current
                </span>
              )}
            </div>
            
            <p className="text-gray-600 mb-4 ml-13">{chapter.description}</p>
            
            <div className="flex items-center gap-6 text-sm text-gray-500 ml-13">
              <div className="flex items-center gap-1">
                <Video className="w-4 h-4" />
                <span>{videosCompleted}/{chapter.videos.length} videos</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{chapter.total_duration}</span>
              </div>
              {chapter.quiz && (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>Quiz included</span>
                </div>
              )}
            </div>

            {progress > 0 && (
              <div className="mt-4 ml-13">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`} />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-100"
          >
            <div className="p-6 bg-gray-50">
              <div className="space-y-3">
                {chapter.videos.map((video, vIndex) => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        video.user_progress?.is_completed 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {video.user_progress?.is_completed ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{video.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{video.duration}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                            {video.video_type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {chapter.quiz && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-indigo-900">{chapter.quiz.title}</h4>
                      <p className="text-sm text-indigo-700 mt-1">
                        {chapter.quiz.questions.length} questions • {chapter.quiz.estimated_duration}
                      </p>
                    </div>
                    {chapter.user_progress?.quiz_passed && (
                      <div className="text-center">
                        <Trophy className="w-6 h-6 text-yellow-500 mx-auto" />
                        <p className="text-sm text-green-600 font-medium mt-1">
                          {chapter.user_progress.quiz_score}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={onStart}
                className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {progress > 0 ? 'Continue Chapter' : 'Start Chapter'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const LearningPathDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { openModal } = useAuthModal();
  const { setCurrentPath } = useLearningPathStore();
  
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      fetchLearningPath();
    }
  }, [id]);

  const fetchLearningPath = async () => {
    try {
      setLoading(true);
      const pathData = await getLearningPath(id!);
      setLearningPath(pathData);
      setCurrentPath(pathData);
      
      
    } catch (err) {
      setError('Failed to load learning path. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPath = async () => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    try {
      await startLearningPath(id!);
      const firstChapter = learningPath?.path_chapters[0];
      if (firstChapter && firstChapter.videos.length > 0) {
        navigate(`/learning-paths/${id}/chapters/${firstChapter.id}/videos/${firstChapter.videos[0].id}`);
      }
    } catch (err) {
      console.error('Failed to start learning path:', err);
    }
  };

  const handleChapterClick = (chapterId: string) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    const chapter = learningPath?.path_chapters.find(ch => ch.id === chapterId);
    if (chapter && chapter.videos.length > 0) {
      navigate(`/learning-paths/${id}/chapters/${chapterId}/videos/${chapter.videos[0].id}`);
    }
  };

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-200 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-indigo-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading your learning journey...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !learningPath) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => navigate('/learning-paths')}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Learning Paths
          </Button>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl"
          >
            {error || 'Learning path not found'}
          </motion.div>
        </div>
      </div>
    );
  }

  const progress = learningPath.user_progress?.progress_percentage || 0;
  const isStarted = !!learningPath.user_progress;
  const currentChapterIndex = learningPath.path_chapters.findIndex(
    ch => ch.user_progress && !ch.user_progress.is_completed
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700"></div>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-300/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative container mx-auto px-4 py-12">
          <Button
            onClick={() => navigate('/learning-paths')}
            variant="ghost"
            className="mb-6 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Learning Paths
          </Button>

          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                  {learningPath.subject.name}
                </span>
                {learningPath.class_level.map(cl => (
                  <span key={cl.id} className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                    {cl.name}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {learningPath.title}
              </h1>
              
              <p className="text-xl text-white/90 mb-8 max-w-3xl">
                {learningPath.description}
              </p>

              <div className="flex flex-wrap items-center gap-6 mb-8">
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">{learningPath.estimated_hours} hours</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <BookOpen className="w-5 h-5" />
                  <span className="font-medium">{learningPath.total_chapters || learningPath.path_chapters.length} chapters</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <Video className="w-5 h-5" />
                  <span className="font-medium">{learningPath.total_videos || learningPath.path_chapters.reduce((acc, ch) => acc + ch.videos.length, 0)} videos</span>
                </div>
              </div>

              {!isStarted ? (
                <Button
                  size="lg"
                  onClick={handleStartPath}
                  className="bg-white text-indigo-600 hover:bg-gray-100 font-semibold px-8 shadow-xl"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Learning Journey
                </Button>
              ) : (
                <div className="flex items-center gap-6">
                  <ProgressRing progress={progress} />
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      You're making great progress!
                    </h3>
                    <p className="text-white/80">
                      Keep going to unlock new achievements
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Admin Controls */}
      {user?.is_superuser && (
        <div className="container mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end gap-4"
          >
            <Button
              variant="outline"
              onClick={() => navigate(`/learning-paths/${id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Path
            </Button>
            <Button
              onClick={() => navigate(`/learning-paths/${id}/chapters/create`)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Chapter
            </Button>
          </motion.div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Enhanced Stats Dashboard */}
          {isStarted && stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Learning Analytics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                  icon={GraduationCap}
                  value={`${stats.completed_chapters}/${stats.total_chapters}`}
                  label="Chapters Mastered"
                  color="bg-gradient-to-br from-indigo-500 to-indigo-600"
                  trend={10}
                />
                <StatsCard
                  icon={Video}
                  value={`${stats.videos_watched}/${stats.total_videos}`}
                  label="Videos Watched"
                  color="bg-gradient-to-br from-purple-500 to-purple-600"
                />
                <StatsCard
                  icon={Brain}
                  value={`${Math.round(stats.quiz_average || 0)}%`}
                  label="Quiz Performance"
                  color="bg-gradient-to-br from-green-500 to-green-600"
                  trend={5}
                />
                <StatsCard
                  icon={Timer}
                  value={`${Math.round(stats.total_time_spent / 3600)}h`}
                  label="Time Invested"
                  color="bg-gradient-to-br from-orange-500 to-orange-600"
                />
              </div>

              {/* Achievement Section */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Next Milestone</h3>
                    <p className="text-white/80">
                      Complete {5 - (stats.completed_chapters % 5)} more chapters to earn your next badge!
                    </p>
                  </div>
                  <Trophy className="w-12 h-12 text-yellow-300" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Course Content */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Course Curriculum</h2>
            
            <div className="space-y-4">
              {learningPath.path_chapters.map((chapter, index) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  index={index}
                  isExpanded={expandedChapters.has(chapter.id)}
                  onToggle={() => toggleChapter(chapter.id)}
                  onStart={() => handleChapterClick(chapter.id)}
                  isLocked={false}
                  isCurrent={index === currentChapterIndex}
                />
              ))}
            </div>
          </div>

          {/* Completion Certificate */}
          {progress === 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-16"
            >
              <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-12 text-white text-center">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-10 right-10 opacity-10"
                  >
                    <Star className="w-32 h-32" />
                  </motion.div>
                  
                  <Award className="w-20 h-20 mx-auto mb-6 text-yellow-300" />
                  <h3 className="text-3xl font-bold mb-4">Congratulations, Champion! 🎉</h3>
                  <p className="text-xl mb-8 max-w-2xl mx-auto">
                    You've successfully completed this learning path and mastered all the concepts. 
                    Your dedication and hard work have paid off!
                  </p>
                  <Button
                    size="lg"
                    className="bg-white text-indigo-600 hover:bg-gray-100 font-semibold shadow-xl"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    Download Certificate
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

