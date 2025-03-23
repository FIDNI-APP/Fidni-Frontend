import React, { useState, useEffect } from 'react';
import { useParams,  useNavigate } from 'react-router-dom';
import { 
  User as UserIcon, 
  Calendar, 
  MessageSquare, 
  ThumbsUp, 
  Eye, 
  FileText,
  Pencil,
  Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { getUserById, getUserContributions, getSavedContents } from '@/lib/api';
import { HomeContentCard } from '@/components/HomeContentCard';
import { Content, User } from '@/types';

export function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [userContributions, setUserContributions] = useState<Content[]>([]);
  const [savedContent, setSavedContent] = useState<Content[]>([]);
  
  const isOwnProfile = currentUser?.id === userId;
  
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch user profile
        const userData = await getUserById(userId || '');
        setUserProfile(userData);
        
        // Fetch user contributions (exercises created)
        const contributionsData = await getUserContributions(userId || '');
        setUserContributions(contributionsData.results || []);
        
        // Fetch saved content if viewing own profile
        if (isOwnProfile) {
          const savedData = await getSavedContents();
          setSavedContent(savedData.results || []);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setError('Failed to load user profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId, isOwnProfile]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mb-4"></div>
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
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error || 'User profile not found'}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Button 
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-full"
            >
              Go back home
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Format date function
  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-32 md:h-48"></div>
          <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6 -mt-16 sm:-mt-24 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end sm:justify-between">
              {/* Avatar and Name */}
              <div className="flex flex-col items-center sm:items-start sm:flex-row sm:space-x-5">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white p-1 rounded-full shadow-lg">
                  {userProfile.avatar ? (
                    <img 
                      src={userProfile.avatar} 
                      alt={`${userProfile.username}'s avatar`} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                      {userProfile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="mt-4 sm:mt-0 text-center sm:text-left">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {userProfile.username}
                  </h1>
                  <div className="flex items-center justify-center sm:justify-start mt-1 text-gray-600">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span className="text-sm">Joined {formatDate(userProfile.joinedAt)}</span>
                  </div>
                  {userProfile.bio && (
                    <p className="mt-2 text-gray-600 max-w-lg">
                      {userProfile.bio}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              {isOwnProfile && (
                <div className="mt-6 sm:mt-0">
                  <Button 
                    onClick={() => navigate('/settings/profile')}
                    className="rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            icon={<FileText className="w-5 h-5 text-indigo-600" />} 
            title="Contributions" 
            value={userContributions.length} 
          />
          <StatCard 
            icon={<MessageSquare className="w-5 h-5 text-purple-600" />} 
            title="Comments" 
            value={userContributions.reduce((total, content) => total + content.comments.length, 0)} 
          />
          <StatCard 
            icon={<ThumbsUp className="w-5 h-5 text-indigo-600" />} 
            title="Reputation" 
            value={userProfile.reputation || 0} 
          />
          <StatCard 
            icon={<Eye className="w-5 h-5 text-emerald-600" />} 
            title="Views" 
            value={userContributions.reduce((total, content) => total + content.view_count, 0)} 
          />
        </div>
        
        {/* Main Content Tabs */}
        <Tabs defaultValue="contributions" className="w-full">
          <TabsList className="w-full bg-white rounded-xl p-1 shadow-sm mb-6">
            <TabsTrigger value="contributions" className="flex-1 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
              <FileText className="w-4 h-4 mr-2" />
              Contributions
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="saved" className="flex-1 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                <Bookmark className="w-4 h-4 mr-2" />
                Saved
              </TabsTrigger>
            )}
            <TabsTrigger value="about" className="flex-1 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
              <UserIcon className="w-4 h-4 mr-2" />
              About
            </TabsTrigger>
          </TabsList>
          
          {/* Contributions Tab */}
          <TabsContent value="contributions">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Exercises Created</h2>
                
                {userContributions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userContributions.map(content => (
                      <div key={content.id} className="h-full">
                        <HomeContentCard
                          content={content}
                          onVote={() => {}}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-1">No exercises yet</h3>
                    <p className="text-gray-500 mb-4">This user hasn't created any exercises yet.</p>
                    {isOwnProfile && (
                      <Button
                        onClick={() => navigate('/create')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full"
                      >
                        Create your first exercise
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Saved Content Tab (only for own profile) */}
          {isOwnProfile && (
            <TabsContent value="saved">
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Saved Exercises</h2>
                  
                  {savedContent.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {savedContent.map(content => (
                        <div key={content.id} className="h-full">
                          <HomeContentCard
                            content={content}
                            onVote={() => {}}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 mb-1">No saved exercises</h3>
                      <p className="text-gray-500 mb-4">You haven't saved any exercises yet.</p>
                      <Button
                        onClick={() => navigate('/exercises')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full"
                      >
                        Browse exercises
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
          
          {/* About Tab */}
          <TabsContent value="about">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">About {userProfile.username}</h2>
                
                <div className="space-y-6">
                  {/* User Bio */}
                  <div className="bg-indigo-50 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-indigo-800 mb-2">Bio</h3>
                    <p className="text-gray-700">
                      {userProfile.bio || `${userProfile.username} hasn't added a bio yet.`}
                    </p>
                  </div>
                  
                  {/* Account Info */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Account Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Username</span>
                        <span className="font-medium">{userProfile.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Member Since</span>
                        <span className="font-medium">{formatDate(userProfile.joinedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contributions</span>
                        <span className="font-medium">{userProfile.contributionsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reputation</span>
                        <span className="font-medium">{userProfile.reputation}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Activity Summary - Placeholder for future stats */}
                  <div className="bg-purple-50 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-purple-800 mb-4">Activity Summary</h3>
                    <p className="text-sm text-purple-600 mb-4">
                      Detailed activity statistics will be available soon.
                    </p>
                    <div className="flex justify-center">
                      <div className="bg-white px-4 py-2 rounded-lg text-purple-800 text-sm">
                        Coming Soon
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Simple Stat Card Component
function StatCard({ icon, title, value }: { 
  icon: React.ReactNode;
  title: string;
  value: number;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
      <div className="flex items-start">
        <div className="mr-3">{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">{value}</span>
          </div>
        </div>
      </div>
    </div>
  );
}