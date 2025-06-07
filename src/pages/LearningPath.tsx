// src/pages/LearningPath.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Clock,
  ChevronRight,
  Award,
  Map,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getClassLevels, getSubjects } from '@/lib/api';
import { ClassLevelModel, SubjectModel } from '@/types';
import { LearningPathMap } from '@/components/learningPath/LearningPathMap';
import { ChapterDetail } from '@/components/learningPath/ChapterDetail';
import { VideoPlayer } from '@/components/learningPath/VideoPlayer';
import { QuizSection } from '@/components/learningPath/QuizSection';
import { ProgressTracker } from '@/components/learningPath/ProgressTracker';



interface SubjectWithProgress extends SubjectModel {
  progress: number;
  totalChapters: number;
  completedChapters: number;
  chapters: ChapterWithProgress[];
  estimatedTime: string;
}

interface ChapterWithProgress {
  id: string;
  number: string;
  title: string;
  description: string;
  videos: VideoContent[];
  quiz: Quiz[];
  completed: boolean;
  locked: boolean;
  progress: number;
  estimatedTime: string;
}

interface VideoContent {
  id: string;
  title: string;
  url: string;
  duration: string;
  type: 'lesson' | 'summary';
  completed: boolean;
  order: number;
}

interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export default function LearningPath() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [selectedLevel, setSelectedLevel] = useState<ClassLevelModel | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithProgress | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterWithProgress | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'map' | 'chapter' | 'video' | 'quiz'>('overview');
  const [activeVideo, setActiveVideo] = useState<VideoContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [classLevels, setClassLevels] = useState<ClassLevelModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadInitialData();
  }, [isAuthenticated]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const levels = await getClassLevels();
      setClassLevels(levels);
      
      // Auto-select user's class level if available
      if (user?.profile?.class_level) {
        const userLevel = levels.find(l => l.id === user?.profile?.class_level?.id);
        if (userLevel) {
          setSelectedLevel(userLevel);
          await loadSubjectsForLevel(userLevel.id);
        }
      }
    } catch (error) {
      console.error('Failed to load learning path data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubjectsForLevel = async (levelId: string) => {
    try {
      const subjectsData = await getSubjects([levelId]);
      
      // Transform subjects with mock progress data
      const subjectsWithProgress: SubjectWithProgress[] = subjectsData.map(subject => ({
        ...subject,
        progress: Math.floor(Math.random() * 100),
        totalChapters: 8,
        completedChapters: Math.floor(Math.random() * 8),
        chapters: generateMockChapters(subject.id),
        estimatedTime: '12h 30m'
      }));
      
      setSubjects(subjectsWithProgress);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    }
  };

  const generateMockChapters = (subjectId: string): ChapterWithProgress[] => {
    return Array.from({ length: 8 }, (_, index) => {
      const chapterNumber = index + 1;
      const isCompleted = index < 3;
      const isLocked = index > 4;
      
      return {
        id: `chapter-${subjectId}-${chapterNumber}`,
        number: `${chapterNumber}`,
        title: `Chapitre ${chapterNumber}: ${getChapterTitle(chapterNumber)}`,
        description: `Découvrez les concepts fondamentaux du chapitre ${chapterNumber}`,
        videos: generateMockVideos(chapterNumber),
        quiz: generateMockQuiz(chapterNumber),
        completed: isCompleted,
        locked: isLocked,
        progress: isCompleted ? 100 : index === 3 ? 60 : 0,
        estimatedTime: '2h 15m'
      };
    });
  };

  const getChapterTitle = (chapter: number): string => {
    const titles = [
      'Introduction aux concepts de base',
      'Théorèmes fondamentaux',
      'Applications pratiques',
      'Résolution de problèmes',
      'Méthodes avancées',
      'Cas particuliers',
      'Exercices de synthèse',
      'Révision générale'
    ];
    return titles[chapter - 1] || 'Concepts avancés';
  };

  const generateMockVideos = (chapterNumber: number): VideoContent[] => {
    const videos: VideoContent[] = [];
    
    // 5 lesson videos
    for (let i = 1; i <= 5; i++) {
      videos.push({
        id: `video-${chapterNumber}-${i}`,
        title: `Leçon ${i}: ${getVideoTitle(i)}`,
        url: 'https://example.com/video.mp4',
        duration: `${10 + Math.floor(Math.random() * 10)}m`,
        type: 'lesson',
        completed: chapterNumber < 3 || (chapterNumber === 3 && i <= 3),
        order: i
      });
    }
    
    // Summary video
    videos.push({
      id: `video-${chapterNumber}-summary`,
      title: 'Résumé du chapitre',
      url: 'https://example.com/summary.mp4',
      duration: '8m',
      type: 'summary',
      completed: chapterNumber < 3,
      order: 6
    });
    
    return videos;
  };

  const getVideoTitle = (videoNumber: number): string => {
    const titles = [
      'Définitions et notations',
      'Propriétés essentielles',
      'Démonstrations',
      'Exemples d application',
      'Exercices guidés'
    ];
    return titles[videoNumber - 1] || 'Contenu supplémentaire';
  };

  const generateMockQuiz = (chapterNumber: number): Quiz[] => {
    return [
      {
        id: `quiz-${chapterNumber}-1`,
        question: `Quelle est la définition correcte du concept principal du chapitre ${chapterNumber}?`,
        options: [
          'Définition A: Lorem ipsum dolor sit amet',
          'Définition B: Consectetur adipiscing elit',
          'Définition C: Sed do eiusmod tempor incididunt',
          'Définition D: Ut labore et dolore magna aliqua'
        ],
        correctAnswer: 2,
        explanation: 'La définition C est correcte car elle inclut tous les éléments essentiels du concept, notamment la condition nécessaire et suffisante.'
      },
      {
        id: `quiz-${chapterNumber}-2`,
        question: 'Parmi les propriétés suivantes, laquelle est toujours vraie?',
        options: [
          'Propriété 1: Pour tout x > 0',
          'Propriété 2: Il existe un x tel que',
          'Propriété 3: Pour au moins un x',
          'Propriété 4: Aucune des propositions'
        ],
        correctAnswer: 0,
        explanation: 'La propriété 1 est universellement vraie car elle s\'applique à tous les éléments positifs de l\'ensemble.'
      },
      {
        id: `quiz-${chapterNumber}-3`,
        question: 'Calculez le résultat de l\'opération suivante: 2x + 3y où x=5 et y=2',
        options: ['10', '13', '16', '19'],
        correctAnswer: 2,
        explanation: '2(5) + 3(2) = 10 + 6 = 16. Il faut bien respecter l\'ordre des opérations.'
      }
    ];
  };

  const handleSelectLevel = async (level: ClassLevelModel) => {
    setSelectedLevel(level);
    await loadSubjectsForLevel(level.id);
    setActiveView('overview');
  };

  const handleSelectSubject = (subject: SubjectWithProgress) => {
    setSelectedSubject(subject);
    setActiveView('map');
  };

  const handleSelectChapter = (chapter: ChapterWithProgress) => {
    if (!chapter.locked) {
      setSelectedChapter(chapter);
      setActiveView('chapter');
    }
  };

  const handleVideoComplete = (videoId: string) => {
    // Update video completion status
    // This would normally make an API call
    console.log('Video completed:', videoId);
  };

  const handleQuizComplete = (score: number) => {
    // Update chapter completion status
    console.log('Quiz completed with score:', score);
    setActiveView('map');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de votre parcours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Map className="w-8 h-8" />
                Parcours d'Apprentissage
              </h1>
              <p className="mt-2 text-indigo-200">
                Progressez étape par étape vers la maîtrise
              </p>
            </div>
            <ProgressTracker 
              totalProgress={selectedSubject?.progress || 0}
              streak={7}
              level={user?.profile?.class_level?.name || ''}
            />
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      {(selectedLevel || selectedSubject || selectedChapter) && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => {
                  setSelectedLevel(null);
                  setSelectedSubject(null);
                  setSelectedChapter(null);
                  setActiveView('overview');
                }}
                className="text-gray-600 hover:text-indigo-600"
              >
                Accueil
              </button>
              
              {selectedLevel && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => {
                      setSelectedSubject(null);
                      setSelectedChapter(null);
                      setActiveView('overview');
                    }}
                    className="text-gray-600 hover:text-indigo-600"
                  >
                    {selectedLevel.name}
                  </button>
                </>
              )}
              
              {selectedSubject && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => {
                      setSelectedChapter(null);
                      setActiveView('map');
                    }}
                    className="text-gray-600 hover:text-indigo-600"
                  >
                    {selectedSubject.name}
                  </button>
                </>
              )}
              
              {selectedChapter && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900 font-medium">
                    {selectedChapter.title}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Level Selection View */}
          {activeView === 'overview' && !selectedLevel && (
            <motion.div
              key="level-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Choisissez votre niveau
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Sélectionnez votre niveau scolaire pour accéder à un parcours d'apprentissage
                  personnalisé et adapté à vos besoins.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classLevels.map((level) => (
                  <motion.button
                    key={level.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectLevel(level)}
                    className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-indigo-200"
                  >
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="w-10 h-10 text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {level.name}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Programme complet avec exercices et évaluations
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Subject Selection View */}
          {activeView === 'overview' && selectedLevel && (
            <motion.div
              key="subject-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Choisissez votre matière
                </h2>
                <p className="text-gray-600">
                  Sélectionnez la matière que vous souhaitez étudier
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((subject) => (
                  <motion.div
                    key={subject.id}
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer"
                    onClick={() => handleSelectSubject(subject)}
                  >
                    <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <BookOpen className="w-8 h-8 text-indigo-600" />
                        <span className="text-sm font-medium text-indigo-600">
                          {subject.completedChapters}/{subject.totalChapters} chapitres
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {subject.name}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Clock className="w-4 h-4" />
                        <span>{subject.estimatedTime}</span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progression</span>
                          <span className="font-medium text-indigo-600">
                            {subject.progress}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${subject.progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Learning Path Map View */}
          {activeView === 'map' && selectedSubject && (
            <motion.div
              key="learning-map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LearningPathMap
                subject={selectedSubject}
                onSelectChapter={handleSelectChapter}
                onBack={() => setActiveView('overview')}
              />
            </motion.div>
          )}

          {/* Chapter Detail View */}
          {activeView === 'chapter' && selectedChapter && (
            <motion.div
              key="chapter-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ChapterDetail
                chapter={selectedChapter}
                onSelectVideo={(video) => {
                  setActiveVideo(video);
                  setActiveView('video');
                }}
                onStartQuiz={() => setActiveView('quiz')}
                onBack={() => setActiveView('map')}
              />
            </motion.div>
          )}

          {/* Video Player View */}
          {activeView === 'video' && activeVideo && selectedChapter && (
            <motion.div
              key="video-player"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <VideoPlayer
                video={activeVideo}
                chapter={selectedChapter}
                onComplete={handleVideoComplete}
                onBack={() => setActiveView('chapter')}
              />
            </motion.div>
          )}

          {/* Quiz View */}
          {activeView === 'quiz' && selectedChapter && (
            <motion.div
              key="quiz-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <QuizSection
                chapter={selectedChapter}
                quiz={selectedChapter.quiz}
                onComplete={handleQuizComplete}
                onBack={() => setActiveView('chapter')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}