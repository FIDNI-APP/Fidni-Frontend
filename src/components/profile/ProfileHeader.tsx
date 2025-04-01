// src/components/profile/ProfileHeader.tsx
import React from 'react';
import { User } from '@/types';
import { Edit, Github, Globe, MapPin } from 'lucide-react';
// Use our custom Badge component instead
import { Badge } from '@/components/ui/badge';

// Check if you have a Button component, otherwise create a simple one
interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ children, className = '', onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`inline-flex items-center px-4 py-2 font-medium text-sm rounded-md ${className}`}
    >
      {children}
    </button>
  );
};

interface ProfileHeaderProps {
  user: User;
  isOwner: boolean;
  onEditProfile: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
  user, 
  isOwner,
  onEditProfile 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-32 md:h-48"></div>
      <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6 -mt-16 sm:-mt-24 relative">
        <div className="flex flex-col sm:flex-row items-center sm:items-end sm:justify-between">
          <div className="flex flex-col items-center sm:items-start sm:flex-row sm:space-x-5">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white p-1 rounded-full shadow-lg">
              {user.profile.avatar ? (
                <img 
                  src={user.profile.avatar} 
                  alt={`${user.username}'s avatar`} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {user.username}
              </h1>
              
              <div className="flex items-center justify-center sm:justify-start mt-1 text-gray-600">
                <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Reputation: {user.profile.reputation}
                </Badge>
                
                {user.profile.display_email && (
                  <span className="ml-3 text-sm text-gray-500">
                    {user.email}
                  </span>
                )}
              </div>
              
              {user.profile.bio && (
                <p className="mt-2 text-gray-600 max-w-lg">
                  {user.profile.bio}
                </p>
              )}
              
              <div className="flex flex-wrap gap-3 mt-3">
                {user.profile.github_username && (
                  <a 
                    href={`https://github.com/${user.profile.github_username}`}
                    className="flex items-center text-sm text-gray-600 hover:text-indigo-600"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="w-4 h-4 mr-1" />
                    {user.profile.github_username}
                  </a>
                )}
                
                {user.profile.website && (
                  <a 
                    href={user.profile.website}
                    className="flex items-center text-sm text-gray-600 hover:text-indigo-600"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="w-4 h-4 mr-1" />
                    Website
                  </a>
                )}
                
                {user.profile.location && (
                  <span className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-1" />
                    {user.profile.location}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {isOwner && (
            <div className="mt-6 sm:mt-0">
              <Button 
                onClick={onEditProfile}
                className="rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
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