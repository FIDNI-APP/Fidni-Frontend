import React from 'react';
import { User } from '@/types';
import { Edit, Award, Mail, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProfileHeaderEnhancedProps {
  user: User;
  isOwner: boolean;
  onEditProfile: () => void;
}

export const ProfileHeaderEnhanced: React.FC<ProfileHeaderEnhancedProps> = ({ 
  user, 
  isOwner,
  onEditProfile 
}) => {
  // Format date nicely
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Cover image/background */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-32 md:h-48 relative">
        <div className="absolute inset-0 bg-pattern-grid opacity-10"></div>
      </div>
      
      {/* Profile content */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6 -mt-16 sm:-mt-24 relative">
        <div className="flex flex-col sm:flex-row items-center sm:items-end sm:justify-between">
          <div className="flex flex-col items-center sm:items-start sm:flex-row sm:space-x-5">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white p-1 rounded-full shadow-lg relative">
              {user.profile.avatar ? (
                <img 
                  src={user.profile.avatar} 
                  alt={`${user.username}'s avatar`} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                  {getInitials(user.username)}
                </div>
              )}
              
             
            </div>
            
            {/* User info */}
            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {user.username}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                {user.profile.display_email && (
                  <span className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-1 text-gray-400" />
                    {user.email}
                  </span>
                )}
                
                <span className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                  Joined {formatDate(user.profile.joined_at)}
                </span>
              </div>
              
              {user.profile.bio && (
                <p className="mt-3 text-gray-600 max-w-lg">
                  {user.profile.bio}
                </p>
              )}
            </div>
          </div>
          
          {/* Edit profile button - only shown to owner */}
          {isOwner && (
            <div className="mt-6 sm:mt-0">
              <Button 
                onClick={onEditProfile}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-full"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};