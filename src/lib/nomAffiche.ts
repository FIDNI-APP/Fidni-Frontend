/**
 * Nom montré pour un membre (13/11/2026, Natsu : « le nom + prénom plutôt que le nom d'utilisateur »).
 * Le serveur envoie `display_name` = « Prénom Nom » aux membres connectés, le pseudo aux visiteurs
 * (backend apps/users/noms.py). Le pseudo reste l'identifiant des adresses (/profile/<pseudo>) et des @mentions.
 */
export const nomAffiche = (u?: { username?: string | null; display_name?: string | null } | null): string =>
  (u?.display_name || u?.username || '').trim();
