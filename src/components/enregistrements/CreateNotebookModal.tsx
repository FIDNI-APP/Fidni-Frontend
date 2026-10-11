// « Nouveau cahier » : petite fenêtre pré-remplie (niveau du profil, la matière du niveau, nom proposé).
// Un clic suffit ; le cahier créé s'ouvre aussitôt. Si l'élève a déjà un cahier de ce niveau et de cette
// matière, on le lui rappelle (avec un lien pour l'ouvrir) sans empêcher d'en créer un autre.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookMarked, Loader2 } from 'lucide-react';
import { getClassLevels } from '@/lib/api/hierarchyApi';
import { ModalShell, FormError, fieldCls } from './ModalShell';
import { subjectsFor, type SubjectChoice } from './useNotebooks';
import { sameId, type Id, type NbNotebook } from '@/components/notebook/notebookModel';

interface Level { id: Id; name: string }

/** Nom proposé, « Mathématiques - 2ème Bac SM », numéroté s'il est déjà pris. */
function proposedTitle(subject: string, level: string, taken: string[]) {
  const base = `${subject} - ${level}`;
  const used = new Set(taken.map((t) => t.trim().toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  let i = 2;
  while (used.has(`${base} (${i})`.toLowerCase())) i += 1;
  return `${base} (${i})`;
}

export const CreateNotebookModal: React.FC<{
  open: boolean;
  onClose: () => void;
  defaultLevelId?: string | null;
  takenTitles: string[];
  /** Cahiers de l'élève : pour signaler celui qui a déjà ce niveau et cette matière. */
  existing?: NbNotebook[];
  create: (args: { levelId: Id; subjectId?: Id | null; title?: string }) => Promise<NbNotebook>;
  onCreated: (nb: NbNotebook) => void;
}> = ({ open, onClose, defaultLevelId, takenTitles, existing = [], create, onCreated }) => {
  const [levels, setLevels] = useState<Level[] | null>(null);
  const [levelId, setLevelId] = useState<string>('');
  const [subjects, setSubjects] = useState<SubjectChoice[] | null>(null);
  const [subjectId, setSubjectId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // À chaque ouverture : niveau du profil, nom proposé de nouveau.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setTouched(false);
    setLevelId(defaultLevelId ?? '');
    if (!levels) getClassLevels().then((l) => setLevels(l as unknown as Level[])).catch(() => setLevels([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultLevelId]);

  useEffect(() => {
    if (!open || !levelId) { setSubjects(null); setSubjectId(''); return; }
    let cancelled = false;
    setSubjects(null);
    subjectsFor(levelId)
      .then((s) => { if (!cancelled) { setSubjects(s); setSubjectId(s[0] ? String(s[0].id) : ''); } })
      .catch(() => { if (!cancelled) { setSubjects([]); setSubjectId(''); } });
    return () => { cancelled = true; };
  }, [open, levelId]);

  const level = useMemo(() => levels?.find((l) => String(l.id) === levelId) ?? null, [levels, levelId]);
  const subject = subjects?.find((s) => String(s.id) === subjectId) ?? null;

  useEffect(() => {
    if (touched) return;
    setTitle(level && subject ? proposedTitle(subject.name, level.name, takenTitles) : '');
  }, [level, subject, touched, takenTitles]);

  const ready = Boolean(levelId && subjectId && title.trim()) && !busy;
  const twin = levelId && subjectId
    ? existing.find((n) => sameId(n.class_level?.id, levelId) && sameId(n.subject?.id, subjectId)) ?? null
    : null;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const nb = await create({ levelId, subjectId, title });
      onCreated(nb);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} labelId="nouveau-cahier-titre" onSubmit={submit}
      title="Nouveau cahier"
      subtitle="Il se remplit avec les leçons que tu y ranges, chacune dans son chapitre.">
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">Niveau</span>
          <select value={levelId} onChange={(e) => setLevelId(e.target.value)} className={fieldCls} disabled={!levels}>
            <option value="">{levels ? 'Choisis ton niveau' : 'Chargement…'}</option>
            {(levels ?? []).map((l) => <option key={l.id} value={String(l.id)}>{l.name}</option>)}
          </select>
        </label>
        <div>
          <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft" id="cahier-matiere">Matière</span>
          {subjects && subjects.length > 1 ? (
            <select aria-labelledby="cahier-matiere" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={fieldCls}>
              {subjects.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          ) : (
            <p
              className="flex min-h-11 items-center rounded-xl border border-line bg-[#fcfbf9] px-3.5 text-[14px] text-ink-soft">
              {!levelId ? <span className="text-ink-faint">Selon ton niveau</span>
                : subjects === null ? <Loader2 className="h-4 w-4 animate-spin text-ink-faint" />
                  : subject ? subject.name : <span className="text-ink-faint">Aucune matière pour ce niveau</span>}
            </p>
          )}
        </div>
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">Nom du cahier</span>
        <input value={title} maxLength={200} onChange={(e) => { setTouched(true); setTitle(e.target.value); }}
          placeholder="Ex. : Maths - 2ème Bac SM" className={fieldCls} />
      </label>

      {twin && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 rounded-xl bg-gold-soft px-3.5 py-2 text-[13px] text-ink-soft ring-1 ring-gold-line">
          <span className="min-w-0">Tu as déjà « <b className="font-semibold text-ink">{twin.title}</b> » pour ce niveau.</span>
          <Link to={`/notebooks?nb=${twin.id}`} onClick={onClose}
            className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand-hover hover:underline">
            Ouvrir <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      )}

      {error && <FormError>{error}</FormError>}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="fd-btn-ghost min-h-11 justify-center sm:min-h-10">Annuler</button>
        <button type="submit" disabled={!ready}
          className="fd-btn-primary min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookMarked className="h-4 w-4" />}
          Créer mon cahier
        </button>
      </div>
    </ModalShell>
  );
};

export default CreateNotebookModal;
