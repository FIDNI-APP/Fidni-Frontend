// src/pages/OnboardingProfile.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getClassLevels,
  getSubjects,
  uploadAvatar,
  completeOnboarding
} from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Check, Loader2,
  GraduationCap, Users, BookOpen, Target,
  Sparkles, Camera, User
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ClassLevel { id: string; name: string; }
interface Subject     { id: string; name: string; }

interface SubjectGrade { subject: string; current: number; target: number; }

interface OnboardingData {
  userType: 'student' | 'teacher';
  // Student
  classLevel: string;
  classLevelName: string;
  favoriteSubjects: string[];
  subjectGrades: SubjectGrade[];
  studyFrequency: 'daily' | 'weekly' | 'occasional';
  dailyGoal: number;
  // Teacher
  teachingClassLevels: string[];
  teachingClassLevelNames: string[];
  teachingSubjects: string[];
  // Common
  avatar: File | null;
  avatarPreview: string | null;
}

// ── Step definitions ─────────────────────────────────────────────────────────

const STUDENT_STEPS = [
  { key: 'role',     title: 'Votre rôle',      subtitle: 'Étudiant ou enseignant' },
  { key: 'level',    title: 'Votre niveau',     subtitle: 'Classe actuelle' },
  { key: 'subjects', title: 'Vos matières',     subtitle: 'Matières à travailler' },
  { key: 'goals',    title: 'Vos objectifs',    subtitle: "Rythme d'apprentissage" },
  { key: 'profile',  title: 'Votre profil',     subtitle: 'Photo et finalisation' },
];

const TEACHER_STEPS = [
  { key: 'role',     title: 'Votre rôle',       subtitle: 'Étudiant ou enseignant' },
  { key: 'level',    title: 'Niveaux enseignés', subtitle: 'Classes que vous enseignez' },
  { key: 'subjects', title: 'Matières enseignées', subtitle: 'Matières que vous enseignez' },
  { key: 'profile',  title: 'Votre profil',      subtitle: 'Photo et finalisation' },
];

// ── Component ─────────────────────────────────────────────────────────────────

const OnboardingProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [data, setData] = useState<OnboardingData>({
    userType: 'student',
    classLevel: '',
    classLevelName: '',
    favoriteSubjects: [],
    subjectGrades: [],
    studyFrequency: 'weekly',
    dailyGoal: 30,
    teachingClassLevels: [],
    teachingClassLevelNames: [],
    teachingSubjects: [],
    avatar: null,
    avatarPreview: null,
  });

  const isTeacher = data.userType === 'teacher';
  const STEPS = isTeacher ? TEACHER_STEPS : STUDENT_STEPS;

  // Auth guard
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.profile?.onboarding_completed) navigate('/');
  }, [user, navigate]);

  // Load class levels
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const levels = await getClassLevels();
        setClassLevels(levels.map((l: any) => ({ id: String(l.id), name: l.name })));
      } catch { setError('Impossible de charger les niveaux'); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  // Load subjects when relevant level(s) change
  useEffect(() => {
    if (isTeacher && data.teachingClassLevels.length === 0) { setSubjects([]); return; }
    if (!isTeacher && !data.classLevel) { setSubjects([]); return; }

    const levelIds = isTeacher ? data.teachingClassLevels : [data.classLevel];
    getSubjects(levelIds)
      .then((s: any[]) => setSubjects(s.map(x => ({ id: String(x.id), name: x.name }))))
      .catch(() => {});
  }, [data.classLevel, data.teachingClassLevels, isTeacher]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleTeachingLevel = (id: string, name: string) => {
    setData(prev => {
      const has = prev.teachingClassLevels.includes(id);
      return {
        ...prev,
        teachingClassLevels: has
          ? prev.teachingClassLevels.filter(x => x !== id)
          : [...prev.teachingClassLevels, id],
        teachingClassLevelNames: has
          ? prev.teachingClassLevelNames.filter(x => x !== name)
          : [...prev.teachingClassLevelNames, name],
        teachingSubjects: [],
      };
    });
  };

  const toggleTeachingSubject = (id: string) => {
    setData(prev => ({
      ...prev,
      teachingSubjects: prev.teachingSubjects.includes(id)
        ? prev.teachingSubjects.filter(x => x !== id)
        : [...prev.teachingSubjects, id],
    }));
  };

  const toggleStudentSubject = (subjectId: string) => {
    setData(prev => {
      const has = prev.favoriteSubjects.includes(subjectId);
      return {
        ...prev,
        favoriteSubjects: has
          ? prev.favoriteSubjects.filter(id => id !== subjectId)
          : [...prev.favoriteSubjects, subjectId],
        subjectGrades: has
          ? prev.subjectGrades.filter(g => g.subject !== subjectId)
          : [...prev.subjectGrades, { subject: subjectId, current: 12, target: 16 }],
      };
    });
  };

  const updateGrade = (subjectId: string, field: 'current' | 'target', value: number) => {
    setData(prev => ({
      ...prev,
      subjectGrades: prev.subjectGrades.map(g =>
        g.subject === subjectId ? { ...g, [field]: Math.max(0, Math.min(20, value)) } : g
      ),
    }));
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("L'image doit faire moins de 5MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setData(prev => ({ ...prev, avatar: file, avatarPreview: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const canProceed = (): boolean => {
    const key = STEPS[currentStep]?.key;
    if (key === 'role') return true;
    if (key === 'level') return isTeacher ? data.teachingClassLevels.length > 0 : !!data.classLevel;
    if (key === 'subjects') return isTeacher ? data.teachingSubjects.length > 0 : data.favoriteSubjects.length > 0;
    if (key === 'goals') return true;
    if (key === 'profile') return true;
    return false;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep(prev => prev + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) { setCurrentStep(prev => prev - 1); setError(null); }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (data.avatar) {
        try { await uploadAvatar(data.avatar); } catch {}
      }

      const payload: Record<string, any> = { user_type: data.userType };

      if (isTeacher) {
        payload.teaching_class_levels = data.teachingClassLevels;
        payload.teaching_subjects = data.teachingSubjects;
      } else {
        payload.class_level = data.classLevel;
        payload.favorite_subjects = data.favoriteSubjects;
        payload.study_frequency = data.studyFrequency;
        payload.daily_goal_minutes = data.dailyGoal;
        payload.subject_grades = data.subjectGrades;
      }

      await completeOnboarding(payload);
      await refreshUser();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step renderers ───────────────────────────────────────────────────────────

  const renderRoleStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Bienvenue sur Fidni</h2>
        <p className="text-slate-500">Commençons par définir votre rôle</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { id: 'student', label: 'Étudiant',   desc: "J'apprends et je progresse",   icon: GraduationCap },
          { id: 'teacher', label: 'Enseignant',  desc: "J'enseigne et je partage",     icon: Users },
        ].map(role => {
          const Icon = role.icon;
          const selected = data.userType === role.id;
          return (
            <button
              key={role.id}
              onClick={() => {
                setData(prev => ({
                  ...prev,
                  userType: role.id as any,
                  // reset conflicting fields when switching
                  classLevel: '', classLevelName: '',
                  favoriteSubjects: [], subjectGrades: [],
                  teachingClassLevels: [], teachingClassLevelNames: [], teachingSubjects: [],
                }));
                setCurrentStep(0); // stay on step 0
              }}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
                selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className={`font-semibold mb-1 ${selected ? 'text-blue-900' : 'text-slate-900'}`}>{role.label}</h3>
              <p className={`text-sm ${selected ? 'text-blue-600' : 'text-slate-500'}`}>{role.desc}</p>
              {selected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Student: single select / Teacher: multi-select checkboxes
  const renderLevelStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {isTeacher ? 'Niveaux que vous enseignez' : "Votre niveau d'études"}
        </h2>
        <p className="text-slate-500">
          {isTeacher ? 'Sélectionnez une ou plusieurs classes' : 'Sélectionnez votre classe actuelle'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {classLevels.map(level => {
            const selected = isTeacher
              ? data.teachingClassLevels.includes(level.id)
              : data.classLevel === level.id;

            return (
              <button
                key={level.id}
                onClick={() => {
                  if (isTeacher) {
                    toggleTeachingLevel(level.id, level.name);
                  } else {
                    setData(prev => ({
                      ...prev,
                      classLevel: level.id,
                      classLevelName: level.name,
                      favoriteSubjects: [],
                      subjectGrades: [],
                    }));
                  }
                }}
                className={`relative px-4 py-3.5 rounded-xl border-2 font-medium text-sm transition-all duration-200 text-left ${
                  selected
                    ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-700 bg-white'
                }`}
              >
                {level.name}
                {isTeacher && selected && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-blue-600" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isTeacher && data.teachingClassLevels.length > 0 && (
        <p className="text-center text-sm text-slate-500">
          {data.teachingClassLevels.length} niveau{data.teachingClassLevels.length > 1 ? 'x' : ''} sélectionné{data.teachingClassLevels.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );

  // Teacher: simple multi-select (no grades) / Student: existing with grades
  const renderSubjectsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {isTeacher ? 'Matières que vous enseignez' : 'Vos matières'}
        </h2>
        <p className="text-slate-500">
          {isTeacher
            ? 'Sélectionnez les matières que vous enseignez'
            : 'Sélectionnez les matières que vous souhaitez travailler'}
        </p>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Chargement des matières...</p>
        </div>
      ) : isTeacher ? (
        // Teacher: simple grid checkboxes
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {subjects.map(subject => {
            const selected = data.teachingSubjects.includes(subject.id);
            return (
              <button
                key={subject.id}
                onClick={() => toggleTeachingSubject(subject.id)}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all duration-200 text-left ${
                  selected
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-slate-200 hover:border-blue-200 text-slate-700 bg-white'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <BookOpen className="w-4 h-4" />
                </div>
                <span>{subject.name}</span>
                {selected && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        // Student: existing with grade sliders
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {subjects.map(subject => {
            const selected = data.favoriteSubjects.includes(subject.id);
            const gradeData = data.subjectGrades.find(g => g.subject === subject.id);
            return (
              <div key={subject.id} className={`bg-white rounded-xl border overflow-hidden transition-all duration-200 ${selected ? 'border-blue-200 shadow-sm' : 'border-slate-200'}`}>
                <button
                  onClick={() => toggleStudentSubject(subject.id)}
                  className={`w-full px-4 py-3.5 flex items-center justify-between transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className={`font-medium ${selected ? 'text-blue-900' : 'text-slate-700'}`}>{subject.name}</span>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                    {selected && <Check className="w-4 h-4 text-white" />}
                  </div>
                </button>

                <AnimatePresence>
                  {selected && gradeData && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 py-4 bg-slate-50 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-medium text-slate-500">Note actuelle</label>
                              <span className="text-sm font-bold text-slate-700">{gradeData.current}/20</span>
                            </div>
                            <input type="range" min="0" max="20" value={gradeData.current}
                              onChange={e => updateGrade(subject.id, 'current', +e.target.value)}
                              className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-medium text-slate-500">Objectif</label>
                              <span className="text-sm font-bold text-emerald-600">{gradeData.target}/20</span>
                            </div>
                            <input type="range" min="0" max="20" value={gradeData.target}
                              onChange={e => updateGrade(subject.id, 'target', +e.target.value)}
                              className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-600" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {isTeacher && data.teachingSubjects.length > 0 && (
        <p className="text-center text-sm text-slate-500">
          {data.teachingSubjects.length} matière{data.teachingSubjects.length > 1 ? 's' : ''} sélectionnée{data.teachingSubjects.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );

  const renderGoalsStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Vos objectifs</h2>
        <p className="text-slate-500">Définissez votre rythme d'apprentissage</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Fréquence d'étude</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'occasional', label: 'Occasionnel', desc: '1-2x/semaine', icon: '🌱' },
            { id: 'weekly',     label: 'Régulier',    desc: '3-4x/semaine', icon: '📚' },
            { id: 'daily',      label: 'Quotidien',   desc: 'Tous les jours', icon: '🚀' },
          ].map(freq => {
            const selected = data.studyFrequency === freq.id;
            return (
              <button key={freq.id}
                onClick={() => setData(prev => ({ ...prev, studyFrequency: freq.id as any }))}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <div className="text-2xl mb-2">{freq.icon}</div>
                <div className={`font-semibold text-sm ${selected ? 'text-blue-900' : 'text-slate-700'}`}>{freq.label}</div>
                <div className={`text-xs mt-1 ${selected ? 'text-blue-600' : 'text-slate-500'}`}>{freq.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium text-slate-700">Objectif quotidien</label>
          <span className="text-sm font-bold text-blue-600">{data.dailyGoal} min</span>
        </div>
        <input type="range" min="10" max="120" step="5" value={data.dailyGoal}
          onChange={e => setData(prev => ({ ...prev, dailyGoal: +e.target.value }))}
          className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>10 min</span><span>1h</span><span>2h</span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-blue-600 mt-0.5" />
          <p className="text-xs text-blue-700">
            Commencez avec un objectif réaliste. Vous pourrez toujours l'ajuster dans les paramètres.
          </p>
        </div>
      </div>
    </div>
  );

  const renderProfileStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Finalisez votre profil</h2>
        <p className="text-slate-500">Ajoutez une photo pour personnaliser votre compte</p>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center">
        <div className="relative mb-4">
          <div className={`w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl flex items-center justify-center ${data.avatarPreview ? '' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
            {data.avatarPreview
              ? <img src={data.avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              : <User className="w-14 h-14 text-white" />
            }
          </div>
          <button onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-slate-200 hover:bg-slate-50">
            <Camera className="w-5 h-5 text-slate-600" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleAvatarSelect} className="hidden" />
        </div>
        {data.avatarPreview
          ? <button onClick={() => setData(prev => ({ ...prev, avatar: null, avatarPreview: null }))}
              className="text-sm text-slate-500 hover:text-red-600 transition-colors">Supprimer la photo</button>
          : <p className="text-xs text-slate-400">JPG, PNG, GIF ou WebP • Max 5MB</p>
        }
      </div>

      {/* Récapitulatif */}
      <div className="bg-slate-50 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Récapitulatif</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-slate-200">
            <span className="text-slate-500 text-sm">Rôle</span>
            <span className="font-medium text-slate-900 text-sm">{isTeacher ? 'Enseignant' : 'Étudiant'}</span>
          </div>

          {isTeacher ? (
            <>
              <div className="flex justify-between items-start py-2 border-b border-slate-200">
                <span className="text-slate-500 text-sm">Niveaux enseignés</span>
                <span className="font-medium text-slate-900 text-sm text-right max-w-[60%]">
                  {data.teachingClassLevelNames.join(', ') || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 text-sm">Matières</span>
                <span className="font-medium text-slate-900 text-sm">
                  {data.teachingSubjects.length} sélectionnée{data.teachingSubjects.length > 1 ? 's' : ''}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-500 text-sm">Niveau</span>
                <span className="font-medium text-slate-900 text-sm">{data.classLevelName || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-500 text-sm">Matières</span>
                <span className="font-medium text-slate-900 text-sm">
                  {data.favoriteSubjects.length} sélectionnée{data.favoriteSubjects.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 text-sm">Objectif</span>
                <span className="font-medium text-slate-900 text-sm">{data.dailyGoal} min/jour</span>
              </div>
            </>
          )}
        </div>
      </div>

      {isTeacher && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
          <Users className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-indigo-700">
            Après votre inscription, vous recevrez un <strong>code enseignant unique</strong> à partager avec vos élèves pour qu'ils puissent vous rejoindre.
          </p>
        </div>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    const key = STEPS[currentStep]?.key;
    if (key === 'role')     return renderRoleStep();
    if (key === 'level')    return renderLevelStep();
    if (key === 'subjects') return renderSubjectsStep();
    if (key === 'goals')    return renderGoalsStep();
    if (key === 'profile')  return renderProfileStep();
    return null;
  };

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel — Desktop */}
      <div className="hidden lg:flex lg:w-80 bg-slate-900 text-white p-8 flex-col">
        <div className="mb-12">
          <h1 className="text-2xl font-bold">Fidni</h1>
          <p className="text-slate-400 text-sm mt-1">Configuration du compte</p>
        </div>

        <div className="flex-1">
          <div className="space-y-2">
            {STEPS.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent   = index === currentStep;
              return (
                <div key={step.key} className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${isCurrent ? 'bg-slate-800' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isCompleted ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <div>
                    <span className={`text-sm font-medium block ${isCurrent ? 'text-white' : 'text-slate-400'}`}>{step.title}</span>
                    <span className="text-xs text-slate-500">{step.subtitle}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-700">
          <p className="text-slate-500 text-xs leading-relaxed">
            Vous pourrez modifier ces informations à tout moment dans les paramètres de votre compte.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col">
        {/* Mobile progress */}
        <div className="lg:hidden p-4 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-900">Étape {currentStep + 1} sur {STEPS.length}</span>
            <span className="text-sm text-slate-500">{STEPS[currentStep]?.title}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3 }} />
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 text-sm">!</span>
              </div>
              <p className="text-red-700 text-sm flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div key={`${data.userType}-${currentStep}`}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}>
                {renderCurrentStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-6 bg-white border-t border-slate-200">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button onClick={handleBack} disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${currentStep === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}>
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button onClick={handleNext} disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${canProceed() ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                Continuer
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Finalisation...</> : <><Sparkles className="w-4 h-4" />Terminer</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingProfile;
