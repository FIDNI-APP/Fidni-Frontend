// « À refaire » sur l'accueil (refonte du 11/10/2026) : les 3 plus anciens de la même liste que Réviser
// (GET /api/revision-lists/suggestions/?tout=1), « Tout voir » mène à /reviser#a-refaire.
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, RotateCcw } from 'lucide-react';
import type { ToRedoItem } from '@/lib/api/revisionListApi';
import { Section, SectionLink } from '@/components/space/Page';
import { REDO_SHOWN } from './home';
import { t } from '@/i18n';

const ago = (days: number | null) => (days === null ? '' : days <= 0 ? t('aujourd’hui') : days === 1 ? t('hier') : t('il y a {n} j', { n: days }));

export const RedoBlock: React.FC<{ items: ToRedoItem[]; count: number; className?: string }> = ({ items, count, className = '' }) => (
  <Section id="a-refaire" title={t('À refaire')} count={count} className={className}
    action={<SectionLink to="/reviser#a-refaire">{t('Tout voir')}</SectionLink>}>
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {items.slice(0, REDO_SHOWN).map((x) => {
        const why = x.failed ? t('Marqué à revoir') : x.weak_questions > 1 ? t('{n} questions à reprendre', { n: x.weak_questions }) : t('{n} question à reprendre', { n: x.weak_questions });
        return (
          <li key={`${x.type}-${x.id}`}>
            <Link to={`/${x.type === 'exam' ? 'exams' : 'exercises'}/${x.id}`}
              className="group flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors hover:bg-[#fcfbf9] focus:outline-none focus-visible:bg-[#fcfbf9] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-strong" aria-hidden>
                <RotateCcw className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink group-hover:underline">{x.title}</span>
                <span className="mt-0.5 block truncate text-[12.5px] text-ink-faint">
                  {why}{x.days_ago !== null && <> · <span className="text-gold-strong">{ago(x.days_ago)}</span></>}
                  {x.chapters[0] && <> · {x.chapters[0]}</>}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  </Section>
);
