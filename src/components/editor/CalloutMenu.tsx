/**
 * CalloutMenu - Dropdown menu for inserting callout boxes in TipTap editor
 */

import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { ChevronDown } from 'lucide-react';
import { CALLOUT_CONFIGS, CalloutType } from '@/types/callout';

interface CalloutMenuProps {
  editor: Editor | null;
}

export const CalloutMenu: React.FC<CalloutMenuProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');

  if (!editor) {
    return null;
  }

  const handleInsertCallout = (type: CalloutType) => {
    editor.chain().focus().setCallout({ type, title: title || undefined }).run();
    setIsOpen(false);
    setTitle('');
  };

  const calloutTypes: CalloutType[] = [
    'theorem',
    'property',
    'definition',
    'lemma',
    'corollary',
    'example',
    'remark',
    'proof',
    'method',
    'warning',
  ];

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        type="button"
      >
        <span>📦</span>
        <span>Encadré</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 p-3">
            {/* Title input */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Titre (optionnel)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Théorème de Pythagore"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Callout types grid */}
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {calloutTypes.map((type) => {
                const config = CALLOUT_CONFIGS[type];
                return (
                  <button
                    key={type}
                    onClick={() => handleInsertCallout(type)}
                    className={`flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md border-l-3 transition-colors ${config.borderColor} ${config.bgColor} hover:opacity-80`}
                    type="button"
                  >
                    <span className="text-lg">{config.icon}</span>
                    <span className={`font-medium ${config.textColor}`}>
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Sélectionnez le texte puis choisissez un type d'encadré
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CalloutMenu;
