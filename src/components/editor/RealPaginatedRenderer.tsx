import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TipTapRenderer from './TipTapRenderer';

interface RealPaginatedRendererProps {
  content: string;
  pageHeight?: number; // in px
  pageWidth?: number; // in px
  padding?: number; // in px
}

/**
 * Real paginated renderer with automatic content splitting
 * Splits content across multiple pages based on actual height
 * Uses TipTapRenderer for proper LaTeX rendering
 */
export const RealPaginatedRenderer: React.FC<RealPaginatedRendererProps> = ({
  content,
  pageHeight = 700,   // Reduced from 1000px for better UX
  pageWidth = 900,
  padding = 24
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Split content into pages based on actual rendered height
  useEffect(() => {
    if (!content) {
      setPages([]);
      return;
    }

    // Create a temporary container to measure content
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.width = `${pageWidth - 2 * padding}px`;
    tempContainer.style.fontFamily = '"Latin Modern Roman", "Computer Modern", "CMU Serif", serif';
    tempContainer.style.fontSize = '11pt';
    tempContainer.style.lineHeight = '1.6';
    tempContainer.innerHTML = content;
    document.body.appendChild(tempContainer);

    const maxHeight = pageHeight - 2 * padding;
    const splitPages: string[] = [];

    // Get all child nodes
    const children = Array.from(tempContainer.children);

    if (children.length === 0) {
      // No children, just use the content as-is
      splitPages.push(content);
    } else {
      let currentPageContent: HTMLElement[] = [];
      let currentHeight = 0;

      for (const child of children) {
        const childClone = child.cloneNode(true) as HTMLElement;
        const childHeight = (child as HTMLElement).offsetHeight;

        // Check if adding this element would exceed page height
        if (currentHeight + childHeight > maxHeight && currentPageContent.length > 0) {
          // Create a new page with current content
          const pageDiv = document.createElement('div');
          currentPageContent.forEach(el => pageDiv.appendChild(el));
          splitPages.push(pageDiv.innerHTML);

          // Start new page with current element
          currentPageContent = [childClone];
          currentHeight = childHeight;
        } else {
          // Add to current page
          currentPageContent.push(childClone);
          currentHeight += childHeight;
        }
      }

      // Add remaining content as last page
      if (currentPageContent.length > 0) {
        const pageDiv = document.createElement('div');
        currentPageContent.forEach(el => pageDiv.appendChild(el));
        splitPages.push(pageDiv.innerHTML);
      }
    }

    document.body.removeChild(tempContainer);
    setPages(splitPages.length > 0 ? splitPages : [content]);
    setCurrentPage(0);
    setIsReady(true);
  }, [content, pageHeight, pageWidth, padding]);

  const goToPage = (pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < pages.length) {
      setCurrentPage(pageIndex);
    }
  };

  if (pages.length === 0 || !isReady) {
    return <div className="text-center py-8 text-gray-500">Chargement...</div>;
  }

  return (
    <div className="w-full">
      {/* Cleaner, more compact navigation */}
      {pages.length > 1 && (
        <div className="flex items-center justify-between mb-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-gray-200"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>

          <span className="text-sm text-gray-600">
            Page <span className="font-semibold text-gray-900">{currentPage + 1}</span> / {pages.length}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === pages.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-gray-200"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page content with TipTap renderer for proper LaTeX */}
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
        style={{
          minHeight: `${pageHeight}px`,
          maxHeight: `${pageHeight}px`
        }}
      >
        <div
          ref={contentRef}
          style={{
            padding: `${padding}px`,
            minHeight: `${pageHeight}px`,
            maxHeight: `${pageHeight}px`,
            overflow: 'auto'
          }}
        >
          {/* Use TipTapRenderer for proper LaTeX rendering */}
          <TipTapRenderer
            content={pages[currentPage] || ''}
            compact={true}
            className="text-base"
          />
        </div>
      </div>
    </div>
  );
};

export default RealPaginatedRenderer;
