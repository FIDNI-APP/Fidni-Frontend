/**
 * Solutions proposées par les élèves sous un exercice ou un examen :
 * texte rédigé dans l'éditeur et/ou photos de la copie.
 */
import { api } from './apiClient';

export interface SolutionAttachment {
  id: string;
  file_name: string;
  file_type: string;
  mime_type: string;
  url: string | null;
  /** URL stable (redirige vers une URL S3 fraîche) : à utiliser pour afficher l'image. */
  download_url: string;
  width?: number | null;
  height?: number | null;
}

export interface ProposedSolution {
  id: number;
  content: number;
  author: { id: number; username: string; avatar?: string | null; is_deleted?: boolean };
  body: string;
  attachments: SolutionAttachment[];
  vote_count: number;
  user_vote: 1 | -1 | null;
  is_mine: boolean;
  created_at: string;
  updated_at: string;
}

export const listProposedSolutions = async (contentId: string | number): Promise<ProposedSolution[]> => {
  const response = await api.get('/proposed-solutions/', { params: { content: contentId } });
  return Array.isArray(response.data) ? response.data : [];
};

export const createProposedSolution = async (data: { content: string | number; body: string; file_ids: string[] }) => {
  const response = await api.post('/proposed-solutions/', data);
  return response.data as ProposedSolution;
};

export const updateProposedSolution = async (id: number, data: { body?: string; file_ids?: string[] }) => {
  const response = await api.patch(`/proposed-solutions/${id}/`, data);
  return response.data as ProposedSolution;
};

export const deleteProposedSolution = async (id: number) => {
  await api.delete(`/proposed-solutions/${id}/`);
};

export const voteProposedSolution = async (id: number, value: 1 | -1) => {
  const response = await api.post(`/proposed-solutions/${id}/vote/`, { value });
  return response.data as { vote_count: number; user_vote: number };
};

/**
 * Réduit une photo de téléphone (souvent 4 à 12 Mo) à 2000 px de côté en JPEG avant l'envoi :
 * plus rapide sur les données mobiles et sous la limite de 10 Mo du serveur.
 */
export const compressImage = async (file: File, maxSide = 2000, quality = 0.85): Promise<File> => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
};
