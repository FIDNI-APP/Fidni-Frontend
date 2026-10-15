/**
 * Langue de l'interface (15/10/2026) : français (langue d'origine) ou arabe, pour les élèves qui ne maîtrisent pas
 * le français. Seule l'interface est traduite : les exercices, cours et devoirs restent en français (programme BIOF),
 * affichés de gauche à droite même quand la page est en arabe (de droite à gauche).
 *
 * Utilisation : `t('Tout réussi')`, `t('{n} questions', { n })`. La clé est le texte français tel qu'il s'affiche ;
 * les traductions sont dans src/i18n/ar/*.json ({ "texte français": "النص العربي" }), un fichier par zone du site.
 * Sans traduction, le français s'affiche. `t` s'appelle au rendu (jamais dans une constante au niveau du module :
 * elle ne changerait pas de langue) ; changer de langue remonte l'application entière.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'fr' | 'ar';
const KEY = 'fidni:langue';

// Traductions arabes, un fichier par zone (coquille.json, contenu.json…), chargées seulement quand l'arabe est
// choisi (environ 80 Ko compressés que les visiteurs en français ne téléchargent pas).
const fichiers = import.meta.glob('./ar/*.json', { import: 'default' }) as Record<string, () => Promise<Record<string, string>>>;
let AR: Record<string, string> = {};
let charge: Promise<void> | null = null;
const chargerArabe = () => (charge ??= Promise.all(Object.values(fichiers).map((f) => f()))
  .then((parts) => { AR = Object.assign({}, ...parts); })
  .catch(() => { charge = null; }));

let current: Lang = (() => {
  try { return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'fr'; } catch { return 'fr'; }
})();

/** Traduit un texte de l'interface ; {nom} est remplacé par vars.nom. Un même mot français au sens différent :
 *  `t('Passer', { _sens: 'quiz' })` cherche d'abord la clé « Passer#quiz » (passer un quiz ≠ passer une question). */
export function t(fr: string, vars?: Record<string, string | number | null | undefined>): string {
  let s = current === 'ar' ? ((vars?._sens ? AR[`${fr}#${vars._sens}`] : undefined) ?? AR[fr] ?? fr) : fr;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
  return s;
}

export const getLang = () => current;

/** À attendre avant le premier affichage (main.tsx) : en arabe, les traductions sont chargées d'abord. */
export const languePrete = (): Promise<void> => (current === 'ar' ? chargerArabe() : Promise.resolve());

/** Locale des dates et nombres (toLocaleDateString…) : arabe du Maroc, chiffres 0-9 comme en classe. */
export const dateLocale = () => (current === 'ar' ? 'ar-MA' : 'fr-FR');

const appliquer = (lang: Lang) => {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
};
appliquer(current);

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: current, setLang: () => {} });
export const useLang = () => useContext(LangContext);

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(current);
  useEffect(() => { appliquer(lang); }, [lang]);
  const value = useMemo(() => ({
    lang,
    setLang: async (l: Lang) => {
      if (l === 'ar') await chargerArabe();
      current = l;
      try { localStorage.setItem(KEY, l); } catch { /* stockage indisponible */ }
      setLangState(l);
    },
  }), [lang]);
  // key : toute l'application se redessine dans la nouvelle langue.
  return <LangContext.Provider value={value}><React.Fragment key={lang}>{children}</React.Fragment></LangContext.Provider>;
};
