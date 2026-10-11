/**
 * Leçon en lecture (page d'une leçon, 11/10/2026) : une vraie feuille de cours. Parties numérotées (numéro en
 * or, titre serif, un filet entre deux parties), sous-parties, encadrés typés (Définition, Théorème,
 * Propriété, Exemple, Méthode, Attention : couleurs dans ReadingStyles), texte à 16,5 px.
 * Les repères data-outline-* alimentent le sommaire (components/lesson/useLessonOutline), comme LessonRenderer
 * (qui garde son rendu pour les cahiers, les listes et les aperçus).
 */
import React from 'react';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import type { FlexibleLessonStructure } from '@/components/content/editor/FlexibleLessonEditor';

export const LessonReader: React.FC<{ structure?: FlexibleLessonStructure }> = ({ structure }) => {
  const sections = structure?.sections ?? [];
  if (sections.length === 0) {
    return <p className="py-10 text-center text-[14.5px] text-ink-faint">Cette leçon n’a pas encore de contenu.</p>;
  }
  return (
    <div className="fd-lesson">
      {sections.map((section, i) => {
        const title = section.title || 'Partie sans titre';
        return (
          <section key={section.id} className={i === 0 ? '' : 'mt-12 border-t border-line pt-10 sm:mt-14 sm:pt-12'}>
            <h2 className="fd-display flex items-baseline gap-3 text-ink" style={{ fontSize: 'clamp(22px, 2.6vw, 27px)', lineHeight: 1.2 }}
              data-outline-level="1" data-outline-num={`${i + 1}`} data-outline-title={title}>
              <span className="shrink-0 text-gold fd-nums">{i + 1}.</span>
              <span className="min-w-0">{title}</span>
            </h2>
            {section.content?.html && (
              <div className="mt-4 min-w-0"><TipTapRenderer content={section.content.html} /></div>
            )}
            {(section.subSections ?? []).map((sub, j) => (
              <div key={sub.id} className="mt-9">
                {sub.title && (
                  <h3 className="fd-display flex items-baseline gap-2.5 text-[19px] leading-snug text-ink sm:text-[20px]"
                    data-outline-level="2" data-outline-num={`${i + 1}.${j + 1}`} data-outline-title={sub.title}>
                    <span className="shrink-0 text-[15px] font-semibold text-ink-faint fd-nums" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>{i + 1}.{j + 1}</span>
                    <span className="min-w-0">{sub.title}</span>
                  </h3>
                )}
                {sub.content?.html && <div className="mt-3 min-w-0"><TipTapRenderer content={sub.content.html} /></div>}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
};

export default LessonReader;
