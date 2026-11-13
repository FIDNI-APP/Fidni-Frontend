// Informations légales partagées (mentions légales, CGU, politique de confidentialité).
// Changer la date ici à chaque modification des CGU ou de la politique de confidentialité, ET TERMS_VERSION
// dans backend/src/apps/users/legal.py si la modification est importante : les comptes devront les accepter
// de nouveau. 10/10/2026 (connexion avec Google, facultative) : date seule, TERMS_VERSION inchangé (choix voulu).
// 09/11/2026 : pages et gestes gardés par membre 6 mois (journal du Pilotage) → TERMS_VERSION 2026-11-09.
// 13/11/2026 : messages et appels entre abonnés mutuels → date seule, TERMS_VERSION inchangé (Natsu : pas de réacceptation) ;
// la section n'apparaît que quand la messagerie est ouverte (lib/features.ts), la date aussi.
import { MESSAGERIE_ACTIVE } from './features';

export const LEGAL = {
  publisher: 'Oussama Hadder',
  contactEmail: 'contact@fidni.fr',
  site: 'https://fidni.fr',
  updated: MESSAGERIE_ACTIVE ? '13 novembre 2026' : '9 novembre 2026',
} as const;
