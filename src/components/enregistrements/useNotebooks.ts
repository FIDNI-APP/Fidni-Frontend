// Cahiers de l'élève : liste, création (matière déduite du niveau), renommage, suppression.
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/apiClient';
import { getSubjects } from '@/lib/api/hierarchyApi';
import { normalizeNotebookPayload } from '@/lib/api/notebookApi';
import { hubPath } from '@/lib/api/hubApi';
import { apiError, sameId, type Id, type NbNotebook } from '@/components/notebook/notebookModel';

/** Leçons du niveau de l'élève (dossiers de chapitres), sinon toutes les leçons. */
export const lessonsHome = (level: { slug: string } | null) => (level ? hubPath('lessons', level.slug) : '/lessons');

export interface SubjectChoice { id: Id; name: string }

/** Matières d'un niveau ; la principale en tête (la seule, sinon les maths). */
export async function subjectsFor(levelId: Id): Promise<SubjectChoice[]> {
  const list = (await getSubjects([String(levelId)])) as unknown as SubjectChoice[];
  const main = list.find((s) => /math/i.test(s.name));
  return main ? [main, ...list.filter((s) => s !== main)] : list;
}

export function useNotebooks(enabled: boolean) {
  const [list, setList] = useState<NbNotebook[] | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    setFailed(false);
    try {
      const r = await api.get('/notebooks/get_notebooks/');
      setList(normalizeNotebookPayload((r.data || []) as NbNotebook[]));
    } catch {
      setList((cur) => cur ?? []);
      setFailed(true);
    }
  }, []);

  useEffect(() => { if (enabled) reload(); }, [enabled, reload]);

  /** Crée le cahier ; sans matière, prend celle du niveau (Maths). Lève une erreur au message lisible. */
  const create = async ({ levelId, subjectId, title }: { levelId: Id; subjectId?: Id | null; title?: string }) => {
    let subject = subjectId;
    if (!subject) {
      const subjects = await subjectsFor(levelId).catch(() => []);
      if (!subjects.length) throw new Error('Aucune matière n’est proposée pour ce niveau.');
      subject = subjects[0].id;
    }
    try {
      const r = await api.post('/notebooks/create_notebook/', {
        subject_id: subject, class_level_id: levelId, title: title?.trim() || undefined,
      });
      const nb = normalizeNotebookPayload(r.data as NbNotebook);
      setList((cur) => [...(cur ?? []), nb]);
      return nb;
    } catch (e) {
      throw new Error(apiError(e, 'Le cahier n’a pas pu être créé.'));
    }
  };

  /** Renomme ; le nom doit rester unique parmi les cahiers de l'élève (contrainte en base). */
  const rename = async (id: Id, title: string) => {
    const clean = title.trim();
    if (!clean) throw new Error('Donne un nom à ton cahier.');
    if ((list ?? []).some((n) => !sameId(n.id, id) && n.title.trim().toLowerCase() === clean.toLowerCase())) {
      throw new Error('Tu as déjà un cahier qui porte ce nom.');
    }
    try {
      await api.patch(`/notebooks/${id}/`, { title: clean });
    } catch (e) {
      throw new Error(apiError(e, 'Le cahier n’a pas pu être renommé.'));
    }
    setList((cur) => cur?.map((n) => (sameId(n.id, id) ? { ...n, title: clean } : n)) ?? cur);
  };

  const remove = async (id: Id) => {
    await api.delete(`/notebooks/${id}/`);
    setList((cur) => cur?.filter((n) => !sameId(n.id, id)) ?? cur);
  };

  return { list, failed, reload, create, rename, remove };
}

export type NotebooksState = ReturnType<typeof useNotebooks>;
