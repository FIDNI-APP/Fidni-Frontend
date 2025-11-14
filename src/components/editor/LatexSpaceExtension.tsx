import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

/**
 * TipTap Extension that converts spacebar presses to LaTeX spaces (\ )
 * This allows users to type LaTeX content more naturally without needing
 * to manually insert LaTeX space commands.
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

export default LatexSpaceExtension;
