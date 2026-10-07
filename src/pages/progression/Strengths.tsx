// Points forts / à renforcer : notions (au moins 3 questions évaluées) et chapitres du Skill IQ.
// Un clic ouvre le chapitre concerné.
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Target } from 'lucide-react';
import type { RatedItem } from './types';
import { Empty, Meter, Section } from './ui';
import { plural } from './format';

export function Strengths({ strengths, weaknesses, questions, onOpen }: {
  strengths: RatedItem[]; weaknesses: RatedItem[]; questions: number; onOpen: (id: number) => void;
}) {
  const early = questions < 10;
  return (
    <div id="forces" className="grid scroll-mt-20 gap-6 lg:grid-cols-2" data-tour="prog-forces">
      <Section title="Mes points forts" icon={<Sparkles className="h-4 w-4" />}
        hint="Ce que tu réussis le mieux (80 % et plus).">
        {strengths.length === 0 ? (
          <Empty text={early
            ? 'Évalue tes réponses aux exercices (Réussi / À revoir) : tes points forts apparaîtront ici.'
            : 'Pas encore de notion réussie à 80 % : continue, ça vient !'} action={early ? { to: '/exercises', label: 'Faire un exercice' } : undefined} />
        ) : (
          <List items={strengths} kind="good" onOpen={onOpen} />
        )}
      </Section>
      <Section title="À renforcer" icon={<Target className="h-4 w-4" />}
        hint="Ce que tu réussis le moins (moins de 60 %) : c’est là que tu progresseras le plus vite.">
        {weaknesses.length === 0 ? (
          <Empty text={early
            ? 'Rien à signaler pour l’instant : il faut quelques questions évaluées par notion.'
            : 'Aucun point faible repéré. Bravo, continue comme ça !'} />
        ) : (
          <List items={weaknesses} kind="weak" onOpen={onOpen} />
        )}
      </Section>
    </div>
  );
}

function List({ items, kind, onOpen }: { items: RatedItem[]; kind: 'good' | 'weak'; onOpen: (id: number) => void }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((x) => {
        const sub = [x.source === 'skilliq' ? 'Quiz Skill IQ' : x.chapter, x.questions ? plural(x.questions, 'question', 'questions') : null]
          .filter(Boolean).join(' · ');
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-ink">{x.label}</span>
                {sub && <span className="block truncate text-[12px] text-ink-faint">{sub}</span>}
              </span>
              <span className={`shrink-0 text-[14px] font-bold ${kind === 'good' ? 'text-brand-hover' : 'text-[#8a6318]'}`}>{x.pct} %</span>
            </span>
            <Meter pct={x.pct} status={kind === 'good' ? 'mastered' : 'weak'} className="mt-2" />
            {kind === 'weak' && (
              <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-hover">
                Voir le chapitre et s’entraîner <ArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
          </>
        );
        const cls = 'block w-full rounded-xl border border-line px-4 py-3 text-left transition-colors hover:bg-[#faf9f7] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';
        return (
          <li key={`${x.source}-${x.label}`}>
            {x.chapter_id ? (
              <button type="button" className={cls} onClick={() => onOpen(x.chapter_id!)}>{body}</button>
            ) : (
              <Link to={x.url} className={cls}>{body}</Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
