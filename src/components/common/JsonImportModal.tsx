/**
 * JsonImportModal - Modal pour importer du contenu via JSON
 *
 * Structure JSON simplifiée - les IDs sont générés automatiquement
 */

import React, { useState, useRef } from 'react';
import { X, Upload, FileJson, Copy, AlertCircle, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api/apiClient';

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any) => void;
  contentType: 'exercise' | 'lesson' | 'exam' | 'content-exercise';
}

// Exemples SIMPLIFIÉS - pas besoin d'IDs, ils sont générés automatiquement
const EXAMPLE_STRUCTURES = {
  'exercise': {
    title: "Étude de fonction",
    difficulty: "medium",
    blocks: [
      {
        type: "context",
        content: "<p>Soit $f(x) = x^2 - 4x + 3$ définie sur $\\mathbb{R}$.</p>"
      },
      {
        type: "question",
        content: "<p>Calculer $f'(x)$.</p>",
        solution: "<p>$f'(x) = 2x - 4$</p>",
        points: 2
      },
      {
        type: "question",
        content: "<p>Étudier les variations de $f$.</p>",
        solution: "<p>$f'(x) = 0 \\Leftrightarrow x = 2$. $f$ est décroissante sur $(-\\infty, 2)$ et croissante sur $(2, +\\infty)$.</p>",
        points: 3,
        subQuestions: [
          {
            content: "<p>Trouver les zéros de $f'$.</p>",
            solution: "<p>$x = 2$</p>",
            points: 1
          },
          {
            content: "<p>Dresser le tableau de variations.</p>",
            points: 2
          }
        ]
      }
    ]
  },
  'lesson': {
    title: "Les nombres dérivés",
    sections: [
      {
        title: "Définition",
        content: "<p>La dérivée de $f$ en $a$ est la limite $\\lim_{h \\to 0} \\frac{f(a+h)-f(a)}{h}$.</p>",
        subSections: [
          {
            title: "Interprétation géométrique",
            content: "<p>La dérivée représente le coefficient directeur de la tangente à la courbe en ce point.</p>"
          }
        ]
      },
      {
        title: "Règles de dérivation",
        content: "<p>$(u+v)' = u'+v'$, $(uv)' = u'v + uv'$, $\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}$</p>"
      }
    ]
  },
  'exam': {
    title: "Bac 2024 — Mathématiques",
    difficulty: "hard",
    duration_minutes: 180,
    is_national_exam: true,
    national_year: 2024,
    blocks: [
      {
        type: "context",
        content: "<p>Dans tout l'exercice, on pose $f(x) = e^x - x - 1$.</p>"
      },
      {
        type: "question",
        content: "<p>Étudier les variations de $f$ sur $\\mathbb{R}$.</p>",
        points: 5
      },
      {
        type: "question",
        content: "<p>Montrer que $f(x) \\geq 0$ pour tout $x \\in \\mathbb{R}$.</p>",
        points: 5
      }
    ]
  },
  'content-exercise': {
    title: "Étude de fonction",
    difficulty: "medium",
    blocks: [
      {
        type: "context",
        content: "<p>Soit $f(x) = x^2 - 4x + 3$</p>"
      },
      {
        type: "question",
        content: "<p>Calculer $f'(x)$</p>",
        solution: "<p>$f'(x) = 2x - 4$</p>",
        points: 2
      }
    ]
  }
};

const CONTENT_TYPE_LABELS = {
  'exercise': 'Exercice',
  'lesson': 'Leçon',
  'exam': 'Examen',
  'content-exercise': 'Exercice structuré'
};

// Génère un ID unique
const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const toContentBlock = (html: string | undefined) =>
  html ? { type: 'text' as const, html } : undefined;

// Transforme le JSON simplifié en structure complète avec IDs
const transformJsonData = (data: any, contentType: string) => {
  // Exercise and exam share the same block structure
  if (contentType === 'exercise' || contentType === 'exam' || contentType === 'content-exercise') {
    const blocks = (data.blocks || []).map((block: any, index: number) => {
      const blockType = block.type || 'question';
      return {
        id: generateId(),
        type: blockType,
        content: toContentBlock(block.content),
        solution: toContentBlock(block.solution),
        points: block.points,
        subQuestions: (block.subQuestions || []).map((sq: any) => ({
          id: generateId(),
          content: toContentBlock(sq.content),
          solution: toContentBlock(sq.solution),
          points: sq.points,
        })),
      };
    });

    return {
      title: data.title || '',
      difficulty: data.difficulty,
      structure: { version: '2.0', blocks },
      ...(contentType === 'exam' && {
        isNationalExam: data.is_national_exam || false,
        nationalYear: data.national_year,
        durationMinutes: data.duration_minutes,
      }),
    };
  }

  if (contentType === 'lesson') {
    const sections = (data.sections || []).map((s: any) => ({
      id: generateId(),
      title: s.title || '',
      content: toContentBlock(s.content) || { type: 'text', html: '' },
      subSections: (s.subSections || []).map((ss: any) => ({
        id: generateId(),
        title: ss.title || '',
        content: toContentBlock(ss.content) || { type: 'text', html: '' },
      })),
    }));

    return {
      title: data.title || '',
      structure: { version: '1.0', sections },
    };
  }

  return data;
};

export const JsonImportModal: React.FC<JsonImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  contentType
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setJsonInput(content);
      setError(null);
    };
    reader.onerror = () => {
      setError('Erreur lors de la lecture du fichier');
    };
    reader.readAsText(file);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsParsing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('content_type', contentType === 'content-exercise' ? 'exercise' : contentType);
      const response = await api.post('/parse-pdf/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setJsonInput(JSON.stringify(response.data, null, 2));
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erreur lors du parsing PDF';
      setError(msg);
    } finally {
      setIsParsing(false);
    }
  };

  const validateAndImport = () => {
    setError(null);
    setSuccess(false);

    if (!jsonInput.trim()) {
      setError('Veuillez entrer ou charger du JSON');
      return;
    }

    let parsed: any;
    let transformedData: any;

    try {
      parsed = JSON.parse(jsonInput);

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Le JSON doit être un objet');
      }

      if (!parsed.title) {
        throw new Error('Le champ "title" est requis');
      }

      if (['exercise', 'exam', 'content-exercise'].includes(contentType) && !parsed.blocks) {
        throw new Error('Le champ "blocks" est requis (liste de questions/contextes)');
      }
      if (contentType === 'lesson' && !parsed.sections) {
        throw new Error('Le champ "sections" est requis');
      }

      // Transformer les données et générer les IDs
      transformedData = transformJsonData(parsed, contentType);

    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError(`JSON invalide: ${err.message}`);
      } else {
        setError(err.message || 'Erreur de validation');
      }
      return;
    }

    // Si on arrive ici, le JSON est valide
    // Fermer le modal d'abord, puis importer
    const dataToImport = transformedData;

    setJsonInput('');
    setError(null);
    onClose();

    // Utiliser requestAnimationFrame pour s'assurer que le modal est fermé
    requestAnimationFrame(() => {
      try {
        onImport(dataToImport);
      } catch (e) {
        console.error('Import error:', e);
      }
    });
  };

  const loadExample = () => {
    setJsonInput(JSON.stringify(EXAMPLE_STRUCTURES[contentType], null, 2));
    setError(null);
  };

  const copyExample = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(EXAMPLE_STRUCTURES[contentType], null, 2));
    } catch {
      // Fallback si clipboard API échoue
      const textarea = document.createElement('textarea');
      textarea.value = JSON.stringify(EXAMPLE_STRUCTURES[contentType], null, 2);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleClose = () => {
    setJsonInput('');
    setError(null);
    setSuccess(false);
    setIsParsing(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Importer {CONTENT_TYPE_LABELS[contentType]} via JSON
            </h2>
            <p className="text-sm text-slate-500">
              Les IDs sont générés automatiquement
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* File upload */}
          <div className="flex gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={pdfRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Charger un .json</span>
            </button>
            <button
              type="button"
              onClick={() => pdfRef.current?.click()}
              disabled={isParsing}
              className="flex-1 p-3 border-2 border-dashed border-red-200 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isParsing ? (
                <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm text-red-600">
                {isParsing ? 'Parsing PDF...' : 'Importer un PDF'}
              </span>
            </button>
          </div>

          {/* Or divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-slate-200" />
            <span className="text-xs text-slate-400">ou collez votre JSON</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* JSON textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">JSON</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadExample}
                  className="text-xs px-2 py-1 bg-indigo-100 hover:bg-indigo-200 rounded text-indigo-700"
                >
                  Voir exemple
                </button>
                <button
                  type="button"
                  onClick={copyExample}
                  className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copier
                </button>
              </div>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setError(null);
              }}
              placeholder={`{\n  "title": "Titre...",\n  "blocks": [...]\n}`}
              className="w-full h-52 p-3 border border-slate-200 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              spellCheck={false}
            />
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div className="text-sm text-green-700">Import réussi!</div>
            </div>
          )}

          {/* Help */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <FileJson className="w-4 h-4 text-blue-500 mt-0.5" />
              <div className="text-xs text-blue-700">
                <strong>Format simplifié:</strong> Pas besoin de spécifier les IDs.<br/>
                Pour les exercices structurés, utilisez <code className="bg-blue-100 px-1 rounded">blocks</code> avec <code className="bg-blue-100 px-1 rounded">type</code> ("context" ou "question"), <code className="bg-blue-100 px-1 rounded">label</code>, <code className="bg-blue-100 px-1 rounded">content</code> et <code className="bg-blue-100 px-1 rounded">solution</code>.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 rounded-b-xl flex justify-end gap-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={validateAndImport}
            disabled={!jsonInput.trim()}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importer
          </button>
        </div>
      </div>
    </div>
  );
};

export default JsonImportModal;
