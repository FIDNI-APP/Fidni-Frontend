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
import { IdentityFields } from '@/components/profile/IdentityForm';
import { identityError, identityFromUser, identityPayload, type IdentityValue } from '@/lib/identity';
import {
  ArrowRight, ArrowLeft, Check, Loader2,
  GraduationCap, Users, BookOpen, Target,
  Sparkles, Camera, User, Sprout, Rocket
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
  { key: 'role',     title: 'Rôle',      subtitle: 'Étudiant ou enseignant' },
  { key: 'identity', title: 'Identité',  subtitle: 'Nom, naissance, établissement' },
  { key: 'level',    title: 'Niveau',     subtitle: 'Classe actuelle' },
  { key: 'subjects', title: 'Matières',   subtitle: 'Matières à travailler' },
  { key: 'goals',    title: 'Objectifs',  subtitle: "Rythme d'apprentissage" },
  { key: 'profile',  title: 'Profil',     subtitle: 'Photo et finalisation' },
];

const TEACHER_STEPS = [
  { key: 'role',     title: 'Rôle',       subtitle: 'Étudiant ou enseignant' },
  { key: 'identity', title: 'Identité',   subtitle: 'Nom, naissance, établissement' },
  { key: 'level',    title: 'Niveaux',    subtitle: 'Classes enseignées' },
  { key: 'subjects', title: 'Matières',   subtitle: 'Matières enseignées' },
  { key: 'profile',  title: 'Profil',     subtitle: 'Photo et finalisation' },
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
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

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

  // Prénom, nom, établissement : obligatoires (repris du compte s'ils existent déjà).
  const [identity, setIdentity] = useState<IdentityValue>(() => identityFromUser(user));

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
    if (isTeacher && data.teachingClassLevels.length === 0) { setSubjects([]); setSubjectsError(null); return; }
    if (!isTeacher && !data.classLevel) { setSubjects([]); setSubjectsError(null); return; }

    const levelIds = isTeacher ? data.teachingClassLevels : [data.classLevel];
    let cancelled = false;
    setSubjectsLoading(true);
    setSubjectsError(null);
    getSubjects(levelIds)
      .then((s: any[]) => {
        if (cancelled) return;
        setSubjects(s.map(x => ({ id: String(x.id), name: x.name })));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Onboarding: getSubjects failed', err);
        setSubjects([]);
        setSubjectsError('Impossible de charger les matières. Réessayez.');
      })
      .finally(() => { if (!cancelled) setSubjectsLoading(false); });
    return () => { cancelled = true; };
  }, [data.classLevel, data.teachingClassLevels, isTeacher, retryNonce]);

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
    if (key === 'identity') return identityError(identity) === null;
    if (key === 'level') return isTeacher ? data.teachingClassLevels.length > 0 : !!data.classLevel;
    if (key === 'subjects') return isTeacher ? data.teachingSubjects.length > 0 : data.favoriteSubjects.length > 0;
    if (key === 'goals') return true;
    if (key === 'profile') return true;
    return false;
  };

  const handleNext = () => {
    if (STEPS[currentStep]?.key === 'identity') {
      const problem = identityError(identity);
      if (problem) { setError(problem); return; }
    }
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

      const payload: Record<string, any> = { user_type: data.userType, ...identityPayload(identity) };

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
    <div className="space-y-7">
      <StepHeading title="Bienvenue sur Fidni" subtitle="Commençons par définir votre rôle." />

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
              className={`relative p-5 rounded-xl border text-left transition-colors ${
                selected ? 'border-brand bg-brand-soft' : 'border-line hover:border-ink bg-white'
              }`}
            >
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-3 ${selected ? 'bg-brand text-white' : 'bg-[#f2f1ee] text-ink-faint'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-1 text-ink">{role.label}</h3>
              <p className={`text-sm ${selected ? 'text-brand-hover' : 'text-ink-faint'}`}>{role.desc}</p>
              {selected && (
                <div className="absolute top-3.5 right-3.5 w-5 h-5 bg-brand rounded-full flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderIdentityStep = () => (
    <div className="space-y-7">
      <StepHeading title="Qui es-tu ?"
        subtitle="Ton nom et ton établissement apparaissent sur tes feuilles d'exercices. Ils restent privés." />
      <IdentityFields value={identity} onChange={(v) => { setIdentity(v); setError(null); }} isTeacher={isTeacher} />
    </div>
  );

  // Student: single select / Teacher: multi-select checkboxes
  const renderLevelStep = () => (
    <div className="space-y-7">
      <StepHeading
        title={isTeacher ? 'Niveaux que vous enseignez' : "Votre niveau d'études"}
        subtitle={isTeacher ? 'Sélectionnez une ou plusieurs classes.' : 'Sélectionnez votre classe actuelle.'}
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-brand" /></div>
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
                className={`relative px-4 py-3 rounded-lg border font-medium text-sm transition-colors text-left ${
                  selected
                    ? 'border-brand bg-brand text-white'
                    : 'border-line hover:border-ink text-ink-soft bg-white'
                }`}
              >
                {level.name}
                {isTeacher && selected && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-brand" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isTeacher && data.teachingClassLevels.length > 0 && (
        <p className="text-center text-sm text-ink-faint">
          <span className="fd-nums font-semibold text-ink">{data.teachingClassLevels.length}</span> niveau{data.teachingClassLevels.length > 1 ? 'x' : ''} sélectionné{data.teachingClassLevels.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );

  // Teacher: simple multi-select (no grades) / Student: existing with grades
  const renderSubjectsStep = () => (
    <div className="space-y-6">
      <StepHeading
        title={isTeacher ? 'Matières que vous enseignez' : 'Vos matières'}
        subtitle={isTeacher
          ? 'Sélectionnez les matières que vous enseignez.'
          : 'Sélectionnez les matières que vous souhaitez travailler.'}
      />

      {subjectsLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-7 h-7 animate-spin text-brand mx-auto mb-4" />
          <p className="text-ink-faint">Chargement des matières…</p>
        </div>
      ) : subjectsError ? (
        <div className="text-center py-8">
          <p className="text-[#a23b34] text-sm mb-4">{subjectsError}</p>
          <button onClick={() => setRetryNonce(n => n + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-line text-ink-soft hover:border-ink text-sm font-medium transition-colors">
            Réessayer
          </button>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-ink-faint text-sm">
            Aucune matière disponible pour ce niveau. Revenez en arrière pour choisir un autre niveau.
          </p>
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
                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                  selected
                    ? 'border-brand bg-brand-soft text-ink'
                    : 'border-line hover:border-ink text-ink-soft bg-white'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? 'bg-brand text-white' : 'bg-[#f2f1ee] text-ink-faint'}`}>
                  <BookOpen className="w-4 h-4" />
                </div>
                <span>{subject.name}</span>
                {selected && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        // Student: existing with grade sliders
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {subjects.map(subject => {
            const selected = data.favoriteSubjects.includes(subject.id);
            const gradeData = data.subjectGrades.find(g => g.subject === subject.id);
            return (
              <div key={subject.id} className={`bg-white rounded-xl border overflow-hidden transition-colors ${selected ? 'border-brand' : 'border-line'}`}>
                <button
                  onClick={() => toggleStudentSubject(subject.id)}
                  className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${selected ? 'bg-brand-soft' : 'hover:bg-[#f7f6f3]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selected ? 'bg-brand text-white' : 'bg-[#f2f1ee] text-ink-faint'}`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className={`font-medium ${selected ? 'text-ink' : 'text-ink-soft'}`}>{subject.name}</span>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selected ? 'border-brand bg-brand' : 'border-[#cfcdc8]'}`}>
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
                      <div className="px-4 py-4 bg-paper border-t border-line">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-medium text-ink-faint">Note actuelle</label>
                              <span className="text-sm font-bold fd-nums text-ink">{gradeData.current}/20</span>
                            </div>
                            <input type="range" min="0" max="20" value={gradeData.current}
                              onChange={e => updateGrade(subject.id, 'current', +e.target.value)}
                              className="w-full h-2 bg-[#e7e3dc] rounded-full appearance-none cursor-pointer accent-[#1a1a1a]" />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-medium text-ink-faint">Objectif</label>
                              <span className="text-sm font-bold fd-nums text-brand-hover">{gradeData.target}/20</span>
                            </div>
                            <input type="range" min="0" max="20" value={gradeData.target}
                              onChange={e => updateGrade(subject.id, 'target', +e.target.value)}
                              className="w-full h-2 bg-[#e7e3dc] rounded-full appearance-none cursor-pointer accent-[#1a7a4a]" />
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
        <p className="text-center text-sm text-ink-faint">
          <span className="fd-nums font-semibold text-ink">{data.teachingSubjects.length}</span> matière{data.teachingSubjects.length > 1 ? 's' : ''} sélectionnée{data.teachingSubjects.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );

  const renderGoalsStep = () => (
    <div className="space-y-7">
      <StepHeading title="Vos objectifs" subtitle="Définissez votre rythme d'apprentissage." />

      <div>
        <label className="block text-sm font-medium text-ink-soft mb-3">Fréquence d'étude</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'occasional', label: 'Occasionnel', desc: '1–2×/semaine', icon: Sprout },
            { id: 'weekly',     label: 'Régulier',    desc: '3–4×/semaine', icon: BookOpen },
            { id: 'daily',      label: 'Quotidien',   desc: 'Tous les jours', icon: Rocket },
          ].map(freq => {
            const Icon = freq.icon;
            const selected = data.studyFrequency === freq.id;
            return (
              <button key={freq.id}
                onClick={() => setData(prev => ({ ...prev, studyFrequency: freq.id as any }))}
                className={`p-4 rounded-xl border text-center transition-colors ${selected ? 'border-brand bg-brand-soft' : 'border-line hover:border-ink bg-white'}`}
              >
                <div className={`w-9 h-9 mx-auto mb-2 rounded-lg flex items-center justify-center ${selected ? 'bg-brand text-white' : 'bg-[#f2f1ee] text-ink-faint'}`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <div className="font-semibold text-sm text-ink">{freq.label}</div>
                <div className={`text-xs mt-1 ${selected ? 'text-brand-hover' : 'text-ink-faint'}`}>{freq.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium text-ink-soft">Objectif quotidien</label>
          <span className="text-sm font-bold fd-nums text-brand-hover">{data.dailyGoal} min</span>
        </div>
        <input type="range" min="10" max="120" step="5" value={data.dailyGoal}
          onChange={e => setData(prev => ({ ...prev, dailyGoal: +e.target.value }))}
          className="w-full h-2 bg-[#e7e3dc] rounded-full appearance-none cursor-pointer accent-[#1a7a4a]" />
        <div className="flex justify-between text-xs text-ink-faint mt-2 fd-nums">
          <span>10 min</span><span>1 h</span><span>2 h</span>
        </div>
      </div>

      <div className="bg-brand-soft border border-brand-line rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-brand-hover mt-0.5 flex-shrink-0" />
          <p className="text-xs text-ink-soft leading-relaxed">
            Commencez avec un objectif réaliste. Vous pourrez toujours l'ajuster dans les paramètres.
          </p>
        </div>
      </div>
    </div>
  );

  const renderProfileStep = () => (
    <div className="space-y-7">
      <StepHeading title="Finalisez votre profil" subtitle="Ajoutez une photo pour personnaliser votre compte." />

      {/* Avatar */}
      <div className="flex flex-col items-center">
        <div className="relative mb-4">
          <div className={`w-24 h-24 rounded-full overflow-hidden border border-line flex items-center justify-center ${data.avatarPreview ? '' : 'bg-ink'}`}>
            {data.avatarPreview
              ? <img src={data.avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              : <User className="w-12 h-12 text-white" />
            }
          </div>
          <button onClick={() => fileInputRef.current?.click()}
            aria-label="Choisir une photo"
            className="absolute bottom-0 right-0 w-9 h-9 bg-white rounded-full flex items-center justify-center border border-line hover:border-ink transition-colors">
            <Camera className="w-4 h-4 text-ink-soft" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleAvatarSelect} className="hidden" />
        </div>
        {data.avatarPreview
          ? <button onClick={() => setData(prev => ({ ...prev, avatar: null, avatarPreview: null }))}
              className="text-sm text-ink-faint hover:text-[#c2564f] transition-colors">Supprimer la photo</button>
          : <p className="text-xs text-ink-faint">JPG, PNG, GIF ou WebP · Max 5 Mo</p>
        }
      </div>

      {/* Récapitulatif */}
      <div className="bg-paper border border-line rounded-xl p-5">
        <h3 className="text-ink-faint mb-4 text-xs uppercase tracking-widest" style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontWeight: 600 }}>Récapitulatif</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-line">
            <span className="text-ink-faint text-sm">Rôle</span>
            <span className="font-medium text-ink text-sm">{isTeacher ? 'Enseignant' : 'Étudiant'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-line">
            <span className="text-ink-faint text-sm">Nom</span>
            <span className="font-medium text-ink text-sm">
              {`${{ M: 'M. ', F: 'Mme ' }[identity.gender as 'M' | 'F'] ?? ''}${identity.firstName} ${identity.lastName}`.trim() || '—'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-line">
            <span className="text-ink-faint text-sm">Date de naissance</span>
            <span className="font-medium text-ink text-sm">
              {identity.birthDate
                ? new Date(`${identity.birthDate}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
            </span>
          </div>
          <div className="flex justify-between items-start gap-4 py-2 border-b border-line">
            <span className="text-ink-faint text-sm">Établissement</span>
            <span className="font-medium text-ink text-sm text-right">{identity.school.name || '—'}</span>
          </div>

          {isTeacher ? (
            <>
              <div className="flex justify-between items-start py-2 border-b border-line">
                <span className="text-ink-faint text-sm">Niveaux enseignés</span>
                <span className="font-medium text-ink text-sm text-right max-w-[60%]">
                  {data.teachingClassLevelNames.join(', ') || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-ink-faint text-sm">Matières</span>
                <span className="font-medium text-ink text-sm">
                  <span className="fd-nums">{data.teachingSubjects.length}</span> sélectionnée{data.teachingSubjects.length > 1 ? 's' : ''}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center py-2 border-b border-line">
                <span className="text-ink-faint text-sm">Niveau</span>
                <span className="font-medium text-ink text-sm">{data.classLevelName || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-line">
                <span className="text-ink-faint text-sm">Matières</span>
                <span className="font-medium text-ink text-sm">
                  <span className="fd-nums">{data.favoriteSubjects.length}</span> sélectionnée{data.favoriteSubjects.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-ink-faint text-sm">Objectif</span>
                <span className="font-medium text-ink text-sm fd-nums">{data.dailyGoal} min/jour</span>
              </div>
            </>
          )}
        </div>
      </div>

      {isTeacher && (
        <div className="bg-brand-soft border border-brand-line rounded-xl p-4 flex items-start gap-3">
          <Users className="w-5 h-5 text-brand-hover mt-0.5 flex-shrink-0" />
          <p className="text-xs text-ink-soft leading-relaxed">
            Après votre inscription, vous recevrez un <strong className="text-ink">code enseignant unique</strong> à partager avec vos élèves pour qu'ils puissent vous rejoindre.
          </p>
        </div>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    const key = STEPS[currentStep]?.key;
    if (key === 'role')     return renderRoleStep();
    if (key === 'identity') return renderIdentityStep();
    if (key === 'level')    return renderLevelStep();
    if (key === 'subjects') return renderSubjectsStep();
    if (key === 'goals')    return renderGoalsStep();
    if (key === 'profile')  return renderProfileStep();
    return null;
  };

  // ── Main render ──────────────────────────────────────────────────────────────
  // Renders as ordinary page content INSIDE the app shell (sidebar + top bar).
  // A single centred column on the paper background; the step navigation lives
  // IN-FLOW at the bottom of the card so it is always visible and clickable.

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <Stepper steps={STEPS} current={currentStep} />

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mt-5 p-4 bg-[#fdeceb] border border-[#f3c9c5] rounded-xl flex items-center gap-3">
            <span className="w-7 h-7 bg-[#f8d7d3] rounded-full flex items-center justify-center flex-shrink-0 text-[#a23b34] text-sm font-semibold">!</span>
            <p className="text-[#a23b34] text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} aria-label="Fermer" className="text-[#c2564f] hover:text-[#a23b34] text-lg leading-none">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card */}
      <div className="fd-card mt-6 overflow-hidden">
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={`${data.userType}-${currentStep}`}
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}>
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation — in-flow, always reachable */}
        <div className="px-6 sm:px-8 py-4 border-t border-line flex items-center justify-between gap-3">
          <button onClick={handleBack} disabled={currentStep === 0}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${currentStep === 0 ? 'text-[#cfcdc8] cursor-not-allowed' : 'text-ink-soft hover:bg-[#f2f1ee]'}`}>
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          {!isLastStep ? (
            // Étape identité : bouton actif, pour expliquer ce qui manque au lieu de rester grisé.
            <button onClick={handleNext} disabled={!canProceed() && STEPS[currentStep]?.key !== 'identity'}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors ${canProceed() ? 'bg-brand text-white hover:bg-brand-hover' : 'bg-[#f2f1ee] text-ink-faint cursor-not-allowed'}`}>
              Continuer
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand text-white rounded-lg font-semibold text-sm hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Finalisation…</> : <><Sparkles className="w-4 h-4" />Terminer</>}
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-ink-faint mt-5 max-w-sm mx-auto leading-relaxed">
        Vous pourrez modifier ces informations à tout moment dans les paramètres de votre compte.
      </p>
    </div>
  );
};

// ── Shared pieces ─────────────────────────────────────────────────────────────

// Müller-Brockmann modular grid: equal columns, consistent rhythm, a single
// hairline connecting the numbered nodes. Collapses to a progress bar on mobile.
const Stepper: React.FC<{ steps: { key: string; title: string }[]; current: number }> = ({ steps, current }) => (
  <>
    <ol className="hidden sm:grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const reached = i <= current;
        return (
          <li key={step.key} className="relative flex flex-col items-center text-center px-1">
            {i > 0 && (
              <span aria-hidden className={`absolute top-[15px] right-1/2 w-full h-0.5 ${reached ? 'bg-brand' : 'bg-line'}`} />
            )}
            <span className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold fd-nums ${
              done ? 'bg-brand border-brand text-white'
              : active ? 'bg-white border-brand text-brand'
              : 'bg-white border-line text-ink-faint'
            }`}>
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span className={`mt-2 text-xs leading-tight ${active ? 'text-ink font-semibold' : done ? 'text-ink-soft' : 'text-ink-faint'}`}>
              {step.title}
            </span>
          </li>
        );
      })}
    </ol>

    {/* Mobile: compact step counter + progress bar */}
    <div className="sm:hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-ink fd-nums">Étape {current + 1} sur {steps.length}</span>
        <span className="text-sm text-ink-faint">{steps[current]?.title}</span>
      </div>
      <div className="h-1.5 bg-[#f2f1ee] rounded-full overflow-hidden">
        <motion.div className="h-full bg-brand rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((current + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.3 }} />
      </div>
    </div>
  </>
);

// Shared step heading — Fraunces title + muted subtitle.
const StepHeading: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="text-center">
    <h2 className="fd-display text-ink mb-2" style={{ fontSize: 23, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h2>
    <p className="text-ink-faint text-sm">{subtitle}</p>
  </div>
);

export default OnboardingProfile;
