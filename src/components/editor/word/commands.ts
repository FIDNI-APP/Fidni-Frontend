/**
 * Registre de commandes de l'éditeur de documents (12/10/2026), sur le principe de wordcraft
 * (« tout est une commande », `crates/engine/src/cmd/*.rs`) : chaque action visible a un id, un libellé,
 * son emplacement dans le ruban, un raccourci éventuel, `enabled`/`active` et `run`. Le ruban, les
 * raccourcis et « Rechercher une commande » appellent tous les mêmes ids ; aucune ne plante si elle ne
 * s'applique pas (elle est simplement désactivée).
 */
import type { Editor } from '@tiptap/core';
import type { ActiveEquation } from './EquationNode';
import { BUILT_INS, templateById } from './mathGallery';
import type { CalloutType } from '@/types/callout';

export type Orientation = 'portrait' | 'paysage';
export type Marges = 'normale' | 'etroite' | 'large';

/** Ce que l'interface sait faire (fenêtres, zoom, mise en page) : fourni par WordEditor. */
export interface EditorUi {
  openImage: () => void;
  openLink: () => void;
  openFind: (replace: boolean) => void;
  openCommandSearch: () => void;
  /** Tableau de variations / de signes (fenêtre). */
  openVariationTable?: () => void;
  print: () => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
  marges: Marges;
  setMarges: (m: Marges) => void;
  /** En-tête FIDNI de la première page (documents). */
  entete?: { actif: boolean; toggle: () => void; edit: () => void };
  /** Fichier : actions fournies par la page (nouveau, dupliquer…), absentes dans un éditeur intégré. */
  file?: {
    newDocument?: () => void; duplicate?: () => void; rename?: () => void; list?: () => void;
    /** Word : importer un .docx (nouveau document), exporter le document en .docx. */
    importDocx?: () => void; exportDocx?: () => void;
    /** Publier le document sur FIDNI (exercice, devoir ou leçon). */
    publish?: () => void;
  };
  /** LaTeX : exporter le document en .tex. */
  latex?: { exportTex: () => void };
  /** Renuméroter les équations (1), (2)… dans l'ordre du document. */
  renumberEquations?: () => void;
}

export interface Ctx {
  editor: Editor;
  eq: ActiveEquation | null;
  ui: EditorUi;
}

export type Params = Record<string, unknown> | undefined;

export interface CommandSpec {
  id: string;
  label: string;
  /** « Accueil › Police » : où la trouver (affiché dans la recherche de commandes). */
  location: string;
  keys?: string;
  run: (ctx: Ctx, params?: Params) => void;
  enabled?: (ctx: Ctx) => boolean;
  active?: (ctx: Ctx) => boolean;
  /** Absente de la recherche (commandes à paramètre seulement). */
  hidden?: boolean;
}

const chain = (c: Ctx) => c.editor.chain().focus();
const str = (p: Params, k: string) => (typeof p?.[k] === 'string' ? (p[k] as string) : '');
const inText = (c: Ctx) => !c.eq;

export const ZOOMS = [50, 75, 90, 100, 110, 125, 150, 175, 200];

const COMMANDS: CommandSpec[] = [
  // ── Fichier
  { id: 'file.new', label: 'Nouveau document', location: 'Fichier', run: (c) => c.ui.file?.newDocument?.(), enabled: (c) => !!c.ui.file?.newDocument },
  { id: 'file.duplicate', label: 'Dupliquer le document', location: 'Fichier', run: (c) => c.ui.file?.duplicate?.(), enabled: (c) => !!c.ui.file?.duplicate },
  { id: 'file.rename', label: 'Renommer', location: 'Fichier', run: (c) => c.ui.file?.rename?.(), enabled: (c) => !!c.ui.file?.rename },
  { id: 'file.list', label: 'Mes documents', location: 'Fichier', run: (c) => c.ui.file?.list?.(), enabled: (c) => !!c.ui.file?.list },
  { id: 'file.exportTex', label: 'Exporter en LaTeX (.tex)', location: 'Fichier', run: (c) => c.ui.latex?.exportTex(), enabled: (c) => !!c.ui.latex },
  { id: 'file.importDocx', label: 'Importer un document Word (.docx)', location: 'Fichier', run: (c) => c.ui.file?.importDocx?.(), enabled: (c) => !!c.ui.file?.importDocx },
  { id: 'file.exportDocx', label: 'Exporter en Word (.docx)', location: 'Fichier', run: (c) => c.ui.file?.exportDocx?.(), enabled: (c) => !!c.ui.file?.exportDocx },
  { id: 'file.publish', label: 'Publier sur FIDNI', location: 'Fichier', run: (c) => c.ui.file?.publish?.(), enabled: (c) => !!c.ui.file?.publish },
  { id: 'file.print', label: 'Imprimer / PDF', location: 'Fichier', keys: 'Ctrl+P', run: (c) => c.ui.print() },

  // ── Accueil › Presse-papiers et modification
  { id: 'edit.undo', label: 'Annuler', location: 'Accès rapide', keys: 'Ctrl+Z', run: (c) => chain(c).undo().run(), enabled: (c) => inText(c) && c.editor.can().undo() },
  { id: 'edit.redo', label: 'Rétablir', location: 'Accès rapide', keys: 'Ctrl+Y', run: (c) => chain(c).redo().run(), enabled: (c) => inText(c) && c.editor.can().redo() },
  { id: 'edit.cut', label: 'Couper', location: 'Accueil › Presse-papiers', keys: 'Ctrl+X', run: (c) => { c.editor.view.focus(); document.execCommand('cut'); }, enabled: (c) => inText(c) && !c.editor.state.selection.empty },
  { id: 'edit.copy', label: 'Copier', location: 'Accueil › Presse-papiers', keys: 'Ctrl+C', run: (c) => { c.editor.view.focus(); document.execCommand('copy'); }, enabled: (c) => inText(c) && !c.editor.state.selection.empty },
  {
    id: 'edit.paste', label: 'Coller (texte)', location: 'Accueil › Presse-papiers', keys: 'Ctrl+V',
    run: (c) => { navigator.clipboard?.readText?.().then((t) => { if (t) chain(c).insertContent(t).run(); }).catch(() => {}); },
    enabled: inText,
  },
  { id: 'edit.find', label: 'Rechercher', location: 'Accueil › Modification', keys: 'Ctrl+F', run: (c) => c.ui.openFind(false) },
  { id: 'edit.replace', label: 'Remplacer', location: 'Accueil › Modification', keys: 'Ctrl+H', run: (c) => c.ui.openFind(true) },
  { id: 'edit.selectAll', label: 'Sélectionner tout', location: 'Accueil › Modification', keys: 'Ctrl+A', run: (c) => chain(c).selectAll().run() },
  { id: 'tools.commands', label: 'Rechercher une commande', location: 'Ruban', keys: 'Alt+Q', run: (c) => c.ui.openCommandSearch() },

  // ── Accueil › Police
  { id: 'format.bold', label: 'Gras', location: 'Accueil › Police', keys: 'Ctrl+B', run: (c) => chain(c).toggleBold().run(), active: (c) => c.editor.isActive('bold'), enabled: inText },
  { id: 'format.italic', label: 'Italique', location: 'Accueil › Police', keys: 'Ctrl+I', run: (c) => chain(c).toggleItalic().run(), active: (c) => c.editor.isActive('italic'), enabled: inText },
  { id: 'format.underline', label: 'Souligné', location: 'Accueil › Police', keys: 'Ctrl+U', run: (c) => chain(c).toggleUnderline().run(), active: (c) => c.editor.isActive('underline'), enabled: inText },
  { id: 'format.strike', label: 'Barré', location: 'Accueil › Police', run: (c) => chain(c).toggleStrike().run(), active: (c) => c.editor.isActive('strike'), enabled: inText },
  { id: 'format.subscript', label: 'Indice', location: 'Accueil › Police', keys: 'Ctrl+=', run: (c) => chain(c).toggleSubscript().run(), active: (c) => c.editor.isActive('subscript'), enabled: inText },
  { id: 'format.superscript', label: 'Exposant', location: 'Accueil › Police', keys: 'Ctrl+Shift++', run: (c) => chain(c).toggleSuperscript().run(), active: (c) => c.editor.isActive('superscript'), enabled: inText },
  { id: 'format.clear', label: 'Effacer la mise en forme', location: 'Accueil › Police', run: (c) => chain(c).unsetAllMarks().unsetTextAlign().setLineSpacing(null).run(), enabled: inText },
  { id: 'format.fontFamily', label: 'Police', location: 'Accueil › Police', hidden: true, enabled: inText,
    run: (c, p) => { const f = str(p, 'value'); if (f) chain(c).setFontFamily(f).run(); else chain(c).unsetFontFamily().run(); } },
  { id: 'format.fontSize', label: 'Taille de police', location: 'Accueil › Police', hidden: true, enabled: inText,
    run: (c, p) => { const s = str(p, 'value'); if (s) chain(c).setFontSize(s).run(); else chain(c).unsetFontSize().run(); } },
  { id: 'format.grow', label: 'Augmenter la taille de police', location: 'Accueil › Police', keys: 'Ctrl+>', enabled: inText, run: (c) => stepSize(c, 1) },
  { id: 'format.shrink', label: 'Diminuer la taille de police', location: 'Accueil › Police', keys: 'Ctrl+<', enabled: inText, run: (c) => stepSize(c, -1) },
  { id: 'format.color', label: 'Couleur de police', location: 'Accueil › Police', hidden: true, enabled: inText,
    run: (c, p) => { const v = str(p, 'value'); if (v) chain(c).setColor(v).run(); else chain(c).unsetColor().run(); } },
  { id: 'format.highlight', label: 'Surligner', location: 'Accueil › Police', enabled: inText,
    run: (c, p) => { const v = str(p, 'value'); if (v === 'none') chain(c).unsetHighlight().run(); else chain(c).toggleHighlight({ color: v || '#fff3a3' }).run(); },
    active: (c) => c.editor.isActive('highlight') },

  // ── Accueil › Paragraphe
  { id: 'para.bullets', label: 'Puces', location: 'Accueil › Paragraphe', run: (c) => chain(c).toggleBulletList().run(), active: (c) => c.editor.isActive('bulletList'), enabled: inText },
  { id: 'para.numbering', label: 'Numérotation', location: 'Accueil › Paragraphe', run: (c) => chain(c).toggleOrderedList().run(), active: (c) => c.editor.isActive('orderedList'), enabled: inText },
  { id: 'para.outdent', label: 'Diminuer le retrait', location: 'Accueil › Paragraphe', run: (c) => chain(c).outdent().run(), enabled: inText },
  { id: 'para.indent', label: 'Augmenter le retrait', location: 'Accueil › Paragraphe', run: (c) => chain(c).indent().run(), enabled: inText },
  { id: 'para.alignLeft', label: 'Aligner à gauche', location: 'Accueil › Paragraphe', keys: 'Ctrl+L', run: (c) => chain(c).setTextAlign('left').run(), active: (c) => c.editor.isActive({ textAlign: 'left' }), enabled: inText },
  { id: 'para.alignCenter', label: 'Centrer', location: 'Accueil › Paragraphe', keys: 'Ctrl+E', run: (c) => chain(c).setTextAlign('center').run(), active: (c) => c.editor.isActive({ textAlign: 'center' }), enabled: inText },
  { id: 'para.alignRight', label: 'Aligner à droite', location: 'Accueil › Paragraphe', keys: 'Ctrl+R', run: (c) => chain(c).setTextAlign('right').run(), active: (c) => c.editor.isActive({ textAlign: 'right' }), enabled: inText },
  { id: 'para.justify', label: 'Justifier', location: 'Accueil › Paragraphe', keys: 'Ctrl+J', run: (c) => chain(c).setTextAlign('justify').run(), active: (c) => c.editor.isActive({ textAlign: 'justify' }), enabled: inText },
  { id: 'para.lineSpacing', label: 'Interligne', location: 'Accueil › Paragraphe', hidden: true, enabled: inText,
    run: (c, p) => chain(c).setLineSpacing(str(p, 'value') || null).run() },

  // ── Accueil › Styles
  { id: 'style.normal', label: 'Normal', location: 'Accueil › Styles', keys: 'Ctrl+Shift+N', run: (c) => chain(c).setParagraph().run(), active: (c) => c.editor.isActive('paragraph') && !c.editor.isActive('blockquote'), enabled: inText },
  { id: 'style.heading1', label: 'Titre 1', location: 'Accueil › Styles', keys: 'Ctrl+Alt+1', run: (c) => chain(c).toggleHeading({ level: 1 }).run(), active: (c) => c.editor.isActive('heading', { level: 1 }), enabled: inText },
  { id: 'style.heading2', label: 'Titre 2', location: 'Accueil › Styles', keys: 'Ctrl+Alt+2', run: (c) => chain(c).toggleHeading({ level: 2 }).run(), active: (c) => c.editor.isActive('heading', { level: 2 }), enabled: inText },
  { id: 'style.heading3', label: 'Titre 3', location: 'Accueil › Styles', keys: 'Ctrl+Alt+3', run: (c) => chain(c).toggleHeading({ level: 3 }).run(), active: (c) => c.editor.isActive('heading', { level: 3 }), enabled: inText },
  { id: 'style.quote', label: 'Citation', location: 'Accueil › Styles', run: (c) => chain(c).toggleBlockquote().run(), active: (c) => c.editor.isActive('blockquote'), enabled: inText },

  // ── Insertion
  { id: 'insert.pageBreak', label: 'Saut de page', location: 'Insertion › Pages', keys: 'Ctrl+Entrée', run: (c) => chain(c).setPageBreak().run(), enabled: inText },
  { id: 'insert.table', label: 'Tableau', location: 'Insertion › Tableaux', enabled: inText,
    run: (c, p) => {
      const rows = clampInt(p?.rows, 1, 20, 3);
      const cols = clampInt(p?.cols, 1, 10, 3);
      chain(c).insertTable({ rows, cols, withHeaderRow: false }).run();
    } },
  { id: 'insert.image', label: 'Image', location: 'Insertion › Illustrations', run: (c) => c.ui.openImage(), enabled: inText },
  { id: 'insert.link', label: 'Lien', location: 'Insertion › Liens', keys: 'Ctrl+K', run: (c) => c.ui.openLink(), enabled: inText, active: (c) => c.editor.isActive('link') },
  { id: 'insert.horizontalRule', label: 'Ligne horizontale', location: 'Insertion › Pages', run: (c) => chain(c).setHorizontalRule().run(), enabled: inText },
  { id: 'insert.callout', label: 'Encart (théorème, définition…)', location: 'Insertion › Encarts', hidden: true, enabled: inText,
    run: (c, p) => { const type = str(p, 'type') as CalloutType; if (type) chain(c).setCallout({ type }).run(); } },
  { id: 'insert.equation', label: 'Nouvelle équation', location: 'Insertion › Symboles', keys: 'Alt+=', enabled: inText,
    run: (c, p) => {
      const b = BUILT_INS.find((x) => x.id === str(p, 'builtin'));
      if (b) chain(c).insertMath(b.tex, true).run();
      else chain(c).insertEquation().run();
    } },
  { id: 'insert.variationTable', label: 'Tableau de variations / de signes', location: 'Insertion › Symboles',
    run: (c) => { c.eq?.close('after'); c.ui.openVariationTable?.(); }, enabled: (c) => !!c.ui.openVariationTable },
  { id: 'insert.inlineFormula', label: 'Formule LaTeX ($…$)', location: 'Insertion › Symboles', hidden: true, enabled: inText,
    run: (c, p) => { const tex = str(p, 'latex'); if (tex) chain(c).insertMath(tex, p?.display === true).run(); } },

  // ── Tableau (onglet contextuel)
  { id: 'table.rowBefore', label: 'Insérer une ligne au-dessus', location: 'Tableau', run: (c) => chain(c).addRowBefore().run(), enabled: (c) => c.editor.can().addRowBefore() },
  { id: 'table.rowAfter', label: 'Insérer une ligne en dessous', location: 'Tableau', run: (c) => chain(c).addRowAfter().run(), enabled: (c) => c.editor.can().addRowAfter() },
  { id: 'table.colBefore', label: 'Insérer une colonne à gauche', location: 'Tableau', run: (c) => chain(c).addColumnBefore().run(), enabled: (c) => c.editor.can().addColumnBefore() },
  { id: 'table.colAfter', label: 'Insérer une colonne à droite', location: 'Tableau', run: (c) => chain(c).addColumnAfter().run(), enabled: (c) => c.editor.can().addColumnAfter() },
  { id: 'table.deleteRow', label: 'Supprimer la ligne', location: 'Tableau', run: (c) => chain(c).deleteRow().run(), enabled: (c) => c.editor.can().deleteRow() },
  { id: 'table.deleteCol', label: 'Supprimer la colonne', location: 'Tableau', run: (c) => chain(c).deleteColumn().run(), enabled: (c) => c.editor.can().deleteColumn() },
  { id: 'table.merge', label: 'Fusionner les cellules', location: 'Tableau', run: (c) => chain(c).mergeCells().run(), enabled: (c) => c.editor.can().mergeCells() },
  { id: 'table.split', label: 'Fractionner la cellule', location: 'Tableau', run: (c) => chain(c).splitCell().run(), enabled: (c) => c.editor.can().splitCell() },
  { id: 'table.headerRow', label: 'Ligne d’en-tête', location: 'Tableau', run: (c) => chain(c).toggleHeaderRow().run(), enabled: (c) => c.editor.can().toggleHeaderRow() },
  { id: 'table.delete', label: 'Supprimer le tableau', location: 'Tableau', run: (c) => chain(c).deleteTable().run(), enabled: (c) => c.editor.can().deleteTable() },

  // ── Mise en page
  { id: 'layout.portrait', label: 'Orientation portrait', location: 'Mise en page › Orientation', run: (c) => c.ui.setOrientation('portrait'), active: (c) => c.ui.orientation === 'portrait' },
  { id: 'layout.landscape', label: 'Orientation paysage', location: 'Mise en page › Orientation', run: (c) => c.ui.setOrientation('paysage'), active: (c) => c.ui.orientation === 'paysage' },
  { id: 'layout.marginsNormal', label: 'Marges normales', location: 'Mise en page › Marges', run: (c) => c.ui.setMarges('normale'), active: (c) => c.ui.marges === 'normale' },
  { id: 'layout.marginsNarrow', label: 'Marges étroites', location: 'Mise en page › Marges', run: (c) => c.ui.setMarges('etroite'), active: (c) => c.ui.marges === 'etroite' },
  { id: 'layout.marginsWide', label: 'Marges larges', location: 'Mise en page › Marges', run: (c) => c.ui.setMarges('large'), active: (c) => c.ui.marges === 'large' },

  { id: 'layout.entete', label: 'En-tête FIDNI (établissement, classe, nom et prénom)', location: 'Mise en page › En-tête',
    run: (c) => c.ui.entete?.toggle(), enabled: (c) => !!c.ui.entete, active: (c) => !!c.ui.entete?.actif },
  { id: 'layout.enteteEdit', label: 'Modifier l’en-tête', location: 'Mise en page › En-tête',
    run: (c) => c.ui.entete?.edit(), enabled: (c) => !!c.ui.entete },

  // ── Affichage
  { id: 'view.zoomIn', label: 'Zoom avant', location: 'Affichage › Zoom', keys: 'Ctrl+Alt+=', run: (c) => c.ui.setZoom(ZOOMS.find((z) => z > c.ui.zoom) ?? c.ui.zoom), enabled: (c) => c.ui.zoom < ZOOMS[ZOOMS.length - 1] },
  { id: 'view.zoomOut', label: 'Zoom arrière', location: 'Affichage › Zoom', keys: 'Ctrl+Alt+-', run: (c) => c.ui.setZoom([...ZOOMS].reverse().find((z) => z < c.ui.zoom) ?? c.ui.zoom), enabled: (c) => c.ui.zoom > ZOOMS[0] },
  { id: 'view.zoom100', label: 'Zoom 100 %', location: 'Affichage › Zoom', run: (c) => c.ui.setZoom(100), active: (c) => c.ui.zoom === 100 },

  // ── Équation (onglet contextuel, comme wordcraft `equation_tab.rs`)
  { id: 'equation.display', label: 'Équation centrée (affichage)', location: 'Équation › Options', run: (c) => c.eq?.setDisplay(true), enabled: (c) => !!c.eq, active: (c) => !!c.eq?.display },
  { id: 'equation.inline', label: 'Équation dans la ligne', location: 'Équation › Options', run: (c) => c.eq?.setDisplay(false), enabled: (c) => !!c.eq, active: (c) => !!c.eq && !c.eq.display },
  { id: 'equation.number', label: 'Numéroter l’équation', location: 'Équation › Options', run: (c) => c.eq?.toggleNumber(), enabled: (c) => !!c.eq, active: (c) => !!c.eq?.numbered },
  { id: 'equation.renumber', label: 'Renuméroter les équations', location: 'Équation › Options',
    run: (c) => c.ui.renumberEquations?.(), enabled: (c) => !!c.ui.renumberEquations },
  { id: 'equation.close', label: 'Fermer l’équation', location: 'Équation › Options', keys: 'Échap', run: (c) => c.eq?.close('after'), enabled: (c) => !!c.eq },
  { id: 'equation.insertStructure', label: 'Insérer une structure', location: 'Équation › Structures', hidden: true,
    run: (c, p) => {
      const tpl = templateById(str(p, 'id'));
      const tex = tpl?.tex ?? str(p, 'tex');
      if (!tex) return;
      // Hors d'une équation : une nouvelle équation qui contient la structure (comme Word).
      if (c.eq) c.eq.insert(tex);
      else chain(c).insertEquation('', false, tex).run();
    } },
  { id: 'equation.insertSymbol', label: 'Insérer un symbole', location: 'Équation › Symboles', hidden: true,
    run: (c, p) => { const tex = str(p, 'tex'); if (tex && c.eq) c.eq.insert(tex); else if (tex) chain(c).insertEquation('', false, tex).run(); } },
];

const SIZES = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '36pt', '48pt', '72pt'];
export const FONT_SIZES = SIZES;

function stepSize(c: Ctx, dir: 1 | -1) {
  const cur = String(c.editor.getAttributes('textStyle').fontSize || '12pt');
  const i = SIZES.indexOf(cur);
  const n = SIZES[Math.max(0, Math.min(SIZES.length - 1, (i < 0 ? 4 : i) + dir))];
  chain(c).setFontSize(n).run();
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === 'number' ? Math.round(v) : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

const BY_ID = new Map(COMMANDS.map((c) => [c.id, c]));

export const command = (id: string) => BY_ID.get(id);
export const searchableCommands = () => COMMANDS.filter((c) => !c.hidden);

/** Exécute une commande par son id ; jamais d'exception vers l'interface (une commande ratée ne fait rien). */
export function runCommand(ctx: Ctx, id: string, params?: Params): boolean {
  const spec = BY_ID.get(id);
  if (!spec) return false;
  try {
    if (spec.enabled && !spec.enabled(ctx)) return false;
    spec.run(ctx, params);
    return true;
  } catch (e) {
    console.error(`[éditeur] commande ${id} :`, e);
    return false;
  }
}

export function isEnabled(ctx: Ctx, id: string) {
  const spec = BY_ID.get(id);
  try { return !!spec && (!spec.enabled || spec.enabled(ctx)); } catch { return false; }
}

export function isActive(ctx: Ctx, id: string) {
  const spec = BY_ID.get(id);
  try { return !!spec?.active?.(ctx); } catch { return false; }
}
