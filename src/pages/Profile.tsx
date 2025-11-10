// src/pages/Profile.tsx - Version améliorée et affinée
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  FileText,
  Activity,
  Edit2,
  BookOpen,
  Target,
  Share2,
  Flag,
  UserPlus,
  ListChecks,
  TrendingUp,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

// Import des composants de profil
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileInfoCard } from '@/components/profile/ProfileInfoCard';
import { SavedContentSection } from '@/components/profile/SavedContentSection';
import { ViewHistorySection } from '@/components/profile/ViewHistorySection';
import { ProgressSection } from '@/components/profile/ProgressSection';
import { ContributionsSection } from '@/components/profile/ContributionsSection';
import { ProgressCharts } from '@/components/profile/ProgressCharts';
import { TimeTrackingStatsRevised } from '@/components/profile/TimeTrackingStatsRevised';
import StudentNotebook from '@/components/profile/StudentNotebook'; // Renommé pour correspondre au nom de fichier
import { RevisionListsSection } from '@/components/profile/RevisionListsSection';
import { StatsOverviewCard } from '@/components/profile/StatsOverviewCard';
import { ActivityHeatmap } from '@/components/profile/ActivityHeatmap';

// TabNavigation: Clean professional design matching homepage style
const TabNavigation: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOwner: boolean;
  userType: 'student' | 'teacher';
}> = ({ activeTab, onTabChange, isOwner, userType }) => {
  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard, available: true },
    { id: 'informations', label: 'Informations', icon: UserPlus, available: isOwner },
    { id: 'progress', label: 'Progression', icon: Target, available: isOwner },
    { id: 'contributions', label: 'Contributions', icon: FileText, available: userType === 'teacher' },
    { id: 'timetracking', label: 'Statistiques', icon: TrendingUp, available: isOwner },
    { id: 'notebook', label: 'Notes', icon: BookOpen, available: isOwner }
  ].filter(tab => tab.available);

  const tabContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-white/80 backdrop-blur-md sticky top-0 md:top-16 z-30 border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={tabContainerRef} className="flex gap-2 py-3 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-gray-700 to-purple-800 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};


export function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, isLoading: authLoading } = useAuth(); // Added authLoading
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null); // Define specific type for stats
  const [contributions, setContributions] = useState<Content[]>([]);
  const [savedExercises, setSavedExercises] = useState<Content[]>([]);
  const [history, setHistory] = useState<ViewHistoryItem[]>([]);
  const [successExercises, setSuccessExercises] = useState<Content[]>([]);
  const [reviewExercises, setReviewExercises] = useState<Content[]>([]);
  const [dailyActivity, setDailyActivity] = useState<any[]>([]);

  // Initialize activeTab from URL query parameter or default to 'overview'
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'overview';
  });

  // More granular data loading states
  const [dataLoaded, setDataLoaded] = useState({
    profile: false, stats: false, contributions: false,
    savedExercises: false, history: false, progressExercises: false, dailyActivity: false
  });

  const isOwner = !authLoading && currentUser?.username === username;

  // Handler to change tab and update URL
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Sync tab from URL changes (browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return; // Wait for auth context to load

    const loadInitialData = async () => {
      if (!username) return;
      setIsLoadingProfile(true);
      setError(null);
      setDataLoaded(prev => ({ ...prev, profile: false, stats: false, contributions: false, savedExercises: false, dailyActivity: false }));

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
          // Load saved exercises
          getUserSavedExercises(username).then(data => {
            setSavedExercises(data);
            setDataLoaded(prev => ({ ...prev, savedExercises: true }));
          });

          // Load daily activity for heatmap
          import('@/lib/api/apiClient').then(({ api }) => {
            api.get(`/users/${username}/study-stats/`).then(response => {
              setDailyActivity(response.data.daily_activity || []);
              setDataLoaded(prev => ({ ...prev, dailyActivity: true }));
            }).catch(err => {
              console.error('Failed to load daily activity:', err);
              setDataLoaded(prev => ({ ...prev, dailyActivity: true })); // Mark as loaded even on error
            });
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


  const handleEditProfile = () => {
    // Navigate to dedicated edit page instead of modal
    navigate(`/profile/${username}/edit`);
  };


  if (isLoadingProfile && !dataLoaded.profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-12 h-12 border-3 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-700 font-medium">Chargement...</p>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Header Section with gradient matching homepage */}
      <section className="relative bg-gradient-to-r from-gray-900 to-purple-800 text-white py-12 md:py-16 mb-8 overflow-hidden">
        {/* Animated background elements - matching homepage */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-20 -left-20 w-60 h-60 bg-purple-300/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute -bottom-20 right-1/3 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

          {/* Geometric patterns */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Action buttons */}
          <div className="flex justify-end gap-2 mb-6">
            {isOwner ? (
              <Button
                onClick={handleEditProfile}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md text-sm"
                size="sm"
              >
                <Edit2 className="w-4 h-4 mr-1" /> Modifier le profil
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 border border-white/20 backdrop-blur-md">
                  <UserPlus className="w-4 h-4 mr-1" />Suivre
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 border border-white/20 backdrop-blur-md">
                  <Share2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Simplified ProfileHeader - only user identity info */}
          <ProfileHeader
            user={userProfile}
            stats={stats}
            isOwner={isOwner}
            onEditProfile={handleEditProfile}
          />
        </div>
      </section>

      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOwner={isOwner}
        userType={userProfile.profile.user_type}
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
              className="space-y-6"
            >
              {/* Main Stats Overview */}
              <StatsOverviewCard
                contributionStats={stats?.contribution_stats || {}}
                learningStats={stats?.learning_stats}
                isLoading={!dataLoaded.stats}
                userType={userProfile.profile.user_type}
              />

              {/* Activity Heatmap - only for owner */}
              {isOwner && dailyActivity.length > 0 && (
                <ActivityHeatmap daily_activity={dailyActivity} />
              )}
            </motion.div>
          )}

          {/* New Informations Tab */}
          {activeTab === 'informations' && isOwner && (
            <motion.div
              key="informations-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ProfileInfoCard user={userProfile} />
            </motion.div>
          )}

          {activeTab === 'progress' && isOwner && (
            <motion.div
              key="progress-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 md:space-y-8"
            >
              <ProgressCharts
                stats={stats}
                successExercises={successExercises}
                reviewExercises={reviewExercises}
              />
              <ProgressSection
                successExercises={successExercises}
                reviewExercises={reviewExercises}
                isLoading={!dataLoaded.progressExercises}
              />
            </motion.div>
          )}

          {activeTab === 'contributions' && (
            <motion.div
              key="contributions-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ContributionsSection
                success_exercises={{ exercises: contributions }}
                review_exercises={{ exercises: [] }}
                isLoading={!dataLoaded.contributions}
              />
            </motion.div>
          )}

          {activeTab === 'timetracking' && isOwner && (
            <motion.div
              key="timetracking-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TimeTrackingStatsRevised username={username!} />
            </motion.div>
          )}

          {activeTab === 'activity' && isOwner && (
            <motion.div
              key="activity-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ViewHistorySection
                items={history}
                isLoading={!dataLoaded.history}
              />
            </motion.div>
          )}

          {activeTab === 'notebook' && isOwner && (
            <motion.div
              key="notebook-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StudentNotebook />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
