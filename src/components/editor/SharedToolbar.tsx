// Une seule barre d'outils pour toute une page d'écriture (11/10/2026 : une barre par champ, répétée sous
// chaque question, « overwhelm de mort »). Les éditeurs compacts placés dans <SharedToolbarProvider> n'ont
// plus leur propre barre : celle du champ où est le curseur s'affiche dans <SharedToolbarSlot>, collée en
// haut de l'écran pendant le défilement (comme Word). Hors du fournisseur, rien ne change.
import React, { createContext, useContext, useMemo, useState } from 'react';
import { Type } from 'lucide-react';

interface SharedToolbarValue {
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
  active: string | null;
  setActive: (id: string | null) => void;
}

const SharedToolbarContext = createContext<SharedToolbarValue | null>(null);

export const useSharedToolbar = () => useContext(SharedToolbarContext);

export const SharedToolbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const value = useMemo(() => ({ slot, setSlot, active, setActive }), [slot, active]);
  return <SharedToolbarContext.Provider value={value}>{children}</SharedToolbarContext.Provider>;
};

/** L'emplacement de la barre : collé sous la barre du site pendant le défilement. */
export const SharedToolbarSlot: React.FC<{ className?: string }> = ({ className = '' }) => {
  const ctx = useContext(SharedToolbarContext);
  return (
    <div className={`sticky top-[68px] z-30 rounded-xl border border-line bg-[#fbfaf8]/95 shadow-[0_6px_18px_-10px_rgba(20,18,16,.25)] backdrop-blur ${className}`}>
      <div ref={ctx?.setSlot} />
      {!ctx?.active && (
        <p className="flex h-10 items-center gap-2 px-3 text-[12.5px] text-ink-faint">
          <Type className="h-4 w-4" aria-hidden /> Clique dans un champ : gras, formules, encarts, images apparaissent ici.
        </p>
      )}
    </div>
  );
};
