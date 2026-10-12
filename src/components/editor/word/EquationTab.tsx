/**
 * Onglet contextuel « Équation » et bouton Insertion › Équation (12/10/2026), portés de wordcraft
 * (`crates/ui-egui/src/equation_tab.rs`) : groupes Outils (équations prêtes, code LaTeX), Symboles (une
 * bande du jeu courant, ▲ ▼ et tous les jeux), Structures (onze galeries dont le bouton montre une
 * formule rendue) et Options (centrée, dans la ligne, numéroter, fermer).
 */
import React, { useEffect, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, ChevronDown, ChevronUp, Code2, Hash, LogOut, MoreHorizontal, Sigma } from 'lucide-react';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { BUILT_INS, STRUCTURES, SYMBOL_SETS, forPreview, type MathGallery } from './mathGallery';
import { mathFormulaCategories } from '../editorConfig';
import { Group, MenuButton, MenuHeading, SmallButton, Tex, keepFocus } from './RibbonParts';
import type { Ctx, Params } from './commands';
import { isActive, isEnabled } from './commands';

type Run = (id: string, params?: Params) => void;

/** Menu d'une galerie de structures : sections titrées, vignettes rendues. */
const StructureMenu: React.FC<{ gallery: MathGallery; onPick: (id: string) => void }> = ({ gallery, onPick }) => (
  <div className="max-h-[min(520px,70vh)] w-[min(360px,calc(100vw-16px))] overflow-y-auto p-1.5">
    {gallery.sections.map((s) => {
      const wide = s.templates.some((x) => x.tex.length > 40);
      return (
        <section key={s.name} className="mb-1.5">
          <MenuHeading>{s.name}</MenuHeading>
          <div className={`grid gap-1 ${wide ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {s.templates.map((tpl) => (
              <button key={tpl.id} type="button" title={tpl.label} aria-label={tpl.label} onMouseDown={keepFocus} onClick={() => onPick(tpl.id)}
                className="wd-tile">
                <Tex tex={forPreview(tpl.tex)} />
              </button>
            ))}
          </div>
        </section>
      );
    })}
  </div>
);

/** Équations prêtes : celles de wordcraft, puis les modèles du programme. */
const BuiltInMenu: React.FC<{ run: Run; close: () => void; inEquation: boolean }> = ({ run, close, inEquation }) => (
  <div className="w-[min(380px,calc(100vw-16px))]">
    <div className="max-h-[min(520px,65vh)] overflow-y-auto p-1.5">
      <MenuHeading>Équations prêtes</MenuHeading>
      {BUILT_INS.map((b) => (
        <button key={b.id} type="button" onMouseDown={keepFocus}
          onClick={() => { run(inEquation ? 'equation.insertStructure' : 'insert.equation', inEquation ? { tex: b.tex } : { builtin: b.id }); close(); }}
          className="wd-builtin">
          <span className="wd-builtin-label">{b.label}</span>
          <Tex tex={b.tex} display className="wd-builtin-tex" />
        </button>
      ))}
      {mathFormulaCategories.map((cat) => (
        <div key={cat.name}>
          <MenuHeading>Programme · {cat.name}</MenuHeading>
          {cat.formulas.map((f) => (
            <button key={f.name} type="button" onMouseDown={keepFocus}
              onClick={() => { run(inEquation ? 'equation.insertStructure' : 'insert.inlineFormula', inEquation ? { tex: f.latex } : { latex: f.latex, display: true }); close(); }}
              className="wd-builtin">
              <span className="wd-builtin-label">{f.name}</span>
              <Tex tex={f.latex} display className="wd-builtin-tex" />
            </button>
          ))}
        </div>
      ))}
    </div>
    {!inEquation && (
      <div className="border-t border-line p-1.5">
        <button type="button" onMouseDown={keepFocus} onClick={() => { run('insert.equation'); close(); }} className="wd-menu-item font-semibold">
          <Sigma className="h-4 w-4" /> Insérer une nouvelle équation <span className="wd-menu-hint">Alt+=</span>
        </button>
      </div>
    )}
  </div>
);

/** Insertion › Symboles › Équation : bouton partagé (haut = nouvelle équation, bas = équations prêtes). */
export const EquationInsertButton: React.FC<{ run: Run; disabled?: boolean }> = ({ run, disabled }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="wd-split">
      <button type="button" title="Insérer une nouvelle équation (Alt+=)" disabled={disabled} onMouseDown={keepFocus}
        onClick={() => run('insert.equation')} className="wd-split-top">
        <span className="wd-big-icon"><span className="wd-eq-icon">π</span></span>
      </button>
      <button ref={ref} type="button" title="Équations prêtes" disabled={disabled} aria-expanded={open} onMouseDown={keepFocus}
        onClick={() => setOpen((v) => !v)} className="wd-split-bottom">
        Équation <ChevronDown className="inline h-3 w-3" />
      </button>
      <FloatingPanel anchorRef={ref} open={open} onClose={() => setOpen(false)} className="wd-menu">
        {open && <BuiltInMenu run={run} close={() => setOpen(false)} inEquation={false} />}
      </FloatingPanel>
    </div>
  );
};

/** Bouton d'une galerie de structures (image = formule rendue, comme wordcraft). */
const StructureButton: React.FC<{ gallery: MathGallery; run: Run }> = ({ gallery, run }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button ref={ref} type="button" title={gallery.label.replace('\n', ' ')} aria-expanded={open} onMouseDown={keepFocus} onClick={() => setOpen((v) => !v)}
        className={`wd-struct ${open ? 'is-active' : ''}`}>
        <span className="wd-struct-pic"><Tex tex={gallery.picture} /></span>
        <span className="wd-struct-label">{gallery.label} <ChevronDown className="inline h-3 w-3" /></span>
      </button>
      <FloatingPanel anchorRef={ref} open={open} onClose={() => setOpen(false)} className="wd-menu">
        {open && <StructureMenu gallery={gallery} onPick={(id) => { run('equation.insertStructure', { id }); setOpen(false); }} />}
      </FloatingPanel>
    </>
  );
};

/** Groupe Symboles : 3 rangées du jeu courant, ▲ ▼ pour défiler, « … » pour tous les jeux. */
const SymbolStrip: React.FC<{ run: Run }> = ({ run }) => {
  const [set, setSet] = useState(0);
  const [start, setStart] = useState(0);
  const perRow = 7;
  const rows = 2;
  const symbols = SYMBOL_SETS[set]?.symbols ?? [];
  const page = symbols.slice(start, start + perRow * rows);
  const btn = (tex: string) => (
    <button key={tex} type="button" title={tex} aria-label={tex} onMouseDown={keepFocus} onClick={() => run('equation.insertSymbol', { tex })} className="wd-sym">
      <Tex tex={tex} />
    </button>
  );
  return (
    <div className="flex items-stretch gap-1">
      <div className="grid grid-cols-7 gap-px">{page.map(btn)}</div>
      <div className="flex flex-col gap-px">
        <SmallButton label="Rangée précédente" icon={<ChevronUp className="h-3.5 w-3.5" />} disabled={start === 0} onClick={() => setStart(Math.max(0, start - perRow))} />
        <SmallButton label="Rangée suivante" icon={<ChevronDown className="h-3.5 w-3.5" />} disabled={start + perRow * rows >= symbols.length} onClick={() => setStart(start + perRow)} />
        <MenuButton label="Tous les jeux de symboles" icon={<MoreHorizontal className="h-3.5 w-3.5" />} placement="bottom-end">
          {(close) => (
            <div className="w-[min(420px,calc(100vw-16px))] p-2">
              <div className="mb-2 flex flex-wrap gap-1">
                {SYMBOL_SETS.map((s, i) => (
                  <button key={s.name} type="button" onMouseDown={keepFocus} onClick={() => { setSet(i); setStart(0); }}
                    className={`wd-chip ${i === set ? 'is-active' : ''}`}>{s.name}</button>
                ))}
              </div>
              <div className="flex max-h-72 flex-wrap gap-px overflow-y-auto">
                {symbols.map((tex) => (
                  <button key={tex} type="button" title={tex} onMouseDown={keepFocus} onClick={() => { run('equation.insertSymbol', { tex }); close(); }} className="wd-sym">
                    <Tex tex={tex} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </MenuButton>
      </div>
    </div>
  );
};

/** Code LaTeX de l'équation ouverte (la forme « linéaire » de wordcraft, ici en LaTeX). */
const LatexPanel: React.FC<{ ctx: Ctx; close: () => void }> = ({ ctx, close: closeMenu }) => {
  // Le champ a pris le focus : on le rend à l'équation en refermant.
  const close = () => { closeMenu(); ctx.eq?.mathfield.focus(); };
  const [value, setValue] = useState(() => ctx.eq?.latex() ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const apply = () => { ctx.eq?.setLatex(value); close(); };
  return (
    <div className="w-[min(420px,calc(100vw-16px))] p-3">
      <label className="mb-1.5 block text-[12px] font-semibold text-ink-faint" htmlFor="wd-latex">Code LaTeX de l’équation</label>
      <textarea id="wd-latex" ref={ref} value={value} onChange={(e) => setValue(e.target.value)} rows={3} spellCheck={false}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); apply(); } }}
        className="block w-full resize-y rounded-lg border border-line px-2.5 py-2 font-mono text-[13px] focus:border-brand focus:outline-none" />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={close} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:bg-[#f2f1ee]">Annuler</button>
        <button type="button" onClick={apply} className="rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-brand-hover">Appliquer</button>
      </div>
    </div>
  );
};

/** L'onglet « Équation » (visible tant qu'une équation est ouverte). */
export const EquationTab: React.FC<{ ctx: Ctx; run: Run }> = ({ ctx, run }) => (
  <>
    <Group label="Outils">
      <MenuButton big label="Équation" icon={<Tex tex="\sum_{i=1}^{n}" />} title="Équations prêtes">
        {(close) => <BuiltInMenu run={run} close={close} inEquation />}
      </MenuButton>
      <div className="wd-stack">
        <MenuButton label="LaTeX" showLabel icon={<Code2 className="h-4 w-4" />} title="Voir et modifier le code LaTeX">
          {(close) => <LatexPanel ctx={ctx} close={close} />}
        </MenuButton>
      </div>
    </Group>
    <Group label="Symboles"><SymbolStrip run={run} /></Group>
    <Group label="Options">
      <div className="wd-stack">
        <SmallButton showLabel label="Centrée" title="Équation sur sa propre ligne" icon={<AlignCenter className="h-4 w-4" />}
          active={isActive(ctx, 'equation.display')} onClick={() => run('equation.display')} />
        <SmallButton showLabel label="Dans la ligne" title="Équation dans la ligne du texte" icon={<AlignLeft className="h-4 w-4" />}
          active={isActive(ctx, 'equation.inline')} onClick={() => run('equation.inline')} />
      </div>
      <div className="wd-stack">
        <SmallButton showLabel label="Numéroter" title="Numéro à la marge droite (équation centrée)" icon={<Hash className="h-4 w-4" />}
          active={isActive(ctx, 'equation.number')} onClick={() => run('equation.number')} />
        <SmallButton showLabel label="Fermer" title="Fermer l’équation et revenir au texte (Échap)" icon={<LogOut className="h-4 w-4" />}
          disabled={!isEnabled(ctx, 'equation.close')} onClick={() => run('equation.close')} />
      </div>
    </Group>
    <Group label="Structures" className="wd-structures">
      {STRUCTURES.map((g) => <StructureButton key={g.id} gallery={g} run={run} />)}
    </Group>
  </>
);
