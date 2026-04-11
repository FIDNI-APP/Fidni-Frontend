/**
 * TextBlockEditor - Wrapper around CompactTipTapEditor for structured content blocks
 *
 * Uses the compact editor that grows with content (not A4 format)
 * for editing individual content blocks within the structured content system.
 */

import React from 'react';
import CompactTipTapEditor from '@/components/editor/CompactTipTapEditor';
import type { ContentBlock } from '@/types/structured';

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
      />
    </div>
  );
};

export default TextBlockEditor;
