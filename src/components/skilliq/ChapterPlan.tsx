// Liste repliée des chapitres d'un niveau, numérotés dans l'ordre du programme (« Chapitres prévus »).
import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { QuizChapter } from './types';

export const ChapterPlan: React.FC<{ title: React.ReactNode; meta?: React.ReactNode; chapters: QuizChapter[]; className?: string }> = ({
  title, meta, chapters, className = '',
}) => (
  <details className={`group rounded-2xl border border-line bg-white ${className}`}>
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 text-[13.5px] text-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:px-5 [&::-webkit-details-marker]:hidden">
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-open:rotate-90 rtl:rotate-180" aria-hidden />
      <span className="min-w-0 flex-1"><b className="font-semibold text-ink">{title}</b>{meta && <> · {meta}</>}</span>
      <span className="fd-nums shrink-0 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[12px] font-semibold text-ink-faint">{chapters.length}</span>
    </summary>
    {/* Deux colonnes qui se lisent de haut en bas : l'ordre du programme reste lisible. */}
    <ol className="gap-x-8 border-t border-line px-4 py-4 sm:columns-2 sm:px-5">
      {chapters.map((c, i) => (
        <li key={c.id} className="flex break-inside-avoid items-baseline gap-3 py-1 text-[13.5px] leading-snug text-ink-soft">
          <span className="fd-nums w-5 shrink-0 text-[12.5px] font-semibold text-ink-faint" aria-hidden>{i + 1}</span>
          {c.name}
        </li>
      ))}
    </ol>
  </details>
);
