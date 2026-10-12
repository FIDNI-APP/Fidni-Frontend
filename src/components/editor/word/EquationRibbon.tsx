/**
 * Onglet « Équation » hors de l'éditeur de documents (12/10/2026) : la même rangée de groupes (outils,
 * symboles, options, structures), affichée dans la barre de l'éditeur compact des contenus pendant qu'une
 * équation est ouverte. Les boutons passent par le même registre de commandes.
 */
import React, { useCallback, useMemo } from 'react';
import type { Editor } from '@tiptap/core';
import type { ActiveEquation } from './EquationNode';
import { EquationTab } from './EquationTab';
import { runCommand, type Ctx, type EditorUi, type Params } from './commands';
import './word.css';

const noop = () => {};

const EquationRibbon: React.FC<{ editor: Editor; eq: ActiveEquation }> = ({ editor, eq }) => {
  // Ici, seules les commandes d'équation servent : le reste de l'interface n'existe pas.
  const ui = useMemo<EditorUi>(() => ({
    openImage: noop, openLink: noop, openFind: noop, openCommandSearch: noop, print: noop,
    zoom: 100, setZoom: noop, orientation: 'portrait', setOrientation: noop, marges: 'normale', setMarges: noop,
  }), []);
  const ctx: Ctx = { editor, eq, ui };
  const run = useCallback((id: string, params?: Params) => { runCommand({ editor, eq, ui }, id, params); }, [editor, eq, ui]);
  return (
    <div className="wd-ribbon wd-ribbon-inline" role="toolbar" aria-label="Équation">
      <div className="wd-panel"><EquationTab ctx={ctx} run={run} /></div>
    </div>
  );
};

export default EquationRibbon;
