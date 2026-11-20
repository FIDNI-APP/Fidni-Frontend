// Compte de moins de 24 h : il ne peut pas encore écrire (forum, commentaire, réponse, solution proposée).
// Backend : apps/discussions/moderation.py (20/11/2026), réponse 403 {code: 'compte_recent', heures}.
import { t } from '@/i18n';

/** Message traduit si l'erreur vient d'un compte trop récent, sinon null. */
export function messageCompteRecent(err: unknown): string | null {
  const data = (err as { response?: { data?: { code?: string; heures?: number } } })?.response?.data;
  if (data?.code !== 'compte_recent') return null;
  return t('Ton compte est tout neuf : tu pourras écrire dans {n} h. En attendant, entraîne-toi sur les exercices.', { n: data.heures ?? 24 });
}
