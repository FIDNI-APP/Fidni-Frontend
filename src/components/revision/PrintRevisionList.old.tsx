import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RevisionList } from '@/lib/api';

interface PrintRevisionListProps {
  list: RevisionList;
}

const processLatexContent = (content: string): string => {
  try {
    const json = JSON.parse(content);
    
    const processNode = (node: any): string => {
      if (typeof node === 'string') return node;
      
      if (typeof node.text === 'string') {
        if (node.type === 'mathematics') {
          return node.attrs?.mode === 'display' ? `\\[${node.text}\\]` : `\\(${node.text}\\)`;
        }
        return node.text;
      }
      
      if (Array.isArray(node.content)) {
        return node.content.map(processNode).join('');
      }
      
      if (node.content) return processNode(node.content);
      
      return '';
    };

    return processNode(json);
  } catch {
    // If not JSON, assume content already has proper LaTeX delimiters
    return content;
  }
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

export const PrintRevisionList: React.FC<PrintRevisionListProps> = ({ list }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Extract plain text from any content format
  const extractText = (content: string): string => {
    if (!content) return 'Contenu non disponible';

    try {
      // If HTML, extract text
      if (content.trim().startsWith('<')) {
        const div = document.createElement('div');
        div.innerHTML = content;
        return div.textContent || div.innerText || 'Contenu non disponible';
      }

      // Try parsing as JSON
      try {
        const json = JSON.parse(content);
        
        // Recursive text extraction from JSON
        const extract = (node: any): string => {
          if (!node) return '';
          if (typeof node === 'string') return node;
          if (node.text) return node.text;
          if (node.type === 'text' && node.text) return node.text;
          if (node.type === 'mathematics' && node.attrs?.latex) {
            return node.attrs.latex;
          }
          if (Array.isArray(node.content)) {
            return node.content.map(extract).join(' ');
          }
          if (node.content) return extract(node.content);
          return '';
        };

        const text = extract(json);
        return text || content;
      } catch {
        // Not JSON, return as plain text
        return content;
      }
    } catch (err) {
      console.error('Error extracting text:', err);
      return content;
    }
  };

  const handleDownloadPDF = async () => {
    if (!list.items || list.items.length === 0) {
      alert('Aucun exercice dans cette liste');
      return;
    }

    try {
      setIsGenerating(true);

      // Load jsPDF dynamically if not already loaded
      let jsPDF: any;
      
      // Try to use global jsPDF or dynamically import it
      if (typeof window !== 'undefined' && window.jspdf?.jsPDF) {
        jsPDF = window.jspdf.jsPDF;
      } else {
        // Dynamically load jsPDF from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(() => reject(new Error('jsPDF loading timeout')), 5000);
        });
        
        jsPDF = (window as any).jspdf?.jsPDF;
        if (!jsPDF) {
          throw new Error('jsPDF not loaded');
        }
      }

      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const maxWidth = pageWidth - (2 * margin);
      let y = margin;

      // Helper function to add text with word wrap
      const addText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        
        const lines = doc.splitTextToSize(text, maxWidth);
        
        for (const line of lines) {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += fontSize * 0.5;
        }
        
        return y;
      };

      // Add centered title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const title = list.name.toUpperCase();
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, (pageWidth - titleWidth) / 2, y);
      y += 12;

      // Add subtitle
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const subtitle = `${formatDate(new Date().toISOString())} — ${list.item_count} exercice${list.item_count > 1 ? 's' : ''}`;
      const subtitleWidth = doc.getTextWidth(subtitle);
      doc.text(subtitle, (pageWidth - subtitleWidth) / 2, y);
      y += 10;

      // Add line separator
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Process each exercise
      for (let i = 0; i < list.items.length; i++) {
        const item = list.items[i];
        const content = item.content_object as Content;
        
        if (!content) continue;

        // Check if we need a new page
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }

        // Exercise title
        y = addText(`Exercice ${i + 1}: ${content.title}`, 13, true);
        y += 2;

        // Metadata
        if (content.subject?.name || content.difficulty || content.chapters?.length > 0) {
          doc.setTextColor(100, 100, 100);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10);
          
          let metadata = '';
          if (content.subject?.name) {
            metadata += `Matière : ${content.subject.name}`;
          }
          if (content.chapters && content.chapters.length > 0) {
            if (metadata) metadata += ' — ';
            metadata += `Chapitre : ${content.chapters.map(ch => ch.name).join(', ')}`;
          }
          if (content.difficulty) {
            if (metadata) metadata += ' — ';
            metadata += `Difficulté : ${getDifficultyLabel(content.difficulty)}`;
          }
          
          const metaLines = doc.splitTextToSize(metadata, maxWidth);
          for (const line of metaLines) {
            if (y > pageHeight - margin) {
              doc.addPage();
              y = margin;
            }
            doc.text(line, margin, y);
            y += 5;
          }
          
          doc.setTextColor(0, 0, 0);
          y += 3;
        }

        // Exercise content
        const contentText = extractText(content.content);
        y = addText(contentText, 11, false);
        y += 8;
      }

      // Add footer
      if (y > pageHeight - 30) {
        doc.addPage();
        y = pageHeight / 2;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const footerText = '• • • FIN • • •';
      const footerWidth = doc.getTextWidth(footerText);
      doc.text(footerText, (pageWidth - footerWidth) / 2, y + 10);

      // Save the PDF
      doc.save(`${list.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);

    } catch (error) {
      console.error('PDF generation error:', error);
      
      // Fallback: Generate simple HTML and use browser print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${list.name}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }
              h1 {
                text-align: center;
                text-transform: uppercase;
                font-size: 24px;
                margin-bottom: 10px;
              }
              .subtitle {
                text-align: center;
                color: #666;
                margin-bottom: 30px;
              }
              .exercise {
                margin-bottom: 30px;
                page-break-inside: avoid;
              }
              .exercise h2 {
                font-size: 16px;
                margin-bottom: 8px;
              }
              .metadata {
                font-size: 11px;
                color: #666;
                font-style: italic;
                margin-bottom: 10px;
              }
              .content {
                font-size: 12px;
                white-space: pre-wrap;
              }
              hr {
                border: none;
                border-top: 1px solid #ccc;
                margin: 30px 0;
              }
              .footer {
                text-align: center;
                font-weight: bold;
                margin-top: 50px;
              }
              @media print {
                body { padding: 0; }
                .exercise { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <h1>${list.name}</h1>
            <p class="subtitle">${formatDate(new Date().toISOString())} — ${list.item_count} exercice${list.item_count > 1 ? 's' : ''}</p>
            <hr>
            ${list.items.map((item, index) => {
              const content = item.content_object as Content;
              if (!content) return '';
              
              const metadata = [];
              if (content.subject?.name) metadata.push(`Matière : ${content.subject.name}`);
              if (content.chapters?.length > 0) metadata.push(`Chapitre : ${content.chapters.map(ch => ch.name).join(', ')}`);
              if (content.difficulty) metadata.push(`Difficulté : ${getDifficultyLabel(content.difficulty)}`);
              
              return `
                <div class="exercise">
                  <h2>Exercice ${index + 1}: ${content.title}</h2>
                  ${metadata.length > 0 ? `<p class="metadata">${metadata.join(' — ')}</p>` : ''}
                  <div class="content">${extractText(content.content)}</div>
                </div>
              `;
            }).join('')}
            <hr>
            <div class="footer">• • • FIN • • •</div>
          </body>
          </html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Auto-trigger print dialog
        printWindow.onload = () => {
          printWindow.print();
        };
        
        alert('Une nouvelle fenêtre s\'est ouverte avec le contenu. Utilisez Ctrl+P (ou Cmd+P sur Mac) pour imprimer ou sauvegarder en PDF.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownloadPDF}
      disabled={isGenerating}
      className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md shadow-lg hover:shadow-xl transition-all hover:scale-105"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Télécharger PDF
        </>
      )}
    </Button>
  );
};