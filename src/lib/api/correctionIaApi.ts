/**
 * Correction de sa propre copie par l'IA (fonction cachée, 20/10/2026) : l'élève photographie sa copie d'un devoir ou
 * d'un examen, l'IA la compare au corrigé de Fidni et montre où des points ont été perdus.
 * Accès : administrateurs et personnes autorisées (limite par personne, réglée dans Pilotage › IA).
 * Backend : apps/copies/solo.py.
 */
import { api } from './apiClient';
import type { CopieDetail, Note, PointFaible, StatutCopie } from './copiesApi';

export interface AccesCorrection {
  acces: boolean;
  /** Corrections encore permises ; null : sans limite (administrateur). */
  restant: number | null;
  limite: number | null;
}

export interface CorrectionResume extends Note {
  id: number;
  statut: StatutCopie;
  etape: string;
  titre: string;
  created_at: string;
  content: { id: number; type: string; title: string } | null;
}

export interface CorrectionDetail extends CopieDetail {
  content: { id: number; type: string; title: string } | null;
  /** Ce que l'IA a lu sur la copie, question par question. */
  reponses: Record<string, { texte: string; illisible: boolean; confiance: number | null }>;
  corrigee: boolean;
  points_faibles: PointFaible[];
}

export async function getAcces() {
  return (await api.get<AccesCorrection>('/correction-ia/acces/')).data;
}

export async function mesCorrections(contenu?: number | string) {
  return (await api.get<{ corrections: CorrectionResume[] } & AccesCorrection>('/correction-ia/copies/', {
    params: contenu ? { contenu } : {},
  })).data;
}

export async function soumettre(contenu: number | string, fichiers: File[]) {
  const f = new FormData();
  f.append('contenu', String(contenu));
  fichiers.forEach((x) => f.append('fichiers', x));
  return (await api.post<{ id: number; statut: StatutCopie } & AccesCorrection>('/correction-ia/soumettre/', f, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
}

export async function getCorrection(id: number | string) {
  return (await api.get<CorrectionDetail>(`/correction-ia/copies/${id}/`)).data;
}

export async function supprimerCorrection(id: number | string) {
  await api.delete(`/correction-ia/copies/${id}/`);
}

// ---- Pilotage : qui a le droit (administrateurs)
export interface LigneAcces {
  user: { id: number; username: string };
  limite: number;
  utilisees: number;
  restant: number;
  actif: boolean;
  note: string;
  created_at: string;
}

export async function listAcces() {
  return (await api.get<{ acces: LigneAcces[]; defaut: number }>('/pilotage/correction-ia/acces/')).data;
}
export async function donnerAcces(username: string, limite: number, note = '') {
  return (await api.post<LigneAcces>('/pilotage/correction-ia/acces/', { username, limite, note })).data;
}
export async function changerAcces(uid: number, body: Partial<{ limite: number; actif: boolean; note: string; remettre_a_zero: boolean }>) {
  return (await api.patch<LigneAcces>(`/pilotage/correction-ia/acces/${uid}/`, body)).data;
}
export async function retirerAcces(uid: number) {
  await api.delete(`/pilotage/correction-ia/acces/${uid}/`);
}
