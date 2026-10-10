// « Pour continuer » : sous un exercice, un examen ou une leçon, les contenus les plus semblables
// (mêmes notions, même chapitre, même niveau — backend apps/things/similar.py), chacun avec sa raison.
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { trackAction } from '@/lib/usage';
import { DifficultyChip, ProgressPill } from '@/components/content/listing/ListingParts';
import {
  BASE_PATH, TYPE_LABEL, chapterLabel, progressOf, type ListItem, type ListKind,
} from '@/components/content/listing/listingUtils';

type Item = ListItem & { reason?: string };

export const SimilarContents: React.FC<{ contentId: string }> = ({ contentId }) => {
  const [items, setItems] = useState<Item[] | null>(null);
  // « ‹ Retour » du contenu ouvert ramène ici (ContentHeader lit state.from).
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    setItems(null);
    api.get(`/contents/${contentId}/recommendations/`)
      .then((r) => { if (alive) setItems(r.data.items ?? []); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [contentId]);

  if (!items?.length) return null; // rien de proche (ou chargement) : pas d'encart vide

  return (
    <section aria-labelledby="pour-continuer" data-tour="detail-similaires">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 id="pour-continuer" className="fd-display text-[18px] text-ink">Pour continuer</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-faint">Des contenus qui travaillent la même chose, à ton niveau.</p>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const kind = item.type as ListKind;
          const chapter = chapterLabel(item);
          return (
            <li key={item.id}>
              <Link to={`${BASE_PATH[kind] ?? '/exercises'}/${item.id}`}
                state={{ from: location.pathname + location.search }}
                onClick={() => trackAction('similaire')}
                className="group flex h-full flex-col rounded-2xl border border-line bg-white p-4 transition-colors hover:border-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">{TYPE_LABEL[kind] ?? 'Contenu'}</span>
                  {'difficulty' in item && <DifficultyChip difficulty={item.difficulty} felt={item.felt} />}
                  <ProgressPill progress={progressOf(item)} />
                </span>
                <span className="mt-2.5 line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink group-hover:text-brand">{item.title}</span>
                {chapter && <span className="mt-1 truncate text-[12px] text-ink-faint">{chapter}</span>}
                <span className="mt-auto flex items-center gap-1.5 pt-3 text-[12px] text-ink-soft">
                  <span className="min-w-0 flex-1 truncate">{item.reason}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default SimilarContents;
