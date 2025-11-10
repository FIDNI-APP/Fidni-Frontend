import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RealPaginatedRendererProps {
  content: string;
  pageHeight?: number; // in px
  pageWidth?: number; // in px
  padding?: number; // in px
}

/**
 * Real paginated renderer with automatic content splitting
 * Splits content across multiple pages based on actual height
 */
export const RealPaginatedRenderer: React.FC<RealPaginatedRendererProps> = ({
  content,
  pageHeight = 1000,  // Taller pages
  pageWidth = 900,    // Wider for better screen usage
  padding = 20        // Minimal padding
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
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
  }, [content, pageHeight, pageWidth, padding]);

  const goToPage = (pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < pages.length) {
      setCurrentPage(pageIndex);
    }
  };

  if (pages.length === 0) {
    return <div className="text-center py-8 text-gray-500">Chargement...</div>;
  }

  return (
    <div className="w-full">
      {/* Navigation controls */}
      {pages.length > 1 && (
        <div className="flex items-center justify-between mb-6 px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-purple-700 bg-white rounded-lg hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-purple-900">
              Page <span className="font-bold text-lg">{currentPage + 1}</span> sur{' '}
              <span className="font-bold text-lg">{pages.length}</span>
            </span>
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === pages.length - 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-purple-700 bg-white rounded-lg hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page content */}
      <div className="relative bg-white"
        style={{
          minHeight: `${pageHeight}px`
        }}
      >
        {/* Page number */}
        <div className="absolute top-2 right-4 text-xs text-gray-400 font-medium">
          {currentPage + 1} / {pages.length}
        </div>

        {/* Content with overflow hidden */}
        <div
          ref={contentRef}
          className="prose prose-lg max-w-none"
          style={{
            padding: `${padding}px`,
            minHeight: `${pageHeight}px`,
            overflow: 'hidden',
            fontFamily: '"Latin Modern Roman", "Computer Modern", "CMU Serif", Georgia, serif',
            fontSize: '11pt',
            lineHeight: '1.6',
            color: '#1a1a1a'
          }}
          dangerouslySetInnerHTML={{ __html: pages[currentPage] || '' }}
        />
      </div>
    </div>
  );
};

export default RealPaginatedRenderer;
