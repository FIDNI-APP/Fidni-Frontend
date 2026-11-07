// Effet au clic sur les boutons qui comptent (07/11/2026, principes d'Apple : un retour réservé aux moments qui ont du
// sens, sur l'événement lui-même, image, onde et vibration ensemble). Un bouton l'active avec data-effet :
//   reussi : la coche se trace, onde verte ; revoir : la flèche tourne, onde or ; partie et aime : onde ;
//   neutre (Enregistrer, Je n'aime pas) : rebond seul.
// Choisir déclenche tout ; effacer un choix (aria-pressed déjà vrai) ne donne qu'un petit rebond de l'icône.
// Un attribut et non une classe : React réécrit les classes au même moment. Les dessins sont dans index.css.
import type { AssessmentStatus } from '@/types/content';

export type Effet = 'reussi' | 'revoir' | 'partie' | 'aime' | 'neutre';

export const effetResultat = (statut: AssessmentStatus): Effet =>
  (statut === 'success' ? 'reussi' : statut === 'partial' ? 'partie' : 'revoir');

const DUREE = 560;

export function installerEffetsBoutons() {
  document.addEventListener('click', (e) => {
    const bouton = (e.target as Element | null)?.closest?.<HTMLElement>('button[data-effet]');
    if (!bouton) return;
    // Lu avant que React n'applique le nouvel état : « true » veut dire qu'on efface ce choix.
    const choisit = bouton.getAttribute('aria-pressed') !== 'true';
    bouton.removeAttribute('data-fd-pop');
    void bouton.offsetWidth; // relance l'animation sur un double clic
    bouton.setAttribute('data-fd-pop', choisit ? 'on' : 'off');
    window.setTimeout(() => bouton.removeAttribute('data-fd-pop'), DUREE);
    // Vibration très courte là où elle existe (Android) ; rien pour un simple enregistrement.
    if (choisit && bouton.dataset.effet !== 'neutre') navigator.vibrate?.(bouton.dataset.effet === 'reussi' ? 14 : 8);
  });
}
