// src/pages/OnboardingProfile.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles,
  Brain,
  Target,
  Zap,
  Star,
  TrendingUp,
  Gamepad2,
  Trophy,
  Rocket,
  Heart,
  BookOpen,
  Users,
  GraduationCap,
  Loader2,
  ChevronRight,
  Check,
  X,
  Plus,
  Minus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getClassLevels, 
  getSubjects, 
  saveOnboardingProfile
} from '@/lib/api';
import styles from './OnboardingProfile.module.css';

// Types
interface OnboardingData {
  userType: 'student' | 'teacher';
  classLevel: string;
  learningStyle: 'visual' | 'practical' | 'theoretical' | 'mixed';
  goals: string[];
  favoriteSubjects: string[];
  studyTime: 'casual' | 'regular' | 'intensive';
  gradeRanges: {
    subjectId: string;
    current: number;
    target: number;
  }[];
  bio?: string;
}

// Predefined goals
const LEARNING_GOALS = [
  { id: 'improve_grades', label: 'Améliorer mes notes', icon: TrendingUp },
  { id: 'exam_prep', label: 'Préparer des examens', icon: Target },
  { id: 'understand_better', label: 'Mieux comprendre', icon: Brain },
  { id: 'challenge_myself', label: 'Me challenger', icon: Trophy },
  { id: 'help_others', label: 'Aider les autres', icon: Users },
  { id: 'have_fun', label: "M'amuser en apprenant", icon: Gamepad2 }
];

const STUDY_TIME_OPTIONS = [
  { 
    id: 'casual', 
    label: 'Occasionnel', 
    description: '1-2 fois par semaine',
    color: 'blue'
  },
  { 
    id: 'regular', 
    label: 'Régulier', 
    description: '3-4 fois par semaine',
    color: 'purple'
  },
  { 
    id: 'intensive', 
    label: 'Intensif', 
    description: 'Tous les jours',
    color: 'orange'
  }
];

const OnboardingProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'profile' | 'preferences' | 'goals' | 'subjects' | 'complete'>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reference data
  const [classLevels, setClassLevels] = useState<{id: string, name: string}[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<OnboardingData>({
    userType: 'student',
    classLevel: '',
    learningStyle: 'mixed',
    goals: [],
    favoriteSubjects: [],
    studyTime: 'regular',
    gradeRanges: [],
    bio: ''
  });
  
  // Floating elements for background
  const [floatingElements, setFloatingElements] = useState<JSX.Element[]>([]);
  
  useEffect(() => {
    // Generate floating elements
    const elements = Array.from({ length: 6 }, (_, i) => (
      <div
        key={i}
        className={styles.floatingElement}
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${15 + Math.random() * 10}s`
        }}
      >
        {i % 3 === 0 ? <Star className="w-6 h-6 text-purple-300 opacity-50" /> :
         i % 3 === 1 ? <Sparkles className="w-6 h-6 text-blue-300 opacity-50" /> :
         <Zap className="w-6 h-6 text-pink-300 opacity-50" />}
      </div>
    ));
    setFloatingElements(elements);
  }, []);
  
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    if (user.profile?.onboarding_completed) {
      navigate('/');
    }
  }, [user, navigate]);
  
  useEffect(() => {
    loadClassLevels();
  }, []);
  
  useEffect(() => {
    if (formData.classLevel) {
      loadSubjects(formData.classLevel);
    }
  }, [formData.classLevel]);
  
  const loadClassLevels = async () => {
    try {
      setLoadingData(true);
      const levelsData = await getClassLevels();
      console.log("Class levels loaded:", levelsData);
      setClassLevels(levelsData.map(l => ({ id: l.id, name: l.name })));
    } catch (err) {
      console.error("Error loading class levels:", err);
    } finally {
      setLoadingData(false);
    }
  };
  
  const loadSubjects = async (classLevelId: string) => {
    try {
      setLoadingData(true);
      // getSubjects expects an array of class level IDs
      const subjectsData = await getSubjects([classLevelId]);
      console.log("Subjects loaded for class level", classLevelId, ":", subjectsData);
      setSubjects(subjectsData.map(s => ({ id: s.id, name: s.name })));
    } catch (err) {
      console.error("Error loading subjects:", err);
      setSubjects([]);
    } finally {
      setLoadingData(false);
    }
  };
  
  // Screen navigation with smooth transitions
  const navigateToScreen = (screen: typeof currentScreen) => {
    const screenElement = document.querySelector(`.${styles.screenContent}`);
    if (screenElement) {
      screenElement.classList.add(styles.fadeOut);
      setTimeout(() => {
        setCurrentScreen(screen);
        screenElement.classList.remove(styles.fadeOut);
      }, 300);
    } else {
      setCurrentScreen(screen);
    }
  };
  
  // Welcome Screen
  const renderWelcomeScreen = () => (
    <div className={`${styles.screenContent} ${styles.welcomeScreen}`}>
      <div className={styles.welcomeContent}>
        <div className={styles.logoContainer}>
          <div className={styles.logoGlow}></div>
          <Rocket className="w-20 h-20 text-white" />
        </div>
        
        <h1 className={styles.welcomeTitle}>
          Bienvenue sur Fidni! 🎉
        </h1>
        
        <p className={styles.welcomeSubtitle}>
          Créons ensemble votre expérience d'apprentissage personnalisée
        </p>
        
        <div className={styles.welcomeFeatures}>
          <div className={styles.featureCard}>
            <Brain className="w-8 h-8 text-purple-400 mb-2" />
            <span>Apprentissage adaptatif</span>
          </div>
          <div className={styles.featureCard}>
            <Target className="w-8 h-8 text-blue-400 mb-2" />
            <span>Objectifs personnalisés</span>
          </div>
          <div className={styles.featureCard}>
            <Trophy className="w-8 h-8 text-yellow-400 mb-2" />
            <span>Suivi des progrès</span>
          </div>
        </div>
        
        <button
          onClick={() => navigateToScreen('profile')}
          className={styles.startButton}
        >
          <span>Commencer l'aventure</span>
          <Sparkles className="w-5 h-5 ml-2" />
        </button>
        
        <p className={styles.timeEstimate}>
          ⏱️ Temps estimé : 2-3 minutes
        </p>
      </div>
    </div>
  );
  
  // Profile Screen (User Type & Class Level)
  const renderProfileScreen = () => (
    <div className={`${styles.screenContent} ${styles.profileScreen}`}>
      <div className={styles.screenHeader}>
        <h2 className={styles.screenTitle}>Qui êtes-vous? 🤔</h2>
        <p className={styles.screenDescription}>
          Commençons par les bases pour personnaliser votre expérience
        </p>
      </div>
      
      <div className={styles.profileGrid}>
        <div className={styles.profileSection}>
          <h3 className={styles.sectionTitle}>Je suis...</h3>
          <div className={styles.roleCards}>
            <div
              onClick={() => setFormData({...formData, userType: 'student'})}
              className={`${styles.roleCard} ${formData.userType === 'student' ? styles.selected : ''}`}
            >
              <div className={styles.roleIcon}>
                <GraduationCap className="w-12 h-12" />
              </div>
              <h4>Étudiant</h4>
              <p>J'apprends et je progresse</p>
              {formData.userType === 'student' && (
                <div className={styles.selectedBadge}>
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>
            
            <div
              onClick={() => setFormData({...formData, userType: 'teacher'})}
              className={`${styles.roleCard} ${formData.userType === 'teacher' ? styles.selected : ''}`}
            >
              <div className={styles.roleIcon}>
                <Users className="w-12 h-12" />
              </div>
              <h4>Enseignant</h4>
              <p>J'enseigne et je partage</p>
              {formData.userType === 'teacher' && (
                <div className={styles.selectedBadge}>
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.profileSection}>
          <h3 className={styles.sectionTitle}>Mon niveau</h3>
          {loadingData ? (
            <div className={styles.loadingState}>
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <p>Chargement des niveaux...</p>
            </div>
          ) : (
            <div className={styles.levelGrid}>
              {classLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => {
                    setFormData({...formData, classLevel: level.id});
                    // Load subjects when a class level is selected
                    loadSubjects(level.id);
                  }}
                  className={`${styles.levelButton} ${formData.classLevel === level.id ? styles.selected : ''}`}
                >
                  {level.name}
                  {formData.classLevel === level.id && (
                    <Check className="w-4 h-4 ml-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.navigationButtons}>
        <button
          onClick={() => navigateToScreen('welcome')}
          className={styles.backButton}
        >
          Retour
        </button>
        <button
          onClick={() => navigateToScreen('preferences')}
          disabled={!formData.classLevel}
          className={styles.nextButton}
        >
          Continuer
          <ChevronRight className="w-5 h-5 ml-1" />
        </button>
      </div>
    </div>
  );
  
  // Learning Preferences Screen
  const renderPreferencesScreen = () => (
    <div className={`${styles.screenContent} ${styles.preferencesScreen}`}>
      <div className={styles.screenHeader}>
        <h2 className={styles.screenTitle}>Comment apprenez-vous le mieux? 🧠</h2>
        <p className={styles.screenDescription}>
          Votre style d'apprentissage nous aide à adapter le contenu
        </p>
      </div>
      
      <div className={styles.learningStyles}>
        <div
          onClick={() => setFormData({...formData, learningStyle: 'visual'})}
          className={`${styles.styleCard} ${formData.learningStyle === 'visual' ? styles.selected : ''}`}
        >
          <div className={styles.styleEmoji}>👁️</div>
          <h4>Visuel</h4>
          <p>Schémas, graphiques et illustrations</p>
        </div>
        
        <div
          onClick={() => setFormData({...formData, learningStyle: 'practical'})}
          className={`${styles.styleCard} ${formData.learningStyle === 'practical' ? styles.selected : ''}`}
        >
          <div className={styles.styleEmoji}>🛠️</div>
          <h4>Pratique</h4>
          <p>Exercices et mise en application</p>
        </div>
        
        <div
          onClick={() => setFormData({...formData, learningStyle: 'theoretical'})}
          className={`${styles.styleCard} ${formData.learningStyle === 'theoretical' ? styles.selected : ''}`}
        >
          <div className={styles.styleEmoji}>📚</div>
          <h4>Théorique</h4>
          <p>Concepts et explications détaillées</p>
        </div>
        
        <div
          onClick={() => setFormData({...formData, learningStyle: 'mixed'})}
          className={`${styles.styleCard} ${formData.learningStyle === 'mixed' ? styles.selected : ''}`}
        >
          <div className={styles.styleEmoji}>🎯</div>
          <h4>Mixte</h4>
          <p>Un peu de tout!</p>
        </div>
      </div>
      
      <div className={styles.studyTimeSection}>
        <h3 className={styles.sectionTitle}>Temps d'étude prévu</h3>
        <div className={styles.studyTimeOptions}>
          {STUDY_TIME_OPTIONS.map((option) => (
            <div
              key={option.id}
              onClick={() => setFormData({...formData, studyTime: option.id as any})}
              className={`${styles.studyTimeCard} ${formData.studyTime === option.id ? styles.selected : ''} ${styles[option.color]}`}
            >
              <h4>{option.label}</h4>
              <p>{option.description}</p>
              {formData.studyTime === option.id && (
                <div className={styles.checkIcon}>
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className={styles.navigationButtons}>
        <button
          onClick={() => navigateToScreen('profile')}
          className={styles.backButton}
        >
          Retour
        </button>
        <button
          onClick={() => navigateToScreen('goals')}
          className={styles.nextButton}
        >
          Continuer
          <ChevronRight className="w-5 h-5 ml-1" />
        </button>
      </div>
    </div>
  );
  
  // Goals Screen
  const renderGoalsScreen = () => {
    const toggleGoal = (goalId: string) => {
      const newGoals = formData.goals.includes(goalId)
        ? formData.goals.filter(g => g !== goalId)
        : [...formData.goals, goalId];
      setFormData({...formData, goals: newGoals});
    };
    
    return (
      <div className={`${styles.screenContent} ${styles.goalsScreen}`}>
        <div className={styles.screenHeader}>
          <h2 className={styles.screenTitle}>Quels sont vos objectifs? 🎯</h2>
          <p className={styles.screenDescription}>
            Sélectionnez tous ceux qui vous correspondent
          </p>
        </div>
        
        <div className={styles.goalsGrid}>
          {LEARNING_GOALS.map((goal) => {
            const Icon = goal.icon;
            const isSelected = formData.goals.includes(goal.id);
            
            return (
              <div
                key={goal.id}
                onClick={() => toggleGoal(goal.id)}
                className={`${styles.goalCard} ${isSelected ? styles.selected : ''}`}
              >
                <div className={styles.goalIcon}>
                  <Icon className="w-8 h-8" />
                </div>
                <span>{goal.label}</span>
                {isSelected && (
                  <div className={styles.goalCheck}>
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className={styles.bioSection}>
          <h3 className={styles.sectionTitle}>
            Quelque chose à ajouter? (optionnel)
          </h3>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({...formData, bio: e.target.value})}
            placeholder="Parlez-nous de vos aspirations, défis ou toute autre chose..."
            className={styles.bioTextarea}
            rows={3}
          />
        </div>
        
        <div className={styles.navigationButtons}>
          <button
            onClick={() => navigateToScreen('preferences')}
            className={styles.backButton}
          >
            Retour
          </button>
          <button
            onClick={() => navigateToScreen('subjects')}
            disabled={formData.goals.length === 0}
            className={styles.nextButton}
          >
            Continuer
            <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>
    );
  };
  
  // Subjects Screen with Grade Targets
  const renderSubjectsScreen = () => {
    const toggleSubject = (subjectId: string) => {
      if (formData.favoriteSubjects.includes(subjectId)) {
        setFormData({
          ...formData,
          favoriteSubjects: formData.favoriteSubjects.filter(s => s !== subjectId),
          gradeRanges: formData.gradeRanges.filter(g => g.subjectId !== subjectId)
        });
      } else {
        setFormData({
          ...formData,
          favoriteSubjects: [...formData.favoriteSubjects, subjectId],
          gradeRanges: [...formData.gradeRanges, {
            subjectId,
            current: 12,
            target: 16
          }]
        });
      }
    };
    
    const updateGrade = (subjectId: string, field: 'current' | 'target', value: number) => {
      setFormData({
        ...formData,
        gradeRanges: formData.gradeRanges.map(g =>
          g.subjectId === subjectId ? {...g, [field]: value} : g
        )
      });
    };
    
    return (
      <div className={`${styles.screenContent} ${styles.subjectsScreen}`}>
        <div className={styles.screenHeader}>
          <h2 className={styles.screenTitle}>Vos matières favorites 💝</h2>
          <p className={styles.screenDescription}>
            Sélectionnez vos matières et définissez vos objectifs de progression
          </p>
        </div>
        
        <div className={styles.subjectsContainer}>
          {loadingData ? (
            <div className={styles.loadingState}>
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <p>Chargement des matières...</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className={styles.noSubjectsMessage}>
              <BookOpen className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">Aucune matière disponible</p>
              <p className="text-gray-500 text-sm mt-2">
                Veuillez sélectionner un niveau d'études d'abord
              </p>
              <button
                onClick={() => navigateToScreen('profile')}
                className={styles.backButton}
                style={{marginTop: '1rem'}}
              >
                Retourner au profil
              </button>
            </div>
          ) : (
            <>
              <div className={styles.subjectsList}>
                {subjects.map((subject) => {
                  const isSelected = formData.favoriteSubjects.includes(subject.id);
                  const gradeData = formData.gradeRanges.find(g => g.subjectId === subject.id);
                  
                  return (
                    <div key={subject.id} className={styles.subjectItem}>
                      <div
                        onClick={() => toggleSubject(subject.id)}
                        className={`${styles.subjectHeader} ${isSelected ? styles.selected : ''}`}
                      >
                        <div className={styles.subjectInfo}>
                          <BookOpen className="w-5 h-5" />
                          <span>{subject.name}</span>
                        </div>
                        <div className={styles.subjectToggle}>
                          {isSelected ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <Plus className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      {isSelected && gradeData && (
                        <div className={styles.gradeTargets}>
                          <div className={styles.gradeControl}>
                            <label>Note actuelle</label>
                            <div className={styles.gradeInput}>
                              <button
                                onClick={() => updateGrade(subject.id, 'current', Math.max(0, gradeData.current - 1))}
                                className={styles.gradeButton}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className={styles.gradeValue}>{gradeData.current}</span>
                              <button
                                onClick={() => updateGrade(subject.id, 'current', Math.min(20, gradeData.current + 1))}
                                className={styles.gradeButton}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className={styles.gradeControl}>
                            <label>Objectif</label>
                            <div className={styles.gradeInput}>
                              <button
                                onClick={() => updateGrade(subject.id, 'target', Math.max(gradeData.current, gradeData.target - 1))}
                                className={styles.gradeButton}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className={styles.gradeValue}>{gradeData.target}</span>
                              <button
                                onClick={() => updateGrade(subject.id, 'target', Math.min(20, gradeData.target + 1))}
                                className={styles.gradeButton}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className={styles.progressBar}>
                            <div 
                              className={styles.progressFill}
                              style={{
                                width: `${(gradeData.current / 20) * 100}%`,
                                backgroundColor: '#60a5fa'
                              }}
                            />
                            <div 
                              className={styles.progressTarget}
                              style={{
                                left: `${(gradeData.target / 20) * 100}%`
                              }}
                            >
                              <Target className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className={styles.subjectsSummary}>
                <p>{formData.favoriteSubjects.length} matière{formData.favoriteSubjects.length > 1 ? 's' : ''} sélectionnée{formData.favoriteSubjects.length > 1 ? 's' : ''}</p>
              </div>
            </>
          )}
        </div>
        
        <div className={styles.navigationButtons}>
          <button
            onClick={() => navigateToScreen('goals')}
            className={styles.backButton}
          >
            Retour
          </button>
          <button
            onClick={handleSubmit}
            disabled={formData.favoriteSubjects.length === 0 || isLoading}
            className={styles.submitButton}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Finalisation...
              </>
            ) : (
              <>
                Terminer
                <Rocket className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };
  
  // Complete Screen
  const renderCompleteScreen = () => (
    <div className={`${styles.screenContent} ${styles.completeScreen}`}>
      <div className={styles.completeAnimation}>
        <div className={styles.successCircle}>
          <Check className="w-16 h-16 text-white" />
        </div>
        <div className={styles.confetti}>
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className={styles.confettiPiece} style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#fdcb6e', '#6c5ce7'][Math.floor(Math.random() * 5)]
            }} />
          ))}
        </div>
      </div>
      
      <h2 className={styles.completeTitle}>Bravo! 🎉</h2>
      <p className={styles.completeMessage}>
        Votre profil est maintenant configuré. Préparez-vous pour une expérience d'apprentissage exceptionnelle!
      </p>
      
      <div className={styles.completeSummary}>
        <div className={styles.summaryItem}>
          <Heart className="w-5 h-5 text-red-500" />
          <span>{formData.favoriteSubjects.length} matières</span>
        </div>
        <div className={styles.summaryItem}>
          <Target className="w-5 h-5 text-blue-500" />
          <span>{formData.goals.length} objectifs</span>
        </div>
        <div className={styles.summaryItem}>
          <Zap className="w-5 h-5 text-yellow-500" />
          <span>Prêt à apprendre!</span>
        </div>
      </div>
      
      <button
        onClick={() => navigate('/')}
        className={styles.startLearningButton}
      >
        Commencer à apprendre
        <Rocket className="w-5 h-5 ml-2" />
      </button>
    </div>
  );
  
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        setError("Vous devez être connecté.");
        return;
      }
      
      // Transform data for API
      const apiData = {
        class_level: formData.classLevel,
        user_type: formData.userType,
        bio: formData.bio || `Style d'apprentissage: ${formData.learningStyle}, Temps d'étude: ${formData.studyTime}, Objectifs: ${formData.goals.join(', ')}`,
        favorite_subjects: formData.favoriteSubjects,
        subject_grades: formData.gradeRanges.map(grade => ({
          subject: grade.subjectId,
          min_grade: grade.current,
          max_grade: grade.target
        }))
      };
      
      await saveOnboardingProfile(apiData);
      await refreshUser();
      
      navigateToScreen('complete');
      
      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (err) {
      console.error("Error:", err);
      setError("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!user) {
    return (
      <div className={styles.onboardingWrapper}>
        <div className={styles.loadingState}>
          <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.onboardingWrapper}>
      <div className={styles.backgroundEffects}>
        {floatingElements}
      </div>
      
      <div className={styles.contentContainer}>
        {error && (
          <div className={styles.errorBanner}>
            <X className="w-5 h-5" />
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
        
        {currentScreen === 'welcome' && renderWelcomeScreen()}
        {currentScreen === 'profile' && renderProfileScreen()}
        {currentScreen === 'preferences' && renderPreferencesScreen()}
        {currentScreen === 'goals' && renderGoalsScreen()}
        {currentScreen === 'subjects' && renderSubjectsScreen()}
        {currentScreen === 'complete' && renderCompleteScreen()}
      </div>
      
      {/* Progress indicators */}
      {currentScreen !== 'welcome' && currentScreen !== 'complete' && (
        <div className={styles.progressIndicator}>
          <div className={`${styles.progressDot} ${['profile'].includes(currentScreen) ? styles.active : ''}`} />
          <div className={`${styles.progressDot} ${['preferences'].includes(currentScreen) ? styles.active : ''}`} />
          <div className={`${styles.progressDot} ${['goals'].includes(currentScreen) ? styles.active : ''}`} />
          <div className={`${styles.progressDot} ${['subjects'].includes(currentScreen) ? styles.active : ''}`} />
        </div>
      )}
    </div>
  );
};

export default OnboardingProfile;