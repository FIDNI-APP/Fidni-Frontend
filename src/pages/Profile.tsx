// src/pages/ProfilePage.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserProfile,
  getUserStats,
  getUserSavedExercises,
  getUserSavedLessons,
  getUserSavedExams,
  getUserProgressExercises,
  getUserContributions
} from '@/lib/api/userApi';
import { api } from '@/lib/api/apiClient';
import {
  User, Target,
  Settings, Loader2, Users, Pencil, Lock, Plus
} from 'lucide-react';
import { identityFromUser } from '@/lib/identity';

// Import des sections
import { ProfileBilanSection, type SkillAssessment } from '@/components/profile/ProfileBilanSection';
import { ProfileOverview } from '@/components/profile/ProfileOverview';
import { ProgressSection } from '@/components/profile/ProgressSection';
import { SavedContentSection } from '@/components/profile/SavedContentSection';
import { RevisionListsSection } from '@/components/profile/RevisionListsSection';
import StudentNotebook from '@/components/profile/StudentNotebook';
import { SettingsSection } from '@/components/profile/SettingsSection';
import { SkillIQSection } from '@/components/profile/SkillIQSection';
import TeacherStudentsPanel from '@/components/profile/TeacherStudentsPanel';
import { ModerationDeleteButton } from '@/components/profile/ModerationDeleteButton';

interface FeatureConfig {
  id: string;
  title: string;
  icon: React.ElementType;
  forUserType: ('student' | 'teacher')[];
  ownerOnly?: boolean;
}

const FEATURES_CONFIG: FeatureConfig[] = [
  // Profil = qui je suis. La progression a sa propre page (/progression, barre latérale).
  { id: 'overview', title: 'Profil', icon: User, forUserType: ['student', 'teacher'] },
  // Exercices réussis et à revoir (« Ma progression » est une page à part : /progression).
  { id: 'progress', title: 'Réussis / à revoir', icon: Target, forUserType: ['student'] },
  // Skill IQ, Cahiers, Révisions et Favoris ont été déplacés vers la sidebar ("Mon espace").
  { id: 'students', title: 'Mes élèves', icon: Users, forUserType: ['teacher'], ownerOnly: true },
  { id: 'settings', title: 'Paramètres', icon: Settings, forUserType: ['student', 'teacher'], ownerOnly: true },
];

interface SavedData {
  exercises: any[];
  lessons: any[];
  exams: any[];
}

interface ProgressData {
  successExercises: any[];
  reviewExercises: any[];
}

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<string>(searchParams.get('tab') || 'overview');
  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [savedData, setSavedData] = useState<SavedData>({ exercises: [], lessons: [], exams: [] });
  const [progressData, setProgressData] = useState<ProgressData>({ successExercises: [], reviewExercises: [] });
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [progressLoading, setProgressLoading] = useState(true);
  const [bilanLoading, setBilanLoading] = useState(true);

  const isOwner = currentUser?.username === username;
  const userType = profileData?.profile?.user_type || 'student';

  const availableFeatures = useMemo(() => FEATURES_CONFIG.filter(f => {
    const matchesUserType = f.forUserType.includes(userType as 'student' | 'teacher');
    const matchesOwner = f.ownerOnly ? isOwner : true;
    return matchesUserType && matchesOwner;
  }), [userType, isOwner]);

  // Données déjà chargées pour ce profil : changer d'onglet ne les redemande pas
  // (avant, chaque clic relançait les requêtes et réaffichait un chargement).
  const loaded = useRef<{ user?: string; progress?: boolean; bilanFor?: boolean; saved?: boolean }>({});
  // Onglets déjà ouverts : ils restent montés (cachés), on y revient instantanément.
  const [visited, setVisited] = useState<Set<string>>(() => new Set([activeSection]));

  useEffect(() => {
    if (!username || loaded.current.user === username) return;
    // Nouveau profil : on oublie tout ce qui concernait le précédent.
    loaded.current = { user: username };
    setSavedData({ exercises: [], lessons: [], exams: [] });
    setProgressData({ successExercises: [], reviewExercises: [] });
    setProgressLoading(true);
    setBilanLoading(true);
    setVisited(new Set([activeSection]));
    loadProfileData();
  }, [username]);

  useEffect(() => {
    if (!username) return;
    setVisited(prev => (prev.has(activeSection) ? prev : new Set(prev).add(activeSection)));
    const done = loaded.current;
    if ((activeSection === 'overview' || activeSection === 'progress') && !done.progress) {
      done.progress = true;
      loadProgressData();
    }
    // Les bilans Skill IQ ne sont lisibles que par leur propriétaire : on recharge si
    // l'on apprend après coup que c'est bien son profil (session restaurée tardivement).
    if (activeSection === 'overview' && done.bilanFor !== isOwner) {
      done.bilanFor = isOwner;
      loadBilanData();
    }
    if (activeSection === 'saved' && !done.saved) {
      done.saved = true;
      loadSavedData();
    }
  }, [activeSection, username, isOwner]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    // Ancien onglet « Statistiques » : il a sa propre page.
    if (tab === 'statistics') {
      if (isOwner) navigate('/progression', { replace: true });
      else setActiveSection('overview');
      return;
    }
    if (tab && availableFeatures.some(f => f.id === tab)) setActiveSection(tab);
  }, [searchParams, availableFeatures, isOwner, navigate]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profile, userStats] = await Promise.all([
        getUserProfile(username!),
        getUserStats(username!).catch(() => null)
      ]);
      setProfileData(profile);
      setStats(userStats);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedData = async () => {
    if (!username) return;
    try {
      setSavedLoading(true);
      const [exercisesData, lessonsData, examsData] = await Promise.all([
        getUserSavedExercises(username).catch(() => []),
        getUserSavedLessons(username).catch(() => []),
        getUserSavedExams(username).catch(() => [])
      ]);
      setSavedData({
        exercises: Array.isArray(exercisesData) ? exercisesData : [],
        lessons: Array.isArray(lessonsData) ? lessonsData : [],
        exams: Array.isArray(examsData) ? examsData : []
      });
    } catch (error) {
      console.error('Error loading saved data:', error);
      setSavedData({ exercises: [], lessons: [], exams: [] });
    } finally {
      setSavedLoading(false);
    }
  };

  const loadProgressData = async () => {
    if (!username) return;
    try {
      setProgressLoading(true);
      const [successData, reviewData] = await Promise.all([
        getUserProgressExercises(username, 'success').catch(() => []),
        getUserProgressExercises(username, 'review').catch(() => [])
      ]);
      setProgressData({
        successExercises: Array.isArray(successData) ? successData : [],
        reviewExercises: Array.isArray(reviewData) ? reviewData : []
      });
    } catch (error) {
      console.error('Error loading progress data:', error);
      setProgressData({ successExercises: [], reviewExercises: [] });
    } finally {
      setProgressLoading(false);
    }
  };

  // Skill IQ assessments are owner-only ("my"), so a visitor's view simply
  // falls back to the exercise record — the component handles both.
  const loadBilanData = async () => {
    if (!username) return;
    try {
      setBilanLoading(true);
      const [contributionsData, assessmentsRes] = await Promise.all([
        getUserContributions(username).catch(() => []),
        isOwner ? api.get('/skill-assessments/my/').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      const items = Array.isArray(contributionsData)
        ? contributionsData
        : (contributionsData as any)?.results ?? [];
      setContributions(items);
      setAssessments(Array.isArray(assessmentsRes.data) ? assessmentsRes.data : []);
    } catch (error) {
      console.error('Error loading bilan data:', error);
    } finally {
      setBilanLoading(false);
    }
  };

  const panel = (id: string, node: React.ReactNode) =>
    visited.has(id) || activeSection === id ? (
      <div key={id} hidden={activeSection !== id}>{node}</div>
    ) : null;

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    setSearchParams({ tab: sectionId });
  };

  // Prénom, nom, établissement : le propriétaire se relit, les visiteurs ne reçoivent même pas ces champs.
  const privateLine = useMemo(() => {
    if (!isOwner || !currentUser) return '';
    const id = identityFromUser(currentUser);
    const civ = id.gender === 'M' ? 'M. ' : id.gender === 'F' ? 'Mme ' : '';
    const name = `${id.firstName} ${id.lastName}`.trim();
    return [name && `${civ}${name}`, id.school.name].filter(Boolean).join(' · ');
  }, [isOwner, currentUser]);

  const publicFigures = [
    // `total_contributions` ne compte que les exercices : on préfère la vraie liste une fois chargée.
    { label: 'Publications', value: contributions.length || (stats?.contribution_stats?.total_contributions ?? 0) },
    { label: 'Votes reçus', value: stats?.contribution_stats?.upvotes_received ?? 0 },
    { label: 'Vues', value: stats?.contribution_stats?.view_count ?? 0 },
  ];

  const ownProfile = profileData?.profile;
  const missing = isOwner && ownProfile ? [
    !ownProfile.bio && { label: 'Présentation', section: 'photo' },
    userType !== 'teacher' && !ownProfile.class_level && { label: 'Niveau', section: 'scolarite' },
    userType !== 'teacher' && !(ownProfile.subject_grades?.length) && { label: 'Objectifs de notes', section: 'objectifs' },
  ].filter(Boolean) as { label: string; section: string }[] : [];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7' }} className="flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#1a1a1a' }} />
          <p style={{ fontSize: 13, color: '#6b6862' }}>Chargement du profil…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-mono" style={{ minHeight: '100vh', background: '#faf9f7' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* ── En-tête : qui est cette personne ── */}
        <header className="fd-card mb-5 overflow-hidden">
          {/* Bandeau papier quadrillé, même motif que les cahiers. */}
          <div
            aria-hidden
            className="h-20 md:h-24 border-b border-line"
            style={{
              backgroundColor: '#f4f1ea',
              backgroundImage:
                'linear-gradient(#e6e0d4 1px, transparent 1px), linear-gradient(90deg, #e6e0d4 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div className="px-5 pb-5 md:px-7 md:pb-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex min-w-0 items-end gap-4" data-tour="profil-identite">
                <div className="-mt-10 flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-3xl font-bold text-white ring-4 ring-white md:-mt-12 md:h-[104px] md:w-[104px]">
                  {profileData?.profile?.avatar ? (
                    <img src={profileData.profile.avatar} alt={username} className="h-full w-full object-cover" />
                  ) : (
                    username?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 pb-0.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="fd-display truncate text-[24px] leading-tight text-ink md:text-[28px]">
                      {profileData?.username || username}
                    </h1>
                    <span className="rounded-md border border-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.06em] text-ink">
                      {userType === 'teacher' ? 'Enseignant' : 'Étudiant'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[13px] text-ink-soft">
                    {[
                      profileData?.profile?.class_level_name,
                      profileData?.profile?.location,
                      profileData?.profile?.joined_at
                        ? `Membre depuis ${new Date(profileData.profile.joined_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
                        : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              {isOwner && (
                <Link to={`/profile/${username}/edit`} className="fd-btn-ghost shrink-0" data-tour="profil-modifier">
                  <Pencil className="h-3.5 w-3.5" /> Modifier le profil
                </Link>
              )}
              {!isOwner && currentUser?.is_superuser && username && <ModerationDeleteButton username={username} />}
            </div>

            {profileData?.profile?.bio && (
              <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-ink-soft">{profileData.profile.bio}</p>
            )}

            {/* Identité réelle : rappelée au propriétaire seulement, jamais montrée aux visiteurs. */}
            {isOwner && privateLine && (
              <p className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[#f2f1ee] px-2.5 py-1 text-[12px] text-ink-soft"
                title="Visible de toi seul : ton pseudo reste ton nom public">
                <Lock className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{privateLine}</span>
                <span className="shrink-0 text-ink-faint">· visible de toi seul</span>
              </p>
            )}

            {/* Bilan public : ce que la personne a apporté. Masqué tant qu'il n'y a rien (pas de rangée de zéros). */}
            {publicFigures.some(f => f.value > 0) && (
              <dl className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-[#f2f1ee] pt-4">
                {publicFigures.map(figure => (
                  <div key={figure.label}>
                    <dd className="fd-nums text-[20px] font-bold leading-tight text-ink">{figure.value}</dd>
                    <dt className="mt-0.5 text-[11px] tracking-[.03em] text-ink-faint">{figure.label}</dt>
                  </div>
                ))}
              </dl>
            )}

            {/* Ce qui manque au profil, avec un lien direct vers la bonne section. */}
            {isOwner && missing.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#f2f1ee] pt-4">
                <span className="text-[12.5px] font-medium text-ink-soft">À compléter :</span>
                {missing.map(m => (
                  <Link key={m.label} to={`/profile/${username}/edit#${m.section}`}
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-gold-line bg-gold-soft px-3 text-[12px] font-semibold text-gold-strong hover:border-gold">
                    <Plus className="h-3 w-3" aria-hidden /> {m.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ── Tab bar (underline) ── */}
        <div className="mb-6" style={{ borderBottom: '1px solid #e7e3dc' }} data-tour="profil-onglets">
          <div className="flex gap-6 overflow-x-auto" style={{ marginBottom: -1, scrollbarWidth: 'none' }}>
            {availableFeatures.map((feature) => {
              const Icon = feature.icon;
              const isActive = activeSection === feature.id;
              return (
                <button
                  key={feature.id}
                  onClick={() => handleSectionChange(feature.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '10px 2px', border: 'none', background: 'transparent',
                    borderBottom: isActive ? '2px solid #1a7a4a' : '2px solid transparent',
                    color: isActive ? '#15633c' : '#6b6862',
                    fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                    fontFamily: 'DM Sans', cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'color .15s',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#1a1a1a'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#6b6862'; }}
                >
                  <Icon className="w-4 h-4" />
                  {feature.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Section content ── */}
        {/* Pas de fondu : l'ancien fondu sortie puis entrée, ajouté au rechargement,
            donnait l'impression que chaque onglet se chargeait deux fois. */}
        <div>
            {panel('overview', isOwner ? (
              <ProfileOverview
                profile={profileData?.profile}
                userType={userType}
                school={currentUser ? identityFromUser(currentUser).school.name : undefined}
                goals={userType !== 'teacher' ? (profileData?.profile?.subject_grades ?? []) : undefined}
                editUrl={`/profile/${username}/edit`}
                contributions={contributions}
              />
            ) : (
              <ProfileBilanSection
                progressData={progressData}
                assessments={assessments}
                contributions={contributions}
                learningStats={stats?.learning_stats}
                isOwner={isOwner}
                goals={isOwner && userType !== 'teacher' ? (profileData?.profile?.subject_grades ?? []) : undefined}
                editUrl={`/profile/${username}/edit`}
                loading={bilanLoading || progressLoading}
              />
            ))}
            {panel('progress', (
              <ProgressSection successExercises={progressData.successExercises} reviewExercises={progressData.reviewExercises} isLoading={progressLoading} />
            ))}
            {panel('skilliq', <SkillIQSection />)}
            {panel('notebooks', <StudentNotebook />)}
            {panel('revisionlists', <RevisionListsSection />)}
            {panel('saved', (
              <SavedContentSection exercises={savedData.exercises} lessons={savedData.lessons} exams={savedData.exams} isLoading={savedLoading} />
            ))}
            {panel('students', <TeacherStudentsPanel />)}
            {panel('settings', <SettingsSection />)}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
