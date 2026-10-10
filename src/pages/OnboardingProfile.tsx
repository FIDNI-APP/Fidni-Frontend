// src/pages/OnboardingProfile.tsx
/**
 * Onboarding en 2 écrans (10/10/2026) : « Ta classe » puis « Qui es-tu ? ». Il en avait 6 (rôle,
 * identité, niveau, matières, objectifs, photo) entre l'inscription et le premier exercice.
 * - La matière unique est cochée d'office ; objectifs de notes et photo se règlent plus tard (profil).
 * - Chaque « Continuer » enregistre l'étape atteinte (PATCH /onboarding/) : on reprend là où on s'était
 *   arrêté, et le Pilotage voit où les nouveaux élèves abandonnent.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getClassLevels, getSubjects, completeOnboarding, getOnboardingState, updateOnboardingStep } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { IdentityFields } from '@/components/profile/IdentityForm';
import { identityError, identityFromUser, identityPayload, type IdentityValue } from '@/lib/identity';
import { ArrowRight, ArrowLeft, Check, Loader2, Sparkles } from 'lucide-react';

interface Option { id: string; name: string }

const STEPS = [
  { key: 'classe', title: 'Ta classe' },
  { key: 'identite', title: 'Qui es-tu ?' },
] as const;

const OnboardingProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userType, setUserType] = useState<'student' | 'teacher'>(
    () => (user?.profile?.user_type === 'teacher' ? 'teacher' : 'student'),
  );
  const isTeacher = userType === 'teacher';

  const [classLevels, setClassLevels] = useState<Option[] | null>(null);
  const [levelsError, setLevelsError] = useState(false);
  const [levelsNonce, setLevelsNonce] = useState(0);
  // Élève : une classe. Prof : une ou plusieurs.
  const [classLevel, setClassLevel] = useState('');
  const [teachingLevels, setTeachingLevels] = useState<string[]>([]);

  const [subjects, setSubjects] = useState<Option[]>([]);
  const [chosenSubjects, setChosenSubjects] = useState<string[]>([]);

  // Prénom, nom, établissement : obligatoires (repris du compte s'ils existent déjà, même relu après coup).
  const [identity, setIdentity] = useState<IdentityValue>(() => identityFromUser(user));
  const identityTouched = useRef(false);
  const userId = user?.id;
  useEffect(() => {
    if (user && !identityTouched.current) setIdentity(identityFromUser(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une fois le compte connu, pas à chaque rafraîchissement
  }, [userId]);

  // Auth guard (une fois la session relue : un rechargement de la page ne renvoie pas à la connexion).
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (user.profile?.onboarding_completed) navigate('/');
  }, [user, authLoading, navigate]);

  // Reprise : la classe déjà choisie lors d'une visite précédente (sans écraser un choix déjà fait ici).
  const touched = useRef(false);
  useEffect(() => {
    let cancelled = false;
    getOnboardingState()
      .then((state) => {
        if (cancelled || touched.current || !state || state.completed) return;
        const d = state.data ?? {};
        if (d.user_type === 'teacher') { setUserType('teacher'); return; }
        if (d.class_level) {
          setClassLevel(String(d.class_level));
          if (Number(state.current_step) >= 1) setCurrentStep(1);
        }
      })
      .catch(() => { /* pas de reprise : on commence au début */ });
    return () => { cancelled = true; };
  }, []);

  // Load class levels
  useEffect(() => {
    let cancelled = false;
    setLevelsError(false);
    getClassLevels()
      .then((levels) => { if (!cancelled) setClassLevels(levels.map((l) => ({ id: String(l.id), name: l.name }))); })
      .catch(() => { if (!cancelled) { setClassLevels([]); setLevelsError(true); } });
    return () => { cancelled = true; };
  }, [levelsNonce]);

  // Matières du (des) niveau(x) choisi(s) : une seule (aujourd'hui, les maths) → cochée d'office.
  const levelIds = isTeacher ? teachingLevels : classLevel ? [classLevel] : [];
  const levelKey = levelIds.join(',');
  useEffect(() => {
    if (!levelKey) { setSubjects([]); setChosenSubjects([]); return; }
    let cancelled = false;
    getSubjects(levelKey.split(','))
      .then((list: { id: string | number; name: string }[]) => {
        if (cancelled) return;
        const opts = list.map((x) => ({ id: String(x.id), name: x.name }));
        setSubjects(opts);
        setChosenSubjects((prev) => {
          const kept = prev.filter((id) => opts.some((o) => o.id === id));
          return opts.length === 1 ? [opts[0].id] : kept;
        });
      })
      .catch(() => { if (!cancelled) setSubjects([]); });
    return () => { cancelled = true; };
  }, [levelKey]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const switchRole = (next: 'student' | 'teacher') => {
    touched.current = true;
    setUserType(next);
    setClassLevel('');
    setTeachingLevels([]);
    setChosenSubjects([]);
    setError(null);
  };

  const pickLevel = (id: string) => {
    touched.current = true;
    setClassLevel(id);
  };

  const toggleTeachingLevel = (id: string) => {
    touched.current = true;
    setTeachingLevels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSubject = (id: string) => {
    setChosenSubjects((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Plusieurs matières proposées : au moins une. Une seule : déjà cochée.
  const subjectsOk = subjects.length <= 1 || chosenSubjects.length > 0;
  const canProceed = (): boolean => {
    if (STEPS[currentStep].key === 'classe') return (isTeacher ? teachingLevels.length > 0 : !!classLevel) && subjectsOk;
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) return;
    // Étape atteinte, enregistrée sans attendre (reprise + mesure de l'abandon). Jamais bloquant.
    updateOnboardingStep({
      current_step: currentStep + 1,
      user_type: userType,
      ...(!isTeacher && classLevel ? { class_level: classLevel } : {}),
    }).catch(() => {});
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    setError(null);
  };

  const handleBack = () => {
    if (currentStep > 0) { setCurrentStep((s) => s - 1); setError(null); }
  };

  const handleSubmit = async () => {
    const problem = identityError(identity);
    if (problem) { setError(problem); return; }
    let subjectIds = chosenSubjects.length ? chosenSubjects : subjects.length === 1 ? [subjects[0].id] : [];
    try {
      setIsSubmitting(true);
      setError(null);
      // Matières pas encore arrivées (réseau lent) : la matière unique du niveau, pour ne pas l'enregistrer vide.
      if (!subjectIds.length && levelIds.length) {
        const list = await getSubjects(levelIds).catch(() => []);
        if (list.length === 1) subjectIds = [String(list[0].id)];
      }
      const payload: Record<string, unknown> = { user_type: userType, ...identityPayload(identity) };
      if (isTeacher) {
        payload.teaching_class_levels = teachingLevels;
        payload.teaching_subjects = subjectIds;
      } else {
        payload.class_level = classLevel;
        payload.favorite_subjects = subjectIds;
      }
      await completeOnboarding(payload);
      await refreshUser();
      navigate('/');
    } catch (err) {
      const data = (err as { response?: { data?: { error?: string } } }).response?.data;
      setError(data?.error || 'Une erreur est survenue. Réessaie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Écrans ───────────────────────────────────────────────────────────────────

  const renderClassStep = () => (
    <div className="space-y-6">
      <StepHeading
        title={isTeacher ? 'Tes classes' : 'Ta classe'}
        subtitle={isTeacher
          ? 'Les niveaux où tu enseignes (un ou plusieurs).'
          : 'On te montre les exercices, leçons et devoirs de ton programme.'}
      />

      {classLevels === null ? (
        <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-brand" /></div>
      ) : levelsError ? (
        <div className="text-center py-6">
          <p className="text-[#a23b34] text-sm mb-4">Impossible de charger les classes.</p>
          <button type="button" onClick={() => { setClassLevels(null); setLevelsNonce((n) => n + 1); }}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 rounded-lg border border-line text-ink-soft hover:border-ink text-sm font-medium transition-colors">
            Réessayer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role={isTeacher ? 'group' : 'radiogroup'} aria-label={isTeacher ? 'Tes classes' : 'Ta classe'}>
          {classLevels.map((level) => {
            const selected = isTeacher ? teachingLevels.includes(level.id) : classLevel === level.id;
            return (
              <button
                key={level.id}
                type="button"
                role={isTeacher ? 'checkbox' : 'radio'}
                aria-checked={selected}
                onClick={() => (isTeacher ? toggleTeachingLevel(level.id) : pickLevel(level.id))}
                className={`relative flex items-center justify-between gap-3 min-h-[52px] px-4 rounded-xl border font-semibold text-[15px] text-left transition-colors ${
                  selected ? 'border-brand bg-brand-soft text-ink' : 'border-line hover:border-ink text-ink-soft bg-white'
                }`}
              >
                {level.name}
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-brand bg-brand' : 'border-[#cfcdc8]'}`}>
                  {selected && <Check className="w-3.5 h-3.5 text-white" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Plusieurs matières pour ce niveau : on demande lesquelles (une seule : cochée d'office, rien à montrer). */}
      {subjects.length > 1 && (
        <div>
          <p className="text-sm font-medium text-ink-soft mb-2.5">Tes matières</p>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => {
              const on = chosenSubjects.includes(s.id);
              return (
                <button key={s.id} type="button" role="checkbox" aria-checked={on} onClick={() => toggleSubject(s.id)}
                  className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full border text-sm font-medium transition-colors ${
                    on ? 'border-brand bg-brand-soft text-ink' : 'border-line text-ink-soft hover:border-ink bg-white'
                  }`}>
                  {on && <Check className="w-3.5 h-3.5 text-brand" />} {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-center text-[13px] text-ink-faint">
        {isTeacher ? (
          <>Tu es élève ?{' '}
            <button type="button" onClick={() => switchRole('student')} className="font-semibold text-brand-hover underline underline-offset-2 min-h-[32px]">
              Choisis ta classe
            </button>
          </>
        ) : (
          <button type="button" onClick={() => switchRole('teacher')} className="font-semibold text-brand-hover underline underline-offset-2 min-h-[32px]">
            Je suis prof
          </button>
        )}
      </p>
    </div>
  );

  const renderIdentityStep = () => (
    <div className="space-y-6">
      <StepHeading title="Qui es-tu ?"
        subtitle="Ton nom et ton établissement apparaissent sur tes feuilles d'exercices. Ils restent privés." />
      <IdentityFields value={identity} onChange={(v) => { identityTouched.current = true; setIdentity(v); setError(null); }} isTeacher={isTeacher} />
      {isTeacher && (
        <p className="text-[13px] text-ink-faint leading-relaxed">
          Ensuite, tu auras un <strong className="text-ink">code prof</strong> à donner à tes élèves pour qu’ils te rejoignent.
        </p>
      )}
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────────────
  // Renders as ordinary page content INSIDE the app shell (sidebar + top bar).
  // A single centred column on the paper background; the step navigation lives
  // IN-FLOW at the bottom of the card so it is always visible and clickable.

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Stepper current={currentStep} />

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            role="alert"
            className="mt-5 p-4 bg-[#fdeceb] border border-[#f3c9c5] rounded-xl flex items-center gap-3">
            <span className="w-7 h-7 bg-[#f8d7d3] rounded-full flex items-center justify-center flex-shrink-0 text-[#a23b34] text-sm font-semibold">!</span>
            <p className="text-[#a23b34] text-sm flex-1">{error}</p>
            <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="w-8 h-8 text-[#c2564f] hover:text-[#a23b34] text-lg leading-none">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card */}
      <div className="fd-card mt-5 overflow-hidden">
        <div className="p-5 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={`${userType}-${currentStep}`}
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}>
              {STEPS[currentStep].key === 'classe' ? renderClassStep() : renderIdentityStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation — in-flow, always reachable */}
        <div className="px-5 sm:px-8 py-4 border-t border-line flex items-center justify-between gap-3">
          {currentStep > 0 ? (
            <button type="button" onClick={handleBack}
              className="inline-flex items-center gap-2 min-h-[42px] px-4 rounded-lg font-medium text-sm text-ink-soft hover:bg-[#f2f1ee] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          ) : <span />}

          {!isLastStep ? (
            <button type="button" onClick={handleNext} disabled={!canProceed()}
              className={`inline-flex items-center gap-2 min-h-[42px] px-6 rounded-lg font-semibold text-sm transition-colors ${canProceed() ? 'bg-brand text-white hover:bg-brand-hover' : 'bg-[#f2f1ee] text-ink-faint cursor-not-allowed'}`}>
              Continuer
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            // Bouton actif même incomplet : il explique ce qui manque au lieu de rester grisé.
            <button type="button" onClick={handleSubmit} disabled={isSubmitting}
              className="inline-flex items-center gap-2 min-h-[42px] px-6 bg-brand text-white rounded-lg font-semibold text-sm hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Un instant…</> : <><Sparkles className="w-4 h-4" />C’est parti</>}
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-ink-faint mt-5 max-w-sm mx-auto leading-relaxed">
        Tu pourras tout modifier plus tard depuis ton profil (photo, objectifs de notes…).
      </p>
    </div>
  );
};

// ── Shared pieces ─────────────────────────────────────────────────────────────

/** « Étape 1 sur 2 » et une barre de progression. */
const Stepper: React.FC<{ current: number }> = ({ current }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-ink fd-nums">Étape {current + 1} sur {STEPS.length}</span>
      <span className="text-sm text-ink-faint">{STEPS[current].title}</span>
    </div>
    <div className="h-1.5 bg-[#f2f1ee] rounded-full overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={current + 1}>
      <motion.div className="h-full bg-brand rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
        transition={{ duration: 0.3 }} />
    </div>
  </div>
);

// Shared step heading — Fraunces title + muted subtitle.
const StepHeading: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="text-center">
    <h2 className="fd-display text-ink mb-2" style={{ fontSize: 23, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h2>
    <p className="text-ink-faint text-sm">{subtitle}</p>
  </div>
);

export default OnboardingProfile;
