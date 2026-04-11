// src/pages/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserProfile,
  getUserStats,
  getUserSavedExercises,
  getUserSavedLessons,
  getUserSavedExams,
  getUserProgressExercises
} from '@/lib/api/userApi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Target, BarChart3, Bookmark, NotebookPen,
  ListChecks, Settings, Loader2, Menu, Brain, X, Users
} from 'lucide-react';

// Import des sections
import { ProfileOverviewSection } from '@/components/profile/ProfileOverviewSection';
import { StatsDashboard } from '@/components/profile/StatsDashboard';
import { ProgressSection } from '@/components/profile/ProgressSection';
import { SavedContentSection } from '@/components/profile/SavedContentSection';
import { RevisionListsSection } from '@/components/profile/RevisionListsSection';
import StudentNotebook from '@/components/profile/StudentNotebook';
import { SettingsSection } from '@/components/profile/SettingsSection';
import { SkillIQSection } from '@/components/profile/SkillIQSection';
import TeacherStudentsPanel from '@/components/profile/TeacherStudentsPanel';

interface FeatureConfig {
  id: string;
  title: string;
  icon: React.ElementType;
  forUserType: ('student' | 'teacher')[];
  ownerOnly?: boolean;
}

const FEATURES_CONFIG: FeatureConfig[] = [
  { id: 'overview', title: 'Vue d\'ensemble', icon: User, forUserType: ['student', 'teacher'] },
  { id: 'statistics', title: 'Statistiques', icon: BarChart3, forUserType: ['student', 'teacher'] },
  { id: 'progress', title: 'Progression', icon: Target, forUserType: ['student'] },
  { id: 'skilliq', title: 'Skill IQ', icon: Brain, forUserType: ['student'] },
  { id: 'notebooks', title: 'Cahiers', icon: NotebookPen, forUserType: ['student'] },
  { id: 'revisionlists', title: 'Révisions', icon: ListChecks, forUserType: ['student'] },
  { id: 'saved', title: 'Favoris', icon: Bookmark, forUserType: ['student', 'teacher'] },
  { id: 'students', title: 'Mes élèves', icon: Users, forUserType: ['teacher'], ownerOnly: true },
  { id: 'settings', title: 'Paramètres', icon: Settings, forUserType: ['student', 'teacher'], ownerOnly: true },
];

interface SavedData {
  exercises: any[];
  lessons: any[];
  exams: any[];
}

interface ProgressData {
  successExercises: any[];
  reviewExercises: any[];
}

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();

  const [activeSection, setActiveSection] = useState<string>(searchParams.get('tab') || 'overview');
  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [savedData, setSavedData] = useState<SavedData>({ exercises: [], lessons: [], exams: [] });
  const [progressData, setProgressData] = useState<ProgressData>({ successExercises: [], reviewExercises: [] });
  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isOwner = currentUser?.username === username;
  const userType = profileData?.profile?.user_type || 'student';

  const availableFeatures = FEATURES_CONFIG.filter(f => {
    const matchesUserType = f.forUserType.includes(userType as 'student' | 'teacher');
    const matchesOwner = f.ownerOnly ? isOwner : true;
    return matchesUserType && matchesOwner;
  });

  useEffect(() => {
    if (username) loadProfileData();
  }, [username]);

  useEffect(() => {
    if (activeSection === 'saved' && username && savedData.exercises.length === 0) loadSavedData();
  }, [activeSection, username]);

  useEffect(() => {
    if (activeSection === 'progress' && username) loadProgressData();
  }, [activeSection, username]);

  useEffect(() => {
    if (activeSection === 'overview' && username) {
      loadProgressData();
      loadSavedData();
    }
  }, [activeSection, username]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && availableFeatures.some(f => f.id === tab)) setActiveSection(tab);
  }, [searchParams, availableFeatures]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profile, userStats] = await Promise.all([
        getUserProfile(username!),
        getUserStats(username!).catch(() => null)
      ]);
      setProfileData(profile);
      setStats(userStats);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedData = async () => {
    if (!username) return;
    try {
      setSavedLoading(true);
      const [exercisesData, lessonsData, examsData] = await Promise.all([
        getUserSavedExercises(username).catch(() => []),
        getUserSavedLessons(username).catch(() => []),
        getUserSavedExams(username).catch(() => [])
      ]);
      setSavedData({
        exercises: Array.isArray(exercisesData) ? exercisesData : [],
        lessons: Array.isArray(lessonsData) ? lessonsData : [],
        exams: Array.isArray(examsData) ? examsData : []
      });
    } catch (error) {
      console.error('Error loading saved data:', error);
      setSavedData({ exercises: [], lessons: [], exams: [] });
    } finally {
      setSavedLoading(false);
    }
  };

  const loadProgressData = async () => {
    if (!username) return;
    try {
      setProgressLoading(true);
      const [successData, reviewData] = await Promise.all([
        getUserProgressExercises(username, 'success').catch(() => []),
        getUserProgressExercises(username, 'review').catch(() => [])
      ]);
      setProgressData({
        successExercises: Array.isArray(successData) ? successData : [],
        reviewExercises: Array.isArray(reviewData) ? reviewData : []
      });
    } catch (error) {
      console.error('Error loading progress data:', error);
      setProgressData({ successExercises: [], reviewExercises: [] });
    } finally {
      setProgressLoading(false);
    }
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    setSearchParams({ tab: sectionId });
    setSidebarOpen(false);
  };

  const currentFeature = FEATURES_CONFIG.find(f => f.id === activeSection);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>

          {currentFeature && (
            <div className="flex items-center gap-2">
              <currentFeature.icon className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-sm text-slate-900">{currentFeature.title}</span>
            </div>
          )}

          <div className="w-9" />
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>

          {/* Profile Card */}
          <div className="p-6 pb-4 bg-gradient-to-b from-slate-50 to-white">
            <div className="w-16 h-16 mx-auto rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 text-xl font-bold overflow-hidden">
              {profileData?.profile?.avatar ? (
                <img src={profileData.profile.avatar} alt={username} className="w-full h-full object-cover" />
              ) : (
                username?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-center mt-3">
              <h2 className="text-base font-bold text-slate-900">
                {profileData?.username || username}
              </h2>
              <span className="inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                {userType === 'teacher' ? 'Enseignant' : 'Étudiant'}
              </span>
              {profileData?.email && (
                <p className="text-xs text-slate-400 mt-1.5 truncate">{profileData.email}</p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-3 pb-6">
            <div className="space-y-0.5">
              {availableFeatures.map((feature) => {
                const Icon = feature.icon;
                const isActive = activeSection === feature.id;

                return (
                  <button
                    key={feature.id}
                    onClick={() => handleSectionChange(feature.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm
                      ${isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold border-l-[3px] border-blue-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{feature.title}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 lg:min-h-screen">
          {/* Desktop Header */}
          <header className="hidden lg:block sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-200">
            <div className="px-8 py-4">
              {currentFeature && (
                <div className="flex items-center gap-3">
                  <currentFeature.icon className="w-5 h-5 text-slate-400" />
                  <h1 className="text-lg font-semibold text-slate-900">{currentFeature.title}</h1>
                </div>
              )}
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {activeSection === 'overview' && (
                  <ProfileOverviewSection
                    user={profileData}
                    stats={stats}
                    progressData={progressData}
                    savedData={savedData}
                    onNavigate={handleSectionChange}
                  />
                )}
                {activeSection === 'statistics' && (
                  <StatsDashboard username={username!} contributionStats={stats?.contribution_stats} learningStats={stats?.learning_stats} />
                )}
                {activeSection === 'progress' && (
                  <ProgressSection successExercises={progressData.successExercises} reviewExercises={progressData.reviewExercises} isLoading={progressLoading} />
                )}
                {activeSection === 'skilliq' && <SkillIQSection />}
                {activeSection === 'notebooks' && <StudentNotebook />}
                {activeSection === 'revisionlists' && <RevisionListsSection />}
                {activeSection === 'saved' && (
                  <SavedContentSection exercises={savedData.exercises} lessons={savedData.lessons} exams={savedData.exams} isLoading={savedLoading} />
                )}
                {activeSection === 'students' && <TeacherStudentsPanel />}
                {activeSection === 'settings' && <SettingsSection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;
