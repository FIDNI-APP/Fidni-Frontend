import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

/**
 * TipTap Extension that converts spacebar presses to LaTeX spaces (\ )
 * This allows users to type LaTeX content more naturally without needing
 * to manually insert LaTeX space commands.
 *
 * Content is automatically wrapped in $ delimiters when saved.
 */
export const LatexSpaceExtension = Extension.create({
  name: 'latexSpace',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('latexSpace'),
        props: {
          handleKeyDown(view, event) {
            // Check if spacebar was pressed
            if (event.key === ' ' && !event.ctrlKey && !event.altKey && !event.metaKey) {
              // Get the current selection
              const { state, dispatch } = view;
              const { from, to } = state.selection;

              // Insert LaTeX space (backslash + space)
              const tr = state.tr.insertText('\\ ', from, to);
              dispatch(tr);

              // Prevent default spacebar behavior
              event.preventDefault();
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Helper function to wrap text content in $ delimiters for math rendering
 * This is called when saving content to ensure all text is treated as math
 */
export function wrapContentInMathDelimiters(html: string): string {
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Process all text nodes
  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      // Only wrap if text exists and doesn't already have $ delimiters
      if (text.trim() && !text.startsWith('$')) {
        node.textContent = `$${text}$`;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Recursively process child nodes
      Array.from(node.childNodes).forEach(processNode);
    }
  };

  Array.from(tempDiv.childNodes).forEach(processNode);
  return tempDiv.innerHTML;
}

export default LatexSpaceExtension;
