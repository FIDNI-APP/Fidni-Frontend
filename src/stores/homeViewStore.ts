// src/stores/homeViewStore.ts
import { create } from 'zustand';

/**
 * Vue de l'accueil (« classique » ou « campus »), partagée entre la barre du haut (le sélecteur,
 * présent sur toutes les pages), l'accueil, la sidebar et la carte du campus.
 */
export type HomeView = 'classic' | 'campus';
export type CampusRoomId = 'direction' | 'bibliotheque' | 'td' | 'amphi' | 'stade' | 'gare' | 'labo' | 'classes';

const KEY = 'fd-home-view';
const read = (): HomeView => {
  // « 3d » : valeur enregistrée par la première version du campus, on la reprend telle quelle.
  try { return ['campus', '3d'].includes(localStorage.getItem(KEY) ?? '') ? 'campus' : 'classic'; } catch { return 'classic'; }
};

interface HomeViewState {
  view: HomeView;
  setView: (v: HomeView) => void;
  /** Vrai tant que le campus est affiché (masque le pied de page, enrichit la sidebar). */
  immersive: boolean;
  setImmersive: (on: boolean) => void;
  /** Bâtiment survolé depuis la sidebar, mis en valeur sur le campus. */
  hoverRoom: CampusRoomId | null;
  setHoverRoom: (id: CampusRoomId | null) => void;
}

export const useHomeView = create<HomeViewState>()((set) => ({
  view: read(),
  setView: (v) => {
    try { localStorage.setItem(KEY, v); } catch { /* stockage indisponible */ }
    set({ view: v });
  },
  immersive: false,
  // En quittant le campus, on oublie aussi le survol en cours (sinon un bâtiment resterait en valeur au retour).
  setImmersive: (on) => set(on ? { immersive: true } : { immersive: false, hoverRoom: null }),
  hoverRoom: null,
  setHoverRoom: (id) => set({ hoverRoom: id }),
}));
