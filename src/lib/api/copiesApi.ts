/**
 * Copies des élèves (Classes › Évaluations, 15/10/2026) : le professeur dépose les copies, l'IA les transcrit et
 * propose une note par question, le professeur vérifie, valide et publie ; l'élève voit sa copie corrigée.
 * Backend : apps/copies (views.py).
 */
import { api } from './apiClient';
import { saveFile } from '@/lib/native';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';

export type StatutCopie = 'vide' | 'deposee' | 'en_attente' | 'en_cours' | 'corrigee' | 'validee' | 'erreur';
export type SujetStatut = 'pret' | 'en_cours' | 'a_verifier' | 'erreur';

export interface Note { points: number | null; max: number; note: number | null; note_sur: number }

export interface EvaluationResume {
  id: number;
  titre: string;
  date: string | null;
  note_sur: number;
  pas: number;
  source: 'fidni' | 'prive';
  sujet_statut: SujetStatut;
  content: { id: number; type: string; title: string } | null;
  created_at: string;
  copies?: Partial<Record<StatutCopie, number>>;
  publiees?: number;
}

export interface QuestionBareme {
  chemin: string;
  label: string;
  partie: string;
  max: number;
  theoremes: string[];
  enonce_html: string;
  solution_html: string;
}

export interface EvaluationDetail extends EvaluationResume {
  consignes: string;
  sujet: FlexibleExerciseStructure;
  maxima: Record<string, number>;
  questions: QuestionBareme[];
  total_max: number;
  etape: string;
  error: string;
  quota_restant: number | null;
  /** Faux dès qu'une copie est notée : on ne peut plus ajouter, retirer ou déplacer de questions. */
  modifiable: boolean;
  /** PDF de la classe pas encore confirmé (découpage en cours ou à vérifier). */
  lot: Lot | null;
}

export interface CopieResume extends Note {
  id: number;
  statut: StatutCopie;
  etape: string;
  error: string;
  nb_pages: number;
  drapeaux: number;
  publiee: boolean;
}

export interface LigneCopie {
  /** id null : élève sans compte Fidni (username = nom tapé par le professeur). */
  eleve: { id: number | null; username: string };
  membre: boolean;
  sans_compte?: boolean;
  copie: CopieResume | null;
}

export interface NoteQuestion { points: number | null; max: number; commentaire: string; source?: 'prof' | 'ia' | null }
export interface PageScan { id: number; numero: number; url: string; largeur: number; hauteur: number }

export interface CopieDetail extends Note {
  id: number;
  statut: StatutCopie;
  etape: string;
  error: string;
  evaluation: EvaluationResume;
  eleve: { id: number | null; username: string; sans_compte?: boolean };
  questions: QuestionBareme[];
  finales: Record<string, NoteQuestion>;
  commentaire_prof: string;
  commentaire_global: string;
  pages: PageScan[];
  publiee_le: string | null;
  // Professeur seulement :
  transcription?: Record<string, { texte: string; illisible?: boolean; page?: number | null; modifie?: boolean }>
    & { _hors_question?: string; _injection?: boolean; _pages?: string[] };
  ia?: Record<string, { points: number | null; commentaire: string; confiance: number; illisible: boolean }>;
  notes?: Record<string, { points?: number; commentaire?: string }>;
  drapeaux?: { chemin: string | null; raison: 'injection' | 'illisible' | 'confiance' | 'non_notee' | 'hors_sujet' }[];
  precedente?: number | null;
  suivante?: number | null;
  validee_le?: string | null;
}

export interface PointFaible {
  theoreme: string;
  taux: number;
  questions: string[];
  chapitre: { id: number; nom: string; url: string | null } | null;
}

export interface MaCopie extends CopieDetail {
  classe: { id: number; name: string };
  points_faibles: PointFaible[];
}

export interface MaCopieResume extends Note {
  id: number;
  titre: string;
  date: string | null;
  classe: { id: number; name: string };
  publiee_le: string;
}

export interface Rapport {
  copies_validees: number;
  copies_total: number;
  note_sur: number;
  resume: { moyenne: number; mediane: number; min: number; max: number; ecart_type: number; au_dessus_moyenne: number } | null;
  repartition: { de: number; a: number; n: number }[];
  questions: { chemin: string; label: string; max: number; reussite: number | null }[];
  theoremes_faibles: { theoreme: string; taux: number; chapitre: PointFaible['chapitre'] }[];
}

export interface Lot {
  id: number;
  nom: string;
  statut: 'en_attente' | 'en_cours' | 'pret' | 'erreur' | 'confirme';
  etape: string;
  error: string;
  nb_pages: number;
  pages_par_copie: number | null;
  proposition: { pages: number[]; nom_lu: string; eleve_id: number | null; score: number }[];
  pages: string[];
  eleves: { id: number; username: string }[];
}

const base = (cid: number | string) => `/classrooms/${cid}/evaluations/`;

/** URL d'une image servie par l'API (liens signés « /api/copies/… »). */
export function urlApi(chemin: string): string {
  const racine = String(api.defaults.baseURL || '').replace(/\/api\/?$/, '');
  return `${racine}${chemin}`;
}

export function copiesError(e: unknown, fallback: string): string {
  const d = (e as { response?: { data?: { error?: string; detail?: string } } })?.response?.data;
  return d?.error || d?.detail || fallback;
}

export async function listEvaluations(cid: number | string) {
  return (await api.get<{ evaluations: EvaluationResume[]; quota_restant: number | null }>(base(cid))).data;
}
export async function createEvaluation(cid: number | string, body: {
  titre?: string; date?: string | null; note_sur?: number; pas?: number; content_id?: number | null;
}) {
  return (await api.post<EvaluationDetail>(base(cid), body)).data;
}
export async function getEvaluation(cid: number | string, eid: number | string) {
  return (await api.get<EvaluationDetail>(`${base(cid)}${eid}/`)).data;
}
export async function updateEvaluation(cid: number | string, eid: number | string, body: Partial<{
  titre: string; date: string | null; note_sur: number; pas: number; consignes: string;
  maxima: Record<string, number>; sujet: FlexibleExerciseStructure; sujet_verifie: boolean;
}>) {
  return (await api.patch<EvaluationDetail>(`${base(cid)}${eid}/`, body)).data;
}
export async function deleteEvaluation(cid: number | string, eid: number | string) {
  await api.delete(`${base(cid)}${eid}/`);
}
export async function importSujet(cid: number | string, eid: number | string, fichiers: File[]) {
  const fd = new FormData();
  fichiers.forEach((f) => fd.append('fichiers', f));
  return (await api.post<EvaluationDetail>(`${base(cid)}${eid}/sujet/import/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000,
  })).data;
}
export async function listCopies(cid: number | string, eid: number | string) {
  return (await api.get<{ copies: LigneCopie[]; quota_restant: number | null }>(`${base(cid)}${eid}/copies/`)).data;
}
export async function addPages(cid: number | string, eid: number | string, eleveId: number, fichier: File) {
  const fd = new FormData();
  fd.append('fichier', fichier);
  return (await api.post<CopieResume>(`${base(cid)}${eid}/eleves/${eleveId}/pages/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000,
  })).data;
}
/** Copie d'un élève sans compte Fidni (le nom suffit) ; ses pages s'ajoutent ensuite avec addPagesCopie. */
export async function creerCopieSansCompte(cid: number | string, eid: number | string, nom: string) {
  return (await api.post<LigneCopie>(`${base(cid)}${eid}/copies/`, { nom })).data;
}
export async function addPagesCopie(cid: number | string, eid: number | string, copieId: number, fichier: File) {
  const fd = new FormData();
  fd.append('fichier', fichier);
  return (await api.post<CopieResume>(`${base(cid)}${eid}/copies/${copieId}/pages/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000,
  })).data;
}
export async function deleteCopie(cid: number | string, eid: number | string, copieId: number) {
  await api.delete(`${base(cid)}${eid}/copies/${copieId}/`);
}
export async function deletePage(cid: number | string, eid: number | string, pid: number) {
  await api.delete(`${base(cid)}${eid}/pages/${pid}/`);
}
export async function getCopie(cid: number | string, eid: number | string, id: number | string) {
  return (await api.get<CopieDetail>(`${base(cid)}${eid}/copies/${id}/`)).data;
}
export async function updateCopie(cid: number | string, eid: number | string, id: number | string, body: Partial<{
  notes: Record<string, { points?: number | null; commentaire?: string | null }>;
  commentaire_prof: string;
  transcription: Record<string, string>;
  valider: boolean;
}>) {
  return (await api.patch<CopieDetail>(`${base(cid)}${eid}/copies/${id}/`, body)).data;
}
export async function recorriger(cid: number | string, eid: number | string, id: number | string, chemins?: string[]) {
  return (await api.post(`${base(cid)}${eid}/copies/${id}/recorriger/`, { chemins: chemins ?? [] })).data;
}
export async function corriger(cid: number | string, eid: number | string, copies: number[] | 'toutes' = 'toutes') {
  return (await api.post<{ lancees: number; quota_restant: number | null }>(`${base(cid)}${eid}/corriger/`, { copies })).data;
}
export async function publier(cid: number | string, eid: number | string, copies: number[] | 'validees' = 'validees') {
  return (await api.post<{ publiees: number; sans_compte?: number }>(`${base(cid)}${eid}/publier/`, { copies })).data;
}
export async function getRapport(cid: number | string, eid: number | string) {
  return (await api.get<Rapport>(`${base(cid)}${eid}/rapport/`)).data;
}
/** Télécharge le tableau des notes (CSV pour Excel en français, ou XLSX). */
export async function exporterNotes(cid: number | string, eid: number | string, type: 'csv' | 'xlsx', nom: string) {
  const r = await api.get(`${base(cid)}${eid}/export/`, { params: { type }, responseType: 'blob' });
  await saveFile(r.data as Blob, `${nom}.${type}`);
}
/** Feuille de correction à imprimer (professeur) : une copie, avec ses commentaires et sa transcription. */
export interface FeuilleCopie extends Note {
  id: number;
  statut: StatutCopie;
  validee: boolean;
  publiee: boolean;
  /** nom : prénom et nom du compte, sinon le pseudo ; élève sans compte : le nom tapé. */
  eleve: { id: number | null; username: string; nom: string; sans_compte?: boolean };
  finales: Record<string, NoteQuestion>;
  transcription: Record<string, { texte: string; illisible: boolean }>;
  commentaire_prof: string;
  commentaire_global: string;
  points_faibles: PointFaible[];
}

export interface Impression {
  evaluation: EvaluationResume & { total_max: number };
  classe: { id: number; name: string };
  questions: QuestionBareme[];
  copies: FeuilleCopie[];
}

/** Une copie (copie) ou toutes celles qui ont une note. */
export async function getImpression(cid: number | string, eid: number | string, copie?: number | string) {
  return (await api.get<Impression>(`${base(cid)}${eid}/impression/`, { params: copie ? { copie } : {} })).data;
}
export async function envoyerLot(cid: number | string, eid: number | string, fichier: File, pagesParCopie?: number | null) {
  const fd = new FormData();
  fd.append('fichier', fichier);
  if (pagesParCopie) fd.append('pages_par_copie', String(pagesParCopie));
  return (await api.post<Lot>(`${base(cid)}${eid}/lots/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000,
  })).data;
}
export async function getLot(cid: number | string, eid: number | string, lid: number) {
  return (await api.get<Lot>(`${base(cid)}${eid}/lots/${lid}/`)).data;
}
export async function deleteLot(cid: number | string, eid: number | string, lid: number) {
  await api.delete(`${base(cid)}${eid}/lots/${lid}/`);
}
export async function confirmerLot(cid: number | string, eid: number | string, lid: number,
  groupes: { pages: number[]; eleve_id: number | null; nom?: string }[]) {
  return (await api.post<{ copies: number }>(`${base(cid)}${eid}/lots/${lid}/confirmer/`, { groupes })).data;
}
export async function searchSujets(q: string) {
  const r = await api.get<{ results: { id: number; title: string; type: string }[] }>('/contents/', {
    params: { search: q, per_page: 8 },
  });
  return (r.data.results || []).filter((c) => c.type === 'exam' || c.type === 'exercise');
}

export async function mesCopies(classe?: number | string) {
  return (await api.get<{ copies: MaCopieResume[] }>('/mes-copies/', { params: classe ? { classe } : {} })).data.copies;
}
export async function maCopie(id: number | string) {
  return (await api.get<MaCopie>(`/mes-copies/${id}/`)).data;
}

/** Une copie est-elle en cours de traitement (l'écran se relit tout seul) ? */
export const enTraitement = (s?: StatutCopie | null) => s === 'en_attente' || s === 'en_cours';

/** « 12,5 » : nombres à la française (virgule), sans zéros inutiles. */
export const fmt = (n: number | null | undefined) =>
  (n === null || n === undefined ? '—' : (Math.round(n * 100) / 100).toString().replace('.', ','));
