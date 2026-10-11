// « Tes notions » (11/10/2026) : ce que le serveur calcule déjà (points forts / à renforcer, au moins 3 questions
// évaluées par notion) et qui n'était montré nulle part. À retravailler → s'entraîner sur le chapitre ;
// réussi → le détail du chapitre dans le programme.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Target } from 'lucide-react';
import { Section } from '@/components/space/Page';
import { trackAction } from '@/lib/usage';
import type { RatedItem } from './types';
import { Meter } from './ui';
import { plural } from './format';
import { practiceUrl } from './links';

export function Notions({ strengths, weaknesses, onShow }: {
  strengths: RatedItem[]; weaknesses: RatedItem[]; onShow: (chapterId: number) => void;
}) {
  if (!strengths.length && !weaknesses.length) return null;
  const both = strengths.length > 0 && weaknesses.length > 0;
  return (
    <Section id="notions" title="Tes notions" hint="D’après les questions que tu as évaluées, tous chapitres confondus.">
      <div className={`grid items-start gap-3 ${both ? 'md:grid-cols-2' : ''}`}>
        {weaknesses.length > 0 && (
          <Card title="À retravailler" tone="gold">
            {weaknesses.map((n) => (
              <li key={`${n.label}-${n.chapter_id}`}>
                <Link to={n.chapter_id ? practiceUrl(n.hub_url, n.chapter_id) : n.url} onClick={() => trackAction('prog-entrainer')}
                  className="group block rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f7f6f3] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                  <Line item={n} tone="weak" action="S’entraîner" />
                </Link>
              </li>
            ))}
          </Card>
        )}
        {strengths.length > 0 && (
          <Card title="Tu réussis" tone="brand">
            {strengths.map((n) => (
              <li key={`${n.label}-${n.chapter_id}`}>
                {n.chapter_id ? (
                  <button type="button" onClick={() => onShow(n.chapter_id as number)}
                    className="group block w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#f7f6f3] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                    <Line item={n} tone="mastered" action="Le chapitre" />
                  </button>
                ) : <div className="px-3 py-2.5"><Line item={n} tone="mastered" /></div>}
              </li>
            ))}
          </Card>
        )}
      </div>
    </Section>
  );
}

function Card({ title, tone, children }: { title: string; tone: 'gold' | 'brand'; children: ReactNode }) {
  const Icon = tone === 'gold' ? Target : Check;
  return (
    <div className="rounded-2xl border border-line bg-white p-2">
      <h3 className="flex items-center gap-2 px-3 pb-1 pt-2 text-[13.5px] font-semibold text-ink">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${tone === 'gold' ? 'bg-gold-soft text-gold-strong' : 'bg-brand-soft text-brand-hover'}`} aria-hidden>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </h3>
      <ul>{children}</ul>
    </div>
  );
}

function Line({ item: n, tone, action }: { item: RatedItem; tone: 'weak' | 'mastered'; action?: string }) {
  const detail = n.source === 'skilliq' ? 'au quiz du chapitre'
    : [n.chapter, n.questions ? plural(n.questions, 'question', 'questions') : null].filter(Boolean).join(' · ');
  return (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold text-ink">{n.label}</span>
          {detail && <span className="block truncate text-[12px] text-ink-faint">{detail}</span>}
        </span>
        <span className={`fd-nums shrink-0 text-[13.5px] font-bold ${tone === 'weak' ? 'text-[#8a6318]' : 'text-brand-hover'}`}>{n.pct} %</span>
      </span>
      <span className="mt-1.5 flex items-center gap-3">
        <Meter pct={n.pct} status={tone} className="flex-1" />
        {action && (
          <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-brand-hover group-hover:underline">
            <span className="hidden sm:inline">{action}</span> <ArrowRight className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
    </>
  );
}
