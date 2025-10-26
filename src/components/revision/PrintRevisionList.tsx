import React, { useRef } from 'react';
import { RevisionList, RevisionListItem } from '@/lib/api';
import { Content } from '@/types';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TipTapRenderer from '@/components/editor/TipTapRenderer';

interface PrintRevisionListProps {
  list: RevisionList;
}

export const PrintRevisionList: React.FC<PrintRevisionListProps> = ({ list }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Facile';
      case 'medium':
        return 'Moyen';
      case 'hard':
        return 'Difficile';
      default:
        return difficulty;
    }
  };

  return (
    <>
      {/* Print Button - Only visible on screen */}
      <Button
        onClick={handlePrint}
        variant="outline"
        className="print:hidden flex items-center gap-2"
      >
        <Printer className="w-4 h-4" />
        Imprimer en TD
      </Button>

      {/* Print Content - Hidden on screen, visible when printing */}
      <div ref={printRef} className="hidden print:block">
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 1.5cm 1cm;
            }

            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            * {
              visibility: hidden;
            }

            .print-content, .print-content * {
              visibility: visible;
            }

            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              min-height: 100vh;
              display: flex !important;
              flex-direction: column;
            }

            .page-break {
              page-break-after: always;
              break-after: page;
            }

            .avoid-break {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .print-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              margin-top: auto;
            }
          }
        `}</style>

        <div className="print-content bg-white text-black px-6 py-6">
          {/* Header */}
          <div className="border-b-4 border-double border-black pb-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {list.name}
                </h1>
                <p className="text-xs text-gray-600 mt-1 uppercase tracking-wider">Liste de Révisions</p>
              </div>
              <div className="text-right border-l-2 border-gray-300 pl-4">
                <p className="text-sm font-semibold text-gray-800">{formatDate(new Date().toISOString())}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {list.item_count} exercice{list.item_count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-6">
            {list.items && list.items.map((item: RevisionListItem, index: number) => {
              const content = item.content_object as Content;
              if (!content) return null;

              return (
                <div key={item.id} className="avoid-break mb-8">
                  {/* Exercise Header */}
                  <div className="mb-3">
                    <h3 className="text-lg font-bold mb-2">
                      Exercice {index + 1}: {content.title}
                    </h3>
                    <div className="flex gap-4 text-xs text-gray-700">
                      {content.subject && (
                        <span className="font-medium">
                          Matière: {content.subject.name}
                        </span>
                      )}
                      {content.difficulty && (
                        <span>
                          Difficulté: {getDifficultyLabel(content.difficulty)}
                        </span>
                      )}
                      {content.chapters && content.chapters.length > 0 && (
                        <span>
                          Chapitre: {content.chapters.map(ch => ch.name).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Exercise Content */}
                  <div className="prose prose-sm max-w-none">
                    <TipTapRenderer content={content.content} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="print-footer mt-auto pt-4 border-t-2 border-gray-400 text-center text-xs text-gray-600 bg-white px-6 pb-4">
            <p className="font-medium">{list.name}</p>
            <p className="text-gray-500 mt-0.5">{formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>
    </>
  );
};
