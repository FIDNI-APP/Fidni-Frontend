/**
 * TipTap extension for Callout boxes
 * Allows inserting and editing educational callouts (theorems, properties, etc.)
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CalloutType } from '@/types/callout';

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /**
       * Insert a callout box
       */
      setCallout: (options: { type: CalloutType; title?: string }) => ReturnType;
      /**
       * Toggle callout type
       */
      toggleCallout: (type: CalloutType) => ReturnType;
    };
  }
}

export const CalloutExtension = Node.create<CalloutOptions>({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'remark',
        parseHTML: (element) => element.getAttribute('data-callout-type'),
        renderHTML: (attributes) => ({
          'data-callout-type': attributes.type,
        }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-callout-title'),
        renderHTML: (attributes) => {
          if (!attributes.title) {
            return {};
          }
          return {
            'data-callout-title': attributes.title,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout-type]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'callout-block',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (options) =>
        ({ commands, state, tr, dispatch }) => {
          const { from, to, empty } = state.selection;

          // Get callout type label from CALLOUT_CONFIGS
          const CALLOUT_CONFIGS = (window as any).__CALLOUT_CONFIGS;
          const label = CALLOUT_CONFIGS?.[options.type]?.label || options.type;

          if (empty) {
            // No selection - insert new callout with title
            const titleNode = state.schema.nodes.paragraph.create(
              {},
              [
                state.schema.text(label, [
                  state.schema.marks.bold.create(),
                ]),
              ]
            );
            const emptyParagraph = state.schema.nodes.paragraph.create();

            const calloutNode = state.schema.nodes[this.name].create(
              options,
              [titleNode, emptyParagraph]
            );

            return commands.insertContent(calloutNode.toJSON());
          } else {
            // Has selection - wrap selected content in callout with title
            return commands.command(({ tr, state, dispatch }) => {
              if (!dispatch) return false;

              const { from, to } = state.selection;
              const selectedContent = state.doc.slice(from, to).content;

              // Create title paragraph
              const titleNode = state.schema.nodes.paragraph.create(
                {},
                [
                  state.schema.text(label, [
                    state.schema.marks.bold.create(),
                  ]),
                ]
              );

              // Create callout with title + selected content
              const contentNodes = [titleNode];
              selectedContent.forEach((node) => {
                contentNodes.push(node);
              });

              const calloutNode = state.schema.nodes[this.name].create(
                options,
                contentNodes
              );

              // Replace selection with callout
              tr.replaceWith(from, to, calloutNode);

              return true;
            });
          }
        },
      toggleCallout:
        (type) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, { type });
        },
    };
  },
});

export default CalloutExtension;
