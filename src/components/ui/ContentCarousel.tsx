import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ContentCarouselProps {
  children: React.ReactNode[];
  itemsPerView?: number;
}

export const ContentCarousel: React.FC<ContentCarouselProps> = ({
  children,
  itemsPerView = 4
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalItems = children.length;
  const totalPages = Math.ceil(totalItems / itemsPerView);
  const currentPage = Math.floor(currentIndex / itemsPerView);

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  const handlePrev = () => {
    if (canGoPrev && !isTransitioning) {
      setIsTransitioning(true);
      const newPage = currentPage - 1;
      setCurrentIndex(newPage * responsiveItemsPerView);
    }
  };

  const handleNext = () => {
    if (canGoNext && !isTransitioning) {
      setIsTransitioning(true);
      const newPage = currentPage + 1;
      setCurrentIndex(newPage * responsiveItemsPerView);
    }
  };

  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  // Responsive items per view
  const [responsiveItemsPerView, setResponsiveItemsPerView] = useState(itemsPerView);

  useEffect(() => {
    const updateItemsPerView = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setResponsiveItemsPerView(1);
      } else if (width < 1024) {
        setResponsiveItemsPerView(2);
      } else if (width < 1280) {
        setResponsiveItemsPerView(3);
      } else {
        setResponsiveItemsPerView(itemsPerView);
      }
    };

    updateItemsPerView();
    window.addEventListener('resize', updateItemsPerView);
    return () => window.removeEventListener('resize', updateItemsPerView);
  }, [itemsPerView]);

  // Reset to first page when responsiveItemsPerView changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [responsiveItemsPerView]);

  // If not enough items to scroll, show all
  if (totalItems <= responsiveItemsPerView) {
    return (
      <div className={`grid gap-6 ${
        responsiveItemsPerView === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
        responsiveItemsPerView === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
        responsiveItemsPerView === 2 ? 'grid-cols-1 md:grid-cols-2' :
        'grid-cols-1'
      }`}>
        {children}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Navigation buttons */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          className={`
            p-2.5 rounded-xl border-2 transition-all duration-200
            ${canGoPrev
              ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm hover:shadow-md'
              : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
          aria-label="Précédent"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className={`
            p-2.5 rounded-xl border-2 transition-all duration-200
            ${canGoNext
              ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm hover:shadow-md'
              : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
          aria-label="Suivant"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Carousel container */}
      <div className="overflow-hidden" ref={containerRef}>
        <div
          className="flex gap-6 transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / responsiveItemsPerView)}%)`
          }}
        >
          {children.map((child, idx) => (
            <div
              key={idx}
              className="flex-shrink-0"
              style={{ width: `calc(${100 / responsiveItemsPerView}% - ${(responsiveItemsPerView - 1) * 24 / responsiveItemsPerView}px)` }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {Array.from({ length: Math.ceil(totalItems / responsiveItemsPerView) }).map((_, pageIdx) => {
          const pageStartIndex = pageIdx * responsiveItemsPerView;
          const isActive = currentIndex >= pageStartIndex && currentIndex < pageStartIndex + responsiveItemsPerView;

          return (
            <button
              key={pageIdx}
              onClick={() => {
                if (!isTransitioning) {
                  setIsTransitioning(true);
                  setCurrentIndex(pageStartIndex);
                }
              }}
              className={`
                h-1.5 rounded-full transition-all duration-300
                ${isActive
                  ? 'bg-slate-900 w-8'
                  : 'bg-slate-300 w-1.5 hover:bg-slate-400'
                }
              `}
              aria-label={`Aller à la page ${pageIdx + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
};
