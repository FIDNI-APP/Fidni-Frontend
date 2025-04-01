// src/components/profile/ProfileHeaderEnhanced.tsx
import React from 'react';
import { User } from '@/types';
import { Edit, Award, Mail, Calendar, MapPin, Link as LinkIcon, Users, BookOpen } from 'lucide-react';
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
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="relative overflow-hidden">
      {/* Premium background design with layered waves and gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-700 overflow-hidden">
        {/* Decorative wave patterns */}
        <div className="absolute top-0 left-0 right-0 h-64 opacity-10">
          <svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="white" fillOpacity="1" d="M0,192L48,176C96,160,192,128,288,122.7C384,117,480,139,576,149.3C672,160,768,160,864,138.7C960,117,1056,75,1152,64C1248,53,1344,75,1392,85.3L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
          </svg>
        </div>
        
        {/* Animated gradient spots */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-purple-400 mix-blend-soft-light filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-10 right-40 w-72 h-72 rounded-full bg-indigo-400 mix-blend-soft-light filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-10 left-1/3 w-72 h-72 rounded-full bg-blue-400 mix-blend-soft-light filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      </div>
      
      {/* Profile content */}
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12 relative z-10">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
          {/* Avatar with glowing effect */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full opacity-75 group-hover:opacity-100 blur-lg transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 bg-white p-1 rounded-full shadow-2xl">
              {user.profile.avatar ? (
                <img 
                  src={user.profile.avatar} 
                  alt={`${user.username}'s avatar`} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold">
                  {getInitials(user.username)}
                </div>
              )}
            </div>
          </div>
          
          {/* User info with advanced styling */}
          <div className="text-center md:text-left text-white flex-grow">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{user.username}</h1>
              
              {/* Membership badge if applicable */}
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-400/30 backdrop-blur-sm border border-indigo-400/40 text-white">
                <Award className="w-3.5 h-3.5 mr-1.5" />
                Member
              </div>
            </div>
            
            <p className="mt-2 text-indigo-100 max-w-lg">
              {user.profile.bio || "No bio provided yet."}
            </p>
            
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3 text-sm">
              {user.profile.display_email && (
                <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90">
                  <Mail className="w-4 h-4 mr-2 text-indigo-300" />
                  {user.email}
                </div>
              )}
              
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90">
                <Calendar className="w-4 h-4 mr-2 text-indigo-300" />
                Joined {new Date(user.profile.joined_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              
              {user.profile.location && (
                <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90">
                  <MapPin className="w-4 h-4 mr-2 text-indigo-300" />
                  {user.profile.location}
                </div>
              )}
            </div>
            
            {/* Favorite subjects/tags */}
            {user.profile.favorite_subjects && user.profile.favorite_subjects.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-2">
                {user.profile.favorite_subjects.map((subject, index) => (
                  <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500/80 to-purple-500/80 text-white shadow-sm">
                    <BookOpen className="w-3 h-3 mr-1" />
                    {subject}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Edit profile button - only shown to owner */}
          {isOwner && (
            <div className="mt-4 md:mt-0">
              <Button 
                onClick={onEditProfile}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full px-6"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Custom style for animation */}
      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes tilt {
          0%, 50%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(1deg);
          }
          75% {
            transform: rotate(-1deg);
          }
        }
        
        .animate-tilt {
          animation: tilt 10s infinite linear;
        }
        
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
};