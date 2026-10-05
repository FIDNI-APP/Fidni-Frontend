// src/lib/features.ts
/**
 * Fonctionnalités en cours de construction : visibles des admins seulement.
 *
 * Parcours n'est pas terminé : il est masqué partout pour les élèves (barre latérale, plan du
 * campus, adresses /learning-path…, API). Pour le publier, passer PARCOURS_PUBLIC à true ici
 * ET dans le .env du backend (PARCOURS_PUBLIC=True).
 */
export const PARCOURS_PUBLIC = false;

export function canSeeParcours(user: { is_superuser?: boolean; is_staff?: boolean } | null | undefined): boolean {
  return PARCOURS_PUBLIC || !!(user?.is_superuser || user?.is_staff);
}

/** Administrateur ou modérateur : peut modifier ou supprimer tout contenu publié par les membres
 *  (le serveur l'autorise pour le staff : config/permissions.py, IsAuthorOrStaffOrReadOnly). */
export function isModerator(user: { is_superuser?: boolean; is_staff?: boolean } | null | undefined): boolean {
  return !!(user?.is_superuser || user?.is_staff);
}
