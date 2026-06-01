/**
 * Cascading taxonomy picker for the concours admin.
 *
 *  Subject ─▶ Subfield ─▶ Chapter ─▶ Tip
 *
 * - Each select is populated with names (not IDs).
 * - Selecting a parent clears children & refetches.
 * - Selecting nothing on a parent leaves children empty (no orphan options).
 * - Tip select can additionally be filtered by `concoursType` from the parent
 *   exam, so a med-only tip won't appear inside an ENSA question.
 */
import { useEffect, useState } from 'react';
import {
  getAllSubjects, getSubfieldsForSubject,
  getChaptersForSubject, getChaptersForSubfield,
} from '@/lib/api/hierarchyApi';
import { listConcoursTips, type ConcoursTip, type ConcoursType } from '@/lib/api/concoursApi';
import type { SubjectModel, ChapterModel, Subfield } from '@/types';

export interface TaxonomySelection {
  subjectId: number | null;
  subfieldId: number | null;
  chapterId: number | null;
  tipId: number | null;
}

interface Props {
  value: TaxonomySelection;
  onChange: (v: TaxonomySelection) => void;
  concoursType?: ConcoursType;            // for filtering relevant tips
  showChapter?: boolean;                   // hide the chapter select (e.g. when caller renders multi-chapter picker)
  showTip?: boolean;                       // hide the tip select when not needed
  layout?: 'grid' | 'stack';
  compact?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #e4e2f5',
  borderRadius: 10,
  fontSize: 13,
  fontFamily: 'DM Sans',
  color: '#1e1b4b',
  background: '#f9f8ff',
  outline: 'none',
};

export function TaxonomyPicker({
  value, onChange,
  concoursType,
  showChapter = true,
  showTip = true,
  layout = 'grid',
  compact = false,
}: Props) {
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [subfields, setSubfields] = useState<Subfield[]>([]);
  const [chapters, setChapters] = useState<ChapterModel[]>([]);
  const [tips, setTips] = useState<ConcoursTip[]>([]);

  // Initial subjects load
  useEffect(() => {
    (async () => {
      try { setSubjects(await getAllSubjects()); }
      catch (e) { console.error('Failed to load subjects', e); }
    })();
  }, []);

  // Subfields when subject changes
  useEffect(() => {
    if (!value.subjectId) { setSubfields([]); return; }
    (async () => {
      try { setSubfields(await getSubfieldsForSubject(value.subjectId!)); }
      catch (e) { console.error('Failed to load subfields', e); setSubfields([]); }
    })();
  }, [value.subjectId]);

  // Chapters when subfield (or just subject) changes
  useEffect(() => {
    if (!value.subjectId) { setChapters([]); return; }
    (async () => {
      try {
        const data = value.subfieldId
          ? await getChaptersForSubfield(value.subjectId!, value.subfieldId)
          : await getChaptersForSubject(value.subjectId!);
        setChapters(data);
      } catch (e) { console.error('Failed to load chapters', e); setChapters([]); }
    })();
  }, [value.subjectId, value.subfieldId]);

  // Tips when chapter changes
  useEffect(() => {
    if (!showTip) { setTips([]); return; }
    if (!value.chapterId) { setTips([]); return; }
    (async () => {
      try {
        const params: any = { chapter: value.chapterId };
        if (concoursType) params.concours_type = concoursType;
        setTips(await listConcoursTips(params));
      } catch (e) { console.error('Failed to load tips', e); setTips([]); }
    })();
  }, [value.chapterId, concoursType, showTip]);

  const set = (patch: Partial<TaxonomySelection>) => onChange({ ...value, ...patch });

  // When the parent changes, clear the dependent fields.
  const onSubjectChange = (id: number | null) => set({
    subjectId: id, subfieldId: null, chapterId: null, tipId: null,
  });
  const onSubfieldChange = (id: number | null) => set({
    subfieldId: id, chapterId: null, tipId: null,
  });
  const onChapterChange = (id: number | null) => set({
    chapterId: id, tipId: null,
  });
  const onTipChange = (id: number | null) => set({ tipId: id });

  // Tailwind doesn't pick up dynamically-built class names so we map explicitly
  const visibleCols = 1 + (showChapter ? 1 : 0) + (showTip ? 1 : 0) + 1;
  const colClass = ({
    2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4',
  } as Record<number, string>)[visibleCols] || 'md:grid-cols-4';
  const wrapperClass = layout === 'grid'
    ? `grid grid-cols-1 ${colClass} gap-3`
    : 'flex flex-col gap-3';

  return (
    <div className={wrapperClass}>
      <FieldGroup label="Matière" compact={compact}>
        <select
          value={value.subjectId ?? ''}
          onChange={(e) => onSubjectChange(e.target.value ? Number(e.target.value) : null)}
          style={inputStyle}
        >
          <option value="">— Choisir —</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </FieldGroup>

      <FieldGroup label="Domaine" compact={compact}>
        <select
          value={value.subfieldId ?? ''}
          onChange={(e) => onSubfieldChange(e.target.value ? Number(e.target.value) : null)}
          disabled={!value.subjectId || subfields.length === 0}
          style={{ ...inputStyle, opacity: !value.subjectId || subfields.length === 0 ? .5 : 1 }}
        >
          <option value="">
            {!value.subjectId ? 'Sélectionne une matière' : subfields.length === 0 ? 'Aucun domaine' : '— Tous —'}
          </option>
          {subfields.map(sf => <option key={sf.id} value={sf.id}>{sf.name}</option>)}
        </select>
      </FieldGroup>

      {showChapter && (
        <FieldGroup label="Chapitre" compact={compact}>
          <select
            value={value.chapterId ?? ''}
            onChange={(e) => onChapterChange(e.target.value ? Number(e.target.value) : null)}
            disabled={!value.subjectId || chapters.length === 0}
            style={{ ...inputStyle, opacity: !value.subjectId || chapters.length === 0 ? .5 : 1 }}
          >
            <option value="">
              {!value.subjectId ? 'Sélectionne une matière' : chapters.length === 0 ? 'Aucun chapitre' : '— Tous —'}
            </option>
            {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FieldGroup>
      )}

      {showTip && (
        <FieldGroup label="Astuce" compact={compact}>
          <select
            value={value.tipId ?? ''}
            onChange={(e) => onTipChange(e.target.value ? Number(e.target.value) : null)}
            disabled={!value.chapterId}
            style={{ ...inputStyle, opacity: !value.chapterId ? .5 : 1 }}
          >
            <option value="">
              {!value.chapterId ? 'Sélectionne un chapitre' : tips.length === 0 ? 'Aucune astuce' : '— Aucune —'}
            </option>
            {tips.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </FieldGroup>
      )}
    </div>
  );
}

function FieldGroup({ label, children, compact }: {
  label: string; children: React.ReactNode; compact?: boolean;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: compact ? 0 : 4 }}>
      <span style={{ fontSize: 11, color: '#7068a8', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

/* ─────────────────── Multi-chapter picker (for tips) ─────────────────── */

interface MultiChapterPickerProps {
  subjectId: number | null;
  subfieldId: number | null;
  chapterIds: number[];
  onChange: (ids: number[]) => void;
}

/**
 * Multi-select chapter list — shown as checkboxes once a subject is chosen.
 * Used by the tip editor (a tip can apply to several chapters).
 */
export function MultiChapterPicker({
  subjectId, subfieldId, chapterIds, onChange,
}: MultiChapterPickerProps) {
  const [chapters, setChapters] = useState<ChapterModel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subjectId) { setChapters([]); return; }
    (async () => {
      try {
        setLoading(true);
        const data = subfieldId
          ? await getChaptersForSubfield(subjectId, subfieldId)
          : await getChaptersForSubject(subjectId);
        setChapters(data);
        // Drop any selected chapters that no longer belong to the chosen subfield/subject
        const valid = new Set(data.map(c => Number(c.id)));
        const filtered = chapterIds.filter(id => valid.has(id));
        if (filtered.length !== chapterIds.length) onChange(filtered);
      } catch (e) {
        console.error(e); setChapters([]);
      } finally { setLoading(false); }
    })();
  }, [subjectId, subfieldId]);

  const toggle = (id: number) => {
    if (chapterIds.includes(id)) onChange(chapterIds.filter(x => x !== id));
    else onChange([...chapterIds, id]);
  };

  if (!subjectId) {
    return (
      <p style={{ fontSize: 12, color: '#9391b8', fontStyle: 'italic' }}>
        Sélectionne d'abord une matière.
      </p>
    );
  }
  if (loading) return <p style={{ fontSize: 12, color: '#9391b8' }}>Chargement…</p>;
  if (chapters.length === 0) {
    return <p style={{ fontSize: 12, color: '#9391b8', fontStyle: 'italic' }}>Aucun chapitre disponible.</p>;
  }

  return (
    <div
      className="flex flex-wrap gap-1.5"
      style={{
        background: '#f9f8ff', border: '1.5px solid #e4e2f5',
        borderRadius: 10, padding: 10, maxHeight: 200, overflowY: 'auto',
      }}
    >
      {chapters.map(c => {
        const cid = Number(c.id);
        const checked = chapterIds.includes(cid);
        return (
          <button
            type="button"
            key={c.id}
            onClick={() => toggle(cid)}
            style={{
              padding: '5px 12px', borderRadius: 99,
              border: `1.5px solid ${checked ? '#4f46e5' : '#e4e2f5'}`,
              background: checked ? '#4f46e5' : '#fff',
              color: checked ? '#fff' : '#7068a8',
              fontSize: 12, fontWeight: checked ? 600 : 500,
              cursor: 'pointer', transition: 'all .15s',
            }}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
