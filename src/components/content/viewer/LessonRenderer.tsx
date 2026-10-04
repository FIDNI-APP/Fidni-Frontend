/**
 * LessonRenderer - Render lesson content with sections/subsections
 * Read-only viewer for lesson structure
 */

import React from 'react';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import type { FlexibleLessonStructure, SectionBlock, SubSectionBlock } from '@/components/content/editor/FlexibleLessonEditor';

interface LessonRendererProps {
  structure: FlexibleLessonStructure;
}

const RenderContent: React.FC<{ html?: string; className?: string }> = ({ html, className = '' }) => {
  if (!html) return null;

  return (
    <div className={`text-ink-soft min-w-0 max-w-full ${className}`}>
      <TipTapRenderer content={html} />
    </div>
  );
};

const SubSectionRenderer: React.FC<{ subSection: SubSectionBlock; sectionIndex: number; index: number }> = ({
  subSection,
  sectionIndex,
  index,
}) => {
  return (
    <div className="mt-6">
      {subSection.title && (
        <h4 className="fd-display text-lg font-semibold text-ink-soft mb-3" style={{ letterSpacing: '-0.01em' }}
          data-outline-level="2" data-outline-num={`${sectionIndex + 1}.${index + 1}`} data-outline-title={subSection.title}>
          <span className="fd-nums">{sectionIndex + 1}.{index + 1}.</span> {subSection.title}
        </h4>
      )}
      <RenderContent html={subSection.content?.html} className="prose prose-slate" />
    </div>
  );
};

const SectionRenderer: React.FC<{ section: SectionBlock; index: number }> = ({ section, index }) => {
  return (
    <div className="mt-8 first:mt-0">
      {/* data-outline-* : repères du sommaire de la leçon (components/lesson/useLessonOutline). */}
      <h3 className="fd-display text-2xl text-ink mb-4" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}
        data-outline-level="1" data-outline-num={`${index + 1}`} data-outline-title={section.title || 'Section sans titre'}>
        <span className="fd-nums">{index + 1}.</span> {section.title || 'Section sans titre'}
      </h3>

      <RenderContent html={section.content?.html} className="prose prose-slate mb-4" />

      {section.subSections && section.subSections.length > 0 && (
        <div className="space-y-2">
          {section.subSections.map((subSection, idx) => (
            <SubSectionRenderer
              key={subSection.id}
              subSection={subSection}
              sectionIndex={index}
              index={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LessonRenderer: React.FC<LessonRendererProps> = ({ structure }) => {
  if (!structure || !structure.sections || structure.sections.length === 0) {
    return (
      <div className="text-center text-ink-faint py-12">
        <p>Aucune section à afficher pour le moment.</p>
      </div>
    );
  }

  return (
    <div>
      {structure.sections.map((section, index) => (
        <SectionRenderer key={section.id} section={section} index={index} />
      ))}
    </div>
  );
};
