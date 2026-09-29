// src/components/notebook/NotebookCard.tsx
import React from 'react';
import { Trash2 } from 'lucide-react';
import { Notebook } from '@/types';

interface NotebookCardProps {
  notebook: Notebook;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotebookCard: React.FC<NotebookCardProps> = ({ notebook, onClick, onDelete }) => {
  const total = notebook.sections?.length || 0;
  const done = notebook.sections?.filter(s => s.lesson_entries && s.lesson_entries.length > 0).length || 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div
      className="group cursor-pointer"
      onClick={() => onClick(notebook.id)}
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
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }} className="line-clamp-2">
              {notebook.title}
            </h3>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(notebook.id); }}
              title="Supprimer le cahier"
              className="flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100"
              style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: '#9a958c', cursor: 'pointer', transition: 'opacity .15s, background .14s, color .14s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#b91c1c'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9a958c'; }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
