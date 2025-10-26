// src/components/profile/ProfileHeader.tsx
import React from 'react';
import { User } from '@/types';
import {
  Mail,
  Calendar,
  MapPin,
  Shield,
  GraduationCap,
  Sparkles,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

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

  return (
    <div className="relative">
      {/* Simplified header - Focus on user identity only */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-white">
        {/* Avatar avec effets visuels */}
        <div className="relative group flex-shrink-0">
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
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-white/90 backdrop-blur-sm shadow-xl">
              {user.profile.avatar ? (
                <img
                  src={user.profile.avatar}
                  alt={`${user.username}'s avatar`}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${userLevel.color} flex items-center justify-center text-white text-4xl font-bold shadow-inner`}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Indicateur d'activité */}
              <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-4 border-white shadow-md"></div>
            </div>
          </div>
        </div>

        {/* Informations utilisateur */}
        <div className="text-center sm:text-left space-y-4 flex-1">
          {/* Nom et badges */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight flex items-center justify-center sm:justify-start gap-2">
              {user.username}
              {stats?.contribution_stats?.total_contributions >= 50 && (
                <Sparkles className="w-6 h-6 text-yellow-300" />
              )}
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {/* Badge de type d'utilisateur */}
              <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm border border-white/30">
                {user.profile.user_type === 'teacher' ? (
                  <>
                    <Shield className="w-4 h-4 mr-1.5 text-amber-300" />
                    Enseignant
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-4 h-4 mr-1.5" />
                    Étudiant
                  </>
                )}
              </div>

              {/* Badge de niveau */}
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r ${userLevel.color} text-white shadow-md`}>
                <Zap className="w-4 h-4 mr-1.5" />
                {userLevel.level}
              </div>
            </div>
          </div>

          {/* Bio */}
          <p className="text-white/90 text-base sm:text-lg max-w-2xl leading-relaxed">
            {user.profile.bio || "Passionné(e) d'apprentissage et de partage de connaissances 📚"}
          </p>

          {/* Métadonnées */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-white/80">
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
          <div className="max-w-md mx-auto sm:mx-0">
            <div className="flex items-center justify-between text-xs text-white/70 mb-2">
              <span>Progression vers {userLevel.level === "Expert" ? "la légende" : "le niveau suivant"}</span>
              <span className="font-semibold">{Math.round(userLevel.progress)}%</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${userLevel.progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full bg-gradient-to-r ${userLevel.color} shadow-sm`}
              />
            </div>
          </div>

          {/* Sujets favoris */}
          {user.profile.favorite_subjects && user.profile.favorite_subjects.length > 0 && (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-white/70 text-sm font-medium">Sujets favoris:</span>
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
      </div>
    </div>
  );
};
