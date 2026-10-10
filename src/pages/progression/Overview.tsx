// « Où j'en suis » : une seule phrase et la barre du programme (08/10/2026). Le reste est dans le
// programme et l'activité, en dessous.
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { ProgressionData } from './types';
import { STATUS } from './status';
import { plural } from './format';

const PARTS = ['mastered', 'good', 'weak', 'started'] as const;
const LEGEND: Record<(typeof PARTS)[number] | 'todo', [string, string]> = {
  mastered: ['maîtrisé', 'maîtrisés'], good: ['en bonne voie', 'en bonne voie'], weak: ['à renforcer', 'à renforcer'],
  started: ['commencé', 'commencés'], todo: ['pas commencé', 'pas commencés'],
};

export function Overview({ data }: { data: ProgressionData }) {
  const ch = data.summary.chapters;
  const s = data.summary;
  const { user } = useAuth();
  // Niveau manquant : il se règle dans la scolarité du profil (l'onboarding, déjà fait, renverrait à l'accueil).
  const levelLink = user ? `/profile/${user.username}/edit#scolarite` : '/complete-profile';
  return (
    <section aria-label="Où j’en suis" data-tour="prog-resume" className="rounded-2xl border border-line bg-white px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        <p className="fd-nums leading-none text-ink" style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>
          <span className="text-[44px] font-bold tracking-tight">{ch.mastered}</span>
          <span className="text-[22px] font-semibold text-ink-faint"> / {ch.total}</span>
        </p>
        <p className="pb-1 text-[15px] leading-snug text-ink-soft">
          {ch.total === 0
            ? <><Link to={levelLink} className="font-semibold text-brand-hover hover:underline">Indique ton niveau</Link> pour voir ton programme.</>
            : ch.mastered
              ? <>chapitre{ch.mastered > 1 ? 's' : ''} maîtrisé{ch.mastered > 1 ? 's' : ''}{ch.good ? <>, <b className="font-semibold text-ink">{ch.good}</b> en bonne voie</> : null}.</>
              : <>chapitre maîtrisé pour l’instant{ch.good ? <> — <b className="font-semibold text-ink">{ch.good}</b> en bonne voie</> : null}.</>}
        </p>
        {s.questions_ok > 0 && (
          <p className="ml-auto pb-1 text-[13px] text-ink-faint">
            {plural(s.questions_ok, 'question réussie', 'questions réussies')}
            {s.questions_ok_week > 0 && <span className="font-semibold text-brand-hover"> · +{s.questions_ok_week} cette semaine</span>}
          </p>
        )}
      </div>
      {ch.total > 0 && (
        <>
          <div className="mt-4 flex h-2.5 gap-[3px] overflow-hidden rounded-full bg-[#f2f1ee]" role="img"
            aria-label={PARTS.filter((k) => ch[k]).map((k) => `${ch[k]} ${STATUS[k].label.toLowerCase()}`).join(', ') || 'aucun chapitre commencé'}>
            {PARTS.filter((k) => ch[k] > 0).map((k) => (
              <span key={k} className={`${STATUS[k].fill} first:rounded-l-full`} style={{ width: `${(ch[k] / ch.total) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-faint">
            {[...PARTS, 'todo' as const].filter((k) => ch[k] > 0).map((k) => (
              <li key={k} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${k === 'todo' ? 'bg-[#e7e3dc]' : STATUS[k].fill}`} />
                <b className="fd-nums font-semibold text-ink-soft">{ch[k]}</b> {LEGEND[k][ch[k] > 1 ? 1 : 0]}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
