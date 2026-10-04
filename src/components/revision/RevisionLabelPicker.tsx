// Étiquettes facultatives d'une liste de révision : niveau, matière, chapitres.
// Elles servent à filtrer la page Révisions ; la taxonomie est chargée une seule fois.
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Tag } from 'lucide-react';
import { api } from '@/lib/api/apiClient';

export interface TaxChapter { id: number; name: string }
export interface TaxSubject { id: number; name: string; chapters: TaxChapter[] }
export interface TaxLevel { id: number; name: string; subjects: TaxSubject[] }

let cache: Promise<TaxLevel[]> | null = null;
export function loadTaxonomy(): Promise<TaxLevel[]> {
  if (!cache) {
    cache = api.get('/class-levels/?include_taxonomy=true')
      .then((r) => (r.data?.results || r.data || []) as TaxLevel[])
      .catch((e) => { cache = null; throw e; });
  }
  return cache;
}

export function useTaxonomy() {
  const [levels, setLevels] = useState<TaxLevel[]>([]);
  useEffect(() => {
    let alive = true;
    loadTaxonomy().then((l) => { if (alive) setLevels(l); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return levels;
}

export interface RevisionLabels { levelId: number | null; subjectId: number | null; chapterIds: number[] }
export const EMPTY_LABELS: RevisionLabels = { levelId: null, subjectId: null, chapterIds: [] };

/** Étiquettes → champs de l'API. */
export const labelsToPayload = (l: RevisionLabels) => ({
  class_level_ids: l.levelId ? [l.levelId] : [],
  subject_ids: l.subjectId ? [l.subjectId] : [],
  chapter_ids: l.chapterIds,
});

const chip = (on: boolean) =>
  `inline-flex items-center gap-1 max-w-full rounded-full border px-2.5 py-1 text-[12.5px] transition-colors ${
    on ? 'border-brand bg-brand-soft text-brand-hover font-semibold' : 'border-line bg-white text-ink-soft hover:border-ink-faint'}`;

export const RevisionLabelPicker: React.FC<{ value: RevisionLabels; onChange: (v: RevisionLabels) => void }> = ({ value, onChange }) => {
  const levels = useTaxonomy();
  const level = levels.find((l) => l.id === value.levelId);
  const subjects = useMemo(() => (level?.subjects ?? []).filter((s) => s.chapters.length), [level]);
  const chapters = useMemo(() => {
    const src = value.subjectId ? subjects.filter((s) => s.id === value.subjectId) : subjects;
    const seen = new Set<number>();
    return src.flatMap((s) => s.chapters).filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  }, [subjects, value.subjectId]);

  const toggleChapter = (id: number) => onChange({
    ...value, chapterIds: value.chapterIds.includes(id) ? value.chapterIds.filter((x) => x !== id) : [...value.chapterIds, id],
  });

  return (
    <div className="rounded-xl border border-line bg-paper px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
        <Tag className="h-3.5 w-3.5" /> Étiquettes <span className="font-normal text-ink-faint">(facultatif, pour filtrer tes listes)</span>
      </p>

      <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Niveau">
        {levels.map((l) => (
          <button key={l.id} type="button" className={chip(l.id === value.levelId)}
            onClick={() => onChange(l.id === value.levelId ? EMPTY_LABELS : { levelId: l.id, subjectId: null, chapterIds: [] })}>
            {l.id === value.levelId && <Check className="h-3 w-3" />}{l.name}
          </button>
        ))}
      </div>

      {level && subjects.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Matière">
          {subjects.map((s) => (
            <button key={s.id} type="button" className={chip(s.id === value.subjectId)}
              onClick={() => onChange({ ...value, subjectId: s.id === value.subjectId ? null : s.id, chapterIds: [] })}>
              {s.id === value.subjectId && <Check className="h-3 w-3" />}{s.name}
            </button>
          ))}
        </div>
      )}

      {level && chapters.length > 0 && (
        <div className="mt-2.5">
          <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[.06em] text-ink-faint">Chapitres</p>
          <div className="flex max-h-[150px] flex-wrap gap-1.5 overflow-y-auto pr-1">
            {chapters.map((c) => {
              const on = value.chapterIds.includes(c.id);
              return (
                <button key={c.id} type="button" className={chip(on)} onClick={() => toggleChapter(c.id)} aria-pressed={on}>
                  {on && <Check className="h-3 w-3 shrink-0" />}<span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisionLabelPicker;

/** Étiquettes proposées d'après un exercice : son niveau, sa matière, ses chapitres. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const labelsFromContent = (c: any): RevisionLabels => ({
  levelId: c?.class_levels?.[0]?.id != null ? Number(c.class_levels[0].id) : null,
  subjectId: c?.subject?.id != null ? Number(c.subject.id) : null,
  chapterIds: (c?.chapters || []).map((ch: { id: number | string }) => Number(ch.id)).filter((n: number) => !Number.isNaN(n)),
});
