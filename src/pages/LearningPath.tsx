import React, { useState, useEffect } from 'react';
import { ChevronRight, Play, CheckCircle, Star, Clock, Trophy, BookOpen, Target, ArrowRight, Sparkles } from 'lucide-react';

// Types pour la structure des données
interface Video {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  type: 'lesson' | 'summary';
}

interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  completed: boolean;
  score?: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Chapter {
  id: string;
  title: string;
  description: string;
  videos: Video[];
  quiz: Quiz;
  completed: boolean;
  estimatedTime: string;
}

interface Subject {
  id: string;
  name: string;
  description: string;
  chapters: Chapter[];
  progress: number;
  color: string;
  icon: string;
}

interface Level {
  id: string;
  name: string;
  description: string;
  subjects: Subject[];
}

// Données de démonstration
const mockData: Level[] = [
  {
    id: '1',
    name: 'Niveau Seconde',
    description: 'Fondamentaux pour la classe de seconde',
    subjects: [
      {
        id: '1',
        name: 'Mathématiques',
        description: 'Algèbre, géométrie et fonctions',
        progress: 65,
        color: 'from-blue-500 to-blue-600',
        icon: '📐',
        chapters: [
          {
            id: '1',
            title: 'Les fonctions linéaires',
            description: 'Introduction aux fonctions du premier degré',
            estimatedTime: '2h 30min',
            completed: true,
            videos: [
              { id: '1', title: 'Introduction aux fonctions', duration: '15min', completed: true, type: 'lesson' },
              { id: '2', title: 'Représentation graphique', duration: '20min', completed: true, type: 'lesson' },
              { id: '3', title: 'Calculs avec les fonctions', duration: '18min', completed: true, type: 'lesson' },
              { id: '4', title: 'Synthèse du chapitre', duration: '12min', completed: true, type: 'summary' }
            ],
            quiz: {
              id: '1',
              title: 'Quiz - Fonctions linéaires',
              completed: true,
              score: 85,
              questions: [
                {
                  id: '1',
                  question: 'Quelle est la forme générale d\'une fonction linéaire ?',
                  options: ['f(x) = ax + b', 'f(x) = ax²', 'f(x) = ax', 'f(x) = a/x'],
                  correctAnswer: 2,
                  explanation: 'Une fonction linéaire a la forme f(x) = ax où a est le coefficient directeur.'
                }
              ]
            }
          },
          {
            id: '2',
            title: 'Les fonctions affines',
            description: 'Fonctions du premier degré avec ordonnée à l\'origine',
            estimatedTime: '3h 15min',
            completed: false,
            videos: [
              { id: '5', title: 'Définition des fonctions affines', duration: '18min', completed: false, type: 'lesson' },
              { id: '6', title: 'Coefficient directeur et ordonnée', duration: '22min', completed: false, type: 'lesson' },
              { id: '7', title: 'Applications pratiques', duration: '25min', completed: false, type: 'lesson' },
              { id: '8', title: 'Synthèse du chapitre', duration: '15min', completed: false, type: 'summary' }
            ],
            quiz: {
              id: '2',
              title: 'Quiz - Fonctions affines',
              completed: false,
              questions: []
            }
          },
          {
            id: '3',
            title: 'Équations du second degré',
            description: 'Résolution et étude des équations quadratiques',
            estimatedTime: '4h 00min',
            completed: false,
            videos: [],
            quiz: {
              id: '3',
              title: 'Quiz - Équations du second degré',
              completed: false,
              questions: []
            }
          }
        ]
      },
      {
        id: '2',
        name: 'Physique',
        description: 'Mécanique et électricité',
        progress: 30,
        color: 'from-green-500 to-green-600',
        icon: '⚡',
        chapters: [
          {
            id: '4',
            title: 'Les forces et le mouvement',
            description: 'Introduction à la mécanique',
            estimatedTime: '3h 45min',
            completed: false,
            videos: [],
            quiz: {
              id: '4',
              title: 'Quiz - Forces et mouvement',
              completed: false,
              questions: []
            }
          }
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'Niveau Première',
    description: 'Approfondissement des concepts',
    subjects: []
  }
];

const LearningPath: React.FC = () => {
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizResults, setQuizResults] = useState<{ correct: number; total: number } | null>(null);

  // Fonction pour démarrer un quiz
  const startQuiz = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuizResults(null);
  };

  // Fonction pour répondre à une question
  const answerQuestion = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
  };

  // Fonction pour passer à la question suivante
  const nextQuestion = () => {
    if (currentQuiz && currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Fin du quiz
      finishQuiz();
    }
  };

  // Fonction pour terminer le quiz
  const finishQuiz = () => {
    if (currentQuiz) {
      const correct = 1; // Simulation - à calculer réellement
      const total = currentQuiz.questions.length;
      setQuizResults({ correct, total });
    }
  };

  // Vue principale - sélection du niveau
  if (!selectedLevel) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 px-4 py-20 pt-32 text-center relative overflow-hidden">
          {/* Animated Dots Background */}
          <div className="absolute inset-0 particles-effect opacity-20"></div>
          
          {/* Floating shapes for visual interest */}
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-gradient-to-r from-blue-500/20 to-teal-500/20 rounded-full blur-3xl"></div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="animate-fade-in-up">
              <h1 className="text-4xl md:text-6xl fjalla-one-regular font-bold bg-gradient-to-r from-yellow-400 via-yellow-600 to-yellow-900 text-transparent bg-clip-text mb-6">
                Parcours d'Apprentissage
              </h1>
              <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto">
                Progressez étape par étape à travers nos niveaux structurés et maîtrisez chaque concept à votre rythme
              </p>
            </div>
          </div>
          
          {/* Curved bottom edge */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="w-full">
              <path fill="#ffffff" fillOpacity="1" d="M0,96L48,85.3C96,75,192,53,288,58.7C384,64,480,96,576,96C672,96,768,64,864,48C960,32,1056,32,1152,42.7C1248,53,1344,75,1392,85.3L1440,96L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
            </svg>
          </div>
        </section>

        <div className="container mx-auto px-4 py-20">
          {/* Header with icon */}
          <div className="flex items-center justify-center mb-12">
            <div className="relative">
              <Sparkles className="w-10 h-10 text-yellow-500 mr-3 group-hover:animate-ping absolute opacity-75" />
              <Sparkles className="w-10 h-10 text-yellow-500 mr-3 relative" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 text-transparent bg-clip-text">
              Vos Niveaux d'Apprentissage
            </h2>
          </div>

          {/* Statistiques globales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            <div className="bg-white rounded-xl shadow-xl p-6 text-center hover:transform hover:scale-105 transition-all duration-300 border border-gray-100 group hover:border-indigo-200">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-600 transition-colors duration-300">
                <BookOpen className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-2">24</h3>
              <p className="text-gray-600 font-medium">Chapitres disponibles</p>
            </div>
            <div className="bg-white rounded-xl shadow-xl p-6 text-center hover:transform hover:scale-105 transition-all duration-300 border border-gray-100 group hover:border-green-200">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-600 transition-colors duration-300">
                <CheckCircle className="w-8 h-8 text-green-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-2">8</h3>
              <p className="text-gray-600 font-medium">Chapitres complétés</p>
            </div>
            <div className="bg-white rounded-xl shadow-xl p-6 text-center hover:transform hover:scale-105 transition-all duration-300 border border-gray-100 group hover:border-purple-200">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-600 transition-colors duration-300">
                <Trophy className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-2">156</h3>
              <p className="text-gray-600 font-medium">Points gagnés</p>
            </div>
            <div className="bg-white rounded-xl shadow-xl p-6 text-center hover:transform hover:scale-105 transition-all duration-300 border border-gray-100 group hover:border-yellow-200">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-600 transition-colors duration-300">
                <Star className="w-8 h-8 text-yellow-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-2">4.8</h3>
              <p className="text-gray-600 font-medium">Note moyenne</p>
            </div>
          </div>

          {/* Niveaux */}
          <div className="space-y-8">
            {mockData.map((level, index) => (
              <div
                key={level.id}
                className="relative bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl cursor-pointer transform hover:scale-[1.02] border border-gray-100 hover:border-indigo-200"
                onClick={() => setSelectedLevel(level)}
              >
                <div className="p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
                        {index + 1}
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">{level.name}</h2>
                        <p className="text-gray-600 text-lg mb-3">{level.description}</p>
                        <div className="flex items-center space-x-6">
                          <span className="text-sm text-indigo-600 font-semibold bg-indigo-50 px-3 py-1 rounded-full">
                            {level.subjects.length} matières disponibles
                          </span>
                          <span className="text-sm text-gray-500 font-medium">
                            Progression: {level.subjects.length > 0 ? Math.round(level.subjects.reduce((acc, s) => acc + s.progress, 0) / level.subjects.length) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <ArrowRight className="w-8 h-8 text-indigo-600 transform group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-8 py-6">
                  <div className="flex space-x-6 overflow-x-auto">
                    {level.subjects.map((subject) => (
                      <div key={subject.id} className="flex-shrink-0 text-center group">
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${subject.color} text-white flex items-center justify-center text-2xl mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          {subject.icon}
                        </div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">{subject.name}</p>
                        <div className="w-20 bg-gray-200 rounded-full h-3">
                          <div 
                            className={`bg-gradient-to-r ${subject.color} h-3 rounded-full transition-all duration-500`}
                            style={{ width: `${subject.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-medium">{subject.progress}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Vue des matières
  if (!selectedSubject) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 mb-8">
            <button 
              onClick={() => setSelectedLevel(null)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors duration-200 bg-indigo-50 px-3 py-1 rounded-full"
            >
              Parcours d'apprentissage
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700 font-medium">{selectedLevel.name}</span>
          </div>

          {/* Header du niveau */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 text-transparent bg-clip-text mb-6">{selectedLevel.name}</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{selectedLevel.description}</p>
          </div>

          {/* Matières */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {selectedLevel.subjects.map((subject) => (
              <div
                key={subject.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 border border-gray-100 hover:border-indigo-200"
                onClick={() => setSelectedSubject(subject)}
              >
                <div className={`h-40 bg-gradient-to-r ${subject.color} flex items-center justify-center text-7xl text-white relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative z-10">{subject.icon}</div>
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">{subject.name}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{subject.description}</p>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-medium">Progression</span>
                      <span className="text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">{subject.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className={`bg-gradient-to-r ${subject.color} h-4 rounded-full transition-all duration-500 shadow-sm`}
                        style={{ width: `${subject.progress}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-500 pt-2">
                      <span className="font-medium">
                        <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
                        {subject.chapters.filter(c => c.completed).length}/{subject.chapters.length} chapitres
                      </span>
                      <span className="font-medium">
                        <Play className="w-4 h-4 inline mr-1 text-blue-500" />
                        {subject.chapters.reduce((acc, c) => acc + c.videos.length, 0)} vidéos
                      </span>
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

  // Vue des chapitres (parcours visuel)
  if (!selectedChapter && !currentQuiz) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 mb-8">
            <button 
              onClick={() => setSelectedLevel(null)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors duration-200 bg-indigo-50 px-3 py-1 rounded-full"
            >
              Parcours d'apprentissage
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button 
              onClick={() => setSelectedSubject(null)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors duration-200 bg-indigo-50 px-3 py-1 rounded-full"
            >
              {selectedLevel.name}
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700 font-medium">{selectedSubject.name}</span>
          </div>

          {/* Header de la matière */}
          <div className="text-center mb-16">
            <div className={`w-32 h-32 rounded-full bg-gradient-to-r ${selectedSubject.color} text-white flex items-center justify-center text-5xl mx-auto mb-8 shadow-2xl`}>
              {selectedSubject.icon}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 text-transparent bg-clip-text mb-6">{selectedSubject.name}</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{selectedSubject.description}</p>
            
            <div className="mt-8 max-w-md mx-auto">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Progression globale</span>
                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{selectedSubject.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className={`bg-gradient-to-r ${selectedSubject.color} h-4 rounded-full transition-all duration-500 shadow-sm`}
                  style={{ width: `${selectedSubject.progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Parcours des chapitres */}
          <div className="relative max-w-5xl mx-auto">
            {/* Ligne de progression */}
            <div className="absolute left-10 top-20 bottom-20 w-2 bg-gradient-to-b from-indigo-200 to-purple-200 rounded-full"></div>
            
            <div className="space-y-12">
              {selectedSubject.chapters.map((chapter, index) => (
                <div key={chapter.id} className="relative flex items-start">
                  {/* Checkpoint */}
                  <div className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-300 shadow-xl ${
                    chapter.completed 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white cursor-pointer hover:scale-110'
                  }`}>
                    {chapter.completed ? (
                      <CheckCircle className="w-10 h-10" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  
                  {/* Contenu du chapitre */}
                  <div className="ml-12 flex-1 cursor-pointer" onClick={() => setSelectedChapter(chapter)}>
                    <div className="bg-white rounded-2xl shadow-xl p-8 transition-all duration-300 hover:shadow-2xl transform hover:scale-[1.02] border border-gray-100 hover:border-indigo-200">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800 mb-3">{chapter.title}</h3>
                          <p className="text-gray-600 text-lg leading-relaxed">{chapter.description}</p>
                        </div>
                        {chapter.completed && (
                          <div className="flex items-center space-x-3 text-green-600 bg-green-50 px-4 py-2 rounded-full">
                            <Trophy className="w-6 h-6" />
                            <span className="text-sm font-semibold">Complété</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center space-x-8 text-sm text-gray-500">
                          <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full">
                            <Clock className="w-4 h-4 text-indigo-500" />
                            <span className="font-medium">{chapter.estimatedTime}</span>
                          </div>
                          <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full">
                            <Play className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">{chapter.videos.length} vidéos</span>
                          </div>
                          <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full">
                            <Target className="w-4 h-4 text-purple-500" />
                            <span className="font-medium">1 quiz</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-3 pt-2">
                          <button className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                            chapter.completed 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 hover:scale-105'
                              : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 hover:scale-105'
                          }`}>
                            {chapter.completed ? 'Revoir' : 'Commencer'}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              startQuiz(chapter.quiz);
                            }}
                            className="px-6 py-3 bg-purple-100 text-purple-700 rounded-lg font-semibold hover:bg-purple-200 transition-all duration-300 hover:scale-105"
                          >
                            Quiz
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vue du quiz
  if (currentQuiz) {
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];
    
    if (quizResults) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
          <div className="max-w-2xl mx-auto p-8">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Quiz terminé !</h2>
              <p className="text-xl text-gray-600 mb-6">
                Vous avez obtenu {quizResults.correct}/{quizResults.total} bonnes réponses
              </p>
              <div className="text-4xl font-bold text-indigo-600 mb-6">
                {Math.round((quizResults.correct / quizResults.total) * 100)}%
              </div>
              <button
                onClick={() => {
                  setCurrentQuiz(null);
                  setQuizResults(null);
                }}
                className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-300"
              >
                Retour au parcours
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header du quiz */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-transparent bg-clip-text mb-6">{currentQuiz.title}</h1>
              <div className="flex justify-center items-center space-x-6 text-lg text-gray-600">
                <span className="font-semibold">Question {currentQuestionIndex + 1} sur {currentQuiz.questions.length}</span>
                <div className="w-48 bg-gray-200 rounded-full h-3 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full">
                  {Math.round(((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100)}%
                </span>
              </div>
            </div>

            {/* Question */}
            <div className="bg-white rounded-2xl shadow-xl p-10 mb-10 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-8 leading-relaxed">{currentQuestion.question}</h2>
              
              <div className="space-y-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => !showExplanation && answerQuestion(index)}
                    disabled={showExplanation}
                    className={`w-full p-6 text-left rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${
                      showExplanation
                        ? index === currentQuestion.correctAnswer
                          ? 'border-green-500 bg-green-50 text-green-800 shadow-lg'
                          : index === selectedAnswer && index !== currentQuestion.correctAnswer
                          ? 'border-red-500 bg-red-50 text-red-800 shadow-lg'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                        : selectedAnswer === index
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-lg'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        showExplanation
                          ? index === currentQuestion.correctAnswer
                            ? 'bg-green-500 text-white'
                            : index === selectedAnswer && index !== currentQuestion.correctAnswer
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                          : selectedAnswer === index
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-lg">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Explication */}
            {showExplanation && (
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-10 border border-gray-100">
                <div className={`flex items-start space-x-4 ${
                  selectedAnswer === currentQuestion.correctAnswer ? 'text-green-800' : 'text-red-800'
                }`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedAnswer === currentQuestion.correctAnswer ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {selectedAnswer === currentQuestion.correctAnswer ? (
                      <CheckCircle className="w-7 h-7 text-white" />
                    ) : (
                      <span className="text-white font-bold text-xl">✕</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-xl font-bold mb-3 ${
                      selectedAnswer === currentQuestion.correctAnswer ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {selectedAnswer === currentQuestion.correctAnswer ? 'Excellente réponse !' : 'Réponse incorrecte'}
                    </h3>
                    <p className={`text-lg leading-relaxed mb-4 ${
                      selectedAnswer === currentQuestion.correctAnswer ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {currentQuestion.explanation}
                    </p>
                    {selectedAnswer !== currentQuestion.correctAnswer && (
                      <div className="bg-green-100 p-4 rounded-xl border border-green-200">
                        <p className="text-green-800 font-semibold">
                          <strong>Bonne réponse :</strong> {String.fromCharCode(65 + currentQuestion.correctAnswer)}. {currentQuestion.options[currentQuestion.correctAnswer]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setCurrentQuiz(null);
                  setCurrentQuestionIndex(0);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                }}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-semibold transition-colors duration-300 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Quitter le quiz
              </button>
              
              {showExplanation && (
                <button
                  onClick={nextQuestion}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {currentQuestionIndex < currentQuiz.questions.length - 1 ? 'Question suivante' : 'Terminer le quiz'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vue du contenu d'un chapitre
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mb-8">
          <button 
            onClick={() => setSelectedLevel(null)}
            className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors duration-200 bg-indigo-50 px-3 py-1 rounded-full"
          >
            Parcours d'apprentissage
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button 
            onClick={() => setSelectedSubject(null)}
            className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors duration-200 bg-indigo-50 px-3 py-1 rounded-full"
          >
            {selectedLevel?.name}
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button 
            onClick={() => setSelectedChapter(null)}
            className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors duration-200 bg-indigo-50 px-3 py-1 rounded-full"
          >
            {selectedSubject?.name}
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-700 font-medium">{selectedChapter?.title}</span>
        </div>

        {/* Header du chapitre */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 text-transparent bg-clip-text mb-6">{selectedChapter?.title}</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">{selectedChapter?.description}</p>
          
          <div className="flex justify-center items-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md">
              <Clock className="w-5 h-5 text-indigo-500" />
              <span className="font-medium">{selectedChapter?.estimatedTime}</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md">
              <Play className="w-5 h-5 text-blue-500" />
              <span className="font-medium">{selectedChapter?.videos.length} vidéos</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md">
              <Target className="w-5 h-5 text-purple-500" />
              <span className="font-medium">1 quiz final</span>
            </div>
          </div>
        </div>

        {/* Contenu du chapitre */}
        <div className="max-w-5xl mx-auto">
          {/* Vidéos */}
          <div className="mb-16">
            <div className="flex items-center mb-8">
              <Play className="w-8 h-8 text-blue-500 mr-3" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">Vidéos du chapitre</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedChapter?.videos.map((video, index) => (
                <div
                  key={video.id}
                  className="bg-white rounded-2xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl cursor-pointer transform hover:scale-[1.02] border border-gray-100 hover:border-blue-200 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                        video.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {video.completed ? <CheckCircle className="w-7 h-7" /> : <Play className="w-7 h-7" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">{video.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="font-medium">{video.duration}</span>
                          <span className="capitalize font-medium bg-gray-100 px-2 py-1 rounded">
                            {video.type === 'lesson' ? 'Cours' : 'Exercice'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    {video.completed && (
                      <span className="text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full text-sm">
                        ✓ Terminé
                      </span>
                    )}
                    <button className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ml-auto ${
                      video.completed 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 hover:scale-105'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:scale-105'
                    }`}>
                      {video.completed ? 'Revoir' : 'Regarder'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quiz final */}
          <div className="bg-white rounded-2xl shadow-xl p-10 border border-gray-100">
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Target className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-transparent bg-clip-text mb-6">Quiz final du chapitre</h2>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed max-w-2xl mx-auto">
                Testez vos connaissances avec {selectedChapter?.quiz.questions.length} questions et validez votre compréhension du chapitre
              </p>
              
              <button
                onClick={() => startQuiz(selectedChapter?.quiz)}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Commencer le quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningPath;