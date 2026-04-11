/**
 * JsonImportModal - Modal pour importer du contenu via JSON
 *
 * Structure JSON simplifiée - les IDs sont générés automatiquement
 */

import React, { useState, useRef } from 'react';
import { X, Upload, FileJson, Copy, AlertCircle, CheckCircle } from 'lucide-react';

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any) => void;
  contentType: 'exercise' | 'lesson' | 'exam' | 'structured-exercise';
}

// Exemples SIMPLIFIÉS - pas besoin d'IDs, ils sont générés automatiquement
const EXAMPLE_STRUCTURES = {
  'exercise': {
    title: "Équations du second degré",
    difficulty: "medium",
    content: "<p>Résoudre l'équation $x^2 - 5x + 6 = 0$</p>",
    solution: "<p>On factorise: $(x-2)(x-3)=0$, donc $x=2$ ou $x=3$</p>"
  },
  'lesson': {
    title: "Introduction aux dérivées",
    content: "<p>La dérivée d'une fonction $f$ en un point $a$...</p>"
  },
  'exam': {
    title: "Bac S 2024 - Mathématiques",
    year: 2024,
    session: "Normale",
    exercises: [
      { title: "Exercice 1", content: "<p>Énoncé...</p>", points: 5 }
    ]
  },
  'structured-exercise': {
    title: "Étude de fonction",
    difficulty: "medium",
    blocks: [
      {
        type: "context",
        label: "Contexte",
        content: "<p>Soit $f(x) = x^2 - 4x + 3$</p>"
      },
      {
        type: "question",
        label: "1)",
        content: "<p>Calculer $f'(x)$</p>",
        solution: "<p>$f'(x) = 2x - 4$</p>",
        points: 2
      },
      {
        type: "question",
        label: "2)",
        content: "<p>Étudier les variations de $f$</p>",
        solution: "<p>$f'(x) = 0 \\Leftrightarrow x = 2$. Tableau de variations...</p>",
        points: 3
      }
    ]
  }
};

const CONTENT_TYPE_LABELS = {
  'exercise': 'Exercice',
  'lesson': 'Leçon',
  'exam': 'Examen',
  'structured-exercise': 'Exercice structuré'
};

// Génère un ID unique
const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Transforme le JSON simplifié en structure complète avec IDs
const transformJsonData = (data: any, contentType: string) => {
  if (contentType === 'structured-exercise') {
    // Générer les IDs pour chaque block
    const blocks = (data.blocks || []).map((block: any, index: number) => {
      const blockType = block.type || 'question';
      const isContext = blockType === 'context';

      // Pour context: utilise "content"
      // Pour question: utilise "questionContent" pour l'énoncé
      return {
        id: generateId(),
        type: blockType,
        label: block.label || (isContext ? 'Contexte' : `Question ${index + 1}`),
        // Context utilise content, Question utilise questionContent
        ...(isContext
          ? { content: block.content ? { type: 'text', html: block.content } : undefined }
          : { questionContent: block.content ? { type: 'text', html: block.content } : undefined }
        ),
        solution: block.solution ? { type: 'text', html: block.solution } : undefined,
        points: block.points, // Points pour la question
        subQuestions: block.subQuestions?.map((sq: any, sqIdx: number) => ({
          id: generateId(),
          label: sq.label || `${index + 1}.${sqIdx + 1})`,
          content: sq.content ? { type: 'text', html: sq.content } : undefined,
          solution: sq.solution ? { type: 'text', html: sq.solution } : undefined,
          points: sq.points, // Points pour la sous-question
        }))
      };
    });

    return {
      title: data.title || '',
      difficulty: data.difficulty || 'medium',
      structure: { blocks }
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
  const fileRef = useRef<HTMLInputElement>(null);

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

      if (contentType === 'structured-exercise' && !parsed.blocks) {
        throw new Error('Le champ "blocks" est requis (liste de questions/contextes)');
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
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-3"
            >
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-600">Charger un fichier .json</span>
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
