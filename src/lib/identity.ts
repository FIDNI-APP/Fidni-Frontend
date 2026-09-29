// Identité obligatoire d'un compte : prénom, nom, civilité, date de naissance, établissement
// (règles partagées front ; les mêmes que apps/users/identity.py).
import type { SchoolValue } from '@/components/common/SchoolPicker';
import type { User } from '@/types';

export type Gender = 'M' | 'F' | 'N' | '';

export interface IdentityValue {
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: string; // AAAA-MM-JJ (champ <input type="date">)
  school: SchoolValue;
}

export const MIN_AGE = 8;
export const MAX_AGE = 100;

/** Âge en années révolues à la date du jour, ou null si la date est illisible. */
export const ageFrom = (iso: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const born = new Date(y, mo - 1, d);
  if (born.getFullYear() !== y || born.getMonth() !== mo - 1 || born.getDate() !== d) return null;
  const now = new Date();
  return now.getFullYear() - y - ((now.getMonth() < mo - 1 || (now.getMonth() === mo - 1 && now.getDate() < d)) ? 1 : 0);
};

// Mêmes règles que le serveur (apps/users/identity.py) : lettres de toutes les écritures,
// espaces, apostrophes, traits d'union.
const NAME_RE = /^\p{L}[\p{L}\p{M} '’.-]*$/u;

export const identityFromUser = (user: User | null | undefined): IdentityValue => ({
  firstName: user?.first_name || '',
  lastName: user?.last_name || '',
  gender: (user?.profile?.gender as Gender) || '',
  birthDate: user?.profile?.birth_date || '',
  school: user?.profile?.school
    ? { id: user.profile.school.id, name: user.profile.school.name, city: user.profile.school.city }
    : { id: null, name: user?.profile?.school_name || '' },
});

/** Message d'erreur, ou null si tout est valide. */
export const identityError = (v: IdentityValue): string | null => {
  for (const [value, label] of [[v.firstName, 'Le prénom'], [v.lastName, 'Le nom']] as const) {
    const t = value.trim();
    if (!t) return `${label} est obligatoire.`;
    if (t.length > 60) return `${label} est trop long.`;
    if (!NAME_RE.test(t)) return `${label} ne doit contenir que des lettres.`;
  }
  if (!v.gender) return 'Indique ta civilité, ou choisis « Je préfère ne pas le dire ».';
  if (!v.birthDate) return 'Indique ta date de naissance.';
  const age = ageFrom(v.birthDate);
  if (age === null || age < MIN_AGE || age > MAX_AGE) return 'Date de naissance invalide : vérifie l’année.';
  if (v.school.id === null && v.school.name.trim().length < 3) return 'Indique ton établissement.';
  return null;
};

/** Champs à envoyer à l'API (onboarding ou mise à jour du compte). */
export const identityPayload = (v: IdentityValue) => ({
  first_name: v.firstName.trim(),
  last_name: v.lastName.trim(),
  ...(v.gender ? { gender: v.gender } : {}),
  ...(v.birthDate ? { birth_date: v.birthDate } : {}),
  ...(v.school.id !== null
    ? { school_id: v.school.id }
    : { school_id: '' as const, school_name: v.school.name.trim() }),
});

/** Le serveur connaît-il déjà ces champs ? (le site peut être en ligne avant le serveur) */
export const backendHasIdentity = (user: User | null | undefined) =>
  !!user?.profile && 'school_name' in user.profile;

export const identityComplete = (user: User | null | undefined) =>
  !!(user?.first_name && user?.last_name && user?.profile?.school_name
    // Le sexe n'est exigé que si le serveur connaît déjà ce champ (site en ligne avant le serveur).
    && (!user?.profile || !('gender' in user.profile) || user.profile.gender)
    // Idem pour la date de naissance (ajoutée le 29/09/2026 : demandée une fois aux comptes existants).
    && (!user?.profile || !('birth_date' in user.profile) || user.profile.birth_date));

/** Le compte doit-il accepter la version en vigueur des CGU / de la politique de confidentialité ? */
export const termsPending = (user: User | null | undefined) =>
  !!user?.profile && 'terms_up_to_date' in user.profile && user.profile.terms_up_to_date === false;
