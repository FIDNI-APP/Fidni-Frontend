import React, { createContext, useCallback, useContext, useState } from 'react';

export interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbCtx {
  crumbs: Crumb[] | null;
  /**
   * Entrée du menu à surligner (son adresse, ex. '/exams/nationaux'), quand l'adresse de la page ne
   * suffit pas : un sujet du Bac national vit sous /exams/123, comme un DS. À défaut, la barre
   * latérale lit l'adresse du premier élément du fil.
   */
  section: string | null;
  setCrumbs: (crumbs: Crumb[] | null, section?: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbCtx>({
  crumbs: null,
  section: null,
  setCrumbs: () => {},
});

export const useBreadcrumb = () => useContext(BreadcrumbContext);

/**
 * Lets a page push a custom breadcrumb trail up to the app TopBar (e.g. the
 * content detail page feeds in Exercices › Niveau › Chapitre), and optionally
 * the menu entry to highlight: `setCrumbs(trail, '/exams/nationaux')`.
 * Pages should clear it on unmount: `useEffect(() => () => setCrumbs(null), [])`.
 */
export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{ crumbs: Crumb[] | null; section: string | null }>({ crumbs: null, section: null });
  // Stable : les pages l'ont dans les dépendances de leurs effets.
  const setCrumbs = useCallback((crumbs: Crumb[] | null, section?: string | null) => {
    setState({ crumbs, section: crumbs ? section ?? null : null });
  }, []);
  return (
    <BreadcrumbContext.Provider value={{ crumbs: state.crumbs, section: state.section, setCrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};
