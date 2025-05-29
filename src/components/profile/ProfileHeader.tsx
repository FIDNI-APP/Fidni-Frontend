// src/components/profile/ProfileHeader.tsx - Version améliorée
import React, { useState } from 'react';
import { User } from '@/types';
import { 
  Mail, 
  Calendar, 
  MapPin, 
  Shield,
  GraduationCap,
  Award,
  Sparkles,
  Users,
  Zap,
  Target,
  TrendingUp,
  Star,
  BarChart3,
  PenTool
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

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
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  
  // Calcul du niveau utilisateur basé sur les contributions
  const getUserLevel = () => {
    const total = stats?.contribution_stats?.total_contributions || 0;
    
    if (total >= 100) return { 
      level: "Expert", 
      icon: "🏆", 
      color: "from-amber-400 to-orange-500",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      progress: 100
    };
    if (total >= 50) return { 
      level: "Confirmé", 
      icon: "⭐", 
      color: "from-purple-400 to-indigo-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      progress: (total / 100) * 100
    };
    if (total >= 20) return { 
      level: "Intermédiaire", 
      icon: "🌟", 
      color: "from-emerald-400 to-teal-500",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      progress: (total / 50) * 100
    };
    return { 
      level: "Débutant", 
      icon: "🌱", 
      color: "from-blue-400 to-cyan-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      progress: (total / 20) * 100
    };
  };

  const userLevel = getUserLevel();
  
  // Statistiques principales
  const mainStats = [
    {
      id: 'contributions',
      label: 'Contributions',
      value: stats?.contribution_stats?.total_contributions || 0,
      icon: PenTool,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100/50',
      description: "Total des exercices, solutions et commentaires"
    },
    {
      id: 'completed',
      label: 'Complétés',
      value: stats?.learning_stats?.exercises_completed || 0,
      icon: Target,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100/50',
      description: "Exercices réussis avec succès"
    },
    {
      id: 'reputation',
      label: 'Réputation',
      value: stats?.contribution_stats?.upvotes_received || 0,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100/50',
      description: "Points gagnés grâce aux votes positifs"
    },
    {
      id: 'impact',
      label: 'Impact',
      value: stats?.contribution_stats?.view_count || 0,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100/50',
      description: "Nombre total de vues sur vos contributions"
    }
  ];

  return (
    <div className="relative">
      {/* Conteneur principal */}
      <div className="flex flex-col lg:flex-row items-center lg:items-end gap-8 text-white">
        {/* Section Avatar et Infos principales */}
        <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
          {/* Avatar avec effets visuels */}
          <div className="relative group">
            {/* Cercles animés en arrière-plan */}
            <div className="absolute -inset-4 opacity-75">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full blur-lg group-hover:blur-xl transition-all duration-700 animate-pulse"></div>
            </div>
            
            {/* Conteneur de l'avatar */}
            <div className="relative">
              {/* Badge de niveau */}
              <div className={`absolute -top-2 -right-2 z-10 ${userLevel.bgColor} ${userLevel.borderColor} border-2 rounded-full p-2 shadow-lg`}>
                <span className="text-2xl">{userLevel.icon}</span>
              </div>
              
              {/* Avatar */}
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full p-1 bg-white/90 backdrop-blur-sm shadow-xl">
                {user.profile.avatar ? (
                  <img 
                    src={user.profile.avatar} 
                    alt={`${user.username}'s avatar`} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full rounded-full bg-gradient-to-br ${userLevel.color} flex items-center justify-center text-white text-5xl font-bold shadow-inner`}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Indicateur d'activité */}
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-md"></div>
              </div>
            </div>
          </div>
          
          {/* Informations utilisateur */}
          <div className="text-center sm:text-left space-y-3">
            {/* Nom et badges */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight flex items-center gap-2">
                {user.username}
                {stats?.contribution_stats?.total_contributions >= 50 && (
                  <Sparkles className="w-6 h-6 text-yellow-300" />
                )}
              </h1>
              
              <div className="flex items-center gap-2">
                {/* Badge de type d'utilisateur */}
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm border border-white/30">
                  {user.profile.user_type === 'teacher' ? (
                    <>
                      <Shield className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                      Enseignant
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                      Étudiant
                    </>
                  )}
                </div>
                
                {/* Badge de niveau */}
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${userLevel.color} text-white shadow-md`}>
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                  {userLevel.level}
                </div>
              </div>
            </div>
            
            {/* Bio */}
            <p className="text-white/90 max-w-2xl leading-relaxed">
              {user.profile.bio || "Passionné(e) d'apprentissage et de partage de connaissances 📚"}
            </p>
            
            {/* Métadonnées */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
              {user.profile.display_email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Membre depuis {new Date(user.profile.joined_at).toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric'
                })}</span>
              </div>
              
              {user.profile.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{user.profile.location}</span>
                </div>
              )}
            </div>
            
            {/* Barre de progression vers le niveau suivant */}
            <div className="max-w-md">
              <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                <span>Progression vers {userLevel.level === "Expert" ? "la légende" : "le niveau suivant"}</span>
                <span>{Math.round(userLevel.progress)}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${userLevel.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full bg-gradient-to-r ${userLevel.color} shadow-sm`}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Statistiques principales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 w-full lg:w-auto">
          {mainStats.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              onMouseEnter={() => setHoveredStat(stat.id)}
              onMouseLeave={() => setHoveredStat(null)}
              className="relative"
            >
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer group">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">
                  {stat.value.toLocaleString()}
                </div>
                <div className="text-xs text-white/70 font-medium">
                  {stat.label}
                </div>
              </div>
              
              {/* Tooltip au survol */}
              <AnimatePresence>
                {hoveredStat === stat.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute z-10 top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg"
                  >
                    {stat.description}
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Sujets favoris */}
      {user.profile.favorite_subjects && user.profile.favorite_subjects.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-white/70 text-sm">Sujets favoris:</span>
          {user.profile.favorite_subjects.map((subject, idx) => (
            <span 
              key={idx}
              className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-colors cursor-pointer"
            >
              {subject}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};