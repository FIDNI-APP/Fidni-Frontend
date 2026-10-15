/**
 * Leçon en lecture (page d'une leçon) : la mise en forme de la leçon imprimée (PaperExport). Police de LaTeX
 * (lib/paperFont), parties I, II… et sous-parties 1, 2… numérotées en vert, encadrés fins (Définition,
 * Théorème, Propriété, Exemple, Méthode, Attention : styles `.fd-lesson` dans ReadingStyles).
 * Les repères data-outline-* alimentent le sommaire (components/lesson/useLessonOutline), comme LessonRenderer
 * (qui garde son rendu pour les cahiers, les listes et les aperçus).
 */
import React from 'react';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import type { FlexibleLessonStructure } from '@/components/content/editor/FlexibleLessonEditor';
import { ROMAN } from '@/lib/paperFont';
import { t } from '@/i18n';

export const LessonReader: React.FC<{ structure?: FlexibleLessonStructure }> = ({ structure }) => {
  const sections = structure?.sections ?? [];
  if (sections.length === 0) {
    return <p className="py-10 text-center text-[14.5px] text-ink-faint">{t('Cette leçon n’a pas encore de contenu.')}</p>;
  }
  return (
    <div className="fd-lesson">
      {sections.map((section, i) => {
        const title = section.title || t('Partie sans titre');
        const num = ROMAN[i] || String(i + 1);
        return (
          <section key={section.id} className={i === 0 ? '' : 'mt-9 sm:mt-11'}>
            <h2 className="fd-lesson-h2" data-outline-level="1" data-outline-num={num} data-outline-title={title}>
              <span className="fd-lesson-num">{num}.</span> {title}
            </h2>
            {section.content?.html && (
              <div className="mt-2.5 min-w-0"><TipTapRenderer content={section.content.html} /></div>
            )}
            {(section.subSections ?? []).map((sub, j) => (
              <div key={sub.id} className="fd-lesson-sub mt-6 sm:mt-7">
                {sub.title && (
                  <h3 className="fd-lesson-h3" data-outline-level="2" data-outline-num={`${num}.${j + 1}`} data-outline-title={sub.title}>
                    <span className="fd-lesson-num">{j + 1}.</span> {sub.title}
                  </h3>
                )}
                {sub.content?.html && <div className="mt-2 min-w-0"><TipTapRenderer content={sub.content.html} /></div>}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
};

export default LessonReader;
