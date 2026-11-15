// Ordre des exercices d'une série (15/11/2026, Natsu : « que l'utilisateur puisse modifier l'ordre des exercices »).
// Dans « Modifier » de la page d'une série (RevisionListDetail) : ↑ ↓ partout (doigt, clavier), et glisser-déposer
// à la souris. L'ordre est enregistré avec le nom (POST /revision-lists/<id>/reorder/) ; il sert au mode révision,
// à la feuille à imprimer et au PDF.
import React, { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { t } from '@/i18n';

export interface OrdreItem { id: number; title: string; kind: string }

export const OrdreSerie: React.FC<{ items: OrdreItem[]; order: number[]; onChange: (order: number[]) => void }> = ({ items, order, onChange }) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const byId = new Map(items.map((i) => [i.id, i]));
  const rows = order.map((id) => byId.get(id)).filter((x): x is OrdreItem => !!x);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  return (
    <fieldset className="mt-5 min-w-0">
      <legend className="mb-2 text-sm font-medium text-ink-soft">{t('Ordre des exercices')}</legend>
      <ol className="space-y-1.5">
        {rows.map((it, i) => (
          <li key={it.id} draggable
            onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; }}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(e) => { if (dragIndex !== null && dragIndex !== i) { e.preventDefault(); move(dragIndex, i); setDragIndex(i); } }}
            className={`flex items-center gap-2 rounded-xl border bg-white py-1.5 ps-2 pe-1.5 text-[13.5px] transition-colors ${dragIndex === i ? 'border-brand bg-brand-soft' : 'border-line'}`}>
            <GripVertical className="hidden h-4 w-4 shrink-0 cursor-grab text-ink-faint [@media(hover:hover)]:block" aria-hidden />
            <span className="fd-nums w-5 shrink-0 text-center text-[12px] font-semibold text-ink-faint">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink" title={it.title}>{it.title}</span>
              <span className="block text-[11.5px] text-ink-faint">{it.kind}</span>
            </span>
            <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={t('Monter « {title} »', { title: it.title })}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-paper hover:text-ink disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" onClick={() => move(i, i + 1)} disabled={i === rows.length - 1} aria-label={t('Descendre « {title} »', { title: it.title })}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-paper hover:text-ink disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button>
          </li>
        ))}
      </ol>
    </fieldset>
  );
};

export default OrdreSerie;
