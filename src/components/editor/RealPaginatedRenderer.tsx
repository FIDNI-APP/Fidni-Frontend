import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { generateJSON } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Heading from '@tiptap/extension-heading';
import ImageResize from 'tiptap-extension-resize-image';
import { RealTimeMathExtension } from './RealTimeMathExtension';
import TipTapRenderer from './TipTapRenderer';

interface RealPaginatedRendererProps {
  content: string;
  pageHeight?: number; // in px
  pageWidth?: number; // in px
  padding?: number; // in px
}

// Helper to parse TipTap JSON content
interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  attrs?: any;
  marks?: any[];
  text?: string;
}

interface TipTapDocument {
  type: 'doc';
  content: TipTapNode[];
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
  const measurementRef = useRef<HTMLDivElement>(null);

  const [parsedNodes, setParsedNodes] = useState<TipTapNode[]>([]);
  const measurementContainerRef = useRef<HTMLDivElement>(null);
  const hasMeasured = useRef(false);

  // TipTap extensions for HTML parsing
  const extensions = [
    StarterKit.configure({
      heading: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
    }),
    TextStyle,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Color,
    Heading.configure({
      levels: [1, 2],
    }),
    BulletList.configure({
      HTMLAttributes: {
        class: 'list-disc pl-5',
      },
    }),
    OrderedList.configure({
      HTMLAttributes: {
        class: 'list-decimal pl-5',
      },
    }),
    ListItem,
    ImageResize.configure({
      allowBase64: true,
      inline: false,
    }),
    RealTimeMathExtension.configure({
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
    }),
  ];

  // Step 1: Parse content and extract nodes
  useEffect(() => {
    // Reset state when content changes
    setCurrentPage(0);
    setParsedNodes([]);

    if (!content) {
      setPages([]);
      setIsReady(true);
      return;
    }

    try {
      const trimmedContent = content.trim();
      let parsedContent: TipTapDocument;

      // Check if content is JSON (TipTap format)
      if (trimmedContent.startsWith('{')) {
        try {
          parsedContent = JSON.parse(content);

          if (!parsedContent.content || parsedContent.content.length === 0) {
            setPages([]);
            setIsReady(true);
            return;
          }
        } catch (parseError) {
          console.error('Error parsing JSON content:', parseError);
          // Invalid JSON - treat as HTML and convert to TipTap JSON
          try {
            parsedContent = generateJSON(content, extensions) as TipTapDocument;
          } catch (htmlError) {
            console.error('Error converting HTML to JSON:', htmlError);
            setPages([content]);
            setIsReady(true);
            return;
          }
        }
      } else {
        // Content is HTML - convert to TipTap JSON using generateJSON
        try {
          parsedContent = generateJSON(content, extensions) as TipTapDocument;
        } catch (htmlError) {
          console.error('Error converting HTML to JSON:', htmlError);
          setPages([content]);
          setIsReady(true);
          return;
        }
      }

      // Now we have TipTap JSON - extract nodes for pagination
      if (!parsedContent.content || parsedContent.content.length === 0) {
        setPages([]);
        setIsReady(true);
        return;
      }

      setParsedNodes(parsedContent.content);
      hasMeasured.current = false;
      setIsReady(false);
    } catch (error) {
      console.error('Error parsing content:', error);
      setPages([content]);
      setIsReady(true);
    }
  }, [content]);

  // Step 2: Measure and paginate after nodes are rendered
  useEffect(() => {
    if (parsedNodes.length === 0 || hasMeasured.current) return;

    // Wait for content to render, then measure
    const measureAndPaginate = async () => {
      // Give time for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      const container = measurementContainerRef.current;
      if (!container) {
        // Fallback: show all content on one page
        const fallbackDoc: TipTapDocument = {
          type: 'doc',
          content: parsedNodes
        };
        setPages([JSON.stringify(fallbackDoc)]);
        setIsReady(true);
        hasMeasured.current = true;
        return;
      }

      // Measure each node
      const nodeElements = container.querySelectorAll('.node-measurement');
      const measurements: number[] = [];

      nodeElements.forEach((el) => {
        measurements.push((el as HTMLElement).offsetHeight);
      });

      // Paginate based on measurements
      const availableHeight = pageHeight - (padding * 2);
      const pageContents: TipTapDocument[] = [];
      let currentPageNodes: TipTapNode[] = [];
      let currentHeight = 0;

      parsedNodes.forEach((node, index) => {
        const nodeHeight = measurements[index] || 0;

        if (currentHeight + nodeHeight > availableHeight && currentPageNodes.length > 0) {
          pageContents.push({
            type: 'doc',
            content: [...currentPageNodes]
          });
          currentPageNodes = [node];
          currentHeight = nodeHeight;
        } else {
          currentPageNodes.push(node);
          currentHeight += nodeHeight;
        }
      });

      if (currentPageNodes.length > 0) {
        pageContents.push({
          type: 'doc',
          content: currentPageNodes
        });
      }

      const pageStrings = pageContents.map(page => JSON.stringify(page));
      setPages(pageStrings);
      setIsReady(true);
      hasMeasured.current = true;
    };

    measureAndPaginate();
  }, [parsedNodes, pageHeight, padding]);

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
                  goToPage(page);
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
          {/* Left Sidebar: Page thumbnails (scrollable) - only for JSON content */}
          {parsedNodes.length > 0 && pages.length > 1 && (
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

                {/* Content - Fixed height, overflow visible to prevent truncation */}
                <div
                  ref={contentRef}
                  className="relative z-10"
                  style={{
                    padding: `${padding}px`,
                    height: `${pageHeight}px`,
                    overflow: 'visible'
                  }}
                >
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

        {/* Hidden measurement container */}
        {!isReady && parsedNodes.length > 0 && (
          <div
            ref={measurementContainerRef}
            className="fixed top-0 left-0 pointer-events-none"
            style={{
              position: 'absolute',
              visibility: 'hidden',
              top: '-9999px',
              left: '-9999px',
              width: `${pageWidth - (padding * 2)}px`,
            }}
          >
            {parsedNodes.map((node, index) => {
              const nodeDoc: TipTapDocument = {
                type: 'doc',
                content: [node]
              };

              return (
                <div
                  key={`node-${index}`}
                  className="node-measurement"
                  style={{ marginBottom: '10px' }}
                >
                  <TipTapRenderer
                    content={JSON.stringify(nodeDoc)}
                    compact={true}
                    className="text-base leading-relaxed"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealPaginatedRenderer;