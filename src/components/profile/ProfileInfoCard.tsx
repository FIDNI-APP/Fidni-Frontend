/**
 * ProfileInfoCard - Displays user profile information
 * Shows: class level, target subjects, goals, learning style, etc.
 */
import React from 'react';
import { User, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import type { User as UserType } from '@/types';

interface ProfileInfoCardProps {
  user: UserType;
}

export const ProfileInfoCard: React.FC<ProfileInfoCardProps> = ({ user }) => {
  const profile = user.profile;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Informations du profil</h3>
            <p className="text-sm text-slate-300">Détails de votre compte</p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="p-6 space-y-4">
        {/* Class Level */}
        <div className="pb-4 border-b border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Niveau</p>
          <p className="text-lg font-semibold text-slate-900">
            {profile?.class_level_name || profile?.class_level?.name || 'Non renseigné'}
          </p>
        </div>

        {/* Target Subjects */}
        <div className="pb-4 border-b border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-2">Matières cibles</p>
          {profile?.target_subject_names && profile.target_subject_names.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.target_subject_names.map((subject, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                >
                  {subject}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-slate-600">Aucune matière sélectionnée</p>
          )}
        </div>

        {/* User Type */}
        <div className="pb-4 border-b border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Type de compte</p>
          <p className="text-lg font-semibold text-slate-900">
            {profile?.user_type === 'student' ? 'Élève' : 'Enseignant'}
          </p>
        </div>

        {/* Objectives/Goals */}
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">Objectifs</p>
          <p className="text-slate-700">
            {profile?.subject_grades && profile.subject_grades.length > 0
              ? `${profile.subject_grades.length} matière(s) suivie(s)`
              : 'Aucun objectif défini'}
          </p>
        </div>
      </div>

      {/* Subject Grades Section (if available) */}
      {profile?.subject_grades && profile.subject_grades.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border-2 border-amber-200">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <h4 className="font-semibold text-amber-900 text-lg">Notes et Objectifs</h4>
            </div>
            <div className="space-y-3">
              {profile.subject_grades.slice(0, 5).map((grade, idx) => (
                <div key={idx} className="bg-white/60 rounded-lg p-3 border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-amber-900">{grade.subject_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-700">
                      Note actuelle: <span className="font-bold">{grade.current_grade}/20</span>
                    </span>
                    <span className="text-emerald-700">
                      Objectif: <span className="font-bold">{grade.target_grade}/20</span>
                    </span>
                  </div>
                </div>
              ))}
              {profile.subject_grades.length > 5 && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  +{profile.subject_grades.length - 5} autre(s) matière(s)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bio Section (if available) */}
      {profile?.bio && (
        <div className="px-6 pb-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">À propos</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};
