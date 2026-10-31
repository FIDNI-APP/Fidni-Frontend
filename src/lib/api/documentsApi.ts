/** Documents de l'éditeur « façon Word » (12/10/2026) : `/api/documents/`, ceux du membre connecté. */
import { api } from './apiClient';
import { saveFile } from '@/lib/native';

export type Orientation = 'portrait' | 'paysage';
export type Marges = 'normale' | 'etroite' | 'large';

export interface DocumentSummary {
  id: number;
  title: string;
  excerpt: string;
  orientation: Orientation;
  created_at: string;
  updated_at: string;
}

export interface DocumentFull {
  id: number;
  title: string;
  html: string;
  orientation: Orientation;
  marges: Marges;
  /** En-tête FIDNI de la première page. */
  entete?: Record<string, string | boolean>;
  created_at: string;
  updated_at: string;
}

type Page<T> = { results?: T[] } | T[];
const rows = <T,>(data: Page<T>): T[] => (Array.isArray(data) ? data : data.results ?? []);

export const documentsAPI = {
  list: async (q = ''): Promise<DocumentSummary[]> => {
    const res = await api.get('/documents/', { params: { q: q || undefined, page_size: 300 } });
    return rows<DocumentSummary>(res.data);
  },
  get: async (id: number | string): Promise<DocumentFull> => (await api.get(`/documents/${id}/`)).data,
  create: async (data: Partial<Omit<DocumentFull, 'id'>> = {}): Promise<DocumentFull> => (await api.post('/documents/', data)).data,
  update: async (id: number | string, data: Partial<Omit<DocumentFull, 'id'>>): Promise<DocumentFull> =>
    (await api.patch(`/documents/${id}/`, data)).data,
  duplicate: async (id: number | string): Promise<DocumentFull> => (await api.post(`/documents/${id}/dupliquer/`)).data,
  remove: async (id: number | string): Promise<void> => { await api.delete(`/documents/${id}/`); },
  /** Un .docx devient un nouveau document (équations Word → LaTeX, images enregistrées). */
  importDocx: async (file: File): Promise<DocumentFull & { avertissements?: string[] }> => {
    const form = new FormData();
    form.append('fichier', file);
    return (await api.post('/documents/importer-docx/', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })).data;
  },
  /** Le document en Word (.docx), téléchargé par le navigateur. */
  downloadDocx: async (id: number | string, title: string): Promise<void> => {
    const res = await api.get(`/documents/${id}/docx/`, { responseType: 'blob', timeout: 120000 });
    await saveFile(res.data as Blob, `${(title || 'document').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80)}.docx`);
  },
};
