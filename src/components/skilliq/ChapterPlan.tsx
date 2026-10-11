// Liste repliée des chapitres d'un niveau, rangés par sous-domaine (« Chapitres prévus », « Bientôt »).
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { bySubfield, type QuizChapter } from './types';

export const ChapterPlan: React.FC<{ title: React.ReactNode; meta?: React.ReactNode; chapters: QuizChapter[]; className?: string }> = ({
  title, meta, chapters, className = '',
}) => {
  const groups = bySubfield(chapters);
  return (
    <details className={`group rounded-2xl border border-line bg-white ${className}`}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 text-[13.5px] text-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:px-5 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-open:rotate-90" aria-hidden />
        <span className="min-w-0 flex-1"><b className="font-semibold text-ink">{title}</b>{meta && <> · {meta}</>}</span>
        <span className="fd-nums shrink-0 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[12px] font-semibold text-ink-faint">{chapters.length}</span>
      </summary>
      <div className="grid gap-x-8 gap-y-5 border-t border-line px-4 py-4 sm:grid-cols-2 sm:px-5">
        {groups.map(([name, list]) => (
          <div key={name} className="min-w-0">
            <h3 className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{name}</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {list.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-[13.5px] leading-snug text-ink-soft">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#d8d4cc]" aria-hidden />
                  {c.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
};
