// « Pour continuer » : sous un exercice, un examen ou une leçon, les contenus les plus semblables
// (mêmes notions, même chapitre, même niveau — backend apps/things/similar.py), chacun avec sa raison.
// 11/10/2026 : une liste calme dans une seule carte (avant : une grille de cartes, longue sur téléphone).
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, FileText, PenLine } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { trackAction } from '@/lib/usage';
import { ProgressPill } from '@/components/content/listing/ListingParts';
import {
  BASE_PATH, DIFFICULTY, TYPE_LABEL, chapterLabel, progressOf, type ListItem, type ListKind,
} from '@/components/content/listing/listingUtils';

type Item = ListItem & { reason?: string };

const ICON: Record<ListKind, React.ElementType> = { exercise: PenLine, exam: FileText, lesson: BookOpen };
const SHOWN = 4;

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
      <h2 id="pour-continuer" className="fd-display text-[20px] leading-tight text-ink">Pour continuer</h2>
      <p className="mt-1 text-[13px] text-ink-faint">Des contenus qui travaillent la même chose, à ton niveau.</p>
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {items.slice(0, SHOWN).map((item) => {
          const kind = item.type as ListKind;
          const Icon = ICON[kind] ?? PenLine;
          const diff = 'difficulty' in item && item.difficulty ? DIFFICULTY[item.difficulty]?.label : null;
          const sub = [TYPE_LABEL[kind] ?? 'Contenu', diff, item.reason || chapterLabel(item)].filter(Boolean).join(' · ');
          return (
            <li key={item.id}>
              <Link to={`${BASE_PATH[kind] ?? '/exercises'}/${item.id}`}
                state={{ from: location.pathname + location.search }}
                onClick={() => trackAction('similaire')}
                className="group flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors hover:bg-[#fcfbf9] focus:outline-none focus-visible:bg-[#fcfbf9] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft" aria-hidden>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink group-hover:text-brand-hover">{item.title}</span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 whitespace-nowrap empty:hidden"><ProgressPill progress={progressOf(item)} /></span>
                    <span className="truncate text-[12.5px] text-ink-faint">{sub}</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default SimilarContents;
