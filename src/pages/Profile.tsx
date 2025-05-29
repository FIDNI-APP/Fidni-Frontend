// src/pages/Profile.tsx - Version améliorée avec UX/UI moderne
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getUserProfile, 
  getUserStats, 
  getUserContributions, 
  getUserSavedExercises, 
  getUserProgressExercises, 
  getUserHistory,
  updateUserProfile 
} from '@/lib/api';
import { Content, User, ViewHistoryItem } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Loader2, 
  LayoutDashboard, 
  Book, 
  FileText, 
  Activity, 
  Edit2,
  BookOpen,
  Trophy,
  Target,
  TrendingUp,
  Star,
  Award,
  ChevronRight,
  Grid,
  List,
  MoreVertical,
  Share2,
  Flag,
  UserPlus,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

// Import des composants réorganisés
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsOverviewCard } from '@/components/profile/StatsOverviewCard';
import { SavedExercisesSection } from '@/components/profile/SavedExercisesSection';
import { ViewHistorySection } from '@/components/profile/ViewHistorySection';
import { ProgressSection } from '@/components/profile/ProgressSection';
import { ContributionsSection } from '@/components/profile/ContributionsSection';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { ProgressCharts } from '@/components/profile/ProgressCharts';
import StudentNotebook from '@/components/profile/StudentNotebook';

// Nouveau composant pour les quick stats
const QuickStatsBar = ({ stats }: { stats: any }) => {
  const items = [
    { label: 'Exercices', value: stats?.contribution_stats?.exercises || 0, icon: Book, color: 'text-blue-600 bg-blue-50' },
    { label: 'Complétés', value: stats?.learning_stats?.exercises_completed || 0, icon: Trophy, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Points', value: stats?.contribution_stats?.upvotes_received || 0, icon: Star, color: 'text-amber-600 bg-amber-50' },
    { label: 'Vues', value: stats?.contribution_stats?.view_count || 0, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-xl ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-gray-800">{item.value}</span>
          </div>
          <p className="text-sm text-gray-600">{item.label}</p>
        </motion.div>
      ))}
    </div>
  );
};

// Nouveau système de navigation par onglets amélioré
const TabNavigation = ({ activeTab, onTabChange, isOwner }: { 
  activeTab: string, 
  onTabChange: (tab: string) => void,
  isOwner: boolean 
}) => {
  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard, available: true },
    { id: 'progress', label: 'Progression', icon: Target, available: isOwner },
    { id: 'contributions', label: 'Contributions', icon: FileText, available: true },
    { id: 'activity', label: 'Activité', icon: Activity, available: isOwner },
    { id: 'notebook', label: 'Cahier', icon: BookOpen, available: isOwner }
  ].filter(tab => tab.available);

  const tabRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (tabRef.current) {
      const activeButton = tabRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
      if (activeButton) {
        setIndicatorStyle({
          left: activeButton.offsetLeft,
          width: activeButton.offsetWidth
        });
      }
    }
  }, [activeTab]);

  return (
    <div className="bg-white/80 backdrop-blur-md sticky top-16 z-20 border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div ref={tabRef} className="relative flex gap-2 py-2 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm
                transition-all duration-300 whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'text-indigo-700 bg-indigo-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
          
          {/* Indicateur animé */}
          <motion.div
            className="absolute bottom-0 h-0.5 bg-indigo-600 rounded-full"
            animate={indicatorStyle}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>
    </div>
  );
};

// Composant principal du profil avec amélioration UX
export function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  // États
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [contributions, setContributions] = useState<Content[]>([]);
  const [savedExercises, setSavedExercises] = useState<Content[]>([]);
  const [history, setHistory] = useState<ViewHistoryItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [successExercises, setSuccessExercises] = useState<Content[]>([]);
  const [reviewExercises, setReviewExercises] = useState<Content[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [dataLoaded, setDataLoaded] = useState({
    profile: false,
    stats: false,
    contributions: false,
    savedExercises: false,
    history: false,
    successExercises: false,
    reviewExercises: false
  });
  
  const isOwner = currentUser?.username === username;

  // Chargement des données optimisé
  useEffect(() => {
    const loadProfileData = async () => {
      if (!username) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Chargement parallèle des données essentielles
        const [profileData, statsData] = await Promise.all([
          getUserProfile(username),
          getUserStats(username)
        ]);
        
        setUserProfile(profileData);
        setStats(statsData);
        setDataLoaded(prev => ({ ...prev, profile: true, stats: true }));
        
        // Chargement des contributions en arrière-plan
        getUserContributions(username).then(data => {
          setContributions(data?.results || []);
          setDataLoaded(prev => ({ ...prev, contributions: true }));
        });
        
        // Pour le propriétaire, charger les exercices sauvegardés
        if (isOwner) {
          getUserSavedExercises(username).then(data => {
            setSavedExercises(data);
            setDataLoaded(prev => ({ ...prev, savedExercises: true }));
          });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Impossible de charger le profil. Veuillez réessayer.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfileData();
  }, [username, isOwner]);
  
  // Chargement des données spécifiques aux onglets
  useEffect(() => {
    const loadTabData = async () => {
      if (!username || !isOwner) return;
      
      try {
        if (activeTab === 'progress' && !dataLoaded.successExercises) {
          const [successData, reviewData] = await Promise.all([
            getUserProgressExercises(username, 'success'),
            getUserProgressExercises(username, 'review')
          ]);
          
          setSuccessExercises(successData);
          setReviewExercises(reviewData);
          setDataLoaded(prev => ({ 
            ...prev, 
            successExercises: true, 
            reviewExercises: true 
          }));
        }
        
        if (activeTab === 'activity' && !dataLoaded.history) {
          const historyData = await getUserHistory(username);
          setHistory(historyData);
          setDataLoaded(prev => ({ ...prev, history: true }));
        }
      } catch (err) {
        console.error(`Failed to load ${activeTab} data:`, err);
      }
    };
    
    loadTabData();
  }, [activeTab, username, isOwner, dataLoaded]);
  
  const handleEditProfile = () => setIsEditing(true);
  
  const handleSaveProfile = async (userData: any) => {
    try {
      await updateUserProfile(userData);
      setUserProfile(prev => prev ? { ...prev, ...userData } : null);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  };
  
  // État de chargement amélioré
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Chargement du profil...</p>
        </motion.div>
      </div>
    );
  }
  
  if (error || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Flag className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Profil introuvable</h2>
            <p className="text-gray-600 mb-6">{error || 'Le profil demandé n\'existe pas.'}</p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Retour à l'accueil
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/20">
      {/* Mode édition */}
      <AnimatePresence>
        {isEditing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <EditProfileForm 
                user={userProfile} 
                onSave={handleSaveProfile}
                onCancel={() => setIsEditing(false)}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      
      {/* Header du profil modernisé */}
      <div className="relative">
        {/* Effet de gradient animé en arrière-plan */}
        <div className="absolute inset-0 h-96 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
          <div className="absolute inset-0 particles-effect opacity-20"></div>
         <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-20 w-80 h-80 bg-gradient-to-r from-blue-500/20 to-teal-500/20 rounded-full blur-3xl"></div>
        </div>
        
        {/* Contenu du header */}
        <div className="relative pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4">
            {/* Actions du profil */}
            <div className="flex justify-end gap-2 mb-6">
              {isOwner ? (
                <Button
                  onClick={handleEditProfile}
                  className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Suivre
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            
            {/* Informations du profil */}
            <ProfileHeader 
              user={userProfile} 
              stats={stats}
              isOwner={isOwner}
              onEditProfile={handleEditProfile}
            />
          </div>
        </div>
        
        {/* Quick Stats Bar */}
        <div className="relative -mt-8 px-4 max-w-7xl mx-auto">
          <QuickStatsBar stats={stats} />
        </div>
      </div>
      
      {/* Navigation par onglets améliorée */}
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        isOwner={isOwner}
      />
      
      {/* Contenu principal avec animations */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Vue d'ensemble */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Graphiques de progression */}
              {isOwner && stats && (
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      Analyse de progression
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      >
                        {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <ProgressCharts 
                    stats={stats}
                    successExercises={successExercises}
                    reviewExercises={reviewExercises}
                  />
                </div>
              )}
              
              {/* Grille de contenu récent */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contributions récentes */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Contributions récentes
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('contributions')}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      Tout voir
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  
                  {contributions.length > 0 ? (
                    <div className="space-y-3">
                      {contributions.slice(0, 3).map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                        >
                          <h4 className="font-medium text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${
                                item.difficulty === 'easy' ? 'bg-green-500' :
                                item.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              {item.difficulty}
                            </span>
                            <span>•</span>
                            <span>{item.subject.name}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Aucune contribution</p>
                    </div>
                  )}
                </motion.div>
                
                {/* Exercices sauvegardés */}
                {isOwner && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Book className="w-5 h-5 text-indigo-600" />
                        Exercices sauvegardés
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('progress')}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        Tout voir
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    
                    {savedExercises.length > 0 ? (
                      <div className="space-y-3">
                        {savedExercises.slice(0, 3).map((item, index) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                          >
                            <h4 className="font-medium text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              <span>{item.subject.name}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {item.vote_count}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Book className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Aucun exercice sauvegardé</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
              
              {/* Section badges et récompenses */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100"
              >
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Badges et récompenses
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'Débutant', icon: '🌱', earned: true },
                    { name: 'Contributeur', icon: '✍️', earned: true },
                    { name: 'Expert', icon: '🎓', earned: false },
                    { name: 'Mentor', icon: '🏆', earned: false }
                  ].map((badge, index) => (
                    <div
                      key={badge.name}
                      className={`
                        text-center p-4 rounded-xl transition-all
                        ${badge.earned 
                          ? 'bg-white shadow-sm' 
                          : 'bg-gray-100 opacity-50 grayscale'
                        }
                      `}
                    >
                      <div className="text-3xl mb-2">{badge.icon}</div>
                      <p className="text-sm font-medium text-gray-700">{badge.name}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
          
          {/* Onglet Progression */}
          {activeTab === 'progress' && isOwner && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {!dataLoaded.successExercises ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mr-2" />
                  <p>Chargement de votre progression...</p>
                </div>
              ) : (
                <>
                  <ProgressSection 
                    successExercises={successExercises}
                    reviewExercises={reviewExercises}
                    isLoading={false}
                  />
                  
                  <SavedExercisesSection 
                    exercises={savedExercises} 
                    isLoading={false}
                  />
                </>
              )}
            </motion.div>
          )}
          
          {/* Onglet Contributions */}
          {activeTab === 'contributions' && (
            <motion.div
              key="contributions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ContributionsSection 
                success_exercises={{ exercises: dataLoaded.successExercises ? successExercises : [] }}
                review_exercises={{ exercises: dataLoaded.reviewExercises ? reviewExercises : [] }}
                isLoading={false}
              />
            </motion.div>
          )}
          
          {/* Onglet Activité */}
          {activeTab === 'activity' && isOwner && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {!dataLoaded.history ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mr-2" />
                  <p>Chargement de votre activité...</p>
                </div>
              ) : (
                <ViewHistorySection 
                  historyItems={history} 
                  isLoading={false}
                />
              )}
            </motion.div>
          )}
          
          {/* Onglet Cahier */}
          {activeTab === 'notebook' && isOwner && (
            <motion.div
              key="notebook"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden h-[calc(100vh-220px)]">
                <StudentNotebook />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Styles personnalisés */}
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}