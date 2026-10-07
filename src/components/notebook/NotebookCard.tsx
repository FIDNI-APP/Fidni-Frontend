// src/components/notebook/NotebookCard.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { Notebook } from '@/types';

interface NotebookCardProps {
  notebook: Notebook;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
  /** Renommer : renvoie false si le nom est refusé (déjà pris, vide), le champ reste alors ouvert. */
  onRename?: (id: string, title: string) => Promise<boolean>;
}

const NotebookCard: React.FC<NotebookCardProps> = ({ notebook, onClick, onDelete, onRename }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notebook.title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const save = async () => {
    if (!onRename || saving) return;
    const title = draft.trim();
    if (title === notebook.title) { setEditing(false); return; }
    setSaving(true);
    const ok = await onRename(notebook.id, title);
    setSaving(false);
    if (ok) setEditing(false);
    else inputRef.current?.focus();
  };
  const total = notebook.sections?.length || 0;
  const done = notebook.sections?.filter(s => s.lesson_entries && s.lesson_entries.length > 0).length || 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div
      className="group cursor-pointer"
      onClick={() => { if (!editing) onClick(notebook.id); }}
      style={{ transition: 'transform .16s' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
    >
      <div
        className="relative flex flex-col"
        style={{
          height: 232, borderRadius: 14, overflow: 'hidden', background: '#fff',
          border: '1px solid #e7e3dc', transition: 'border-color .16s, box-shadow .16s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d8d4cc'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(20,18,16,.09)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e7e3dc'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        {/* Ink spine with binding */}
        <div
          className="absolute left-0 top-0 bottom-0 flex flex-col items-center justify-between pointer-events-none"
          style={{ width: 26, background: '#1a1a1a', padding: '18px 0' }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: 99, background: '#faf9f7', opacity: 0.32 }} />
          ))}
        </div>

        {/* Cover content */}
        <div className="flex-1 flex flex-col" style={{ padding: '18px 18px 16px 42px' }}>
          <div className="flex items-start justify-between gap-2">
            {editing ? (
              <form className="flex min-w-0 flex-1 items-center gap-1.5" onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => { e.preventDefault(); save(); }}>
                <input ref={inputRef} value={draft} maxLength={200} aria-label="Nom du cahier" disabled={saving}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setDraft(notebook.title); setEditing(false); } }}
                  className="min-w-0 flex-1 rounded-lg border border-brand bg-white px-2 py-1 text-[15px] font-bold text-ink outline-none ring-2 ring-brand/20" />
                <button type="submit" aria-label="Enregistrer le nom" disabled={saving}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-hover">
                  <Check className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }} className="line-clamp-2">
                {notebook.title}
              </h3>
            )}
            {!editing && (
            <div className="flex flex-shrink-0 items-center">
            {onRename && (
              <button
                onClick={(e) => { e.stopPropagation(); setDraft(notebook.title); setEditing(true); }}
                title="Renommer le cahier"
                aria-label="Renommer le cahier"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(notebook.id); }}
              title="Supprimer le cahier"
              aria-label="Supprimer le cahier"
              className="flex items-center justify-center flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100"
              style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: '#9a958c', cursor: 'pointer', transition: 'opacity .15s, background .14s, color .14s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#b91c1c'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9a958c'; }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            </div>
            )}
          </div>

          <div className="mt-1.5 flex flex-col gap-0.5">
            <span style={{ fontSize: 13, color: '#33302b', fontWeight: 500 }}>{notebook.subject.name}</span>
            <span style={{ fontSize: 12.5, color: '#9a958c' }}>{notebook.class_level.name}</span>
          </div>

          <div className="flex-1" />

          <div style={{ height: 6, background: '#f2f1ee', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#1a7a4a', borderRadius: 99, transition: 'width .3s' }} />
          </div>
          <div className="flex items-center justify-between mt-2" style={{ fontSize: 11.5, color: '#6b6862' }}>
            <span>Progression</span>
            <span style={{ fontWeight: 600, color: '#33302b', fontVariantNumeric: 'tabular-nums' }}>{done} / {total} leçons</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotebookCard;
