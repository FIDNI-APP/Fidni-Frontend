// src/pages/Profile.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, getUserStats, getUserContributions, getUserSavedExercises, getUserHistory, updateUserProfile } from '@/lib/api';
import { Content, User, ViewHistoryItem } from '@/types';
import { Loader2 } from 'lucide-react';

// Import the enhanced components
import { ProfileHeaderEnhanced } from '@/components/profile/ProfileHeaderEnhanced';
import { StatsOverviewCard } from '@/components/profile/StatsOverviewCard';
import { SavedExercisesSection } from '@/components/profile/SavedExercisesSection';
import { ViewHistorySection } from '@/components/profile/ViewHistorySection';
import { ProgressSection } from '@/components/profile/ProgressSection';
import { ContributionsSection } from '@/components/profile/ContributionsSection';
import { EditProfileForm } from '@/components/profile/EditProfileForm';

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
  
  const isOwner = currentUser?.username === username;
  
  // src/pages/Profile.tsx - Fix the error in fetchUserData function

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
      setContributions(contributionsData?.results || []);
      
      // Fetch additional data for profile owner
      if (isOwner) {
        // Fetch saved exercises
        const savedData = await getUserSavedExercises(username || '');
        setSavedExercises(savedData?.results || []);
        
        // Fetch history
        const historyData = await getUserHistory(username || '');
        const historyResults = historyData?.results || [];
        setHistory(historyResults);
        
        // Extract progress information (exercises marked as complete or review)
        // Make sure we're safely accessing the data
        if (history && history.length > 0) {
          const completedExercises = history
            .filter(item => item && item.completed === 'success')
            .map(item => item.content);
          
          setSuccessExercises(completedExercises);
          
          // This is simulated - in a real app you would get the actual review exercises from the API
          // Here we're just using a subset of the viewed exercises as "to review" for demonstration
          const reviewItems = history
            .filter(item => item && item.completed === 'review')
            .map(item => item.content);            
          setReviewExercises(reviewItems);
        } else {
          // Handle case where there's no history data
          setSuccessExercises([]);
          setReviewExercises([]);
        }
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
      throw err; // Re-throw to be handled by the form
    }
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
        {/* Enhanced Profile Header */}
        {isEditing ? (
          <EditProfileForm 
            user={userProfile} 
            onSave={handleSaveProfile}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <ProfileHeaderEnhanced 
            user={userProfile} 
            isOwner={isOwner}
            onEditProfile={handleEditProfile}
          />
        )}
        
        {/* Main content - only show when not editing */}
        {!isEditing && (
          <div className="mt-6 space-y-6">
            {/* Stats Overview */}
            <StatsOverviewCard 
              contributionStats={stats?.contribution_stats}
              learningStats={isOwner ? stats?.learning_stats : undefined}
              isLoading={isLoading}
            />
            
            {/* Grid layout for different sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contributions Section */}
              <ContributionsSection 
                exercises={contributions} 
                isLoading={isLoading}
              />
              
              {/* If owner, show saved exercises */}
  {isOwner && (
    <SavedExercisesSection 
      exercises={savedExercises} 
      isLoading={isLoading}
    />
  )}
</div>

{/* Show Progress and History sections for owner */}
{isOwner && (
  <>
    <ProgressSection 
      successExercises={successExercises}
      reviewExercises={reviewExercises}
      isLoading={isLoading}
    />
    
    <div className="mt-6">
      <ViewHistorySection 
        historyItems={history} 
        isLoading={isLoading}
      />
    </div>
  </>
)}
</div>
)}
</div>
</div>
);
}
