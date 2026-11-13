// src/lib/features.ts
/**
 * Fonctionnalités en cours de construction : visibles des admins seulement.
 *
 * Parcours n'est pas terminé : il est masqué partout pour les élèves (barre latérale,
 * adresses /learning-path…, API). Pour le publier, passer PARCOURS_PUBLIC à true ici
 * ET dans le .env du backend (PARCOURS_PUBLIC=True).
 */
export const PARCOURS_PUBLIC = false;

export function canSeeParcours(user: { is_superuser?: boolean; is_staff?: boolean } | null | undefined): boolean {
  return PARCOURS_PUBLIC || !!(user?.is_superuser || user?.is_staff);
}

/**
 * Parcours = fonctionnalité Premium (12/11/2026). Aucune offre Premium n'existe encore côté serveur : quand elle
 * existera, l'utilisateur renvoyé par /api/auth/user/ portera `is_premium` (à ajouter au serializer), et seul ce
 * test change. D'ici là : l'équipe, ou un compte marqué `is_premium`. La page s'affiche (menu, /parcours) dès que
 * canSeeParcours est vrai ; ce test décide si son contenu est ouvert ou réservé (PremiumGate).
 */
export function hasParcoursAccess(user: { is_superuser?: boolean; is_staff?: boolean; is_premium?: boolean } | null | undefined): boolean {
  return !!(user?.is_superuser || user?.is_staff || user?.is_premium);
}

/**
 * Messagerie, appels, visio et travail à plusieurs (13/11/2026) : en développement SEULEMENT (Natsu : le site a deux mois,
 * pas trop de fonctionnalités d'un coup ; on la sortira une fois finie et étudiée). Le serveur est en ligne, mais le
 * site en production n'en montre rien et n'ouvre aucune connexion temps réel. Visible seulement sur localhost (`npm run dev`)
 * (pas d'import.meta.env.DEV : l'obfuscation le casse, voir lib/usage.ts). Le jour de la sortie : true, puis
 * security-headers.conf (camera/microphone=(self)) — voir le commentaire là-bas.
 */
export const MESSAGERIE_ACTIVE: boolean = typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname);

/**
 * Page Membres (/membres : chercher des membres, fil des abonnements) : fermée depuis le 09/11/2026 ; elle revient avec
 * la messagerie (même interrupteur). Fermée, elle sort du menu et son adresse mène aux discussions
 * (pages/communaute/MembresFerme).
 */
export const MEMBRES_OUVERT: boolean = MESSAGERIE_ACTIVE;

/** Administrateur ou modérateur : peut modifier ou supprimer tout contenu publié par les membres
 *  (le serveur l'autorise pour le staff : config/permissions.py, IsAuthorOrStaffOrReadOnly). */
export function isModerator(user: { is_superuser?: boolean; is_staff?: boolean } | null | undefined): boolean {
  return !!(user?.is_superuser || user?.is_staff);
}

type RoleUser = { is_superuser?: boolean; is_staff?: boolean; profile?: { user_type?: string } | null } | null | undefined;

/** Création de contenu (exercice, leçon, examen, « Publier sur FIDNI ») : l'équipe seulement pour l'instant
 *  (12/10/2026 ; le serveur refuse aussi : config/permissions.py CanCreateContent). */
export function canCreateContent(user: RoleUser): boolean {
  return isModerator(user);
}

/** « Mes documents » et outils prof : enseignant déclaré ou équipe (serveur : IsTeacherOrAdmin). */
export function isTeacherOrAdmin(user: RoleUser): boolean {
  return user?.profile?.user_type === 'teacher' || isModerator(user);
}
