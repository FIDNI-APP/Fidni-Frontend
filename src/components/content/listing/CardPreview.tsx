/**
 * Aperçu léger d'un contenu dans une carte (listes, recherche, accueil) : début de l'énoncé et premières
 * questions numérotées, exercices d'un sujet avec leur barème, sommaire d'une leçon. Rendu du HTML du contenu
 * (formules comprises), sans les cadres ni les boutons de la page complète.
 */
import React from 'react';
import { renderContentHtml } from '@/components/editor/TipTapRenderer';
import type { ListKind, PreviewStructure } from './listingUtils';

const html = (h?: string) => ({ __html: renderContentHtml(h || '') });
const stripTags = (h?: string) => (h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** Début de l'énoncé : contexte et premières questions, numérotées comme sur la page. */
const ExercisePreview: React.FC<{ structure: PreviewStructure }> = ({ structure }) => {
  const rows: React.ReactNode[] = [];
  let q = 0;
  for (const b of structure?.blocks ?? []) {
    if (rows.length >= 4) break;
    if (b?.type === 'section') continue;
    if (b?.type === 'context') {
      if (b.content?.html) rows.push(<div key={b.id} dangerouslySetInnerHTML={html(b.content.html)} />);
      continue;
    }
    q++;
    rows.push(
      <div key={b.id} className="flex gap-1.5">
        <span className="fd-nums font-semibold text-ink-soft shrink-0">{q}.</span>
        <div className="min-w-0 flex-1">
          <div dangerouslySetInnerHTML={html(b.content?.html)} />
          {(b.subQuestions ?? []).slice(0, 2).map((sq, i) => (
            <div key={sq.id} className="flex gap-1.5">
              <span className="fd-nums text-ink-faint shrink-0">{q}.{i + 1}.</span>
              <div className="min-w-0 flex-1" dangerouslySetInnerHTML={html(sq.content?.html)} />
            </div>
          ))}
        </div>
      </div>,
    );
  }
  return <>{rows}</>;
};

/** Sujet d'examen : un exercice par ligne, avec son barème et sa première phrase. `total` : nombre de
 *  parties donné par le serveur (en mode Cartes, la structure n'en contient que le début). */
const ExamPreview: React.FC<{ structure: PreviewStructure; total?: number }> = ({ structure, total }) => {
  const parts: { id: string; title: string; points?: number; first: string }[] = [];
  for (const b of structure?.blocks ?? []) {
    if (b?.type === 'section') parts.push({ id: b.id ?? String(parts.length), title: stripTags(b.content?.html) || `Partie ${parts.length + 1}`, points: b.points, first: '' });
    else if (parts.length && !parts[parts.length - 1].first && b?.content?.html) parts[parts.length - 1].first = b.content.html;
  }
  if (!parts.length) return <ExercisePreview structure={structure} />;
  const more = Math.max(parts.length, total ?? 0) - Math.min(parts.length, 4);
  return (
    <ol className="flex flex-col gap-1.5">
      {parts.slice(0, 4).map((p) => (
        <li key={p.id} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-ink-soft truncate">{p.title}</span>
            {Number(p.points) > 0 && <span className="fd-nums text-[12px] text-ink-faint shrink-0">{String(p.points).replace('.', ',')} pts</span>}
          </div>
          {p.first && <div className="fd-preview-line text-ink-faint" dangerouslySetInnerHTML={html(p.first)} />}
        </li>
      ))}
      {more > 0 && <li className="text-[12px] text-ink-faint">+ {more} autre{more > 1 ? 's' : ''}</li>}
    </ol>
  );
};

/** Leçon : son sommaire. */
const LessonPreview: React.FC<{ structure: PreviewStructure }> = ({ structure }) => {
  const sections = (structure?.sections ?? []).filter((s) => s?.title);
  if (!sections.length) return <div dangerouslySetInnerHTML={html(structure?.sections?.[0]?.content?.html)} />;
  return (
    <ol className="flex flex-col gap-1">
      {sections.slice(0, 5).map((s, i) => (
        <li key={s.id} className="flex gap-2 min-w-0">
          <span className="fd-nums text-ink-faint shrink-0 w-4 text-right">{i + 1}</span>
          <span className="truncate text-ink-soft">{stripTags(s.title)}</span>
        </li>
      ))}
      {sections.length > 5 && <li className="pl-6 text-[12px] text-ink-faint">+ {sections.length - 5} autre{sections.length - 5 > 1 ? 's' : ''} partie{sections.length - 5 > 1 ? 's' : ''}</li>}
    </ol>
  );
};

/** « Pour toi » : pourquoi ce contenu est proposé, sans répéter le chapitre ni l'état (« À retravailler » + « À revoir »). */
/** L'aperçu qui convient au type de contenu. `total` : nombre de parties d'un sujet donné par le serveur. */
export const CardPreview: React.FC<{ structure: PreviewStructure; kind: ListKind; total?: number }> = ({ structure, kind, total }) => (
  kind === 'exam' ? <ExamPreview structure={structure} total={total} />
    : kind === 'lesson' ? <LessonPreview structure={structure} />
      : <ExercisePreview structure={structure} />
);

export default CardPreview;
