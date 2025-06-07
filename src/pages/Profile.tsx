// src/pages/Profile.tsx - Version améliorée et affinée
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
} from '@/lib/api'; // Vos fonctions API
import { Content, User, ViewHistoryItem } from '@/types'; // Vos types
import { useAuth } from '@/contexts/AuthContext';
import {
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
  MoreVertical,
  Share2,
  Flag,
  UserPlus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

// Import des composants de profil (assumant qu'ils ont été améliorés comme dans les tours précédents)
import { ProfileHeader } from '@/components/profile/ProfileHeader';
// import { StatsOverviewCard } from '@/components/profile/StatsOverviewCard'; // Remplacé par QuickStatsBar et ProgressCharts
import { SavedExercisesSection } from '@/components/profile/SavedExercisesSection';
import { ViewHistorySection } from '@/components/profile/ViewHistorySection';
import { ProgressSection } from '@/components/profile/ProgressSection';
import { ContributionsSection } from '@/components/profile/ContributionsSection';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { ProgressCharts } from '@/components/profile/ProgressCharts';
import { TimeTrackingStats } from '@/components/profile/TimeTrackingStats';
import StudentNotebook from '@/components/profile/StudentNotebook'; // Renommé pour correspondre au nom de fichier

// QuickStatsBar: Style affiné pour une meilleure intégration
const QuickStatsBar: React.FC<{ stats: any }> = ({ stats }) => {
  const items = [
    { label: 'Exercices Créés', value: stats?.contribution_stats?.exercises || 0, icon: Book, color: 'text-blue-600 bg-blue-100/70 ring-blue-500/20' },
    { label: 'Complétés', value: stats?.learning_stats?.exercises_completed || 0, icon: Trophy, color: 'text-emerald-600 bg-emerald-100/70 ring-emerald-500/20' },
    { label: 'Réputation', value: stats?.contribution_stats?.upvotes_received || 0, icon: Star, color: 'text-amber-600 bg-amber-100/70 ring-amber-500/20' },
    { label: 'Impact (Vues)', value: stats?.contribution_stats?.view_count || 0, icon: TrendingUp, color: 'text-purple-600 bg-purple-100/70 ring-purple-500/20' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-8">
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + index * 0.1, type: "spring", stiffness: 200, damping: 15 }}
          className="bg-white/70 backdrop-blur-lg rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 ring-1 ring-inset ring-gray-900/5"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className={`p-2.5 rounded-xl ${item.color} ring-1 ring-inset`}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-2xl md:text-3xl font-bold text-gray-800">{item.value.toLocaleString()}</span>
          </div>
          <p className="text-sm text-gray-600 truncate">{item.label}</p>
        </motion.div>
      ))}
    </div>
  );
};

// TabNavigation: Style affiné
const TabNavigation: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOwner: boolean;
}> = ({ activeTab, onTabChange, isOwner }) => {
  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard, available: true },
    { id: 'progress', label: 'Progression', icon: Target, available: isOwner },
    { id: 'contributions', label: 'Contributions', icon: FileText, available: true },
    { id: 'timetracking', label: 'Temps d\'étude', icon: TrendingUp, available: isOwner },
    { id: 'activity', label: 'Activité', icon: Activity, available: isOwner },
    { id: 'notebook', label: 'Cahier Digital', icon: BookOpen, available: isOwner }
  ].filter(tab => tab.available);

  const tabContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-white/80 backdrop-blur-md sticky top-0 md:top-16 z-30 border-b border-gray-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div ref={tabContainerRef} className="relative flex gap-1 sm:gap-2 py-2 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tab-id={tab.id} // For indicator positioning
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-lg font-medium text-xs sm:text-sm
                  transition-colors duration-200 ease-in-out whitespace-nowrap group
                  ${isActive
                    ? 'text-indigo-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/70'
                  }
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-indigo-100/80 rounded-lg z-0 shadow-sm"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center">
                  <tab.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  <span className="ml-1.5 hidden sm:inline">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};


export function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, isLoading: authLoading } = useAuth(); // Added authLoading
  const navigate = useNavigate();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null); // Define specific type for stats
  const [contributions, setContributions] = useState<Content[]>([]);
  const [savedExercises, setSavedExercises] = useState<Content[]>([]);
  const [history, setHistory] = useState<ViewHistoryItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [successExercises, setSuccessExercises] = useState<Content[]>([]);
  const [reviewExercises, setReviewExercises] = useState<Content[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // More granular data loading states
  const [dataLoaded, setDataLoaded] = useState({
    profile: false, stats: false, contributions: false,
    savedExercises: false, history: false, progressExercises: false
  });

  const isOwner = !authLoading && currentUser?.username === username;

  useEffect(() => {
    if (authLoading) return; // Wait for auth context to load

    const loadInitialData = async () => {
      if (!username) return;
      setIsLoadingProfile(true);
      setError(null);
      setDataLoaded(prev => ({ ...prev, profile: false, stats: false, contributions: false, savedExercises: false }));

      try {
        const [profileData, statsData, contributionsData] = await Promise.all([
          getUserProfile(username),
          getUserStats(username),
          getUserContributions(username) // Assuming it returns { results: Content[] }
        ]);

        setUserProfile(profileData);
        setStats(statsData);
        setContributions(contributionsData?.results || []);
        setDataLoaded(prev => ({ ...prev, profile: true, stats: true, contributions: true }));

        if (isOwner) {
          getUserSavedExercises(username).then(data => {
            setSavedExercises(data);
            setDataLoaded(prev => ({ ...prev, savedExercises: true }));
          });
        }
      } catch (err) {
        console.error('Failed to load initial profile data:', err);
        setError('Impossible de charger les données initiales du profil.');
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadInitialData();
  }, [username, isOwner, authLoading]);

  useEffect(() => {
    if (authLoading || !isOwner || !username) return;

    const loadTabData = async () => {
      try {
        if (activeTab === 'progress' && !dataLoaded.progressExercises) {
          setIsLoadingProfile(true); // Show loader for tab data if significant
          const [successData, reviewData] = await Promise.all([
            getUserProgressExercises(username, 'success'),
            getUserProgressExercises(username, 'review')
          ]);
          setSuccessExercises(successData);
  setReviewExercises(reviewData);
          setDataLoaded(prev => ({ ...prev, progressExercises: true }));
          setIsLoadingProfile(false);
        }
        if (activeTab === 'activity' && !dataLoaded.history) {
          setIsLoadingProfile(true);
          const historyData = await getUserHistory(username);
          setHistory(historyData);
          setDataLoaded(prev => ({ ...prev, history: true }));
          setIsLoadingProfile(false);
        }
      } catch (err) {
        console.error(`Failed to load ${activeTab} data:`, err);
        setError(`Impossible de charger les données pour l'onglet ${activeTab}.`);
        setIsLoadingProfile(false);
      }
    };
    loadTabData();
  }, [activeTab, username, isOwner, dataLoaded.progressExercises, dataLoaded.history, authLoading]);


  const handleEditProfile = () => setIsEditing(true);
  const handleSaveProfile = async (formData: FormData) => { // Updated to accept FormData
    if (!userProfile) return;
    try {
      const updatedData = await updateUserProfile(formData); // Assuming API handles FormData
      setUserProfile(prev => prev ? { ...prev, ...updatedData, profile: {...prev.profile, ...updatedData.profile} } : null); // Adjust based on API response
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err; // Re-throw for EditProfileForm to handle
    }
  };


  if (isLoadingProfile && !dataLoaded.profile) { // More specific loading condition
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-indigo-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-xl"
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200/50 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-700 font-semibold text-lg">Chargement du profil...</p>
          <p className="text-gray-500 text-sm">Un instant, nous préparons tout pour vous.</p>
        </motion.div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center max-w-md w-full"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 ring-4 ring-red-200/50">
            <Flag className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">Oops! Profil Introuvable</h2>
          <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">{error || 'Le profil que vous cherchez n\'existe pas ou une erreur est survenue.'}</p>
          <Button
            onClick={() => navigate(-1)} // Go back or to home
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
            size="lg"
          >
            Retourner en arrière
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-slate-50 to-indigo-100/30">
      <AnimatePresence>
        {isEditing && (
          <motion.div
            key="edit-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsEditing(false)} // Close on backdrop click
          >
            <motion.div
              key="edit-modal-content"
              initial={{ scale: 0.9, opacity: 0, y:20 }}
              animate={{ scale: 1, opacity: 1, y:0 }}
              exit={{ scale: 0.9, opacity: 0, y:20, transition:{duration:0.2} }}
              transition={{ type:"spring", stiffness:300, damping:25}}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
              {/* EditProfileForm is assumed to be styled from previous turn */}
              <EditProfileForm
                user={userProfile}
                onSave={handleSaveProfile}
                onCancel={() => setIsEditing(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-[450px] bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 overflow-hidden">
          {/* Placeholder for particles or abstract background visuals */}
          {/* <div className="absolute inset-0 particles-effect opacity-10"></div> */}
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-teal-500/10 rounded-full blur-3xl animate-pulse-slower"></div>
        </div>

        <div className="relative pt-12 md:pt-20 pb-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end gap-2 mb-4 md:mb-6">
              {isOwner ? (
                <Button
                  onClick={handleEditProfile}
                  className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20 shadow-lg"
                  size="sm"
                >
                  <Edit2 className="w-4 h-4 mr-1.5" /> Modifier
                </Button>
              ) : (
                <> {/* Buttons for non-owner */}
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 backdrop-blur-sm"><UserPlus className="w-4 h-4 mr-1.5" />Suivre</Button>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 backdrop-blur-sm"><Share2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 backdrop-blur-sm"><MoreVertical className="w-4 h-4" /></Button>
                </>
              )}
            </div>
            {/* ProfileHeader is assumed to be styled from previous turn */}
            <ProfileHeader
              user={userProfile}
              stats={stats}
              isOwner={isOwner}
              onEditProfile={handleEditProfile}
            />
          </div>
        </div>
        <div className="relative -mt-5 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <QuickStatsBar stats={stats} />
        </div>
      </div>

      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOwner={isOwner}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 md:space-y-8"
            >
              {isOwner && stats && (dataLoaded.progressExercises || (!isLoadingProfile && successExercises.length > 0)) && ( // Show if data ready or not loading
                // ProgressCharts is assumed to be styled from previous turn
                <ProgressCharts
                  stats={stats}
                  successExercises={successExercises}
                  reviewExercises={reviewExercises}
                />
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* ContributionsSection and SavedExercisesSection will use their internal refined styling */}
                 <ContributionsSection
                    success_exercises={{ exercises: contributions.filter(c => !c.needs_review) }} // Example differentiation
                    review_exercises={{ exercises: contributions.filter(c => c.needs_review) }}
                    isLoading={!dataLoaded.contributions && isLoadingProfile}
                  />
                {isOwner && (
                   <SavedExercisesSection
                      exercises={savedExercises}
                      isLoading={!dataLoaded.savedExercises && isLoadingProfile}
                    />
                )}
              </div>
              {/* Placeholder for Badges section from your original markup - style as needed */}
              <motion.div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200/80">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" /> Badges et Récompenses
                </h3>
                 <p className="text-gray-500">Vos badges et récompenses apparaîtront ici bientôt !</p>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'progress' && isOwner && (
            <motion.div key="progress-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{duration:0.3}} className="space-y-6 md:space-y-8">
              {/* ProgressSection is assumed to be styled from previous turn */}
               <ProgressSection
                  successExercises={successExercises}
                  reviewExercises={reviewExercises}
                  isLoading={!dataLoaded.progressExercises && isLoadingProfile}
                />
            </motion.div>
          )}
          
          {activeTab === 'contributions' && (
             <motion.div key="contributions-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{duration:0.3}}>
                {/* ContributionsSection full view will be handled by its own internal logic if it has one, or just shows all here */}
                <ContributionsSection 
                    success_exercises={{ exercises: contributions.filter(c => !c.needs_review) }}
                    review_exercises={{ exercises: contributions.filter(c => c.needs_review) }}
                    isLoading={!dataLoaded.contributions && isLoadingProfile}
                />
             </motion.div>
          )}

          {activeTab === 'timetracking' && isOwner && (
            <motion.div key="timetracking-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{duration:0.3}}>
              {/* Time Tracking Statistics - Dedicated Tab */}
              <TimeTrackingStats username={username || ''} />
            </motion.div>
          )}

          {activeTab === 'activity' && isOwner && (
            <motion.div key="activity-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{duration:0.3}}>
              {/* ViewHistorySection is assumed to be styled from previous turn */}
               <ViewHistorySection
                  historyItems={history}
                  isLoading={!dataLoaded.history && isLoadingProfile}
                />
            </motion.div>
          )}

          {activeTab === 'notebook' && isOwner && (
            <motion.div key="notebook-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{duration:0.3}}>
              {/* StudentNotebook styling is self-contained or needs separate full refactor */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[calc(100vh-300px)] md:min-h-[calc(100vh-250px)]">
                <StudentNotebook />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Custom global styles can be kept if they are essential */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1); }
        }
        .animate-pulse-slow { animation: pulse-slow 8s infinite ease-in-out; }
        .animate-pulse-slower { animation: pulse-slower 10s infinite ease-in-out; }

        /* Basic particles effect placeholder (replace with actual library if needed) */
        .particles-effect { 
          /* background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px); */
          /* background-size: 1.5rem 1.5rem; */
        }
      `}</style>
    </div>
  );
  
}