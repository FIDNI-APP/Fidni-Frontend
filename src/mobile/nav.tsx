/**
 * Navigation de l'application : une pile d'écrans par onglet (IonNav, sans routeur : le site garde react-router 7,
 * que le routeur d'Ionic ne prend pas en charge). Un écran poussé arrive en glissant ; retour par le bouton,
 * le geste de balayage (iPhone) ou le bouton « retour » d'Android (MobileApp).
 */
import React, { createContext, useContext, useMemo, useRef } from 'react';
import { IonNav } from '@ionic/react';

type ScreenFactory = () => React.ReactElement;

export interface Nav {
  push: (screen: ScreenFactory) => void;
  pop: () => void;
  /** Revenir au premier écran de l'onglet ; renvoie false s'il y était déjà. */
  popToRoot: () => Promise<boolean>;
  canGoBack: () => Promise<boolean>;
}

const NavContext = createContext<Nav | null>(null);

function navFor(ref: React.RefObject<HTMLIonNavElement | null>): Nav {
  return {
    push: (screen) => { void ref.current?.push(screen); },
    pop: () => { void ref.current?.pop(); },
    popToRoot: async () => {
      const el = ref.current;
      if (!el || !(await el.canGoBack())) return false;
      await el.popToRoot();
      return true;
    },
    canGoBack: async () => !!(await ref.current?.canGoBack()),
  };
}

/** Pile d'écrans d'un onglet ; `onReady` reçoit sa navigation (retour Android, liens ouverts depuis le téléphone). */
export function NavStack({ root, onReady }: { root: ScreenFactory; onReady?: (nav: Nav) => void }) {
  const ref = useRef<HTMLIonNavElement>(null);
  const nav = useMemo(() => navFor(ref), []);
  const readyRef = useRef(false);
  if (!readyRef.current && onReady) { readyRef.current = true; onReady(nav); }
  return (
    <NavContext.Provider value={nav}>
      <IonNav ref={ref} root={root} />
    </NavContext.Provider>
  );
}

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('useNav en dehors d’une NavStack');
  return nav;
}
