/**
 * TextBlockEditor - Wrapper around CompactTipTapEditor for structured content blocks
 *
 * Uses the compact editor that grows with content (not A4 format)
 * for editing individual content blocks within the structured content system.
 * Équations « façon Word » (12/10/2026) : Alt+= ou « Équation » ouvre un champ visuel dans la ligne,
 * l'onglet Équation s'affiche dans la barre, « Plein écran » ouvre le champ dans l'éditeur de documents.
 */

import React from 'react';
import CompactTipTapEditor from '@/components/editor/CompactTipTapEditor';
import type { ContentBlock } from '@/types/content';

interface TextBlockEditorProps {
  value: ContentBlock | undefined;
  onChange: (value: ContentBlock) => void;
  placeholder?: string;
  minHeight?: string;
  showToolbar?: boolean;
  className?: string;
}

export const TextBlockEditor: React.FC<TextBlockEditorProps> = ({
  value,
  onChange,
  placeholder = 'Écrivez ici...',
  minHeight = '80px',
  className = '',
}) => {
  const handleChange = (html: string) => {
    onChange({
      type: 'text',
      html,
    });
  };

  return (
    <div className={className}>
      <CompactTipTapEditor
        content={value?.html || ''}
        onChange={handleChange}
        placeholder={placeholder}
        minHeight={minHeight}
        wordMath
        fullscreenTitle={placeholder}
      />
    </div>
  );
};

export default TextBlockEditor;
