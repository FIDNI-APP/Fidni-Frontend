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
      <div style={{ minHeight: '100vh', background: '#f0effe' }} className="flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#4f46e5' }} />
          <p style={{ fontSize: 13, color: '#7068a8' }}>Chargement du profil…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0effe' }}>
      {/* Mobile Header */}
      <div
        className="lg:hidden sticky top-0 z-40"
        style={{
          background: 'rgba(255,255,255,.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #ede9fe',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Menu className="w-5 h-5" style={{ color: '#1e1b4b' }} />
          </button>

          {currentFeature && (
            <div className="flex items-center gap-2">
              <currentFeature.icon className="w-4 h-4" style={{ color: '#7068a8' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e1b4b' }}>{currentFeature.title}</span>
            </div>
          )}

          <div className="w-9" />
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-72 lg:w-64
            transform transition-transform duration-300 ease-in-out
            lg:translate-x-0 lg:static lg:z-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{
            background: '#fff',
            borderRight: '1px solid #ede9fe',
          }}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X className="w-5 h-5" style={{ color: '#7068a8' }} />
          </button>

          {/* Profile Card */}
          <div
            className="p-6 pb-5 text-center"
            style={{ background: 'linear-gradient(180deg,#f5f4ff,#fff)' }}
          >
            <div
              className="mx-auto"
              style={{
                width: 72, height: 72, borderRadius: 18,
                background: 'linear-gradient(135deg,#4f46e5,#818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 26, fontWeight: 800, overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(79,70,229,.25)',
              }}
            >
              {profileData?.profile?.avatar ? (
                <img src={profileData.profile.avatar} alt={username} className="w-full h-full object-cover" />
              ) : (
                username?.charAt(0).toUpperCase()
              )}
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b', marginTop: 12, letterSpacing: '-0.02em' }}>
              {profileData?.username || username}
            </h2>
            <span
              className="inline-block mt-2"
              style={{
                background: '#eef2ff', color: '#4338ca',
                padding: '3px 10px', borderRadius: 99,
                fontSize: 10, fontWeight: 700, letterSpacing: '.04em',
                textTransform: 'uppercase',
              }}
            >
              {userType === 'teacher' ? 'Enseignant' : 'Étudiant'}
            </span>
            {profileData?.email && (
              <p
                className="truncate"
                style={{ fontSize: 11, color: '#9391b8', marginTop: 6 }}
              >
                {profileData.email}
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="px-3 pb-6">
            <div className="flex flex-col gap-1">
              {availableFeatures.map((feature) => {
                const Icon = feature.icon;
                const isActive = activeSection === feature.id;
                return (
                  <button
                    key={feature.id}
                    onClick={() => handleSectionChange(feature.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 10,
                      background: isActive ? '#eef2ff' : 'transparent',
                      color: isActive ? '#4338ca' : '#4b4880',
                      fontSize: 13, fontWeight: isActive ? 700 : 500,
                      fontFamily: 'DM Sans', cursor: 'pointer',
                      border: 'none', textAlign: 'left',
                      borderLeft: isActive ? '3px solid #4f46e5' : '3px solid transparent',
                      transition: 'all .15s',
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: isActive ? '#4f46e5' : '#9391b8' }} />
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
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(30,27,75,.4)', backdropFilter: 'blur(2px)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 lg:min-h-screen">
          {/* Desktop Header */}
          <header
            className="hidden lg:block sticky z-30"
            style={{
              top: 60, // navbar height
              background: 'rgba(240,239,254,.85)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid #ede9fe',
            }}
          >
            <div className="px-8 py-4">
              {currentFeature && (
                <div className="flex items-center gap-3">
                  <div
                    className="inline-flex items-center justify-center"
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: '#eef2ff', color: '#4338ca',
                    }}
                  >
                    <currentFeature.icon className="w-3.5 h-3.5" />
                  </div>
                  <h1 style={{ fontSize: 16, fontWeight: 700, color: '#1e1b4b', letterSpacing: '-0.01em' }}>
                    {currentFeature.title}
                  </h1>
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
