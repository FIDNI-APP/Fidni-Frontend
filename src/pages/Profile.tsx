// src/pages/Profile.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, getUserStats, getUserContributions, getUserSavedExercises, getUserHistory } from '@/lib/api';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsDashboard } from '@/components/profile/StatsDashboard';
import { UserSettings } from '@/components/profile/UserSettings';
import { ContentList } from '@/components/ContentList';
import { ViewHistoryList } from '@/components/profile/ViewHistoryList';
import { User, Content, ViewHistoryItem } from '@/types';
import { Loader2 } from 'lucide-react';

export function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [contributions, setContributions] = useState<Content[]>([]);
  const [savedExercises, setSavedExercises] = useState<Content[]>([]);
  const [history, setHistory] = useState<ViewHistoryItem[]>([]);
  
  const isOwner = currentUser?.username === username;
  
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch user profile
        const profileData = await getUserProfile(username || '');
        setUserProfile(profileData);
        
        // Fetch stats
        const statsData = await getUserStats(username || '');
        setStats(statsData);
        
        // Fetch contributions
        const contributionsData = await getUserContributions(username || '');
        setContributions(contributionsData.results || []);
        
        // Fetch additional data for profile owner
        if (isOwner) {
          // Fetch saved exercises
          const savedData = await getUserSavedExercises(username || '');
          setSavedExercises(savedData.results || []);
          
          // Fetch history
          const historyData = await getUserHistory(username || '');
          setHistory(historyData.results || []);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setError('Failed to load user profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (username) {
      fetchUserData();
    }
  }, [username, isOwner]);
  
  const handleEditProfile = () => {
    // Navigate to settings tab or open edit modal
    // For simplicity, we'll just navigate to settings tab
    document.getElementById('settings-tab')?.click();
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
            <button 
              onClick={() => navigate('/')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4">
        {/* Profile Header */}
        <ProfileHeader 
          user={userProfile} 
          isOwner={isOwner}
          onEditProfile={handleEditProfile}
        />
        
        {/* Tabs */}
        <div className="mt-6">
          <Tabs defaultValue="stats">
            <TabsList className="bg-white rounded-xl p-1 shadow-sm mb-6">
              <TabsTrigger value="stats">
                Statistics
              </TabsTrigger>
              <TabsTrigger value="contributions">
                Contributions
              </TabsTrigger>
              {isOwner && (
                <>
                  <TabsTrigger value="saved">
                    Saved Exercises
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    History
                  </TabsTrigger>
                  <TabsTrigger value="settings" id="settings-tab">
                    Settings
                  </TabsTrigger>
                </>
              )}
            </TabsList>
            
            <TabsContent value="stats">
              {stats && (
                <StatsDashboard 
                  contributionStats={stats.contribution_stats}
                  learningStats={isOwner ? stats.learning_stats : undefined}
                />
              )}
            </TabsContent>
            
            <TabsContent value="contributions">
              {contributions.length > 0 ? (
                <ContentList
                  contents={contributions}
                  onVote={() => {}}
                />
              ) : (
                <div className="bg-white rounded-xl p-8 text-center">
                  <p className="text-gray-500">No contributions yet</p>
                </div>
              )}
            </TabsContent>
            
            {isOwner && (
              <>
                <TabsContent value="saved">
                  {savedExercises.length > 0 ? (
                    <ContentList
                      contents={savedExercises}
                      onVote={() => {}}
                    />
                  ) : (
                    <div className="bg-white rounded-xl p-8 text-center">
                      <p className="text-gray-500">No saved exercises</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="history">
                  {history.length > 0 ? (
                    <ViewHistoryList items={history} />
                  ) : (
                    <div className="bg-white rounded-xl p-8 text-center">
                      <p className="text-gray-500">No view history</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="settings">
                  <UserSettings />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}