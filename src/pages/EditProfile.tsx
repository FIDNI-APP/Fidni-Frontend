/**
 * EditProfile — tout ce qui décrit la personne, sur une seule page :
 * photo et présentation (publiques), identité (privée), scolarité, objectifs de notes (privés).
 * Pseudo, e-mail, mot de passe et notifications restent dans Profil → Paramètres.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, Camera, Check, Eye, Loader2, Lock, Plus, Settings, Trash2, User,
} from 'lucide-react';
import { getClassLevels, getSubjects, updateUserProfile } from '@/lib/api';
import { removeAvatar, updateUserInfo, uploadAvatar } from '@/lib/api/userApi';
import { IdentityFields } from '@/components/profile/IdentityForm';
import { identityError, identityFromUser, identityPayload, type IdentityValue } from '@/lib/identity';
import { TABBAR_OFFSET } from '@/components/layout/nav';

interface Grade {
  subject: string;
  min_grade: number;
  max_grade: number;
}

const BIO_MAX = 500; // même limite que Profil → Paramètres
const AVATAR_MAX = 5 * 1024 * 1024;
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const inputClass =
  'w-full px-4 py-2.5 bg-white border border-line rounded-xl text-sm text-ink placeholder:text-ink-faint '
  + 'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand';

const idOf = (v: unknown): string =>
  v != null && typeof v === 'object' ? String((v as { id?: string | number }).id ?? '') : String(v ?? '');

/** Carte de section : titre + explication à gauche, champs à droite (empilés sur mobile). */
const Section: React.FC<{
  id: string;
  title: string;
  hint: string;
  visibility: 'public' | 'private';
  children: React.ReactNode;
}> = ({ id, title, hint, visibility, children }) => (
  <section id={id} className="fd-card p-5 md:p-6 scroll-mt-24">
    <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
      <div>
        <h2 className="fd-display text-[17px] text-ink">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{hint}</p>
        <span
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            visibility === 'public' ? 'bg-brand-soft text-brand' : 'bg-[#f2f1ee] text-ink-soft'
          }`}
        >
          {visibility === 'public'
            ? <><Eye className="h-3 w-3" aria-hidden /> Visible sur ton profil</>
            : <><Lock className="h-3 w-3" aria-hidden /> Visible de toi seul</>}
        </span>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  </section>
);

const FieldLabel: React.FC<{ children: React.ReactNode; aside?: React.ReactNode; htmlFor?: string }> = ({ children, aside, htmlFor }) => (
  <div className="mb-1.5 flex items-baseline justify-between gap-3">
    <label htmlFor={htmlFor} className="text-sm font-medium text-ink-soft">{children}</label>
    {aside}
  </div>
);

export function EditProfile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.profile?.user_type === 'teacher';
  const profileUrl = `/profile/${user?.username}`;

  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [targetSubjects, setTargetSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [identity, setIdentity] = useState<IdentityValue>(() => identityFromUser(user));

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [classLevels, setClassLevels] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<{ section: string; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  // Remplit le formulaire une seule fois : un refreshUser() ultérieur ne doit pas écraser la saisie.
  const filled = useRef(false);
  useEffect(() => {
    if (!user?.profile || filled.current) return;
    filled.current = true;
    const p = user.profile;
    setBio(p.bio || '');
    setLocation(p.location || '');
    setClassLevel(p.class_level ? idOf(p.class_level) : '');
    setTargetSubjects(Array.isArray(p.target_subjects) ? p.target_subjects.map(idOf) : []);
    // L'API renvoie l'identifiant de la matière (un nombre) : on le garde en chaîne pour les <select>.
    setGrades((p.subject_grades || []).map((g: any) => ({
      subject: idOf(g.subject),
      min_grade: Number(g.min_grade ?? g.current_grade ?? 0),
      max_grade: Number(g.max_grade ?? g.target_grade ?? 20),
    })));
    setAvatarPreview(p.avatar || '');
    setIdentity(identityFromUser(user));
  }, [user]);

  useEffect(() => {
    Promise.all([getClassLevels(), getSubjects()])
      .then(([levels, subs]) => {
        setClassLevels(levels.map((l: any) => ({ id: String(l.id), name: l.name })));
        setSubjects(subs.map((s: any) => ({ id: String(s.id), name: s.name })));
      })
      .catch(() => setError({ section: 'scolarite', message: 'Impossible de charger les niveaux et les matières.' }))
      .finally(() => setIsLoading(false));
  }, []);

  // Arrivée depuis « À compléter : … » du profil : on amène directement à la bonne section.
  useEffect(() => {
    const target = !isLoading && window.location.hash.slice(1);
    if (target) document.getElementById(target)?.scrollIntoView({ block: 'start' });
  }, [isLoading]);

  const subjectName = useMemo(() => new Map(subjects.map(s => [s.id, s.name])), [subjects]);
  // Une note se fixe pour une matière suivie ; si aucune n'est cochée, toutes sont proposées.
  const gradeChoices = targetSubjects.length ? targetSubjects : subjects.map(s => s.id);
  const freeChoices = gradeChoices.filter(id => !grades.some(g => g.subject === id));

  const fail = (section: string, message: string) => {
    setError({ section, message });
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return fail('photo', 'Format non pris en charge : JPEG, PNG, GIF ou WebP.');
    if (file.size > AVATAR_MAX) return fail('photo', 'Image trop lourde : 5 Mo maximum.');
    setError(null);
    setAvatarFile(file);
    setAvatarRemoved(false);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const dropAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setAvatarRemoved(true);
  };

  const toggleSubject = (id: string) =>
    setTargetSubjects(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]));

  const setGrade = (index: number, patch: Partial<Grade>) =>
    setGrades(prev => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.username) return;

    const problem = identityError(identity);
    if (problem) return fail('identite', problem);
    const badGrade = grades.find(g => ![g.min_grade, g.max_grade].every(n => Number.isFinite(n) && n >= 0 && n <= 20));
    if (badGrade) return fail('objectifs', 'Les notes vont de 0 à 20.');

    setIsSaving(true);
    setError(null);
    try {
      if (avatarFile) await uploadAvatar(avatarFile);
      else if (avatarRemoved && user.profile?.avatar) await removeAvatar();

      await updateUserInfo(identityPayload(identity));
      await updateUserProfile(user.username, {
        profile: {
          bio: bio.trim(),
          location: location.trim(),
          ...(classLevel ? { class_level: classLevel } : {}),
          target_subjects: targetSubjects,
          subject_grades: grades,
        },
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => navigate(profileUrl), 900);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Impossible d’enregistrer le profil. Réessaie dans un instant.';
      setError({ section: 'bas', message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="h-7 w-7 animate-spin text-ink-faint" />
      </div>
    );
  }

  const errorFor = (section: string) =>
    error?.section === section ? (
      <p role="alert" className="mt-4 rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3 text-sm text-[#9c3b2e]">
        {error.message}
      </p>
    ) : null;

  const initial = (identity.firstName || user.username || '?').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-paper">
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl px-4 pt-6 md:px-6 md:pt-8">
        <Link to={profileUrl} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au profil
        </Link>
        <div className="mb-6 mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="fd-display text-[26px] leading-tight text-ink md:text-[30px]">Modifier mon profil</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Ce que les autres voient, et ce qui reste entre toi et Fidni.
            </p>
          </div>
          <Link
            to={`${profileUrl}?tab=settings`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:text-brand-hover"
          >
            <Settings className="h-3.5 w-3.5" /> Pseudo, e-mail et mot de passe
          </Link>
        </div>

        <div className="space-y-4">
          {/* ── Photo et présentation ── */}
          <Section id="photo" title="Photo et présentation" visibility="public"
            hint="Ce qui accompagne ton pseudo sur ton profil, tes publications et tes commentaires.">
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-ink text-3xl font-bold text-white ring-4 ring-white shadow-[0_2px_10px_rgba(26,26,26,.08)]">
                {avatarPreview
                  ? <img src={avatarPreview} alt="Ta photo de profil" className="h-full w-full object-cover" />
                  : <span className="flex h-full w-full items-center justify-center" aria-hidden>{initial}</span>}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="fd-btn-ghost" onClick={() => fileInput.current?.click()}>
                    <Camera className="h-3.5 w-3.5" /> {avatarPreview ? 'Changer la photo' : 'Ajouter une photo'}
                  </button>
                  {avatarPreview && (
                    <button type="button" onClick={dropAvatar}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-ink-soft hover:bg-[#f2f1ee] hover:text-ink">
                      <Trash2 className="h-3.5 w-3.5" /> Retirer
                    </button>
                  )}
                </div>
                <p className="text-xs text-ink-faint">JPEG, PNG, GIF ou WebP, 5 Mo maximum.</p>
                <input ref={fileInput} type="file" accept={AVATAR_TYPES.join(',')} onChange={pickAvatar} className="hidden" />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <FieldLabel htmlFor="bio" aside={
                  <span className={`fd-nums text-xs ${bio.length > BIO_MAX - 30 ? 'text-gold-strong' : 'text-ink-faint'}`}>
                    {bio.length}/{BIO_MAX}
                  </span>
                }>
                  Quelques mots sur toi
                </FieldLabel>
                <textarea id="bio" rows={3} maxLength={BIO_MAX} value={bio} onChange={(e) => setBio(e.target.value)}
                  className={`${inputClass} resize-none leading-relaxed`}
                  placeholder={isTeacher ? 'Professeur de mathématiques au lycée…' : 'En 2ème Bac SM, je vise une mention…'} />
              </div>
              <div>
                <FieldLabel htmlFor="location">Ville</FieldLabel>
                <input id="location" value={location} maxLength={80} onChange={(e) => setLocation(e.target.value)}
                  className={inputClass} placeholder="Casablanca" autoComplete="address-level2" />
              </div>
            </div>
            {errorFor('photo')}
          </Section>

          {/* ── Identité ── */}
          <Section id="identite" title="Identité" visibility="private"
            hint="Sert à tes feuilles d’exercices en PDF et à tes classes. Ton pseudo reste ton seul nom public.">
            <IdentityFields value={identity} onChange={(v) => { setIdentity(v); setError(null); }} isTeacher={isTeacher} />
            {errorFor('identite')}
          </Section>

          {/* ── Scolarité ── */}
          {!isTeacher && (
            <Section id="scolarite" title="Scolarité" visibility="public"
              hint="Ton niveau règle les contenus proposés sur l’accueil et dans les listes.">
              <div className="space-y-5">
                <div>
                  <FieldLabel htmlFor="class-level">Niveau</FieldLabel>
                  <select id="class-level" value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className={inputClass}>
                    <option value="">Choisis ton niveau</option>
                    {classLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                {subjects.length > 0 && (
                  <div>
                    <FieldLabel>Matières suivies</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {subjects.map(s => {
                        const on = targetSubjects.includes(s.id);
                        return (
                          <button key={s.id} type="button" aria-pressed={on} onClick={() => toggleSubject(s.id)}
                            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                              on ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-ink-soft hover:border-ink-faint hover:text-ink'
                            }`}>
                            {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              {errorFor('scolarite')}
            </Section>
          )}

          {/* ── Objectifs ── */}
          {!isTeacher && (
            <Section id="objectifs" title="Objectifs de notes" visibility="private"
              hint="Ta moyenne actuelle et celle que tu vises, sur 20. Elles t’aident à mesurer le chemin parcouru.">
              {grades.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center">
                  <p className="text-sm text-ink-soft">Aucun objectif pour l’instant.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {grades.map((g, i) => {
                    const choices = [g.subject, ...freeChoices].filter((id, k, all) => id && all.indexOf(id) === k);
                    const lo = Math.min(g.min_grade, g.max_grade), hi = Math.max(g.min_grade, g.max_grade);
                    return (
                      <li key={i} className="rounded-xl border border-line bg-white p-4">
                        <div className="flex items-center gap-2">
                          <select aria-label="Matière" value={g.subject} onChange={(e) => setGrade(i, { subject: e.target.value })}
                            className={`${inputClass} flex-1`}>
                            {choices.map(id => <option key={id} value={id}>{subjectName.get(id) ?? 'Matière'}</option>)}
                          </select>
                          <button type="button" aria-label="Retirer cet objectif"
                            onClick={() => setGrades(prev => prev.filter((_, k) => k !== i))}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {([['min_grade', 'Moyenne actuelle'], ['max_grade', 'Objectif']] as const).map(([field, label]) => (
                            <label key={field} className="block">
                              <span className="mb-1 block text-xs font-medium text-ink-faint">{label}</span>
                              <div className="relative">
                                <input type="number" inputMode="decimal" min={0} max={20} step={0.25}
                                  value={Number.isFinite(g[field]) ? g[field] : ''}
                                  onChange={(e) => setGrade(i, { [field]: e.target.value === '' ? NaN : Number(e.target.value) })}
                                  className={`${inputClass} fd-nums pr-10`} />
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">/20</span>
                              </div>
                            </label>
                          ))}
                        </div>
                        {/* Le chemin à parcourir, sur l'échelle 0–20. */}
                        {Number.isFinite(lo) && Number.isFinite(hi) && (
                          <div className="relative mt-4 h-1.5 rounded-full bg-[#f2f1ee]" aria-hidden>
                            <div className="absolute inset-y-0 left-0 rounded-full bg-ink/20" style={{ width: `${(lo / 20) * 100}%` }} />
                            <div className="absolute inset-y-0 rounded-full bg-brand" style={{ left: `${(lo / 20) * 100}%`, width: `${((hi - lo) / 20) * 100}%` }} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {freeChoices.length > 0 && (
                <button type="button" className="fd-btn-ghost mt-3"
                  onClick={() => setGrades(prev => [...prev, { subject: freeChoices[0], min_grade: 10, max_grade: 14 }])}>
                  <Plus className="h-3.5 w-3.5" /> Ajouter un objectif
                </button>
              )}
              {errorFor('objectifs')}
            </Section>
          )}
        </div>
        <div id="bas">{errorFor('bas')}</div>

        {/* ── Barre d'enregistrement : collée en bas de l'écran tant que le formulaire défile ──
            (au-dessus de la barre d'onglets du téléphone ; TABBAR_OFFSET vaut 0 sur ordinateur) */}
        <div className="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-line bg-white/95 backdrop-blur md:-mx-6 md:rounded-t-2xl md:border-x"
          style={{ bottom: TABBAR_OFFSET }}>
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 md:px-6">
            <p className="hidden items-center gap-1.5 text-xs text-ink-faint sm:flex">
              <User className="h-3.5 w-3.5" /> Connecté en tant que <span className="font-semibold text-ink-soft">{user.username}</span>
            </p>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" className="fd-btn-ghost" onClick={() => navigate(profileUrl)}>Annuler</button>
              <button type="submit" className="fd-btn-primary min-w-[150px] justify-center" disabled={isSaving || saved}>
                {saved ? <><Check className="h-4 w-4" /> Enregistré</>
                  : isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
                  : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default EditProfile;
