/**
 * Briques du ruban (12/10/2026) : groupe titré, grand bouton, petit bouton, menu déroulant, vignettes
 * KaTeX. Comme les boutons de wordcraft (`ui-egui/src/widgets.rs`), chacun lance une commande par son id.
 * Un clic ne retire jamais le curseur du texte ni de l'équation ouverte (mousedown annulé).
 */
import React, { useRef, useState } from 'react';
import katex from 'katex';
import { ChevronDown } from 'lucide-react';
import { FloatingPanel, type FloatingPlacement } from '@/components/ui/FloatingPanel';

export const keepFocus = (e: React.MouseEvent) => e.preventDefault();

const katexCache = new Map<string, string>();
/** Rendu KaTeX mis en cache (vignettes des galeries, boutons). */
export function katexHtml(latex: string, display = false) {
  const key = `${display ? 'D' : 'I'}${latex}`;
  let html = katexCache.get(key);
  if (html === undefined) {
    try {
      html = katex.renderToString(latex, { displayMode: display, throwOnError: false, strict: false, trust: false, output: 'html' });
    } catch {
      html = latex;
    }
    katexCache.set(key, html);
  }
  return html;
}

export const Tex: React.FC<{ tex: string; display?: boolean; className?: string }> = ({ tex, display, className }) => (
  <span aria-hidden className={className} dangerouslySetInnerHTML={{ __html: katexHtml(tex, display) }} />
);

/** Groupe du ruban : ses boutons, son nom en dessous (comme Word). */
export const Group: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <div role="group" aria-label={label} className={`wd-group ${className}`}>
    <div className="wd-group-body">{children}</div>
    <div className="wd-group-label">{label}</div>
  </div>
);

interface BtnProps {
  label: string;
  /** Infobulle (libellé + raccourci). */
  title?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  /** Libellé visible à côté de l'icône (petit bouton). */
  showLabel?: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
  caret?: boolean;
  expanded?: boolean;
}

/** Grand bouton : icône au-dessus, libellé dessous. */
export const BigButton: React.FC<BtnProps> = ({ label, title, icon, onClick, active, disabled, buttonRef, caret, expanded }) => (
  <button ref={buttonRef} type="button" title={title ?? label} aria-pressed={active} aria-expanded={expanded} disabled={disabled}
    onMouseDown={keepFocus} onClick={onClick} className={`wd-big ${active ? 'is-active' : ''}`}>
    <span className="wd-big-icon">{icon}</span>
    <span className="wd-big-label">{label}{caret && <ChevronDown className="ml-0.5 inline h-3 w-3" />}</span>
  </button>
);

/** Petit bouton : icône seule (ou icône + libellé). */
export const SmallButton: React.FC<BtnProps> = ({ label, title, icon, onClick, active, disabled, showLabel, buttonRef, caret, expanded }) => (
  <button ref={buttonRef} type="button" title={title ?? label} aria-label={showLabel ? undefined : label} aria-pressed={active}
    aria-expanded={expanded} disabled={disabled} onMouseDown={keepFocus} onClick={onClick}
    className={`wd-small ${showLabel ? 'has-label' : ''} ${active ? 'is-active' : ''}`}>
    {icon}
    {showLabel && <span>{label}</span>}
    {caret && <ChevronDown className="h-3 w-3 opacity-70" />}
  </button>
);

/** Bouton qui ouvre un menu (le menu reçoit `close`). */
export const MenuButton: React.FC<Omit<BtnProps, 'onClick' | 'buttonRef' | 'expanded'> & {
  big?: boolean;
  placement?: FloatingPlacement;
  panelClassName?: string;
  children: (close: () => void) => React.ReactNode;
}> = ({ big, placement = 'bottom-start', panelClassName = '', children, ...btn }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const B = big ? BigButton : SmallButton;
  return (
    <>
      <B {...btn} caret buttonRef={ref} expanded={open} onClick={() => setOpen((v) => !v)} />
      <FloatingPanel anchorRef={ref} open={open} onClose={() => setOpen(false)} placement={placement}
        className={`wd-menu ${panelClassName}`}>
        {open && children(() => setOpen(false))}
      </FloatingPanel>
    </>
  );
};

/** Entrée de menu (texte). */
export const MenuItem: React.FC<{ onClick: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode; hint?: string }> = ({
  onClick, active, disabled, children, hint,
}) => (
  <button type="button" role="menuitem" disabled={disabled} onMouseDown={keepFocus} onClick={onClick}
    className={`wd-menu-item ${active ? 'is-active' : ''}`}>
    <span className="min-w-0 flex-1 truncate">{children}</span>
    {hint && <span className="wd-menu-hint">{hint}</span>}
  </button>
);

export const MenuHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="wd-menu-heading">{children}</div>
);
