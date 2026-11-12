// « Pour continuer » : sous un exercice, un examen ou une leçon, les contenus les plus semblables
// (mêmes théorèmes dans les questions, même chapitre, même niveau — backend apps/things/similar.py), chacun avec sa raison.
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, FileText, PenLine } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { trackAction } from '@/lib/usage';
import { DifficultyChip, ProgressPill } from '@/components/content/listing/ListingParts';
import {
  BASE_PATH, TYPE_LABEL, chapterLabel, progressOf, type ListItem, type ListKind,
} from '@/components/content/listing/listingUtils';
import { t } from '@/i18n';

type Item = ListItem & { reason?: string };

const ICON: Record<ListKind, React.ElementType> = { exercise: PenLine, exam: FileText, lesson: BookOpen };
const COVER: Record<ListKind, string> = {
  exercise: 'bg-brand-soft text-brand-hover border-brand-line',
  lesson: 'bg-gold-soft text-gold-strong border-gold-line',
  exam: 'bg-paper text-ink-soft border-line',
};

export const SimilarContents: React.FC<{ contentId: string }> = ({ contentId }) => {
  const [items, setItems] = useState<Item[] | null>(null);
  const rail = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const measure = () => {
      const pos = Math.abs(el.scrollLeft);
      setEdges({ start: pos <= 2, end: pos + el.clientWidth >= el.scrollWidth - 2 });
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      resize.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [items]);

  function slide(direction: number) {
    const el = rail.current;
    if (!el || el.children.length < 2) return;
    const step = Math.abs(el.children[1].getBoundingClientRect().left - el.children[0].getBoundingClientRect().left);
    const sign = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    el.scrollBy({ left: direction * sign * step,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
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
    <section aria-labelledby="pour-continuer" data-tour="detail-similaires" className="min-w-0 border-t-2 border-ink pt-5">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 id="pour-continuer" className="fd-display text-2xl text-ink sm:text-[28px]">{t('Pour continuer')}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t('Des contenus qui travaillent la même chose, à ton niveau.')}</p>
        </div>
        {!(edges.start && edges.end) && (
          <div className="flex shrink-0 gap-1">
            {([{ Icon: ChevronLeft, label: t('Précédent'), dir: -1, disabled: edges.start },
              { Icon: ChevronRight, label: t('Suivant'), dir: 1, disabled: edges.end }]).map(({ Icon, label, dir, disabled }) => (
              <button key={dir} type="button" aria-label={label} aria-controls="recommandations" disabled={disabled} onClick={() => slide(dir)}
                className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink hover:border-brand focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-35">
                <Icon size={18} className="rtl:rotate-180" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </header>
      <ul id="recommandations" ref={rail} className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2">
        {items.map((item) => {
          const kind = item.type as ListKind;
          const Icon = ICON[kind] ?? PenLine;
          return (
            <li key={item.id} className="flex w-[85%] max-w-[21rem] shrink-0 snap-start sm:w-[44%]">
              <Link to={`${BASE_PATH[kind] ?? '/exercises'}/${item.id}`}
                state={{ from: location.pathname + location.search }} onClick={() => trackAction('similaire')}
                className="group flex min-h-[195px] w-full flex-col overflow-hidden rounded-xl border border-line bg-white text-start hover:border-ink-soft focus-visible:outline-brand focus-visible:-outline-offset-2">
                <span className={`flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold ${COVER[kind] ?? COVER.exercise}`}>
                  <Icon size={18} aria-hidden /> {t(TYPE_LABEL[kind] ?? 'Contenu')}
                  {'difficulty' in item && item.difficulty && <span className="ms-auto"><DifficultyChip difficulty={item.difficulty} plain /></span>}
                </span>
                <span className="fd-display mx-4 mt-4 line-clamp-3 text-xl leading-tight text-ink group-hover:text-brand-hover">{item.title}</span>
                <span className="mt-auto flex items-end justify-between gap-3 px-4 pb-4 pt-5">
                  <span className="min-w-0 text-[13px] leading-relaxed text-ink-soft">
                    <ProgressPill progress={progressOf(item)} />
                    <span className="line-clamp-2">{item.reason || chapterLabel(item)}</span>
                  </span>
                  <ArrowRight size={18} className="shrink-0 text-brand-hover rtl:rotate-180" aria-hidden />
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
