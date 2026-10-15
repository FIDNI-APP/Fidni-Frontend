// Enregistrement d'un contenu par l'assistant « Ajouter un contenu » (une seule fonction pour les trois
// types, création ou modification). Le serveur (things/serializers.py, ContentCreateSerializer) attend les
// identifiants des niveaux, chapitres, sous-domaines, théorèmes et de l'établissement d'origine.
import { api } from './apiClient';

export type WizardContentType = 'exercise' | 'exam' | 'lesson';

export interface ContentPayload {
  type: WizardContentType;
  title: string;
  structure: unknown;
  difficulty?: 'easy' | 'medium' | 'hard';
  subjectId: number | null;
  levelIds: number[];
  chapterIds: number[];
  subfieldIds: number[];
  theoremIds: number[];
  schoolId: number | null;
  durationMinutes?: number | null;
  isNationalExam?: boolean;
  nationalYear?: number | null;
}

function contentBody(p: ContentPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    type: p.type,
    title: p.title.trim(),
    json_content: p.structure,
    subject: p.subjectId,
    class_levels: p.levelIds,
    chapters: p.chapterIds,
    subfields: p.subfieldIds,
    theorems: p.theoremIds,
    school: p.schoolId,
  };
  if (p.type !== 'lesson') body.difficulty = p.difficulty;
  if (p.type === 'exam') {
    body.duration_minutes = p.durationMinutes || null;
    body.is_national_exam = !!p.isNationalExam;
    body.national_year = p.isNationalExam ? p.nationalYear || null : null;
  }
  return body;
}

export async function saveContent(p: ContentPayload, id?: string | number): Promise<{ id: number }> {
  const body = contentBody(p);
  const res = id ? await api.patch(`/contents/${id}/`, body) : await api.post('/contents/', body);
  return res.data;
}

/** Brouillon de Pilotage › À valider modifié dans l'éditeur : enregistré dans le brouillon, rien n'est publié. */
export async function saveDraftEdition(jobId: string | number, fiche: string | null, p: ContentPayload): Promise<{ id: number }> {
  const q = fiche ? `?fiche=${encodeURIComponent(fiche)}` : '';
  return (await api.post(`/pilotage/ia/${jobId}/editeur/${q}`, contentBody(p))).data;
}

export interface ChapterOption {
  id: number;
  name: string;
  subject: { id: number; name: string } | null;
  subfield: { id: number; name: string } | null;
}

/** Chapitres d'un ou plusieurs niveaux (matière facultative), avec leur sous-domaine. */
export async function chaptersFor(levelIds: number[], subjectId: number | null): Promise<ChapterOption[]> {
  if (!levelIds.length) return [];
  const params: Record<string, unknown> = { class_level: levelIds, page_size: 500 };
  if (subjectId) params.subject = [subjectId];
  const res = await api.get('/chapters/', { params });
  const rows = Array.isArray(res.data) ? res.data : res.data.results || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((c: any) => ({
    id: Number(c.id), name: c.name,
    subject: c.subject ? { id: Number(c.subject.id), name: c.subject.name } : null,
    subfield: c.subfield ? { id: Number(c.subfield.id), name: c.subfield.name } : null,
  }));
}

export interface TheoremOption { id: number; name: string }

export async function theoremsFor(levelIds: number[], subjectId: number | null, chapterIds: number[]): Promise<TheoremOption[]> {
  if (!chapterIds.length) return [];
  const params: Record<string, unknown> = { class_level: levelIds, chapters: chapterIds, page_size: 500 };
  if (subjectId) params.subject = subjectId; // ici « subject » simple (les chapitres, eux, lisent « subject[] »)
  const res = await api.get('/theorems/', { params });
  const rows = Array.isArray(res.data) ? res.data : res.data.results || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((t: any) => ({ id: Number(t.id), name: t.name }));
}
