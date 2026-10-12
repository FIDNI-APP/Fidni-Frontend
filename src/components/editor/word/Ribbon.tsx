/**
 * Ruban de l'éditeur de documents (12/10/2026), découpé comme celui de wordcraft
 * (`crates/engine/src/ribbon.rs`, `TABS` et `CONTEXTUAL_TABS`) : Fichier, Accueil, Insertion,
 * Mise en page, Affichage, puis les onglets contextuels qui viennent avec la sélection (Tableau dans un
 * tableau, Équation dans une équation ouverte). Chaque bouton lance une commande du registre.
 */
import React, { useRef, useState } from 'react';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, ClipboardPaste, Columns3, Copy, FileDown, FilePlus2, FileUp, Files,
  FolderOpen, Highlighter, ImageIcon, IndentDecrease, IndentIncrease, Italic, Link as LinkIcon, List, ListOrdered,
  Merge, Minus, PenLine, Printer, Redo2, RemoveFormatting, Replace, Rows3, Scissors, Search, SeparatorHorizontal,
  Split, Strikethrough, Subscript as SubIcon, Superscript as SupIcon, Table as TableIcon, Trash2, Underline, Undo2,
  ZoomIn, ZoomOut, MessageSquare, RectangleHorizontal, RectangleVertical, PanelTop,
} from 'lucide-react';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { CALLOUT_CONFIGS, type CalloutType } from '@/types/callout';
import { colorOptions } from '../editorConfig';
import { BigButton, Group, MenuButton, MenuItem, SmallButton, Tex, keepFocus } from './RibbonParts';
import { EquationInsertButton, EquationTab } from './EquationTab';
import { FONT_SIZES, ZOOMS, command, isActive, isEnabled, type Ctx, type Params } from './commands';

export type TabId = 'accueil' | 'insertion' | 'miseEnPage' | 'affichage' | 'tableau' | 'equation';

const FONTS: { label: string; value: string }[] = [
  { label: 'Police par défaut', value: '' },
  { label: 'DM Sans', value: 'DM Sans' },
  { label: 'Fraunces', value: 'Fraunces' },
  { label: 'DM Mono', value: 'DM Mono' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Courier New', value: 'Courier New' },
];
const HIGHLIGHTS = ['#fff3a3', '#c9f2d0', '#cfe8ff', '#ffd6e7', '#ffe2c2', '#e3d9ff'];
const SPACINGS = ['1', '1.15', '1.5', '2', '2.5', '3'];

type Run = (id: string, params?: Params) => void;

/** Bouton relié à une commande : libellé, raccourci, état actif/désactivé lus dans le registre. */
const Cmd: React.FC<{ ctx: Ctx; run: Run; id: string; icon: React.ReactNode; big?: boolean; showLabel?: boolean; label?: string; params?: Params }> = ({
  ctx, run, id, icon, big, showLabel, label, params,
}) => {
  const spec = command(id);
  const text = label ?? spec?.label ?? id;
  const title = spec?.keys ? `${text} (${spec.keys})` : text;
  const B = big ? BigButton : SmallButton;
  return <B label={text} title={title} icon={icon} showLabel={showLabel} active={isActive(ctx, id)} disabled={!isEnabled(ctx, id)} onClick={() => run(id, params)} />;
};

const ico = 'h-4 w-4';
const big = 'h-6 w-6';

/** Sélecteur (police, taille) qui n'enlève pas le curseur du texte. */
const Picker: React.FC<{ label: string; value: string; width: number; options: { label: string; value: string }[]; onPick: (v: string) => void; disabled?: boolean; fontPreview?: boolean }> = ({
  label, value, width, options, onPick, disabled, fontPreview,
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? (value || options[0]?.label);
  return (
    <>
      <button ref={ref} type="button" title={label} aria-label={label} aria-expanded={open} disabled={disabled} onMouseDown={keepFocus}
        onClick={() => setOpen((v) => !v)} className="wd-picker" style={{ width }}>
        <span className="truncate">{current}</span><span aria-hidden className="opacity-60">▾</span>
      </button>
      <FloatingPanel anchorRef={ref} open={open} onClose={() => setOpen(false)} className="wd-menu max-h-80 overflow-y-auto p-1" matchWidth={false}>
        {open && options.map((o) => (
          <MenuItem key={o.value || 'defaut'} active={o.value === value} onClick={() => { onPick(o.value); setOpen(false); }}>
            <span style={fontPreview && o.value ? { fontFamily: o.value } : undefined}>{o.label}</span>
          </MenuItem>
        ))}
      </FloatingPanel>
    </>
  );
};

/** Grille de choix d'un tableau (lignes × colonnes), comme Insertion › Tableau. */
const TableGrid: React.FC<{ onPick: (rows: number, cols: number) => void }> = ({ onPick }) => {
  const [hover, setHover] = useState<[number, number]>([0, 0]);
  return (
    <div className="p-2.5">
      <div className="mb-1.5 text-[12px] font-semibold text-ink-soft">{hover[0] ? `Tableau ${hover[1]} × ${hover[0]}` : 'Insérer un tableau'}</div>
      <div className="grid grid-cols-8 gap-[3px]" onMouseLeave={() => setHover([0, 0])}>
        {Array.from({ length: 64 }, (_, i) => {
          const r = Math.floor(i / 8) + 1;
          const c = (i % 8) + 1;
          const on = r <= hover[0] && c <= hover[1];
          return (
            <button key={i} type="button" aria-label={`${c} colonnes × ${r} lignes`} onMouseDown={keepFocus} onMouseEnter={() => setHover([r, c])}
              onFocus={() => setHover([r, c])} onClick={() => onPick(r, c)}
              className={`h-4 w-4 rounded-[2px] border ${on ? 'border-brand bg-brand-soft' : 'border-line bg-white'}`} />
          );
        })}
      </div>
    </div>
  );
};

const Swatches: React.FC<{ colors: string[]; onPick: (c: string) => void; resetLabel: string; onReset: () => void }> = ({ colors, onPick, resetLabel, onReset }) => (
  <div className="w-44 p-2">
    <div className="grid grid-cols-6 gap-1.5">
      {colors.map((c) => (
        <button key={c} type="button" aria-label={`Couleur ${c}`} onMouseDown={keepFocus} onClick={() => onPick(c)}
          className="h-6 w-6 rounded-md border border-line transition-transform hover:scale-110" style={{ backgroundColor: c }} />
      ))}
    </div>
    <button type="button" onMouseDown={keepFocus} onClick={onReset} className="mt-2 w-full rounded-md py-1 text-[12px] font-semibold text-ink-soft hover:bg-[#f2f1ee]">{resetLabel}</button>
  </div>
);

const HomeTab: React.FC<{ ctx: Ctx; run: Run }> = ({ ctx, run }) => {
  const style = ctx.editor.getAttributes('textStyle');
  const family = String(style.fontFamily || '').replace(/["']/g, '');
  const size = String(style.fontSize || '');
  const off = !!ctx.eq;
  return (
    <>
      <Group label="Presse-papiers">
        <Cmd ctx={ctx} run={run} id="edit.paste" big label="Coller" icon={<ClipboardPaste className={big} />} />
        <div className="wd-stack">
          <Cmd ctx={ctx} run={run} id="edit.cut" showLabel icon={<Scissors className={ico} />} />
          <Cmd ctx={ctx} run={run} id="edit.copy" showLabel icon={<Copy className={ico} />} />
        </div>
      </Group>
      <Group label="Police">
        <div className="wd-stack">
          <div className="flex gap-1">
            <Picker label="Police" value={family} width={128} options={FONTS} disabled={off} fontPreview onPick={(v) => run('format.fontFamily', { value: v })} />
            <Picker label="Taille de police" value={size} width={64} disabled={off}
              options={[{ label: 'Auto', value: '' }, ...FONT_SIZES.map((s) => ({ label: s.replace('pt', ''), value: s }))]}
              onPick={(v) => run('format.fontSize', { value: v })} />
            <Cmd ctx={ctx} run={run} id="format.grow" icon={<span className="text-[13px] font-bold">A<sup>+</sup></span>} />
            <Cmd ctx={ctx} run={run} id="format.shrink" icon={<span className="text-[12px] font-bold">A<sup>−</sup></span>} />
          </div>
          <div className="flex gap-0.5">
            <Cmd ctx={ctx} run={run} id="format.bold" icon={<Bold className={ico} />} />
            <Cmd ctx={ctx} run={run} id="format.italic" icon={<Italic className={ico} />} />
            <Cmd ctx={ctx} run={run} id="format.underline" icon={<Underline className={ico} />} />
            <Cmd ctx={ctx} run={run} id="format.strike" icon={<Strikethrough className={ico} />} />
            <Cmd ctx={ctx} run={run} id="format.subscript" icon={<SubIcon className={ico} />} />
            <Cmd ctx={ctx} run={run} id="format.superscript" icon={<SupIcon className={ico} />} />
            <MenuButton label="Surligner" disabled={off} active={isActive(ctx, 'format.highlight')} icon={<Highlighter className={ico} />}>
              {(close) => <Swatches colors={HIGHLIGHTS} resetLabel="Aucun surlignage"
                onPick={(c) => { run('format.highlight', { value: c }); close(); }} onReset={() => { run('format.highlight', { value: 'none' }); close(); }} />}
            </MenuButton>
            <MenuButton label="Couleur de police" disabled={off}
              icon={<Baseline className={ico} style={{ color: String(style.color || '#1a1a1a') }} />}>
              {(close) => <Swatches colors={colorOptions} resetLabel="Automatique"
                onPick={(c) => { run('format.color', { value: c }); close(); }} onReset={() => { run('format.color', { value: '' }); close(); }} />}
            </MenuButton>
            <Cmd ctx={ctx} run={run} id="format.clear" icon={<RemoveFormatting className={ico} />} />
          </div>
        </div>
      </Group>
      <Group label="Paragraphe">
        <div className="wd-stack">
          <div className="flex gap-0.5">
            <Cmd ctx={ctx} run={run} id="para.bullets" icon={<List className={ico} />} />
            <Cmd ctx={ctx} run={run} id="para.numbering" icon={<ListOrdered className={ico} />} />
            <Cmd ctx={ctx} run={run} id="para.outdent" icon={<IndentDecrease className={ico} />} />
            <Cmd ctx={ctx} run={run} id="para.indent" icon={<IndentIncrease className={ico} />} />
          </div>
          <div className="flex gap-0.5">
            <Cmd ctx={ctx} run={run} id="para.alignLeft" icon={<AlignLeft className={ico} />} />
            <Cmd ctx={ctx} run={run} id="para.alignCenter" icon={<AlignCenter className={ico} />} />
            <Cmd ctx={ctx} run={run} id="para.alignRight" icon={<AlignRight className={ico} />} />
            <Cmd ctx={ctx} run={run} id="para.justify" icon={<AlignJustify className={ico} />} />
            <MenuButton label="Interligne" disabled={off} icon={<Rows3 className={ico} />}>
              {(close) => (
                <div className="w-32 p-1">
                  {SPACINGS.map((s) => (
                    <MenuItem key={s} onClick={() => { run('para.lineSpacing', { value: s }); close(); }}>{s.replace('.', ',')}</MenuItem>
                  ))}
                  <MenuItem onClick={() => { run('para.lineSpacing', { value: '' }); close(); }}>Par défaut</MenuItem>
                </div>
              )}
            </MenuButton>
          </div>
        </div>
      </Group>
      <Group label="Styles" className="wd-styles">
        {([['style.normal', 'Normal', 'wd-style-normal'], ['style.heading1', 'Titre 1', 'wd-style-h1'], ['style.heading2', 'Titre 2', 'wd-style-h2'],
          ['style.heading3', 'Titre 3', 'wd-style-h3'], ['style.quote', 'Citation', 'wd-style-quote']] as const).map(([id, label, cls]) => (
          <button key={id} type="button" onMouseDown={keepFocus} onClick={() => run(id)} disabled={!isEnabled(ctx, id)}
            title={command(id)?.keys ? `${label} (${command(id)?.keys})` : label} aria-pressed={isActive(ctx, id)}
            className={`wd-style ${cls} ${isActive(ctx, id) ? 'is-active' : ''}`}>
            <span className="wd-style-sample">AaBbCc</span><span className="wd-style-name">{label}</span>
          </button>
        ))}
      </Group>
      <Group label="Modification">
        <div className="wd-stack">
          <Cmd ctx={ctx} run={run} id="edit.find" showLabel icon={<Search className={ico} />} />
          <Cmd ctx={ctx} run={run} id="edit.replace" showLabel icon={<Replace className={ico} />} />
        </div>
      </Group>
    </>
  );
};

const InsertTab: React.FC<{ ctx: Ctx; run: Run }> = ({ ctx, run }) => {
  const off = !!ctx.eq;
  return (
    <>
      <Group label="Pages">
        <Cmd ctx={ctx} run={run} id="insert.pageBreak" big icon={<SeparatorHorizontal className={big} />} />
        <Cmd ctx={ctx} run={run} id="insert.horizontalRule" big label="Ligne" icon={<Minus className={big} />} />
      </Group>
      <Group label="Tableaux">
        <MenuButton big label="Tableau" disabled={off} icon={<TableIcon className={big} />}>
          {(close) => <TableGrid onPick={(rows, cols) => { run('insert.table', { rows, cols }); close(); }} />}
        </MenuButton>
      </Group>
      <Group label="Illustrations">
        <Cmd ctx={ctx} run={run} id="insert.image" big icon={<ImageIcon className={big} />} />
      </Group>
      <Group label="Liens">
        <Cmd ctx={ctx} run={run} id="insert.link" big icon={<LinkIcon className={big} />} />
      </Group>
      <Group label="Encarts">
        <MenuButton big label="Encart" disabled={off} icon={<MessageSquare className={big} />}>
          {(close) => (
            <div className="grid w-64 grid-cols-2 gap-1.5 p-2">
              {(Object.keys(CALLOUT_CONFIGS) as CalloutType[]).map((type) => {
                const c = CALLOUT_CONFIGS[type];
                return (
                  <button key={type} type="button" onMouseDown={keepFocus} onClick={() => { run('insert.callout', { type }); close(); }}
                    className={`flex items-center gap-2 rounded-lg border p-2 text-left hover:bg-[#faf9f7] ${c.borderColor}`}>
                    <span className="shrink-0 text-base">{c.icon}</span>
                    <span className={`truncate text-[12px] font-semibold ${c.textColor}`}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </MenuButton>
      </Group>
      <Group label="Symboles">
        <EquationInsertButton run={run} disabled={off} />
        <Cmd ctx={ctx} run={run} id="insert.variationTable" big label="Tableau de var." icon={<span className="wd-tv-icon"><Tex tex="\nearrow\searrow" /></span>} />
      </Group>
    </>
  );
};

const LayoutTab: React.FC<{ ctx: Ctx; run: Run }> = ({ ctx, run }) => (
  <>
    <Group label="Orientation">
      <Cmd ctx={ctx} run={run} id="layout.portrait" big label="Portrait" icon={<RectangleVertical className={big} />} />
      <Cmd ctx={ctx} run={run} id="layout.landscape" big label="Paysage" icon={<RectangleHorizontal className={big} />} />
    </Group>
    <Group label="Marges">
      <div className="wd-stack">
        <Cmd ctx={ctx} run={run} id="layout.marginsNormal" showLabel label="Normales (2,5 cm)" icon={<PanelTop className={ico} />} />
        <Cmd ctx={ctx} run={run} id="layout.marginsNarrow" showLabel label="Étroites (1,27 cm)" icon={<PanelTop className={ico} />} />
        <Cmd ctx={ctx} run={run} id="layout.marginsWide" showLabel label="Larges (3,5 cm)" icon={<PanelTop className={ico} />} />
      </div>
    </Group>
    <Group label="Saut">
      <Cmd ctx={ctx} run={run} id="insert.pageBreak" big icon={<SeparatorHorizontal className={big} />} />
    </Group>
    {ctx.ui.entete && (
      <Group label="En-tête">
        <Cmd ctx={ctx} run={run} id="layout.entete" big label="En-tête FIDNI" icon={<PanelTop className={big} />} />
        <div className="wd-stack">
          <Cmd ctx={ctx} run={run} id="layout.enteteEdit" showLabel label="Modifier…" icon={<PenLine className={ico} />} />
        </div>
      </Group>
    )}
  </>
);

const ViewTab: React.FC<{ ctx: Ctx; run: Run }> = ({ ctx, run }) => (
  <Group label="Zoom">
    <Cmd ctx={ctx} run={run} id="view.zoomOut" big icon={<ZoomOut className={big} />} />
    <Cmd ctx={ctx} run={run} id="view.zoom100" big label="100 %" icon={<span className="text-[15px] font-bold">1:1</span>} />
    <Cmd ctx={ctx} run={run} id="view.zoomIn" big icon={<ZoomIn className={big} />} />
    <div className="wd-stack">
      <Picker label="Zoom" value={String(ctx.ui.zoom)} width={84} options={ZOOMS.map((z) => ({ label: `${z} %`, value: String(z) }))}
        onPick={(v) => ctx.ui.setZoom(Number(v))} />
    </div>
  </Group>
);

const TableTab: React.FC<{ ctx: Ctx; run: Run }> = ({ ctx, run }) => (
  <>
    <Group label="Lignes et colonnes">
      <div className="wd-stack">
        <Cmd ctx={ctx} run={run} id="table.rowBefore" showLabel label="Ligne au-dessus" icon={<Rows3 className={ico} />} />
        <Cmd ctx={ctx} run={run} id="table.rowAfter" showLabel label="Ligne en dessous" icon={<Rows3 className={ico} />} />
      </div>
      <div className="wd-stack">
        <Cmd ctx={ctx} run={run} id="table.colBefore" showLabel label="Colonne à gauche" icon={<Columns3 className={ico} />} />
        <Cmd ctx={ctx} run={run} id="table.colAfter" showLabel label="Colonne à droite" icon={<Columns3 className={ico} />} />
      </div>
    </Group>
    <Group label="Fusionner">
      <div className="wd-stack">
        <Cmd ctx={ctx} run={run} id="table.merge" showLabel label="Fusionner" icon={<Merge className={ico} />} />
        <Cmd ctx={ctx} run={run} id="table.split" showLabel label="Fractionner" icon={<Split className={ico} />} />
        <Cmd ctx={ctx} run={run} id="table.headerRow" showLabel label="Ligne d’en-tête" icon={<PenLine className={ico} />} />
      </div>
    </Group>
    <Group label="Supprimer">
      <div className="wd-stack">
        <Cmd ctx={ctx} run={run} id="table.deleteRow" showLabel label="La ligne" icon={<Trash2 className={ico} />} />
        <Cmd ctx={ctx} run={run} id="table.deleteCol" showLabel label="La colonne" icon={<Trash2 className={ico} />} />
        <Cmd ctx={ctx} run={run} id="table.delete" showLabel label="Le tableau" icon={<Trash2 className={ico} />} />
      </div>
    </Group>
  </>
);

/** Menu Fichier (le « Backstage » réduit à l'essentiel). */
const FileMenu: React.FC<{ ctx: Ctx; run: Run }> = ({ ctx, run }) => (
  <MenuButton label="Fichier" showLabel icon={null} panelClassName="w-60 p-1">
    {(close) => (
      <>
        {([['file.new', FilePlus2], ['file.duplicate', Files], ['file.rename', PenLine], ['file.list', FolderOpen], ['file.importTex', FileDown], ['file.exportTex', FileUp], ['file.print', Printer]] as const)
          .filter(([id]) => id === 'file.print' || isEnabled(ctx, id))
          .map(([id, Icon]) => (
            <MenuItem key={id} hint={command(id)?.keys} onClick={() => { close(); run(id); }}>
              <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4" /> {command(id)?.label}</span>
            </MenuItem>
          ))}
      </>
    )}
  </MenuButton>
);

export const Ribbon: React.FC<{ ctx: Ctx; run: Run; tab: TabId; setTab: (t: TabId) => void; inTable: boolean }> = ({ ctx, run, tab, setTab, inTable }) => {
  const tabs: { id: TabId; label: string; contextual?: boolean }[] = [
    { id: 'accueil', label: 'Accueil' },
    { id: 'insertion', label: 'Insertion' },
    { id: 'miseEnPage', label: 'Mise en page' },
    { id: 'affichage', label: 'Affichage' },
    ...(inTable ? [{ id: 'tableau' as TabId, label: 'Tableau', contextual: true }] : []),
    ...(ctx.eq ? [{ id: 'equation' as TabId, label: 'Équation', contextual: true }] : []),
  ];
  const current = tabs.some((t) => t.id === tab) ? tab : 'accueil';
  return (
    <div className="wd-ribbon">
      <div className="wd-tabs" role="tablist" aria-label="Ruban">
        <FileMenu ctx={ctx} run={run} />
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={current === t.id} onMouseDown={keepFocus} onClick={() => setTab(t.id)}
            className={`wd-tab ${current === t.id ? 'is-active' : ''} ${t.contextual ? 'is-contextual' : ''}`}>
            {t.label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-0.5 pr-1">
          <Cmd ctx={ctx} run={run} id="edit.undo" icon={<Undo2 className={ico} />} />
          <Cmd ctx={ctx} run={run} id="edit.redo" icon={<Redo2 className={ico} />} />
          <button type="button" onMouseDown={keepFocus} onClick={() => run('tools.commands')} className="wd-tellme" title="Rechercher une commande (Alt+Q)">
            <Search className="h-3.5 w-3.5" /> <span>Rechercher une commande</span>
          </button>
        </span>
      </div>
      <div className="wd-panel" role="tabpanel">
        {current === 'accueil' && <HomeTab ctx={ctx} run={run} />}
        {current === 'insertion' && <InsertTab ctx={ctx} run={run} />}
        {current === 'miseEnPage' && <LayoutTab ctx={ctx} run={run} />}
        {current === 'affichage' && <ViewTab ctx={ctx} run={run} />}
        {current === 'tableau' && <TableTab ctx={ctx} run={run} />}
        {current === 'equation' && <EquationTab ctx={ctx} run={run} />}
      </div>
    </div>
  );
};
