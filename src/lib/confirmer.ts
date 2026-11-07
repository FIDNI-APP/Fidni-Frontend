// Fenêtre de confirmation du site, à la place de window.confirm (07/11/2026) : même dessin partout, y compris sur
// téléphone, et la page continue de vivre pendant la question (un chrono ne s'arrête plus).
//   if (!await confirmer(t('Supprimer ce DS ?'), { action: t('Supprimer'), danger: true })) return;
// Attention : ce n'est plus bloquant. Une page dont l'état peut changer pendant la question (chrono qui se termine)
// doit vérifier cet état après le await.
import { useSyncExternalStore } from 'react';

export interface OptionsConfirmation {
  /** Libellé du bouton d'action, un verbe : « Supprimer » plutôt que « OK ». */
  action?: string;
  /** Action difficile à défaire : bouton rouge, et le focus va sur « Annuler ». */
  danger?: boolean;
}

export interface DemandeConfirmation extends OptionsConfirmation {
  id: number;
  message: string;
  repondre: (ok: boolean) => void;
}

let courante: DemandeConfirmation | null = null;
let compteur = 0;
let hotePresent = false;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

export function confirmer(message: string, options: OptionsConfirmation = {}): Promise<boolean> {
  // Écrans sans fenêtre montée (application native, page isolée) : la question est quand même posée.
  if (!hotePresent) return Promise.resolve(window.confirm(message));
  courante?.repondre(false);
  return new Promise((repondre) => {
    compteur += 1;
    courante = { ...options, id: compteur, message, repondre };
    prevenir();
  });
}

export function repondreConfirmation(ok: boolean) {
  const demande = courante;
  if (!demande) return;
  courante = null;
  prevenir();
  demande.repondre(ok);
}

export const declarerHote = (present: boolean) => { hotePresent = present; };

const abonner = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f); }; };
export const useConfirmation = () => useSyncExternalStore(abonner, () => courante);
