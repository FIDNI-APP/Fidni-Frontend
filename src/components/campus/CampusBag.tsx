import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, X } from 'lucide-react';
import { useSpaceSummary } from './useSpaceSummary';
import './campus.css';

/** « 3 listes », « 1 cahier », « Aucun favori ». */
function count(n: number, one: string, many: string, none: string) {
  return n === 0 ? none : `${n} ${n > 1 ? many : one}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username?: string;
}

/** Le cartable (bouton dessiné) et son tableau vert : Cahiers, Révisions, Favoris, avec les vraies données. */
export const CampusBag: React.FC<Props> = ({ open, onOpenChange, username }) => {
  const bagRef = useRef<HTMLButtonElement>(null);
  const boardRef = useRef<HTMLElement>(null);
  const space = useSpaceSummary(open, username);

  // Le tableau se ferme au clic à l'extérieur.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!bagRef.current?.contains(n) && !boardRef.current?.contains(n)) onOpenChange(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={bagRef}
        type="button"
        className="fdc-card fdc-bag"
        aria-expanded={open}
        aria-controls="fdc-board"
        title="Mon espace : cahiers, listes de révision, favoris (touche C)"
        onClick={() => onOpenChange(!open)}
      >
        <svg width="56" height="50" viewBox="0 0 64 58" aria-hidden="true">
          <path d="M23 15v-4a9 7 0 0 1 18 0v4" fill="none" stroke="#6e4a2c" strokeWidth="3.2" strokeLinecap="round" />
          <g className="peek">
            <rect x="14" y="12" width="10" height="16" rx="1.5" fill="#2f6b53" />
            <rect x="25.5" y="9" width="10" height="19" rx="1.5" fill="#3d5a80" />
            <rect x="37" y="13" width="13" height="15" rx="1" fill="#fffdf7" />
            <path d="M37 16.5h13" stroke="#e3a1a1" strokeWidth="1" />
          </g>
          <rect x="5" y="20" width="54" height="35" rx="8" fill="#9a6b43" />
          <rect x="5" y="47" width="54" height="8" rx="4" fill="#85592f" />
          <g className="flap">
            <path d="M5 28a8 8 0 0 1 8-8h38a8 8 0 0 1 8 8v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" fill="#b5835a" />
            <path d="M9 36.5h46" stroke="#8a5d36" strokeWidth="1" strokeDasharray="2 2" />
            <rect x="27.5" y="33" width="9" height="10" rx="2.2" fill="#c0892f" />
            <rect x="30.5" y="36" width="3" height="4" rx="1" fill="#8f6420" />
          </g>
        </svg>
        <span className="tx"><b>Mon cartable</b><span>cahiers · révisions · favoris</span></span>
      </button>

      {open && (
        <nav ref={boardRef} id="fdc-board" className="fdc-board" aria-label="Mon cartable">
          <div className="fdc-board-in">
            <div className="fdc-board-head">
              <span>Mon cartable</span>
              <button type="button" onClick={() => onOpenChange(false)} aria-label="Fermer le cartable"><X className="w-4 h-4" /></button>
            </div>
            <div className="fdc-board-items">
              <Link to="/notebooks" className="fdc-obj">
                <span className="art"><span className="fdc-nb"><i /></span></span>
                <b>Mes cahiers</b>
                <small>{space?.notebooks != null ? count(space.notebooks, 'cahier', 'cahiers', 'Aucun cahier') : 'Cours et notes'}</small>
              </Link>
              <Link to="/revision-lists" className="fdc-obj">
                <span className="art">
                  <span className="fdc-fiche">{space?.lists?.names.map((n) => <i key={n}>{n}</i>)}</span>
                </span>
                <b>Révisions</b>
                <small>{space?.lists ? count(space.lists.count, 'liste', 'listes', 'Aucune liste') : 'Listes à revoir'}</small>
              </Link>
              <Link to="/saved" className="fdc-obj">
                <span className="art"><span className="fdc-note"><Bookmark className="w-6 h-6" /></span></span>
                <b>Favoris</b>
                <small>{space?.favorites != null ? count(space.favorites, 'contenu', 'contenus', 'Aucun favori') : 'Gardés pour plus tard'}</small>
              </Link>
            </div>
          </div>
        </nav>
      )}
    </>
  );
};
