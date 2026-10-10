// src/components/profile/SettingsSection.tsx
import React, { useState, useRef, useEffect } from 'react';
import { IdentityFields } from '@/components/profile/IdentityForm';
import { identityError, identityFromUser, identityPayload, type IdentityValue } from '@/lib/identity';
import { deleteMyAccount, downloadMyData } from '@/lib/api/userApi';
import { requestPasswordReset } from '@/lib/api/authApi';
import { LEGAL } from '@/lib/legal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  uploadAvatar,
  removeAvatar,
  updateUserInfo,
  changePassword,
  updateUserProfile
} from '@/lib/api/userApi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Bell, Shield, Palette, LogOut,
  Camera, Check, X, Loader2, Eye, EyeOff,
  Mail, Trash2, Moon, Sun, Monitor,
  Save, AlertTriangle, Database, KeyRound, MailCheck
} from 'lucide-react';

type SettingsTab = 'profile' | 'account' | 'notifications' | 'appearance' | 'danger';
/** Erreur axios telle que lue ici. */
type ApiError = { response?: { status?: number; data?: { error?: string; code?: string } } };
const apiData = (err: unknown) => (err as ApiError)?.response?.data;

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'account', label: 'Compte', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Apparence', icon: Palette },
  { id: 'danger', label: 'Mes données', icon: Database },
];

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`
      relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200
      ${enabled ? 'bg-brand' : 'bg-[#e7e3dc]'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    <span
      className={`
        inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200
        ${enabled ? 'translate-x-6' : 'translate-x-1'}
      `}
    />
  </button>
);

interface SettingRowProps {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ icon: Icon, title, description, children }) => (
  <div className="flex items-center justify-between py-4 border-b border-[#faf9f7] last:border-0">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-[#f2f1ee] rounded-lg mt-0.5">
        <Icon className="w-4 h-4 text-ink-soft" />
      </div>
      <div>
        <h4 className="font-medium text-ink text-sm">{title}</h4>
        <p className="text-xs text-ink-faint mt-0.5">{description}</p>
      </div>
    </div>
    <div className="flex-shrink-0 ml-4">
      {children}
    </div>
  </div>
);

export const SettingsSection: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bonne nouvelle à lire (nouvelle adresse à confirmer) : reste affichée jusqu'à fermeture.
  const [notice, setNotice] = useState<string | null>(null);
  // Changer d'adresse e-mail demande le mot de passe actuel (protection du compte).
  const [emailPassword, setEmailPassword] = useState('');

  // Profile state
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.profile?.bio || '',
    avatarPreview: user?.profile?.avatar || '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  // Identité (prénom, nom, civilité, date de naissance, établissement) : même composant qu'à l'inscription.
  const [identity, setIdentity] = useState<IdentityValue>(() => identityFromUser(user));
  const [exporting, setExporting] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);
  // Compte sans mot de passe : lien « définir un mot de passe » envoyé par e-mail.
  const [linkState, setLinkState] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: user?.profile?.email_notifications ?? true,
    commentNotifications: user?.profile?.comment_notifications ?? true,
    solutionNotifications: user?.profile?.solution_notifications ?? true,
  });

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Compte créé avec Google (10/10/2026) : peut n'avoir aucun mot de passe. Champ absent : comme avant.
  // Le premier mot de passe se définit par un lien reçu par e-mail (une session ouverte ne suffit pas).
  const hasPassword = user?.has_password !== false;
  const googleLinked = !!user?.google_linked;
  const SET_PASSWORD_FIRST = googleLinked
    ? 'Pour changer d’adresse e-mail, définis d’abord un mot de passe : bouton « Définir un mot de passe » ci-dessous.'
    : `Ton compte n’a pas de mot de passe : pour changer d’adresse e-mail, écris à ${LEGAL.contactEmail}.`;

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username,
        email: user.email,
        bio: user.profile?.bio || '',
        avatarPreview: user.profile?.avatar || '',
      });
      setIdentity(identityFromUser(user));
      setNotifications({
        emailNotifications: user.profile?.email_notifications ?? true,
        commentNotifications: user.profile?.comment_notifications ?? true,
        solutionNotifications: user.profile?.solution_notifications ?? true,
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user?.username) {
      setError('Utilisateur non authentifié');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      // Upload avatar if changed
      if (avatarFile) {
        await uploadAvatar(avatarFile);
      }

      // Update user info
      const emailChanged = profileData.email.trim().toLowerCase() !== (user.email || '').toLowerCase();
      if (emailChanged && !hasPassword) {
        setActiveTab('account');
        setError(SET_PASSWORD_FIRST);
        return;
      }
      if (emailChanged && !emailPassword) {
        setActiveTab('account');
        setError('Indique ton mot de passe actuel pour changer d’adresse e-mail.');
        return;
      }
      const problem = identityError(identity);
      if (problem) {
        setActiveTab('profile');
        setError(problem);
        return;
      }
      const newEmail = profileData.email.trim();
      const info = await updateUserInfo({
        ...identityPayload(identity),
        ...(emailChanged ? { email: newEmail, current_password: emailPassword } : {}),
      });
      setEmailPassword('');
      // La nouvelle adresse est enregistrée tout de suite, mais reste « à confirmer » jusqu'au clic sur le lien reçu.
      if (emailChanged && info?.email_verification_sent) {
        const to = typeof info.pending_email === 'string' && info.pending_email ? info.pending_email : newEmail;
        setNotice(`Confirme ta nouvelle adresse : on t’a envoyé un lien à ${to}. Pense à vérifier tes courriers indésirables.`);
      }

      // Update profile (and optionally username)
      await updateUserProfile(user.username, {
        username: profileData.username,
        profile: {
          bio: profileData.bio,
          email_notifications: notifications.emailNotifications,
          comment_notifications: notifications.commentNotifications,
          solution_notifications: notifications.solutionNotifications,
        }
      });

      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      if (apiData(err)?.code === 'set_password_first') {
        setActiveTab('account');
        setError(SET_PASSWORD_FIRST);
      } else {
        setError(apiData(err)?.error || 'Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, avatarPreview: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar();
      setProfileData(prev => ({ ...prev, avatarPreview: '' }));
      setAvatarFile(null);
      await refreshUser();
    } catch {
      setError('Erreur lors de la suppression de l\'avatar');
    }
  };

  const handlePasswordChange = async () => {
    setError(null);
    if (!hasPassword) return;  // compte sans mot de passe : lien par e-mail (handleSetPasswordLink)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setChangingPassword(true);

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(apiData(err)?.error || 'Erreur lors du changement de mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  /** Compte sans mot de passe (créé avec Google) : même lien que « Mot de passe oublié », envoyé à son adresse. */
  const handleSetPasswordLink = async () => {
    if (!user?.email) return;
    setError(null);
    setLinkState('sending');
    try {
      await requestPasswordReset(user.email);
      setLinkState('sent');
    } catch (err) {
      setLinkState('idle');
      const status = (err as ApiError)?.response?.status;
      setError(status === 429 ? 'Trop de demandes. Patiente quelques minutes avant de réessayer.'
        : apiData(err)?.error || 'Impossible d’envoyer le lien pour le moment. Réessaie dans un instant.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user?.username || (hasPassword && !deletePassword)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyAccount(hasPassword ? deletePassword : undefined);
      // Le serveur a déjà révoqué les sessions : on efface les jetons locaux et on repart à l'accueil.
      await logout().catch(() => undefined);
      navigate('/');
    } catch (err) {
      setDeleteError(apiData(err)?.error || 'La suppression a échoué. Réessaie.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-ink-faint text-sm">
            Gère ton compte et personnalise ton expérience
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {saved && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg"
              >
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Sauvegardé</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl hover:bg-brand-hover transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">Enregistrer</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} aria-label="Fermer le message">
              <X className="w-4 h-4 text-red-400 hover:text-red-600" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nouvelle adresse à confirmer */}
      {notice && (
        <div role="status" className="p-4 bg-brand-soft border border-brand-line rounded-xl flex items-start gap-3">
          <MailCheck className="w-5 h-5 text-brand-hover flex-shrink-0 mt-0.5" />
          <p className="text-ink text-sm flex-1 min-w-0 break-words">{notice}</p>
          <button onClick={() => setNotice(null)} aria-label="Fermer le message">
            <X className="w-4 h-4 text-ink-faint hover:text-ink" />
          </button>
        </div>
      )}

      {/* Segmented Tab Bar */}
      <div className="flex bg-[#f2f1ee] rounded-xl p-1 overflow-x-auto scrollbar-hide w-fit">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              // Sur téléphone, seule l'icône est visible : le nom reste lisible par les lecteurs d'écran.
              aria-label={tab.label}
              aria-pressed={isActive}
              title={tab.label}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                ${isActive ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink-soft'}
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Avatar */}
              <div className="fd-card p-6">
                <h3 className="font-semibold text-ink mb-4">Photo de profil</h3>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-[#e7e3dc] flex items-center justify-center text-ink-soft text-2xl font-bold overflow-hidden">
                      {profileData.avatarPreview ? (
                        <img src={profileData.avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        profileData.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl border border-[#e7e3dc] shadow-sm hover:bg-paper transition-colors"
                    >
                      <Camera className="w-4 h-4 text-ink-soft" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-ink-soft mb-3">
                      JPG, PNG ou GIF. Max 5MB.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-sm font-medium text-brand bg-brand-soft rounded-lg hover:bg-brand-soft transition-colors"
                      >
                        Changer
                      </button>
                      {profileData.avatarPreview && (
                        <button
                          onClick={handleRemoveAvatar}
                          className="px-3 py-1.5 text-sm font-medium text-ink-soft bg-[#f2f1ee] rounded-lg hover:bg-[#e7e3dc] transition-colors"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div className="fd-card p-6">
                <h3 className="font-semibold text-ink mb-4">Informations personnelles</h3>
                <div className="grid gap-4">
                  <IdentityFields value={identity} onChange={(v) => { setIdentity(v); setError(null); }}
                    isTeacher={user?.profile?.user_type === 'teacher'} />

                  <div>
                    <label className="block text-sm font-medium text-ink-soft mb-1.5">
                      Nom d'utilisateur
                    </label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-paper border border-[#e7e3dc] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                      placeholder="Nom d'utilisateur"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-soft mb-1.5">
                      Bio
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-paper border border-[#e7e3dc] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all resize-none"
                      placeholder="Parle un peu de toi…"
                      maxLength={500}
                    />
                    <p className="text-xs text-ink-faint mt-1">{profileData.bio.length}/500 caractères</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Connexion avec Google */}
              {googleLinked && (
                <div className="fd-card p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-brand-soft rounded-lg mt-0.5">
                      <Check className="w-4 h-4 text-brand-hover" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink">Connecté avec Google</h3>
                      <p className="text-sm text-ink-faint mt-1">
                        Tu te connectes avec le bouton « Continuer avec Google ».{' '}
                        {hasPassword
                          ? 'Ton e-mail (ou ton pseudo) et ton mot de passe marchent aussi.'
                          : 'Ton compte n’a pas encore de mot de passe : tu peux en définir un ci-dessous.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="fd-card p-6">
                <h3 className="font-semibold text-ink mb-4">Adresse email</h3>
                <div>
                  <label htmlFor="settings-email" className="block text-sm font-medium text-ink-soft mb-1.5">
                    Email
                  </label>
                  <input
                    id="settings-email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!hasPassword}
                    className="w-full px-4 py-2.5 bg-paper border border-[#e7e3dc] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="ton.email@exemple.com"
                  />
                  {!hasPassword && (
                    <p className="text-xs text-ink-faint mt-1.5">Pour changer d’adresse, définis d’abord un mot de passe ci-dessous.</p>
                  )}
                </div>
                {hasPassword && profileData.email.trim().toLowerCase() !== (user?.email || '').toLowerCase() && (
                  <div className="mt-4">
                    <label htmlFor="settings-email-password" className="block text-sm font-medium text-ink-soft mb-1.5">
                      Mot de passe actuel
                    </label>
                    <input
                      id="settings-email-password"
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full px-4 py-2.5 bg-paper border border-[#e7e3dc] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-ink-faint mt-1.5">
                      Nécessaire pour changer l’adresse de ton compte. Puis « Enregistrer » : on enverra un lien de
                      confirmation à la nouvelle adresse.
                    </p>
                  </div>
                )}
              </div>

              {/* Mot de passe. Compte sans mot de passe (créé avec Google) : le premier se définit par un lien
                  reçu par e-mail, comme « Mot de passe oublié » — une session restée ouverte ne suffit pas. */}
              {!hasPassword ? (
                <div className="fd-card p-6">
                  <h3 className="font-semibold text-ink mb-2">Définir un mot de passe</h3>
                  {googleLinked ? (
                    <>
                      <p className="text-sm text-ink-faint">
                        Ton compte a été créé avec Google. Un mot de passe te permet aussi de te connecter avec ton
                        e-mail (ou ton pseudo), et de changer d’adresse e-mail. Pour le choisir, on t’envoie un lien à{' '}
                        <strong className="text-ink break-words">{user?.email}</strong>.
                      </p>
                      {linkState === 'sent' ? (
                        <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-brand-line bg-brand-soft px-4 py-3 text-sm text-ink">
                          <MailCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-hover" />
                          <span>
                            On t’a envoyé un lien par e-mail pour définir ton mot de passe. Pense à regarder dans les
                            spams. Une fois le mot de passe choisi, reconnecte-toi.
                          </span>
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSetPasswordLink}
                          disabled={linkState === 'sending' || !user?.email}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-xl hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {linkState === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                          {linkState === 'sending' ? 'Envoi…' : 'Définir un mot de passe'}
                        </button>
                      )}
                    </>
                  ) : (
                    // Sans compte Google, le lien « Mot de passe oublié » n'est pas envoyé (rien ne prouve l'adresse).
                    <p className="text-sm text-ink-faint">
                      Ton compte n’a pas de mot de passe. Pour en obtenir un, écris à{' '}
                      <a href={`mailto:${LEGAL.contactEmail}`} className="text-brand-hover underline">{LEGAL.contactEmail}</a>.
                    </p>
                  )}
                </div>
              ) : (
              <div className="fd-card p-6">
                <h3 className="font-semibold text-ink mb-4">Mot de passe</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="settings-current-password" className="block text-sm font-medium text-ink-soft mb-1.5">
                      Mot de passe actuel
                    </label>
                    <div className="relative">
                      <input
                        id="settings-current-password"
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        autoComplete="current-password"
                        className="w-full px-4 py-2.5 pr-12 bg-paper border border-[#e7e3dc] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        aria-label={showPasswords.current ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-faint hover:text-ink-soft"
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="settings-new-password" className="block text-sm font-medium text-ink-soft mb-1.5">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="settings-new-password"
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        autoComplete="new-password"
                        className="w-full px-4 py-2.5 pr-12 bg-paper border border-[#e7e3dc] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        aria-label={showPasswords.new ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-faint hover:text-ink-soft"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="settings-confirm-password" className="block text-sm font-medium text-ink-soft mb-1.5">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="settings-confirm-password"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        autoComplete="new-password"
                        className="w-full px-4 py-2.5 pr-12 bg-paper border border-[#e7e3dc] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        aria-label={showPasswords.confirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-faint hover:text-ink-soft"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handlePasswordChange}
                    disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-xl hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingPassword ? 'Enregistrement…' : 'Changer le mot de passe'}
                  </button>
                </div>
              </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="fd-card p-6">
                <h3 className="font-semibold text-ink mb-2">Notifications par email</h3>
                <p className="text-sm text-ink-faint mb-6">Choisis les notifications que tu veux recevoir</p>

                <div className="space-y-1">
                  <SettingRow
                    icon={Mail}
                    title="Notifications par email"
                    description="Recevoir des notifications par email"
                  >
                    <ToggleSwitch
                      enabled={notifications.emailNotifications}
                      onChange={(v) => setNotifications(prev => ({ ...prev, emailNotifications: v }))}
                    />
                  </SettingRow>

                  <SettingRow
                    icon={Bell}
                    title="Notifications de commentaires"
                    description="Alertes quand quelqu'un commente ton contenu"
                  >
                    <ToggleSwitch
                      enabled={notifications.commentNotifications}
                      onChange={(v) => setNotifications(prev => ({ ...prev, commentNotifications: v }))}
                      disabled={!notifications.emailNotifications}
                    />
                  </SettingRow>

                  <SettingRow
                    icon={Bell}
                    title="Notifications de solutions"
                    description="Alertes pour les nouvelles solutions"
                  >
                    <ToggleSwitch
                      enabled={notifications.solutionNotifications}
                      onChange={(v) => setNotifications(prev => ({ ...prev, solutionNotifications: v }))}
                      disabled={!notifications.emailNotifications}
                    />
                  </SettingRow>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="fd-card p-6">
                <h3 className="font-semibold text-ink mb-2">Thème</h3>
                <p className="text-sm text-ink-faint mb-6">Personnalise l'apparence de l'application</p>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Clair', icon: Sun },
                    { id: 'dark', label: 'Sombre', icon: Moon },
                    { id: 'system', label: 'Système', icon: Monitor },
                  ].map((themeOption) => {
                    const Icon = themeOption.icon;
                    const isActive = theme === themeOption.id;

                    return (
                      <button
                        key={themeOption.id}
                        onClick={() => setTheme(themeOption.id as Parameters<typeof setTheme>[0])}
                        className={`
                          flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all
                          ${isActive
                            ? 'border-brand bg-brand-soft'
                            : 'border-[#e7e3dc] hover:border-line bg-white'
                          }
                        `}
                      >
                        <div className={`p-3 rounded-xl ${isActive ? 'bg-brand text-white' : 'bg-[#f2f1ee] text-ink-soft'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-sm font-medium ${isActive ? 'text-brand' : 'text-ink-soft'}`}>
                          {themeOption.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              {/* RGPD : droit d'accès et de portabilité */}
              <div className="fd-card p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-ink">Télécharger mes données</h3>
                    <p className="text-sm text-ink-faint mt-1 max-w-lg">
                      Un fichier avec tout ce que Fidni conserve sur ton compte : profil, progression,
                      publications, favoris, historique…
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!user?.username) return;
                      setExporting(true);
                      try { await downloadMyData(user.username); }
                      catch { setError('Le téléchargement a échoué. Réessaie dans un instant.'); }
                      finally { setExporting(false); }
                    }}
                    disabled={exporting}
                    className="fd-btn-ghost"
                  >
                    {exporting ? 'Préparation…' : 'Télécharger (JSON)'}
                  </button>
                </div>
              </div>
              {/* Logout */}
              <div className="fd-card border-l-4 border-l-amber-500 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <LogOut className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-ink">Se déconnecter</h3>
                    <p className="text-sm text-ink-faint mt-1">
                      Tu seras déconnecté de ton compte sur cet appareil.
                    </p>
                    <button
                      onClick={() => setShowLogoutModal(true)}
                      className="mt-4 px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                    >
                      Se déconnecter
                    </button>
                  </div>
                </div>
              </div>

              {/* Delete Account */}
              <div className="bg-white rounded-2xl border border-red-200 border-l-4 border-l-red-500 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 rounded-xl">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900">Supprimer le compte</h3>
                    <p className="text-sm text-red-600 mt-1">
                      Irréversible : ton profil, ta progression et tes fichiers sont effacés. Tes publications
                      restent visibles, sous le nom « Compte supprimé ».
                    </p>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                    >
                      Supprimer mon compte
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Logout Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 overflow-y-auto [align-items:safe_center] z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowLogoutModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogOut className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">Se déconnecter ?</h3>
                <p className="text-sm text-ink-faint mb-6">
                  Tu devras te reconnecter pour accéder à ton compte.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-ink-soft bg-[#f2f1ee] rounded-xl hover:bg-[#e7e3dc] transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 overflow-y-auto [align-items:safe_center] z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">Supprimer ton compte ?</h3>
                <p className="text-sm text-ink-faint mb-3">
                  Cette action est irréversible. Ton profil, ta progression, tes favoris, tes cahiers,
                  tes listes de révision et tes fichiers seront définitivement effacés.
                </p>
                <p className="text-sm text-ink-faint mb-4">
                  Les exercices, commentaires et solutions que tu as publiés resteront en ligne pour les
                  autres élèves, sous le nom « Compte supprimé ».
                </p>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-left">
                  <p className="text-sm text-red-700 mb-2">
                    Pour confirmer, tape <strong>{user?.username}</strong> ci-dessous :
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder={user?.username}
                  />
                  {/* Compte créé avec Google, sans mot de passe : le pseudo recopié suffit. */}
                  {hasPassword && (
                    <>
                      <p className="text-sm text-red-700 mt-3 mb-2">Ton mot de passe :</p>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        autoComplete="current-password"
                        className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </>
                  )}
                  {deleteError && <p className="text-sm text-red-700 mt-2">{deleteError}</p>}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmText('');
                      setDeletePassword('');
                      setDeleteError(null);
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-ink-soft bg-[#f2f1ee] rounded-xl hover:bg-[#e7e3dc] transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== user?.username || (hasPassword && !deletePassword) || deleting}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Suppression…' : 'Supprimer définitivement'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsSection;
