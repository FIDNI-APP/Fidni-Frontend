// Prénom, nom, civilité, date de naissance et établissement : obligatoires pour chaque compte
// (feuilles d'exercices, classes). Privés : jamais affichés sur le profil public.
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserInfo } from '@/lib/api/userApi';
import { SchoolPicker } from '@/components/common/SchoolPicker';
import {
  ageFrom, backendHasIdentity, identityComplete, identityError, identityFromUser, identityPayload, termsPending,
  MAX_AGE, MIN_AGE, type IdentityValue,
} from '@/lib/identity';

const inputClass =
  'w-full px-4 py-2.5 bg-white border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand';

export const IdentityFields: React.FC<{
  value: IdentityValue;
  onChange: (v: IdentityValue) => void;
  isTeacher?: boolean;
}> = ({ value, onChange, isTeacher }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label className="block">
        <span className="block text-sm font-medium text-ink-soft mb-1.5">Prénom</span>
        <input className={inputClass} value={value.firstName} autoComplete="given-name" maxLength={60}
          onChange={(e) => onChange({ ...value, firstName: e.target.value })} />
      </label>
      <label className="block">
        <span className="block text-sm font-medium text-ink-soft mb-1.5">Nom</span>
        <input className={inputClass} value={value.lastName} autoComplete="family-name" maxLength={60}
          onChange={(e) => onChange({ ...value, lastName: e.target.value })} />
      </label>
    </div>
    <div className="flex flex-wrap items-start gap-4">
    <div>
      <span className="block text-sm font-medium text-ink-soft mb-1.5">Civilité</span>
      <div className="inline-flex flex-wrap p-1 rounded-xl bg-[#f2f1ee]" role="radiogroup" aria-label="Civilité">
        {([['M', 'Monsieur'], ['F', 'Madame'], ['N', 'Je préfère ne pas le dire']] as const).map(([g, label]) => (
          <button key={g} type="button" role="radio" aria-checked={value.gender === g}
            onClick={() => onChange({ ...value, gender: g })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              value.gender === g ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
    <BirthDateField value={value.birthDate} onChange={(birthDate) => onChange({ ...value, birthDate })} isTeacher={isTeacher} />
    </div>
    <div>
      <span className="block text-sm font-medium text-ink-soft mb-1.5">
        {isTeacher ? 'Établissement où tu enseignes' : 'Ton établissement'}
      </span>
      <SchoolPicker value={value.school} onChange={(school) => onChange({ ...value, school })} />
    </div>
    <p className="flex items-start gap-2 text-xs text-ink-faint leading-relaxed">
      <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      Visible par toi seul : ton pseudo reste ton nom public sur Fidni.
    </p>
  </div>
);

/** Date de naissance (champ natif : calendrier sur téléphone, saisie clavier sur ordinateur). */
const BirthDateField: React.FC<{ value: string; onChange: (v: string) => void; isTeacher?: boolean }> = ({ value, onChange, isTeacher }) => {
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const max = iso(new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate()));
  const min = iso(new Date(today.getFullYear() - MAX_AGE, today.getMonth(), today.getDate()));
  const age = value ? ageFrom(value) : null;
  return (
    <label className="block min-w-[190px] flex-1">
      <span className="block text-sm font-medium text-ink-soft mb-1.5">Date de naissance</span>
      <input type="date" className={inputClass} value={value} min={min} max={max} autoComplete="bday"
        onChange={(e) => onChange(e.target.value)} />
      {!isTeacher && age !== null && age < 15 && (
        <span className="block mt-1.5 text-xs text-gold-strong leading-relaxed">
          Moins de 15 ans : l’accord d’un de tes parents est nécessaire pour utiliser Fidni.
        </span>
      )}
    </label>
  );
};

/**
 * Comptes créés avant que ces champs deviennent obligatoires : une fenêtre bloquante les
 * demande une fois. Les nouveaux comptes les remplissent pendant l'onboarding.
 */
export const IdentityGate: React.FC = () => {
  const { isAuthenticated, user, refreshUser, logout } = useAuth();
  const location = useLocation();
  const [value, setValue] = useState<IdentityValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const mustAccept = termsPending(user);
  const needed =
    isAuthenticated && user && backendHasIdentity(user) &&
    user.profile.onboarding_completed && (!identityComplete(user) || mustAccept) &&
    !['/complete-profile', '/terms-of-service', '/privacy-policy', '/mentions-legales'].includes(location.pathname);
  if (!needed) return null;

  const current = value ?? identityFromUser(user);

  const save = async () => {
    const problem = identityError(current);
    if (problem) { setError(problem); return; }
    if (mustAccept && !accepted) {
      setError('Accepte les conditions d’utilisation et la politique de confidentialité pour continuer.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateUserInfo({ ...identityPayload(current), ...(mustAccept ? { accept_terms: true } : {}) });
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Enregistrement impossible. Réessaie.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true"
      aria-labelledby="identity-gate-title">
      <div className="bg-white rounded-2xl border border-line w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="p-6 sm:p-7">
          <h2 id="identity-gate-title" className="text-lg font-semibold text-ink mb-1.5">
            {identityComplete(user) ? 'Nos conditions ont changé' : 'Complète ton profil'}
          </h2>
          <p className="text-sm text-ink-faint mb-5 leading-relaxed">
            {identityComplete(user)
              ? 'Nos conditions d’utilisation et notre politique de confidentialité ont été mises à jour. Vérifie tes informations puis accepte-les pour continuer.'
              : 'Quelques informations manquent à ton profil (dont ta date de naissance). Elles restent privées et servent notamment sur tes feuilles d’exercices en PDF.'}
          </p>
          <IdentityFields value={current} onChange={(v) => { setValue(v); setError(null); }}
            isTeacher={user.profile.user_type === 'teacher'} />
          {mustAccept && (
            <label className="flex items-start gap-2.5 mt-5 text-sm text-ink-soft cursor-pointer">
              <input type="checkbox" checked={accepted} onChange={(e) => { setAccepted(e.target.checked); setError(null); }}
                className="mt-0.5 h-4 w-4 accent-[#1a7a4a] flex-shrink-0" />
              <span>
                J’ai lu et j’accepte les{' '}
                <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-brand-hover underline">conditions d’utilisation</a>
                {' '}et la{' '}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-hover underline">politique de confidentialité</a>
                {' '}mises à jour.
              </span>
            </label>
          )}
          {error && <p className="mt-4 text-sm text-[#a23b34]">{error}</p>}
        </div>
        <div className="px-6 sm:px-7 py-4 border-t border-line flex items-center justify-between gap-3">
          <button onClick={() => logout()} className="text-sm text-ink-faint hover:text-ink">Se déconnecter</button>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-lg font-semibold text-sm hover:bg-brand-hover disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};
