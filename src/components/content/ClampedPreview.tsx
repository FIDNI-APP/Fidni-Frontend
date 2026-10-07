// Aperçu tronqué d'un contenu dans une liste : au-delà d'une certaine hauteur, le texte s'efface en
// fondu et un bouton permet de tout afficher sur place. Le fondu est un masque CSS (pas une classe
// bg-gradient-*, que index.css rend noire).
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FADE = 'linear-gradient(to bottom, #000 65%, transparent)';

export const ClampedPreview: React.FC<{ maxHeight?: number; children: React.ReactNode }> = ({ maxHeight = 340, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Marge de 60 px : on ne coupe pas un contenu qui dépasse à peine.
    const check = () => setOverflows(el.scrollHeight > maxHeight + 60);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxHeight]);

  const clamped = overflows && !open;
  return (
    <div>
      <div
        ref={ref}
        style={clamped ? { maxHeight, overflow: 'hidden', WebkitMaskImage: FADE, maskImage: FADE } : undefined}
      >
        {children}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            if (open) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-hover hover:underline"
          aria-expanded={open}
        >
          {open ? 'Réduire' : 'Lire la suite'}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
};

export default ClampedPreview;
