import React from 'react';
import TipTapPaginatedRenderer from './TipTapPaginatedRenderer';

interface RealPaginatedRendererProps {
  content: string;
  pageHeight?: number;
  pageWidth?: number;
  padding?: number;
}

/**
 * Professional PDF-like paginated renderer with TipTap and page awareness
 */
export const RealPaginatedRenderer: React.FC<RealPaginatedRendererProps> = ({
  content,
  pageHeight = 1122,
  pageWidth = 794,
  padding = 64,
}) => {
  return (
    <TipTapPaginatedRenderer
      content={content}
      pageHeight={pageHeight}
      pageWidth={pageWidth}
      padding={padding}
    />
  );
};

export default RealPaginatedRenderer;
