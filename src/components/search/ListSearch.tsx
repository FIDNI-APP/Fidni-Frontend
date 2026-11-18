// Recherche dans une liste (17/11/2026, Natsu : « je suis dans le chapitre de la dérivation, j'écris exercice 48, et
// l'exercice 48 apparaît ») : un numéro (« 48 », « exercice 48 », « #48 ») donne le contenu qui le porte dans ce
// chapitre (backend things/numeros.py) ; un mot cherche dans les titres et les énoncés. Paramètre d'adresse « q ».
import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { t } from '@/i18n';

export const ListSearch: React.FC<{
  value: string;
  onChange: (q: string) => void;
  placeholder: string;
  className?: string;
}> = ({ value, onChange, placeholder, className = '' }) => {
  const [text, setText] = useState(value);
  // L'adresse change ailleurs (retour, lien) : le champ suit, sans toucher à ce qu'on est en train d'écrire.
  useEffect(() => { setText((cur) => (cur.trim() === value ? cur : value)); }, [value]);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const send = (q: string, now = false) => {
    window.clearTimeout(timer.current);
    if (now) onChange(q.trim());
    else timer.current = window.setTimeout(() => onChange(q.trim()), 350);
  };

  return (
    <form role="search" className={`relative ${className}`} onSubmit={(e) => { e.preventDefault(); send(text, true); }}>
      <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
      <input
        type="search"
        value={text}
        onChange={(e) => { setText(e.target.value); send(e.target.value); }}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
        maxLength={100}
        className="h-10 w-full rounded-xl border border-line bg-white ps-9 pe-9 text-[14px] text-ink placeholder:text-ink-faint transition-colors hover:border-[#cfc9bf] focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {text && (
        <button type="button" onClick={() => { setText(''); send('', true); }} aria-label={t('Effacer la recherche')}
          className="absolute end-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
};
