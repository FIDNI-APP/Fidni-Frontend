import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import TipTapRenderer from './TipTapRenderer';

interface RealPaginatedRendererProps {
  content: string;
  pageHeight?: number; // in px
  pageWidth?: number; // in px
  padding?: number; // in px
}

/**
 * Professional PDF-like paginated renderer with enhanced UX
 * Splits content across multiple pages based on actual height
 * Uses TipTapRenderer for proper LaTeX rendering
 */
export const RealPaginatedRenderer: React.FC<RealPaginatedRendererProps> = ({
  content,
  pageHeight = 1000,
  pageWidth = 900,
  padding = 48
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const contentRef = useRef<HTMLDivElement>(null);

  // Split content into pages based on actual rendered TipTap height
  useEffect(() => {
    if (!content) {
      setPages([]);
      return;
    }

    const paginateContent = async () => {
      // Parse TipTap content
      let parsedContent;
      try {
        if (typeof content === 'string' && content.trim().startsWith('{')) {
          parsedContent = JSON.parse(content);
        } else {
          // HTML fallback - single page
          setPages([content]);
          setIsReady(true);
          return;
        }
      } catch (e) {
        setPages([content]);
        setIsReady(true);
        return;
      }

      if (!parsedContent.content || parsedContent.content.length === 0) {
        setPages([content]);
        setIsReady(true);
        return;
      }

      const allNodes = parsedContent.content;
      const maxContentHeight = pageHeight - 2 * padding;
      const splitPages: any[] = [];
      let currentPageNodes: any[] = [];
      let currentHeight = 0;

      // Measure each node using TipTapRenderer
      for (let i = 0; i < allNodes.length; i++) {
        const nodeHeight = await new Promise<number>((resolve) => {
          const nodeContent = JSON.stringify({
            type: 'doc',
            content: [allNodes[i]]
          });

          // Create div for measurement
          const measureDiv = document.createElement('div');
          measureDiv.style.position = 'absolute';
          measureDiv.style.top = '-99999px';
          measureDiv.style.width = `${pageWidth - 2 * padding}px`;
          measureDiv.style.visibility = 'hidden';
          document.body.appendChild(measureDiv);

          // Render TipTapRenderer to measure
          ReactDOM.render(
            <TipTapRenderer
              content={nodeContent}
              compact={true}
              className="text-base leading-relaxed"
              onReady={() => {
                // Measure AFTER render complete
                const height = measureDiv.offsetHeight;

                // Clean up
                ReactDOM.unmountComponentAtNode(measureDiv);
                document.body.removeChild(measureDiv);

                resolve(height);
              }}
            />,
            measureDiv
          );
        });

        // Check if adding this node exceeds page height
        if (currentHeight + nodeHeight > maxContentHeight && currentPageNodes.length > 0) {
          // Save current page
          splitPages.push({
            type: 'doc',
            content: currentPageNodes
          });
          // Start new page
          currentPageNodes = [allNodes[i]];
          currentHeight = nodeHeight;
        } else {
          // Add to current page
          currentPageNodes.push(allNodes[i]);
          currentHeight += nodeHeight;
        }
      }

      // Add remaining nodes
      if (currentPageNodes.length > 0) {
        splitPages.push({
          type: 'doc',
          content: currentPageNodes
        });
      }

      // Convert to JSON strings
      const pageStrings = splitPages.map(page => JSON.stringify(page));
      setPages(pageStrings.length > 0 ? pageStrings : [content]);
      setCurrentPage(0);
      setIsReady(true);
    };

    paginateContent();
  }, [content, pageHeight, pageWidth, padding]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 0) {
        setCurrentPage(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentPage < pages.length - 1) {
        setCurrentPage(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, pages.length]);

  const goToPage = (pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < pages.length) {
      setCurrentPage(pageIndex);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 70));

  if (pages.length === 0 || !isReady) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement du document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-900 p-8' : 'h-screen overflow-hidden'}`}>
      <div className="max-w-5xl mx-auto h-full flex flex-col">
        {/* Enhanced Toolbar */}
        <div className="flex items-center justify-between mb-6 px-4 py-3 bg-white rounded-lg shadow-md border border-gray-200">
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-2 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-sm"
              title="Page précédente (←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
              <input
                type="number"
                min="1"
                max={pages.length}
                value={currentPage + 1}
                onChange={(e) => {
                  const page = parseInt(e.target.value) - 1;
                  if (page >= 0 && page < pages.length) {
                    setCurrentPage(page);
                  }
                }}
                className="w-12 text-center text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">/ {pages.length}</span>
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === pages.length - 1}
              className="p-2 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-sm"
              title="Page suivante (→)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-6">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600">
              {Math.round(((currentPage + 1) / pages.length) * 100)}%
            </span>
          </div>

          {/* Zoom & Fullscreen Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all hover:shadow-sm"
              title="Zoom arrière"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-gray-600 min-w-[3rem] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all hover:shadow-sm"
              title="Zoom avant"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all hover:shadow-sm"
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Main Layout: Thumbnails on left, content on right */}
        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Left Sidebar: Page thumbnails (scrollable) */}
          {pages.length > 1 && (
            <div className="flex-shrink-0">
              <div
                className="sticky top-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                style={{ maxHeight: `${pageHeight}px` }}
              >
                <div className="flex flex-col gap-3">
                  {pages.map((pageContent, index) => {
                    // Calculate thumbnail dimensions to match page aspect ratio
                    const thumbnailWidth = 80;
                    const thumbnailHeight = Math.round((thumbnailWidth * pageHeight) / pageWidth);
                    const scale = thumbnailWidth / pageWidth;

                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentPage(index)}
                        className={`relative flex-shrink-0 rounded border-2 transition-all hover:scale-105 overflow-hidden ${
                          index === currentPage
                            ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-200'
                            : 'border-gray-300 hover:border-gray-400 opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          width: `${thumbnailWidth}px`,
                          height: `${thumbnailHeight}px`,
                          background: 'linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%)',
                        }}
                      >
                        {/* Miniature preview of page content */}
                        <div
                          className="absolute top-0 left-0 pointer-events-none bg-white overflow-hidden"
                          style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            width: `${pageWidth}px`,
                            height: `${pageHeight}px`,
                          }}
                        >
                          <div
                            style={{
                              padding: `${padding}px`,
                              height: `${pageHeight}px`,
                              overflow: 'hidden',
                            }}
                          >
                            <TipTapRenderer
                              content={pageContent}
                              compact={true}
                              className="text-base leading-relaxed"
                            />
                          </div>
                        </div>
                        {/* Page number overlay */}
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] px-1 py-0.5 rounded">
                          {index + 1}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Right: PDF-like Page Container with beautiful shadows */}
          <div className="flex-1 flex justify-center">
            <div
              className="transition-all duration-300 ease-out"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center'
              }}
            >
              {/* Paper-like page with realistic shadows */}
              <div
                className="bg-white rounded-sm overflow-hidden relative group"
                style={{
                  width: `${pageWidth}px`,
                  minHeight: `${pageHeight}px`,
                  boxShadow: `
                    0 2px 4px rgba(0, 0, 0, 0.05),
                    0 4px 8px rgba(0, 0, 0, 0.08),
                    0 8px 16px rgba(0, 0, 0, 0.08),
                    0 16px 32px rgba(0, 0, 0, 0.08)
                  `
                }}
              >
                {/* Subtle paper texture overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
                     style={{
                       backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.05\'/%3E%3C/svg%3E")'
                     }}
                />

                {/* Page number watermark */}
                {pages.length > 1 && (
                  <div className="absolute bottom-8 right-12 text-gray-400 text-sm font-medium select-none">
                    {currentPage + 1}
                  </div>
                )}

                {/* Content - Fixed height, no scroll (content paginated) */}
                <div
                  ref={contentRef}
                  className="relative z-10"
                  style={{
                    padding: `${padding}px`,
                    height: `${pageHeight}px`,
                    overflow: 'hidden'
                  }}
                >
                  {/* Use TipTapRenderer for proper LaTeX rendering */}
                  <TipTapRenderer
                    content={pages[currentPage] || ''}
                    compact={true}
                    className="text-base leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        {pages.length > 1 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Utilisez les touches ← → pour naviguer entre les pages
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealPaginatedRenderer;
