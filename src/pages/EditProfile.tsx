/**
 * EditProfile - Dedicated page for editing user profile
 * Full-page form with all editable fields
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  Mail,
  MapPin,
  BookOpen,
  GraduationCap,
  Target,
  Save,
  X,
  Loader2,
  Upload,
  Camera
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getClassLevels, getSubjects, updateUserProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface EditProfileData {
  bio: string;
  location: string;
  class_level: string;
  target_subjects: string[];
  avatar?: File | null;
  subject_grades: {
    subject: string;
    min_grade: number;
    max_grade: number;
  }[];
}

export function EditProfile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<EditProfileData>({
    bio: '',
    location: '',
    class_level: '',
    target_subjects: [],
    subject_grades: []
  });

  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [classLevels, setClassLevels] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [classLevelsData, subjectsData] = await Promise.all([
          getClassLevels(),
          getSubjects()
        ]);

        setClassLevels(classLevelsData);
        setSubjects(subjectsData);

        // Populate form with user data
        if (user?.profile) {
          console.log('User profile data:', user.profile);

          // Handle class_level - can be a number (ID), string (ID), or object with id
          let classLevelId = '';
          if (user.profile.class_level) {
            if (typeof user.profile.class_level === 'number') {
              classLevelId = user.profile.class_level.toString();
            } else if (typeof user.profile.class_level === 'string') {
              classLevelId = user.profile.class_level;
            } else if (user.profile.class_level.id) {
              classLevelId = user.profile.class_level.id.toString();
            }
          }

          // Handle target_subjects - it's an array of IDs
          const targetSubjectsIds = Array.isArray(user.profile.target_subjects)
            ? user.profile.target_subjects
            : [];

          // Handle subject_grades
          const subjectGradesData = user.profile.subject_grades?.map(grade => ({
            subject: typeof grade.subject === 'string' ? grade.subject : grade.subject?.id || '',
            min_grade: grade.min_grade || grade.current_grade || 0,
            max_grade: grade.max_grade || grade.target_grade || 20
          })) || [];

          console.log('Parsed data:', {
            class_level: classLevelId,
            target_subjects: targetSubjectsIds,
            subject_grades: subjectGradesData
          });

          setFormData({
            bio: user.profile.bio || '',
            location: user.profile.location || '',
            class_level: classLevelId,
            target_subjects: targetSubjectsIds,
            subject_grades: subjectGradesData
          });

          setAvatarPreview(user.profile.avatar || '');
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Impossible de charger les données');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, avatar: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      target_subjects: prev.target_subjects.includes(subjectId)
        ? prev.target_subjects.filter(id => id !== subjectId)
        : [...prev.target_subjects, subjectId]
    }));
  };

  const handleAddGrade = () => {
    if (formData.target_subjects.length === 0) {
      setError('Veuillez d\'abord sélectionner des matières cibles');
      return;
    }

    const availableSubjects = formData.target_subjects.filter(
      subjectId => !formData.subject_grades.find(g => g.subject === subjectId)
    );

    if (availableSubjects.length === 0) {
      setError('Vous avez déjà ajouté des notes pour toutes vos matières cibles');
      return;
    }

    setFormData(prev => ({
      ...prev,
      subject_grades: [
        ...prev.subject_grades,
        { subject: availableSubjects[0], min_grade: 10, max_grade: 15 }
      ]
    }));
  };

  const handleRemoveGrade = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subject_grades: prev.subject_grades.filter((_, i) => i !== index)
    }));
  };

  const handleGradeChange = (index: number, field: 'min_grade' | 'max_grade', value: number) => {
    setFormData(prev => ({
      ...prev,
      subject_grades: prev.subject_grades.map((grade, i) =>
        i === index ? { ...grade, [field]: value } : grade
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.username) {
      setError('Utilisateur non trouvé');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Create update data object (JSON instead of FormData for now)
      const updateData = {
        profile: {
          bio: formData.bio,
          location: formData.location,
          class_level: formData.class_level,
          target_subjects: formData.target_subjects,
          subject_grades: formData.subject_grades.map(grade => ({
            subject: grade.subject,
            min_grade: grade.min_grade,
            max_grade: grade.max_grade
          }))
        }
      };

      console.log('=== SENDING UPDATE ===');
      console.log('Form data:', formData);
      console.log('Update data being sent:', JSON.stringify(updateData, null, 2));
      console.log('Subject grades count:', formData.subject_grades.length);

      await updateUserProfile(user.username, updateData);
      await refreshUser();

      setSuccessMessage('Profil mis à jour avec succès!');
      setTimeout(() => {
        navigate(`/profile/${user.username}`);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.error || 'Impossible de mettre à jour le profil');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Modifier mon profil</h1>
              <p className="text-slate-600 mt-1">Personnalisez vos informations</p>
            </div>
            <Button
              onClick={() => navigate(`/profile/${user?.username}`)}
              variant="outline"
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Annuler
            </Button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700"
          >
            {error}
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl text-green-700"
          >
            {successMessage}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Photo de profil
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 border-4 border-white shadow-lg">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg"
                >
                  <Upload className="w-4 h-4 text-white" />
                </label>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-2">
                  Choisissez une image pour votre profil
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  className="cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choisir une image
                </Button>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations de base
            </h2>
            <div className="space-y-4">
              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Biographie
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="Parlez-nous de vous..."
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Localisation
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="Paris, France"
                />
              </div>
            </div>
          </div>

          {/* Academic Info */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Informations académiques
            </h2>
            <div className="space-y-4">
              {/* Class Level */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Niveau de classe
                </label>
                <select
                  value={formData.class_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, class_level: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="">Sélectionnez votre niveau</option>
                  {classLevels.map(level => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Subjects */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Matières cibles
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {subjects.map(subject => (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => handleSubjectToggle(subject.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.target_subjects.includes(subject.id)
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {subject.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Subject Grades */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Notes et Objectifs
              </h2>
              <Button
                type="button"
                onClick={handleAddGrade}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Ajouter une matière
              </Button>
            </div>

            {formData.subject_grades.length === 0 ? (
              <p className="text-slate-600 text-center py-8">
                Aucune note ajoutée. Cliquez sur "Ajouter une matière" pour commencer.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.subject_grades.map((grade, index) => (
                  <div key={index} className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <select
                        value={grade.subject}
                        onChange={(e) => {
                          const newGrades = [...formData.subject_grades];
                          newGrades[index].subject = e.target.value;
                          setFormData(prev => ({ ...prev, subject_grades: newGrades }));
                        }}
                        className="flex-1 px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500"
                      >
                        {formData.target_subjects.map(subjectId => {
                          const subject = subjects.find(s => s.id === subjectId);
                          return subject ? (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ) : null;
                        })}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveGrade(index)}
                        className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Note actuelle
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={grade.min_grade}
                          onChange={(e) => handleGradeChange(index, 'min_grade', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Objectif
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={grade.max_grade}
                          onChange={(e) => handleGradeChange(index, 'max_grade', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              onClick={() => navigate(`/profile/${user?.username}`)}
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
