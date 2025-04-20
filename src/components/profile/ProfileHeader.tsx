// src/components/profile/ProfileHeader.tsx
import React, { useState } from 'react';
import { User } from '@/types';
import { 
  Edit, 
  Mail, 
  Calendar, 
  MapPin, 
  ExternalLink,
  Shield,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

interface ProfileHeaderProps {
  user: User;
  stats: any;
  isOwner: boolean;
  onEditProfile: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
  user, 
  stats,
  isOwner,
  onEditProfile 
}) => {
  const [activeSection, setActiveSection] = useState<'about' | 'achievements'>('about');

  // Calculate user level based on contributions
  const getUserLevel = () => {
    const total = stats?.contribution_stats?.total_contributions || 0;
    
    if (total > 50) return { level: "Expert", color: "bg-gradient-to-r from-amber-400 to-orange-500" };
    if (total > 20) return { level: "Advanced", color: "bg-gradient-to-r from-purple-400 to-indigo-500" };
    if (total > 5) return { level: "Intermediate", color: "bg-gradient-to-r from-emerald-400 to-teal-500" };
    return { level: "Beginner", color: "bg-gradient-to-r from-blue-400 to-cyan-500" };
  };

  const userLevel = getUserLevel();
  
  // Get badges and achievements
  const getAchievements = () => {
    const achievements = [];
    
    if ((stats?.contribution_stats?.exercises || 0) >= 5) {
      achievements.push({ 
        name: "Content Creator", 
        icon: "🏆", 
        description: "Created 5+ exercises" 
      });
    }
    
    if ((stats?.learning_stats?.exercises_completed || 0) >= 10) {
      achievements.push({ 
        name: "Fast Learner", 
        icon: "🚀", 
        description: "Completed 10+ exercises" 
      });
    }
    
    if ((stats?.contribution_stats?.upvotes_received || 0) >= 20) {
      achievements.push({ 
        name: "Community Favorite", 
        icon: "⭐", 
        description: "Received 20+ upvotes" 
      });
    }
    
    return achievements;
  };
  
  const achievements = getAchievements();

  return (
    <div className="relative overflow-hidden">
      {/* Background with animated particles */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-800 via-violet-800 to-purple-900">
        {/* Animated gradient spots */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-purple-400 mix-blend-soft-light filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-10 right-40 w-72 h-72 rounded-full bg-indigo-400 mix-blend-soft-light filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-10 left-1/3 w-72 h-72 rounded-full bg-blue-400 mix-blend-soft-light filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16 relative z-10">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
          {/* Avatar with interactive elements */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full opacity-75 group-hover:opacity-100 blur-lg transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 bg-white p-1 rounded-full shadow-2xl">
              {user.profile.avatar ? (
                <img 
                  src={user.profile.avatar} 
                  alt={`${user.username}'s avatar`} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* Badge indicator for user level */}
              <div className="absolute -bottom-2 -right-2 rounded-full p-1 bg-white">
                <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${userLevel.color}`}>
                  {userLevel.level}
                </div>
              </div>
            </div>
          </div>
          
          {/* User info */}
          <div className="text-center lg:text-left text-white flex-grow">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{user.username}</h1>
              
              {user.profile.user_type && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur-sm border border-white/20">
                  {user.profile.user_type === 'teacher' ? (
                    <>
                      <Shield className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                      Teacher
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-blue-300" />
                      Student
                    </>
                  )}
                </div>
              )}
            </div>
            
            <p className="mt-3 text-indigo-100 max-w-lg font-light">
              {user.profile.bio || "No bio provided yet."}
            </p>
            
            <div className="mt-4 flex flex-wrap justify-center lg:justify-start gap-3 text-sm">
              {user.profile.display_email && (
                <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 border border-white/20 hover:bg-white/20 transition-colors">
                  <Mail className="w-4 h-4 mr-2 text-indigo-300" />
                  {user.email}
                </div>
              )}
              
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 border border-white/20 hover:bg-white/20 transition-colors">
                <Calendar className="w-4 h-4 mr-2 text-indigo-300" />
                Joined {new Date(user.profile.joined_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              
              {user.profile.location && (
                <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 border border-white/20 hover:bg-white/20 transition-colors">
                  <MapPin className="w-4 h-4 mr-2 text-indigo-300" />
                  {user.profile.location}
                </div>
              )}
            </div>
            
            {/* Stats Summary */}
            <div className="mt-6 grid grid-cols-3 md:grid-cols-4 gap-3 max-w-2xl mx-auto lg:mx-0">
              <StatItem 
                label="Exercises"
                value={stats?.contribution_stats?.exercises || 0}
                color="bg-indigo-400/20"
                textColor="text-indigo-200"
              />
              <StatItem 
                label="Solutions"
                value={stats?.contribution_stats?.solutions || 0}
                color="bg-purple-400/20"
                textColor="text-purple-200"
              />
              <StatItem 
                label="Upvotes"
                value={stats?.contribution_stats?.upvotes_received || 0}
                color="bg-pink-400/20"
                textColor="text-pink-200"
              />
              <StatItem 
                label="Views"
                value={stats?.contribution_stats?.view_count || 0}
                color="bg-blue-400/20"
                textColor="text-blue-200"
              />
            </div>
            
            {/* Sections for About/Achievements */}
            <div className="mt-6 max-w-2xl mx-auto lg:mx-0">
              <div className="flex border-b border-white/20">
                <button
                  onClick={() => setActiveSection('about')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeSection === 'about' 
                      ? 'border-b-2 border-white text-white' 
                      : 'text-white/70 hover:text-white/90'
                  }`}
                >
                  About
                </button>
                <button
                  onClick={() => setActiveSection('achievements')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeSection === 'achievements' 
                      ? 'border-b-2 border-white text-white' 
                      : 'text-white/70 hover:text-white/90'
                  }`}
                >
                  Achievements
                </button>
              </div>
              
              <AnimatePresence mode="wait">
                {activeSection === 'about' ? (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="pt-4"
                  >
                    {/* About content */}
                    <div className="text-white/80 text-sm">
                      {user.profile.class_level && (
                        <div className="mb-2">
                          <span className="text-white/60">Class Level:</span>{' '}
                          <span className="font-medium text-white">{user.profile.class_level.name}</span>
                        </div>
                      )}
                      
                      {user.profile.favorite_subjects && user.profile.favorite_subjects.length > 0 && (
                        <div className="mb-2">
                          <span className="text-white/60">Favorite Subjects:</span>{' '}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {user.profile.favorite_subjects.map((subject, idx) => (
                              <span 
                                key={idx}
                                className="px-3 py-1 rounded-full text-xs bg-white/10 border border-white/10 text-white"
                              >
                                {subject}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="achievements"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="pt-4"
                  >
                    {/* Achievements content */}
                    {achievements.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {achievements.map((achievement, idx) => (
                          <div 
                            key={idx}
                            className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10"
                          >
                            <div className="flex items-center">
                              <div className="text-2xl mr-2">{achievement.icon}</div>
                              <div>
                                <div className="font-medium text-white">{achievement.name}</div>
                                <div className="text-xs text-white/70">{achievement.description}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-white/70 text-center py-4">
                        No achievements yet. Keep learning and contributing!
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Edit profile button - only shown to owner */}
          {isOwner && (
            <div className="mt-4 lg:mt-0">
              <Button 
                onClick={onEditProfile}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full px-6 py-2.5 font-medium"
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

// Helper component for stats
const StatItem = ({ label, value, color, textColor }: { label: string, value: number, color: string, textColor: string }) => (
  <div className={`${color} rounded-lg p-3 flex flex-col items-center shadow-sm border border-white/10`}>
    <div className={`text-xl font-bold ${textColor}`}>{value}</div>
    <div className="text-xs text-white/70">{label}</div>
  </div>
);