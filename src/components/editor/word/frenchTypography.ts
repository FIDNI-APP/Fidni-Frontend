import { Extension, InputRule } from '@tiptap/core';

/**
 * Typographie française (comme LaTeX avec babel-french) : l'espace tapée avant « ; ! ? » devient une
 * insécable fine, avant « : » une insécable (plus de « ? » seul en début de ligne) ; " devient « ou » avec
 * leurs espaces insécables. Retour arrière juste après annule la conversion (undoInputRule).
 */
export const FrenchTypography = Extension.create({
  name: 'frenchTypography',
  addInputRules() {
    return [
      new InputRule({
        // Seulement après une espace tapée (« mot ; ») : une adresse (https://…) ou une heure ne bouge pas.
        find: /([^\s\u00a0\u202f(«]) ([;!?])$/,
        handler: ({ state, range, match }) => {
          state.tr.insertText(`${match[1]}\u202f${match[2]}`, range.from, range.to);
        },
      }),
      new InputRule({
        find: /([^\s\u00a0\u202f(«]) (:)$/,
        handler: ({ state, range, match }) => {
          state.tr.insertText(`${match[1]}\u00a0${match[2]}`, range.from, range.to);
        },
      }),
      new InputRule({
        find: /(^|[\s([])"$/,
        handler: ({ state, range, match }) => { state.tr.insertText(`${match[1]}«\u00a0`, range.from, range.to); },
      }),
      new InputRule({
        find: /([^\s])[ ]?"$/,
        handler: ({ state, range, match }) => { state.tr.insertText(`${match[1]}\u00a0»`, range.from, range.to); },
      }),
    ];
  },
});

export default FrenchTypography;
