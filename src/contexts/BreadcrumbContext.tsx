import React, { createContext, useContext, useState } from 'react';

export interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbCtx {
  crumbs: Crumb[] | null;
  setCrumbs: (crumbs: Crumb[] | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbCtx>({
  crumbs: null,
  setCrumbs: () => {},
});

export const useBreadcrumb = () => useContext(BreadcrumbContext);

/**
 * Lets a page push a custom breadcrumb trail up to the app TopBar (e.g. the
 * content detail page feeds in Exercices › Niveau › Matière › Chapitre).
 * Pages should clear it on unmount: `useEffect(() => () => setCrumbs(null), [])`.
 */
export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ crumbs, setCrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};
