import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import TurndownService from 'turndown';
import 'katex/dist/katex.min.css';

interface SimplePaginatedRendererProps {
  content: string;
  pageHeight?: number;
  pageWidth?: number;
  padding?: number;
}

export const SimplePaginatedRenderer: React.FC<SimplePaginatedRendererProps> = ({
  content,
  pageHeight = 1122,
  pageWidth = 794,
  padding = 64,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const measureRef = useRef<HTMLDivElement>(null);

  // Split content into pages
  useEffect(() => {
    if (!content) {
      setPages([]);
      setIsReady(true);
      return;
    }

    const paginateContent = async () => {
      const isHTML = content.trim().startsWith('<');
      let processedContent = content;

      // Convert HTML to Markdown if needed
      if (isHTML) {
        const mathPlaceholders: { [key: string]: string } = {};
        let mathCounter = 0;

        // Protect LaTeX
        let protectedContent = content.replace(/\$\$([^$]+)\$\$/g, (match) => {
          const placeholder = `XDMATHX${mathCounter}XDMATHX`;
          mathPlaceholders[placeholder] = match;
          mathCounter++;
          return placeholder;
        });

        protectedContent = protectedContent.replace(/\$([^$]+)\$/g, (match) => {
          const placeholder = `XMATHX${mathCounter}XMATHX`;
          mathPlaceholders[placeholder] = match;
          mathCounter++;
          return placeholder;
        });

        const turndownService = new TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
        });

        processedContent = turndownService.turndown(protectedContent);

        // Restore LaTeX
        Object.entries(mathPlaceholders).forEach(([placeholder, latex]) => {
          processedContent = processedContent.split(placeholder).join(latex);
        });
      }

      // Split into blocks
      const blocks = processedContent.split(/\n(?=#{1,6}\s|```|\$\$|\n)/g).filter((b) => b.trim());

      const newPages: string[] = [];
      let currentPageContent = '';
      let currentHeight = 0;
      const maxContentHeight = pageHeight - padding * 2;

      for (const block of blocks) {
        const estimatedHeight = estimateBlockHeight(block);

        if (currentHeight + estimatedHeight > maxContentHeight && currentPageContent) {
          newPages.push(currentPageContent.trim());
          currentPageContent = block + '\n\n';
          currentHeight = estimatedHeight;
        } else {
          currentPageContent += block + '\n\n';
          currentHeight += estimatedHeight;
        }
      }

      if (currentPageContent.trim()) {
        newPages.push(currentPageContent.trim());
      }

      setPages(newPages.length > 0 ? newPages : [processedContent]);
      setIsReady(true);
    };

    paginateContent();
  }, [content, pageHeight, padding]);

  const estimateBlockHeight = (block: string): number => {
    const lines = block.split('\n').length;

    if (block.trim().startsWith('$$')) return 80 + lines * 20;
    if (block.trim().startsWith('```')) return 40 + lines * 20;
    if (block.trim().startsWith('#')) {
      const level = block.match(/^#{1,6}/)?.[0].length || 1;
      return level === 1 ? 60 : level === 2 ? 50 : 40;
    }
    if (block.includes('![')) return 300;

    return lines * 28;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 0) {
        setCurrentPage((prev) => prev - 1);
      } else if (e.key === 'ArrowRight' && currentPage < pages.length - 1) {
        setCurrentPage((prev) => prev + 1);
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

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 70));

  if (!isReady) {
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
    <div className={`w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-900 p-6' : 'min-h-screen py-4'}`}>
      <div className="max-w-7xl mx-auto flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 px-4 py-3 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-2 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
              <input
                type="number"
                min="1"
                max={pages.length}
                value={currentPage + 1}
                onChange={(e) => goToPage(parseInt(e.target.value) - 1)}
                className="w-12 text-center text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1"
              />
              <span className="text-sm text-gray-600">/ {pages.length}</span>
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === pages.length - 1}
              className="p-2 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-6">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600">{Math.round(((currentPage + 1) / pages.length) * 100)}%</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleZoomOut} className="p-2 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-gray-600 min-w-[3rem] text-center">{zoom}%</span>
            <button onClick={handleZoomIn} className="p-2 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100">
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex justify-center">
          <div className="transition-all duration-300" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
            <div
              className="bg-white rounded-sm overflow-hidden relative"
              style={{
                width: `${pageWidth}px`,
                minHeight: `${pageHeight}px`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 4px 8px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.08)',
              }}
            >
              {pages.length > 1 && (
                <div className="absolute bottom-8 right-12 text-gray-400 text-sm font-medium select-none">{currentPage + 1}</div>
              )}

              <div ref={measureRef} className="relative z-10 prose prose-base max-w-none" style={{ padding: `${padding}px`, minHeight: `${pageHeight}px` }}>
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4 text-gray-900" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mb-3 text-gray-800" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mb-2 text-gray-800" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-4 leading-7 text-gray-700" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
                    li: ({ node, ...props }) => <li className="text-gray-700" {...props} />,
                    code: ({ node, inline, ...props }) =>
                      inline ? (
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-600" {...props} />
                      ) : (
                        <code className="block bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono" {...props} />
                      ),
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-gray-600 my-4" {...props} />,
                    img: ({ node, ...props }) => <img className="rounded-lg max-w-full h-auto my-4" {...props} />,
                    div: ({ node, className, ...props }) => {
                      if (className?.includes('math-display') || className?.includes('katex-display')) {
                        return <div className="text-center my-6" {...props} />;
                      }
                      return <div className={className} {...props} />;
                    },
                  }}
                >
                  {pages[currentPage] || ''}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplePaginatedRenderer;
