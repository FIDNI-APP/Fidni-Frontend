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
    <div className={`text-slate-700 min-w-0 max-w-full ${className}`}>
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
        <h4 className="text-lg font-semibold text-slate-800 mb-3">
          {sectionIndex + 1}.{index + 1}. {subSection.title}
        </h4>
      )}
      <RenderContent html={subSection.content?.html} className="prose prose-slate" />
    </div>
  );
};

const SectionRenderer: React.FC<{ section: SectionBlock; index: number }> = ({ section, index }) => {
  return (
    <div className="mt-8 first:mt-0">
      <h3 className="text-2xl font-bold text-slate-900 mb-4">
        {index + 1}. {section.title || 'Section sans titre'}
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
      <div className="text-center text-slate-400 py-12">
        <p>Aucune section à afficher</p>
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
