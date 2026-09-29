// Champ « Établissement » : autocomplétion sur les ~10 400 établissements publiés par le
// ministère (data.gov.ma). Si l'établissement n'y figure pas, le texte saisi est gardé tel quel.
import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, Loader2, School as SchoolIcon, PenLine } from 'lucide-react';
import { searchSchools, type SchoolOption } from '@/lib/api/userApi';
import { FloatingPanel } from '@/components/ui/FloatingPanel';

export interface SchoolValue {
  /** Identifiant dans la liste officielle ; null = saisie libre. */
  id: number | null;
  name: string;
  city?: string;
}

interface SchoolPickerProps {
  value: SchoolValue;
  onChange: (value: SchoolValue) => void;
  inputClassName?: string;
  autoFocus?: boolean;
}

export const SchoolPicker: React.FC<SchoolPickerProps> = ({ value, onChange, inputClassName, autoFocus }) => {
  const listId = useId();
  const [query, setQuery] = useState(value.name);
  const [results, setResults] = useState<SchoolOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Valeur fixée de l'extérieur (profil chargé après coup) : le champ la reprend.
  useEffect(() => { setQuery(value.name); }, [value.name]);

  // Recherche avec un court délai ; une réponse arrivée trop tard est ignorée.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2 || (value.id !== null && q === value.name)) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      searchSchools(q, controller.signal)
        .then((r) => { setResults(r); setActive(0); })
        .catch(() => { /* requête annulée ou réseau : on garde la saisie libre */ })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, open, value.id, value.name]);

  const choose = (s: SchoolOption) => {
    onChange({ id: s.id, name: s.name, city: s.city });
    setQuery(s.name);
    setOpen(false);
  };

  const typed = query.trim();
  const showFreeText = typed.length >= 3;
  const optionCount = results.length + (showFreeText ? 1 : 0);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || optionCount === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % optionCount); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + optionCount) % optionCount); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (active < results.length) choose(results[active]);
      else setOpen(false); // saisie libre déjà enregistrée à la frappe
    } else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div>
      <div ref={boxRef} className="relative">
        <SchoolIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open && optionCount > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          placeholder="Ex. : Lycée Moulay Youssef, Rabat"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            onChange({ id: null, name: e.target.value });
          }}
          onKeyDown={onKeyDown}
          className={inputClassName || 'w-full pl-9 pr-9 py-2.5 bg-white border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand'}
          style={{ paddingLeft: 36, paddingRight: 36 }}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-ink-faint" />}
        {!loading && value.id !== null && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand" />}
      </div>

      {/* Rendue au-dessus de la page : la liste n'est plus coupée dans une fenêtre qui défile. */}
      <FloatingPanel anchorRef={boxRef} open={open && optionCount > 0} onClose={() => setOpen(false)} matchWidth>
        <ul id={listId} role="listbox"
          className="max-h-72 overflow-y-auto bg-white border border-line rounded-xl shadow-lg py-1">
          {results.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(s); }}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 cursor-pointer flex items-start justify-between gap-3 ${i === active ? 'bg-[#f2f1ee]' : ''}`}>
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink truncate">{s.name}</div>
                <div className="text-xs text-ink-faint">{[s.city, s.kind_label].filter(Boolean).join(' · ')}</div>
              </div>
              {s.name_ar && <div dir="rtl" className="text-xs text-ink-faint shrink-0 max-w-[40%] truncate pt-0.5">{s.name_ar}</div>}
            </li>
          ))}
          {showFreeText && (
            <li role="option" aria-selected={active === results.length}
              onMouseDown={(e) => { e.preventDefault(); onChange({ id: null, name: typed }); setOpen(false); }}
              onMouseEnter={() => setActive(results.length)}
              className={`px-3 py-2 cursor-pointer flex items-center gap-2 border-t border-line text-sm text-ink-soft ${active === results.length ? 'bg-[#f2f1ee]' : ''}`}>
              <PenLine className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Utiliser « {typed} »{results.length ? '' : ' (introuvable dans la liste)'}</span>
            </li>
          )}
        </ul>
      </FloatingPanel>

      <p className="text-xs text-ink-faint mt-1.5">
        {value.id !== null
          ? `Établissement de la liste officielle${value.city ? ` · ${value.city}` : ''}`
          : typed.length >= 3
            ? 'Pas dans la liste ? Ce nom sera utilisé tel quel.'
            : 'Tape au moins 2 lettres : nom du lycée, du collège ou de la ville.'}
      </p>
    </div>
  );
};

export default SchoolPicker;
