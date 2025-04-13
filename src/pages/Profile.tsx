// src/pages/Profile.tsx
import React, { useState, useEffect } from 'react';
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
  History, 
  Edit, 
  Calendar, 
  MapPin, 
  Mail,
  NotebookPen,
  BookOpen 
} from 'lucide-react';

// Import components
import { ProfileHeaderEnhanced } from '@/components/profile/ProfileHeaderEnhanced';
import { StatsOverviewCard } from '@/components/profile/StatsOverviewCard';
import { SavedExercisesSection } from '@/components/profile/SavedExercisesSection';
import { ViewHistorySection } from '@/components/profile/ViewHistorySection';
import { ProgressSection } from '@/components/profile/ProgressSection';
import { ContributionsSection } from '@/components/profile/ContributionsSection';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { ProgressCharts } from '@/components/profile/ProgressCharts';
import StudentNotebook  from '@/components/profile/StudentNotebook';
import { Button } from '@/components/ui/button';

export function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Various states for different data
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [contributions, setContributions] = useState<Content[]>([]);
  const [savedExercises, setSavedExercises] = useState<Content[]>([]);
  const [history, setHistory] = useState<ViewHistoryItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Additional states for the enhanced progress tracking
  const [successExercises, setSuccessExercises] = useState<Content[]>([]);
  const [reviewExercises, setReviewExercises] = useState<Content[]>([]);
  
  // Active tab state - controls when we load additional data
  const [activeTab, setActiveTab] = useState('overview');
  
  // Track which data has been loaded
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

  // Load basic profile data when component mounts
  useEffect(() => {
    const loadBasicProfileData = async () => {
      if (!username) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Always load profile and stats data initially
        const profileData = await getUserProfile(username);
        setUserProfile(profileData);
        setDataLoaded(prev => ({ ...prev, profile: true }));
        
        const statsData = await getUserStats(username);
        setStats(statsData);
        setDataLoaded(prev => ({ ...prev, stats: true }));
        
        // Load contributions for Overview tab
        const contributionsData = await getUserContributions(username);
        setContributions(contributionsData?.results || []);
        setDataLoaded(prev => ({ ...prev, contributions: true }));
        
        // Only for profile owner, load saved exercises for Overview tab
        if (isOwner) {
          const savedData = await getUserSavedExercises(username);
          setSavedExercises(savedData);
          setDataLoaded(prev => ({ ...prev, savedExercises: true }));
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setError('Failed to load user profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBasicProfileData();
  }, [username, isOwner]);
  
  // Load tab-specific data only when the tab is active
  useEffect(() => {
    const loadTabData = async () => {
      if (!username || !isOwner) return;
      
      try {
        if (activeTab === 'exercises' && !dataLoaded.successExercises) {
          // Load success exercises
          const successExercisesData = await getUserProgressExercises(username, 'success');
          setSuccessExercises(successExercisesData);
          setDataLoaded(prev => ({ ...prev, successExercises: true }));
          
          // Load review exercises
          const reviewExercisesData = await getUserProgressExercises(username, 'review');
          setReviewExercises(reviewExercisesData);
          setDataLoaded(prev => ({ ...prev, reviewExercises: true }));
        }
        
        if (activeTab === 'activity' && !dataLoaded.history) {
          // Load history
          const historyData = await getUserHistory(username);
          setHistory(historyData);
          setDataLoaded(prev => ({ ...prev, history: true }));
        }
      } catch (err) {
        console.error(`Failed to load data for ${activeTab} tab:`, err);
      }
    };
    
    loadTabData();
  }, [activeTab, username, isOwner, dataLoaded]);
  
  const handleEditProfile = () => {
    setIsEditing(true);
  };
  
  const handleSaveProfile = async (userData: any) => {
    try {
      await updateUserProfile(userData);
      
      // Update local state with new profile data
      setUserProfile(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          username: userData.username,
          email: userData.email,
          profile: {
            ...prev.profile,
            ...userData.profile
          }
        };
      });
      
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  };
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  if (error || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-sm">
            <p>{error || 'User profile not found'}</p>
          </div>
          <div className="mt-4 flex justify-center">
            <Button 
              onClick={() => navigate('/')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      {/* Profile Editing Mode */}
      {isEditing ? (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <EditProfileForm 
            user={userProfile} 
            onSave={handleSaveProfile}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <>
          {/* Enhanced hero section with profile header */}
          <div className="max-w-full mx-auto">
            <ProfileHeaderEnhanced 
              user={userProfile} 
              isOwner={isOwner}
              onEditProfile={handleEditProfile}
            />
          </div>
          
          {/* Tab navigation */}
          <div className="bg-white border-b shadow-sm sticky top-16 z-10">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex overflow-x-auto hide-scrollbar">
                <button
                  onClick={() => handleTabChange('overview')}
                  className={`px-6 py-4 font-medium text-base flex items-center border-b-2 transition-colors ${
                    activeTab === 'overview' 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5 mr-2" />
                  Overview
                </button>
                
                {isOwner && (
                  <button
                    onClick={() => handleTabChange('exercises')}
                    className={`px-6 py-4 font-medium text-base flex items-center border-b-2 transition-colors ${
                      activeTab === 'exercises' 
                        ? 'border-indigo-600 text-indigo-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Book className="w-5 h-5 mr-2" />
                    Exercises
                  </button>
                )}
                
                <button
                  onClick={() => handleTabChange('contributions')}
                  className={`px-6 py-4 font-medium text-base flex items-center border-b-2 transition-colors ${
                    activeTab === 'contributions' 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Contributions
                </button>
                
                {isOwner && (
                  <button
                    onClick={() => handleTabChange('activity')}
                    className={`px-6 py-4 font-medium text-base flex items-center border-b-2 transition-colors ${
                      activeTab === 'activity' 
                        ? 'border-indigo-600 text-indigo-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <History className="w-5 h-5 mr-2" />
                    Activity
                  </button>
                )}

                {isOwner && (
                  <button
                    onClick={() => handleTabChange('notebook')}
                    className={`px-6 py-4 font-medium text-base flex items-center border-b-2 transition-colors ${
                      activeTab === 'notebook' 
                        ? 'border-indigo-600 text-indigo-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Book className="w-5 h-5 mr-2" />
                    Cahier de cours
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Tab content */}
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8 fade-in animate-delay-1">
                <StatsOverviewCard 
                  contributionStats={stats?.contribution_stats}
                  learningStats={isOwner ? stats?.learning_stats : undefined}
                  isLoading={isLoading}
                />
                
                {/* Add the Progress Charts component - only load if we have stats */}
                {isOwner && stats && (
                  <ProgressCharts 
                    stats={stats}
                    successExercises={successExercises}
                    reviewExercises={reviewExercises}
                  />
                )}
                
                {/* User bio and additional info */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold mb-4">About {userProfile.username}</h2>
                  
                  <div className="prose prose-indigo max-w-none">
                    {userProfile.profile.bio ? (
                      <p>{userProfile.profile.bio}</p>
                    ) : (
                      <p className="text-gray-500 italic">No bio provided</p>
                    )}
                  </div>
                  
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-5 h-5 mr-3 text-indigo-500" />
                      <span>Joined {new Date(userProfile.profile.joined_at).toLocaleDateString()}</span>
                    </div>
                    
                    {userProfile.profile.location && (
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-5 h-5 mr-3 text-indigo-500" />
                        <span>{userProfile.profile.location}</span>
                      </div>
                    )}
                    
                    {userProfile.profile.display_email && (
                      <div className="flex items-center text-gray-600">
                        <Mail className="w-5 h-5 mr-3 text-indigo-500" />
                        <span>{userProfile.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Show a preview of latest content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isOwner && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <Book className="w-5 h-5 mr-2 text-indigo-600" />
                        Recent Saved Exercises
                      </h3>
                      {savedExercises.length > 0 ? (
                        <div className="bg-white rounded-xl shadow-md p-5">
                          {savedExercises.slice(0, 3).map((exercise, index) => (
                            <div 
                              key={exercise.id} 
                              className={`py-3 ${index !== savedExercises.slice(0, 3).length - 1 ? 'border-b border-gray-100' : ''}`}
                            >
                              <h4 className="font-medium text-gray-900 hover:text-indigo-600 transition-colors truncate">
                                {exercise.title}
                              </h4>
                              <div className="flex items-center text-sm text-gray-500 mt-1">
                                <span>{exercise.difficulty === 'easy' ? 'Easy' : exercise.difficulty === 'medium' ? 'Medium' : 'Hard'}</span>
                                <span className="mx-2">•</span>
                                <span>{exercise.subject.name}</span>
                              </div>
                            </div>
                          ))}
                          
                          {savedExercises.length > 3 && (
                            <div className="mt-3 text-center">
                              <Button 
                                variant="ghost"
                                onClick={() => handleTabChange('exercises')}
                                className="text-indigo-600 text-sm hover:text-indigo-800"
                              >
                                View all ({savedExercises.length})
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 text-gray-500 rounded-lg p-5 text-center">
                          No exercises saved yet
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                      Recent Contributions
                    </h3>
                    {contributions.length > 0 ? (
                      <div className="bg-white rounded-xl shadow-md p-5">
                        {contributions.slice(0, 3).map((contribution, index) => (
                          <div 
                            key={contribution.id} 
                            className={`py-3 ${index !== contributions.slice(0, 3).length - 1 ? 'border-b border-gray-100' : ''}`}
                          >
                            <h4 className="font-medium text-gray-900 hover:text-indigo-600 transition-colors truncate">
                              {contribution.title}
                            </h4>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <span>{contribution.subject.name}</span>
                              <span className="mx-2">•</span>
                              <span>{new Date(contribution.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                        
                        {contributions.length > 3 && (
                          <div className="mt-3 text-center">
                            <Button 
                              variant="ghost"
                              onClick={() => handleTabChange('contributions')}
                              className="text-indigo-600 text-sm hover:text-indigo-800"
                            >
                              View all ({contributions.length})
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 text-gray-500 rounded-lg p-5 text-center">
                        No contributions yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Exercises Tab */}
            {activeTab === 'exercises' && isOwner && (
              <div className="space-y-8 fade-in animate-delay-2">
                {!dataLoaded.successExercises ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mr-2" />
                    <p>Loading exercise data...</p>
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
              </div>
            )}
            
            
            
            {/* Contributions Tab */}
            {activeTab === 'contributions' && (
              <div className="space-y-8 fade-in animate-delay-2">
                <ContributionsSection 
                  success_exercises={{ exercises: dataLoaded.successExercises ? successExercises : [] }}
                  review_exercises={{ exercises: dataLoaded.reviewExercises ? reviewExercises : [] }}
                  isLoading={false}
                />
              </div>
            )}
            
            {/* Activity Tab */}
            {activeTab === 'activity' && isOwner && (
              <div className="space-y-8 fade-in animate-delay-2">
                {!dataLoaded.history ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mr-2" />
                    <p>Loading activity history...</p>
                  </div>
                ) : (
                  <ViewHistorySection 
                    historyItems={history} 
                    isLoading={false}
                  />
                )}
              </div>
            )}
            {/* Notebook Tab */}
            {activeTab === 'notebook' && isOwner && (
              <div className="fade-in animate-delay-2">
                <StudentNotebook />
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Add some custom styles */}
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-delay-1 { animation-delay: 0.1s; }
        .animate-delay-2 { animation-delay: 0.2s; }
      `}</style>
    </div>
  );
}