// Menu déroulant rendu au-dessus de toute la page (portail dans <body>), positionné sous son
// bouton. Un menu en `position: absolute` était coupé par tout parent en overflow hidden/auto
// (cartes, fenêtres, barre latérale, éditeurs) : celui-ci ne l'est jamais. Il passe au-dessus
// du bouton quand la place manque en bas et reste toujours dans l'écran.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type FloatingPlacement = 'bottom-start' | 'bottom' | 'bottom-end' | 'top-start' | 'top' | 'top-end';

interface FloatingPanelProps {
  /** Élément auquel le menu est accroché (bouton, champ…). */
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  /** Clic en dehors du menu et de son bouton, ou touche Échap. */
  onClose?: () => void;
  placement?: FloatingPlacement;
  /** Écart avec le bouton, en pixels. */
  offset?: number;
  /** Même largeur que le bouton (listes d'autocomplétion). */
  matchWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  /** Pour tester si un clic tombe dans le menu (logique « clic extérieur » du parent). */
  panelRef?: React.MutableRefObject<HTMLDivElement | null>;
  role?: string;
  id?: string;
}

const MARGIN = 8;

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  anchorRef, open, onClose, placement = 'bottom-start', offset = 6, matchWidth,
  className, style, children, panelRef, role, id,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  // Le menu lui-même (avec ses classes) : c'est lui qu'on mesure. L'enveloppe `ref` ne fait que
  // le placer et, si l'écran manque de place, le limiter en hauteur.
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width?: number; maxHeight?: number } | null>(null);

  const setRefs = (el: HTMLDivElement | null) => {
    ref.current = el;
    if (panelRef) panelRef.current = el;
  };

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = innerRef.current;
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = matchWidth ? a.width : panel.offsetWidth;
    // Hauteur du menu avec ses propres limites (classes max-h) : l'enveloppe ne le déforme pas.
    const naturalHeight = panel.offsetHeight;

    const below = vh - a.bottom - offset - MARGIN;
    const above = a.top - offset - MARGIN;
    const wantsTop = placement.startsWith('top');
    const top = wantsTop
      ? !(above < naturalHeight && below > above)
      : below < naturalHeight && above > below;
    const room = Math.max(120, top ? above : below);
    const height = Math.min(naturalHeight, room);

    let left = placement.endsWith('end') ? a.right - width
      : placement.endsWith('start') ? a.left
        : a.left + a.width / 2 - width / 2;
    left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - width - MARGIN));
    const next = {
      top: Math.round(top ? a.top - offset - height : a.bottom + offset),
      left: Math.round(left),
      width: matchWidth ? a.width : undefined,
      // Limite posée seulement si l'écran manque de place.
      maxHeight: naturalHeight > room ? Math.floor(room) : undefined,
    };
    setPos((prev) => (prev && prev.top === next.top && prev.left === next.left && prev.width === next.width
      && prev.maxHeight === next.maxHeight ? prev : next));
  }, [anchorRef, matchWidth, offset, placement]);

  // Première mesure avant l'affichage (pas de saut visible), puis à chaque défilement ou redimensionnement.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    // Le contenu du menu peut changer de taille (résultats de recherche qui arrivent).
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (observer && innerRef.current) observer.observe(innerRef.current);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [open, place]);

  useEffect(() => {
    if (!open || !onClose) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={setRefs}
      style={{
        position: 'fixed',
        zIndex: 1000,
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        ...(pos?.width !== undefined ? { width: pos.width } : {}),
        ...(pos?.maxHeight !== undefined ? { maxHeight: pos.maxHeight, overflowY: 'auto' as const } : {}),
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      <div ref={innerRef} id={id} role={role} className={className} style={style}>
        {children}
      </div>
    </div>,
    document.body,
  );
};

export default FloatingPanel;
