// src/components/profile/SettingsSection.tsx
import React, { useState, useRef, useEffect } from 'react';
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
  Save, AlertTriangle
} from 'lucide-react';

type SettingsTab = 'profile' | 'account' | 'notifications' | 'appearance' | 'danger';

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'account', label: 'Compte', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Apparence', icon: Palette },
  { id: 'danger', label: 'Zone de danger', icon: AlertTriangle },
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
      ${enabled ? 'bg-blue-600' : 'bg-slate-200'}
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
  <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-slate-100 rounded-lg mt-0.5">
        <Icon className="w-4 h-4 text-slate-600" />
      </div>
      <div>
        <h4 className="font-medium text-slate-900 text-sm">{title}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
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

  // Profile state
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    firstName: '',
    lastName: '',
    bio: user?.profile?.bio || '',
    avatarPreview: user?.profile?.avatar || '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);

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

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: user?.profile?.email_notifications ?? true,
    commentNotifications: user?.profile?.comment_notifications ?? true,
    solutionNotifications: user?.profile?.solution_notifications ?? true,
  });

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username,
        email: user.email,
        firstName: (user as any).first_name || '',
        lastName: (user as any).last_name || '',
        bio: user.profile?.bio || '',
        avatarPreview: user.profile?.avatar || '',
      });
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

    try {
      // Upload avatar if changed
      if (avatarFile) {
        await uploadAvatar(avatarFile);
      }

      // Update user info
      await updateUserInfo({
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email: profileData.email,
      });

      // Update profile
      await updateUserProfile(user.username, {
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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
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
    } catch (err) {
      setError('Erreur lors de la suppression de l\'avatar');
    }
  };

  const handlePasswordChange = async () => {
    setError(null);

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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du changement de mot de passe');
    } finally {
      setChangingPassword(false);
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
    if (deleteConfirmText !== user?.username) return;
    // TODO: Implement account deletion
    console.log('Deleting account...');
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm">
            Gérez votre compte et personnalisez votre expérience
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
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
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4 text-red-400 hover:text-red-600" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Segmented Tab Bar */}
      <div className="flex bg-slate-100 rounded-xl p-1 overflow-x-auto scrollbar-hide w-fit">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDanger = tab.id === 'danger';

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                ${isActive
                  ? isDanger
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-slate-900 shadow-sm'
                  : isDanger
                    ? 'text-red-500 hover:text-red-600'
                    : 'text-slate-500 hover:text-slate-700'
                }
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
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Photo de profil</h3>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-600 text-2xl font-bold overflow-hidden">
                      {profileData.avatarPreview ? (
                        <img src={profileData.avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        profileData.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-slate-600" />
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
                    <p className="text-sm text-slate-600 mb-3">
                      JPG, PNG ou GIF. Max 5MB.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Changer
                      </button>
                      {profileData.avatarPreview && (
                        <button
                          onClick={handleRemoveAvatar}
                          className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Informations personnelles</h3>
                <div className="grid gap-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Prénom
                      </label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Votre prénom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Nom
                      </label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nom d'utilisateur
                    </label>
                    <input
                      type="text"
                      value={profileData.username}
                      disabled
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400 mt-1">Le nom d'utilisateur ne peut pas être modifié</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Bio
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Parlez-nous de vous..."
                      maxLength={500}
                    />
                    <p className="text-xs text-slate-400 mt-1">{profileData.bio.length}/500 caractères</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Email */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Adresse email</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Mot de passe</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Mot de passe actuel
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-4 py-2.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-4 py-2.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-2.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handlePasswordChange}
                    disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingPassword ? 'Changement...' : 'Changer le mot de passe'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-2">Notifications par email</h3>
                <p className="text-sm text-slate-500 mb-6">Choisissez quelles notifications vous souhaitez recevoir</p>

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
                    description="Alertes quand quelqu'un commente votre contenu"
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
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-2">Thème</h3>
                <p className="text-sm text-slate-500 mb-6">Personnalisez l'apparence de l'application</p>

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
                        onClick={() => setTheme(themeOption.id as any)}
                        className={`
                          flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all
                          ${isActive
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                          }
                        `}
                      >
                        <div className={`p-3 rounded-xl ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-slate-700'}`}>
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
              {/* Logout */}
              <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <LogOut className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">Se déconnecter</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Vous serez déconnecté de votre compte sur cet appareil.
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
                      Cette action est irréversible. Toutes vos données seront définitivement supprimées.
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
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
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Se déconnecter ?</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Vous devrez vous reconnecter pour accéder à votre compte.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
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
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Supprimer votre compte ?</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Cette action est irréversible. Toutes vos données, votre progression et vos contenus sauvegardés seront définitivement supprimés.
                </p>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-left">
                  <p className="text-sm text-red-700 mb-2">
                    Pour confirmer, tapez <strong>{user?.username}</strong> ci-dessous :
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder={user?.username}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmText('');
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== user?.username}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Supprimer définitivement
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
