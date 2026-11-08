// Taguer des leçons, exercices et examens dans une discussion (5 au plus) : recherche par titre (sans accents) ou par
// n° du contenu, résultats en cartes ; les contenus choisis s'affichent en cartes, avec une croix pour les retirer.
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
import { searchContentTags, type ContentTag } from '@/lib/api/discussionsApi';
import { ContentTagCard, contentTypeLabel } from './parts';
import { t } from '@/i18n';

export const MAX_TAGS = 5;

export const ContentTagPicker: React.FC<{ value: ContentTag[]; onChange: (tags: ContentTag[]) => void }> = ({ value, onChange }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ContentTag[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const full = value.length >= MAX_TAGS;

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2 && !/^\d+$/.test(query)) { setResults(null); return; }
    let alive = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchContentTags(query)
        .then((r) => { if (alive) setResults(r); })
        .catch(() => { if (alive) setResults([]); })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const add = (tag: ContentTag) => {
    if (full || value.some((v) => v.id === tag.id)) return;
    onChange([...value, tag]);
    setQ('');
    setResults(null);
    setOpen(false);
  };

  const shown = (results ?? []).filter((r) => !value.some((v) => v.id === r.id));

  return (
    <div ref={boxRef}>
      {value.length > 0 && (
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {value.map((tag) => <ContentTagCard key={tag.id} tag={tag} onRemove={() => onChange(value.filter((v) => v.id !== tag.id))} />)}
        </div>
      )}
      {!full && (
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            placeholder={value.length ? t('Taguer un autre contenu…') : t('Chercher une leçon, un exercice, un examen ou son n°')}
            aria-label={t('Taguer un contenu')}
            className="h-11 w-full rounded-xl border border-line bg-white ps-9 pe-9 text-[14px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
          {loading && <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-faint" aria-hidden />}
          {open && results && (
            <ul role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_14px_40px_rgba(20,18,16,.14)]">
              {shown.length === 0 ? (
                <li className="px-3 py-2.5 text-[13px] text-ink-faint">{t('Aucun contenu trouvé.')}</li>
              ) : shown.map((r) => (
                <li key={r.id} role="option" aria-selected={false}>
                  <button type="button" onClick={() => add(r)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start hover:bg-[#f7f6f3]">
                    <Plus className="h-4 w-4 shrink-0 text-brand-hover" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{r.title}</span>
                      <span className="block truncate text-[12px] text-ink-faint">
                        {[contentTypeLabel(r.type), r.chapter, r.level, t('n° {id}', { id: r.id })].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="mt-1.5 text-[12px] text-ink-faint fd-nums">{value.length} / {MAX_TAGS}</p>
    </div>
  );
};

export default ContentTagPicker;
