import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut, LayoutList, LayoutGrid } from 'lucide-react';
import StarterKit from '@tiptap/starter-kit';
import { A4_PAGE_SIZE } from './pagination';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import { Heading } from '@tiptap/extension-heading';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { ListItem } from '@tiptap/extension-list-item';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Image } from '@tiptap/extension-image';
import Mathematics from '@tiptap/extension-mathematics';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface TipTapPaginatedRendererProps {
  content: string;
  pageHeight?: number;
  pageWidth?: number;
  padding?: number;
}

export const TipTapPaginatedRenderer: React.FC<TipTapPaginatedRendererProps> = ({
  content,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [showPreviewPanels, setShowPreviewPanels] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Calculate the actual page height for viewport
  const PAGE_HEIGHT = A4_PAGE_SIZE.pageHeight -
                       A4_PAGE_SIZE.marginTop -
                       A4_PAGE_SIZE.marginBottom -
                       20 - // contentMarginTop + contentMarginBottom
                       20; // approximate header/footer height

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TextStyle,
      Color,
      Paragraph,
      Text,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
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
      Image.configure({
        HTMLAttributes: {
          class: 'content-image',
        },
      }),
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
        },
      }),
    ],
    content: content || '<p></p>',
    editable: false,
    editorProps: {
      attributes: {
        class: 'tiptap-paginated-renderer',
      },
    },
  });

  // Count total pages based on content height
  useEffect(() => {
    if (!editor) return;

    const timer = setTimeout(() => {
      const editorDom = editor.view.dom;

      // Render LaTeX first
      const walker = document.createTreeWalker(
        editorDom,
        NodeFilter.SHOW_TEXT,
        null
      );

      const textNodes: Text[] = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent?.includes('$')) {
          textNodes.push(node as Text);
        }
      }

      textNodes.forEach((textNode) => {
        const text = textNode.textContent || '';
        if (!text.includes('$')) return;

        const parent = textNode.parentElement;
        if (!parent || parent.classList.contains('katex')) return;

        const fragment = document.createDocumentFragment();
        const parts = text.split(/(\\$\\$[^$]+\\$\\$|\\$[^$]+\\$)/g);

        parts.forEach(part => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            const latex = part.slice(2, -2);
            const div = document.createElement('div');
            div.className = 'math-display';
            try {
              katex.render(latex, div, { displayMode: true, throwOnError: false });
              fragment.appendChild(div);
            } catch (e) {
              fragment.appendChild(document.createTextNode(part));
            }
          } else if (part.startsWith('$') && part.endsWith('$')) {
            const latex = part.slice(1, -1);
            const span = document.createElement('span');
            span.className = 'math-inline';
            try {
              katex.render(latex, span, { displayMode: false, throwOnError: false });
              fragment.appendChild(span);
            } catch (e) {
              fragment.appendChild(document.createTextNode(part));
            }
          } else {
            fragment.appendChild(document.createTextNode(part));
          }
        });

        parent.replaceChild(fragment, textNode);
      });

      // Get the actual content height
      const contentElement = editorDom.querySelector('.ProseMirror') || editorDom;
      const totalContentHeight = contentElement.scrollHeight;

      // Calculate how many pages we need
      const calculatedPages = Math.ceil(totalContentHeight / PAGE_HEIGHT);
      setTotalPages(Math.max(1, calculatedPages));

      console.log('📊 Page calculation:', {
        contentHeight: totalContentHeight,
        pageHeight: PAGE_HEIGHT,
        totalPages: calculatedPages
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [editor?.state.doc, PAGE_HEIGHT]);

  // Control viewport to show only current page content with slide animation
  useEffect(() => {
    if (!editor || !viewportRef.current) return;

    const scrollOffset = currentPage * PAGE_HEIGHT;

    // Apply transform to show only the current page's content
    const editorDom = editor.view.dom;
    const viewport = viewportRef.current;

    if (editorDom && viewport) {
      // Simple horizontal slide based on direction
      const horizontalOffset = slideDirection === 'right' ? 100 : -100;

      // Slide out current page
      viewport.style.opacity = '0';
      viewport.style.transform = `translateX(${-horizontalOffset}px)`;
      viewport.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';

      setTimeout(() => {
        // Update content position (no animation here)
        editorDom.style.transform = `translateY(-${scrollOffset}px)`;
        editorDom.style.transition = 'none';

        // Slide in new page from opposite side
        viewport.style.transform = `translateX(${horizontalOffset}px)`;

        setTimeout(() => {
          viewport.style.opacity = '1';
          viewport.style.transform = 'translateX(0)';
          viewport.style.transition = 'opacity 0.2s ease-in, transform 0.2s ease-in';
        }, 20);
      }, 200);

      console.log(`📍 Showing page ${currentPage + 1}: offset -${scrollOffset}px, direction: ${slideDirection}`);
    }
  }, [currentPage, editor, PAGE_HEIGHT, slideDirection]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 0) {
        setCurrentPage(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages - 1) {
        setCurrentPage(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, totalPages]);

  const goToPage = (pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < totalPages) {
      // Determine slide direction
      setSlideDirection(pageIndex > currentPage ? 'right' : 'left');
      setCurrentPage(pageIndex);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 70));

  if (!editor) {
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
    <div className={`w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-100 p-6' : 'min-h-screen py-4'}`}>
      <div className="max-w-7xl mx-auto flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 px-4 py-3 bg-white rounded-lg shadow-md border border-gray-200 z-10">
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
                max={totalPages}
                value={currentPage + 1}
                onChange={(e) => {
                  const page = parseInt(e.target.value) - 1;
                  goToPage(page);
                }}
                className="w-12 text-center text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">/ {totalPages}</span>
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
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
                style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600">
              {Math.round(((currentPage + 1) / totalPages) * 100)}%
            </span>
          </div>

          {/* Zoom & Fullscreen */}
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
              onClick={() => setShowPreviewPanels(!showPreviewPanels)}
              className={`p-2 text-gray-700 rounded-lg transition-all hover:shadow-sm ${
                showPreviewPanels ? 'bg-indigo-100 hover:bg-indigo-200' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              title={showPreviewPanels ? "Masquer les aperçus" : "Afficher les aperçus"}
            >
              {showPreviewPanels ? <LayoutGrid className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
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

        {/* Main content area with sidebar */}
        <div className="flex gap-4">
          {/* Page Thumbnails Sidebar - Conditionally rendered */}
          {showPreviewPanels && (
            <div className="flex-shrink-0 w-48 bg-white rounded-lg shadow-md border border-gray-200 p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="space-y-2">
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    onClick={() => goToPage(index)}
                    className={`w-full p-2 rounded-lg border-2 transition-all ${
                      currentPage === index
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="bg-white border border-gray-300 rounded overflow-hidden relative"
                      style={{
                        aspectRatio: `${A4_PAGE_SIZE.pageWidth} / ${A4_PAGE_SIZE.pageHeight}`,
                      }}
                    >
                      {/* CSS-based visual preview */}
                      <div
                        className="absolute inset-0"
                        style={{
                          transform: 'scale(0.18)',
                          transformOrigin: 'top left',
                          width: `${A4_PAGE_SIZE.pageWidth}px`,
                          height: `${A4_PAGE_SIZE.pageHeight}px`,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            transform: `translateY(-${index * PAGE_HEIGHT}px)`,
                            padding: `${A4_PAGE_SIZE.marginTop}px ${A4_PAGE_SIZE.marginLeft}px`,
                          }}
                          dangerouslySetInnerHTML={{
                            __html: editor?.getHTML() || ''
                          }}
                          className="preview-content"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-center mt-1 font-medium text-gray-600">
                      {index + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Page viewport container */}
          <div className="flex-1 flex justify-center">
            <div
              className="bg-white shadow-lg"
              style={{
                width: `${A4_PAGE_SIZE.pageWidth}px`,
                padding: '0',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
              }}
            >
            {/* Page viewport - shows only one page at a time */}
            <div
              ref={viewportRef}
              className="relative overflow-hidden"
              style={{
                height: `${A4_PAGE_SIZE.pageHeight}px`,
                width: '100%',
              }}
            >
              {/* Page header */}
              <div
                className="absolute top-0 left-0 right-0 z-10 bg-white"
                style={{
                  height: `${A4_PAGE_SIZE.marginTop}px`,
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span className="text-gray-600 text-sm"></span>
                <span className="text-gray-600 text-sm">Page {currentPage + 1}</span>
              </div>

              {/* Content viewport */}
              <div
                style={{
                  paddingTop: `${A4_PAGE_SIZE.marginTop}px`,
                  paddingBottom: `${A4_PAGE_SIZE.marginBottom}px`,
                  paddingLeft: `${A4_PAGE_SIZE.marginLeft}px`,
                  paddingRight: `${A4_PAGE_SIZE.marginRight}px`,
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                <EditorContent editor={editor} />
              </div>

              {/* Page footer */}
              <div
                className="absolute bottom-0 left-0 right-0 z-10 bg-white"
                style={{
                  height: `${A4_PAGE_SIZE.marginBottom}px`,
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <span className="text-gray-600 text-sm">{currentPage + 1}</span>
              </div>
            </div>
          </div>
        </div>
        </div>

        <style>{`
          /* Remove the PaginationPlus visual elements since we're using viewport */
          .tiptap-paginated-renderer [data-rm-pagination] {
            display: none !important;
          }

          .tiptap-paginated-renderer .rm-first-page-header {
            display: none !important;
          }

          .tiptap-paginated-renderer {
            outline: none;
            border: none !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: auto !important;
          }

          .tiptap-paginated-renderer .ProseMirror {
            font-family: 'Latin Modern Roman', 'Computer Modern', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            background: transparent;
            outline: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: ${totalPages * PAGE_HEIGHT}px;
          }

          /* Ensure content flows naturally */
          .tiptap-paginated-renderer p {
            margin-bottom: 0.75rem;
            text-align: justify;
          }

          .tiptap-paginated-renderer h1 {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 1rem;
            color: #1f2937;
          }

          .tiptap-paginated-renderer h2 {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 0.75rem;
            color: #374151;
          }

          .tiptap-paginated-renderer ul,
          .tiptap-paginated-renderer ol {
            margin-bottom: 0.75rem;
          }

          .tiptap-paginated-renderer li {
            margin-bottom: 0.25rem;
          }

          .tiptap-paginated-renderer .content-image {
            display: block;
            margin: 1rem auto;
            max-width: 100%;
            border-radius: 0.5rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          /* LaTeX math styling */
          .tiptap-paginated-renderer .math-inline {
            display: inline;
            margin: 0 2px;
          }

          .tiptap-paginated-renderer .math-display {
            display: block;
            text-align: center;
            margin: 1.5rem 0;
          }

          .tiptap-paginated-renderer .katex {
            font-size: 1.1em;
          }

          .tiptap-paginated-renderer .katex-display {
            text-align: center;
            margin: 1.5rem 0;
          }

          /* Hide any decorations from PaginationPlus */
          .ProseMirror-widget {
            display: none !important;
          }

          /* Preview content styling */
          .preview-content {
            font-family: 'Latin Modern Roman', 'Computer Modern', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            background: white;
            pointer-events: none;
          }

          .preview-content p {
            margin-bottom: 0.75rem;
            text-align: justify;
          }

          .preview-content h1 {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 1rem;
            color: #1f2937;
          }

          .preview-content h2 {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 0.75rem;
            color: #374151;
          }

          .preview-content ul,
          .preview-content ol {
            margin-bottom: 0.75rem;
            padding-left: 1.25rem;
          }

          .preview-content li {
            margin-bottom: 0.25rem;
          }

          .preview-content .katex {
            font-size: 1.1em;
          }

          .preview-content .math-inline {
            display: inline;
            margin: 0 2px;
          }

          .preview-content .math-display {
            display: block;
            text-align: center;
            margin: 1.5rem 0;
          }
        `}</style>
      </div>
    </div>
  );
};

export default TipTapPaginatedRenderer;
