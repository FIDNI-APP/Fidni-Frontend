// « Ton prochain pas » (11/10/2026) : la page commence par ce qu'il faut faire maintenant, plus par un déficit
// (« 0 / 14 chapitre maîtrisé »). Le chapitre choisi (nextStep.ts), ses deux boutons, ce qui reste à revoir,
// puis le bilan en chiffres positifs : chapitres commencés, questions réussies, temps, série.
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, ChevronRight, Compass, RotateCcw } from 'lucide-react';
import { Section } from '@/components/space/Page';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { trackAction } from '@/lib/usage';
import type { ProgressionData } from './types';
import { RING, STATUS } from './status';
import { highlights, pickNextStep, type Highlight, type NextStep } from './nextStep';
import { courseFirst as needsCourseFirst, lessonsUrl, practiceUrl, quizUrl } from './links';

// « À renforcer » : le texte or foncé de status.ts (4,9:1 sur le fond doré clair ; gold-strong n'y fait que 4,1:1).
const CHIP = {
  mastered: 'bg-brand-soft text-brand-hover', good: 'bg-brand-soft text-brand-hover', weak: `bg-gold-soft ${STATUS.weak.text}`,
  started: 'bg-[#f2f1ee] text-ink-soft', todo: 'bg-[#f2f1ee] text-ink-soft',
} as const;

export function Overview({ data, onShow }: { data: ProgressionData; onShow: (chapterId: number) => void }) {
  const step = pickNextStep(data);
  const facts = highlights(data);
  // Pas de chapitre à proposer (programme pas encore en ligne) : seulement le bilan, s'il y a de quoi.
  if (!step && !facts.length) return null;
  return (
    <Section id="prochain-pas" title={step ? 'Ton prochain pas' : 'Ton bilan'}>
      <div data-tour="prog-resume">
        {step && <NextStepHero step={step} onShow={onShow} />}
        <Highlights items={facts} />
      </div>
    </Section>
  );
}

function NextStepHero({ step, onShow }: { step: NextStep; onShow: (chapterId: number) => void }) {
  const c = step.chapter;
  const st = STATUS[c.status];
  // Chapitre à découvrir : « À découvrir » (pas « Pas commencé » juste au-dessus de « Commence … »).
  const discover = step.kind === 'decouvrir';
  const Icon = discover ? Compass : st.icon;
  const label = discover ? 'À découvrir' : st.label;
  const review = c.review[0];
  // Chapitre sans exercice encore : le cours d'abord (« S'entraîner » mènerait à une liste vide).
  const courseFirst = needsCourseFirst(c);
  const practice = (
    <Link key="entrainer" to={practiceUrl(c.hub_url, c.id)} onClick={() => trackAction('prog-entrainer')}
      className={`${courseFirst ? 'fd-btn-ghost min-h-10' : 'fd-btn-primary min-h-11'} w-full justify-center`}>
      S’entraîner <ArrowRight className="h-4 w-4" />
    </Link>
  );
  const course = (
    <Link key="cours" to={lessonsUrl(c.hub_url, c.id)} onClick={() => trackAction('prog-cours')}
      className={`${courseFirst ? 'fd-btn-primary min-h-11' : 'fd-btn-ghost min-h-10'} w-full justify-center`}>
      <BookOpen className="h-4 w-4" /> Le cours
    </Link>
  );
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 sm:flex-1">
          {c.mastery !== null ? (
            <ProgressRing percentage={c.mastery} size={64} strokeWidth={6} progressColor={RING[c.status]} trackColor="#efece6" className="sm:row-span-2">
              <span className="fd-nums text-[15px] font-bold text-ink">{c.mastery}%</span>
            </ProgressRing>
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#f2f1ee] text-ink-soft ring-1 ring-line sm:row-span-2" aria-hidden>
              <Compass className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${CHIP[c.status]}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </span>
            <h3 className="fd-display mt-2 text-[24px] leading-tight text-ink">
              <span className="text-ink-faint">{step.verb}</span> {c.name}
            </h3>
            <p className="mt-0.5 text-[13px] text-ink-faint">{c.subfield}</p>
          </div>
          {/* Téléphone : la raison prend toute la largeur, sous le cercle ; ordinateur : sous le titre. */}
          <div className="col-span-2 sm:col-span-1 sm:col-start-2">
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-soft sm:mt-2.5">{step.reason}</p>
            {step.focus && (
              <p className="mt-1 text-[13px] text-ink-soft">
                <span className="font-semibold text-gold-strong">Surtout :</span> {step.focus.label}{' '}
                <span className="fd-nums text-ink-faint">({step.focus.pct} %)</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-line pt-4 sm:w-[240px] sm:shrink-0 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          {courseFirst ? [course, practice] : [practice, course]}
          {c.quiz_ready && (
            <Link to={quizUrl(c.id)} onClick={() => trackAction('prog-quiz')} className="fd-btn-ghost min-h-10 w-full justify-center">
              <Brain className="h-4 w-4" /> {c.skilliq ? 'Refaire le quiz' : 'Passer le quiz'}
            </Link>
          )}
        </div>
      </div>
      {/* Bas de carte : ce qui reste à revoir, le détail (téléphone : l'ordinateur l'a déjà à côté du programme), la suite. */}
      <div className={`flex flex-wrap items-center gap-x-4 border-t border-line bg-[#fcfbf9] px-5 py-1 text-[12.5px] sm:px-6 ${
        review || step.then.length ? '' : 'lg:hidden'}`}>
        {review && (
          <Link to={review.url} className="inline-flex min-h-10 min-w-0 max-w-full grow items-center gap-1.5 font-semibold text-ink-soft hover:text-ink">
            <RotateCcw className="h-3.5 w-3.5 shrink-0 text-gold-strong" />
            <span className="truncate">À revoir : {review.title}</span>
          </Link>
        )}
        <button type="button" onClick={() => onShow(c.id)} className="inline-flex min-h-10 items-center gap-1 font-semibold text-ink-soft hover:text-ink lg:hidden">
          Voir le détail du chapitre <ChevronRight className="h-3.5 w-3.5" />
        </button>
        {step.then.length > 0 && (
          <span className="flex min-w-0 basis-full flex-wrap items-center gap-x-1 text-ink-faint sm:ml-auto sm:basis-auto">
            <span>Ensuite :</span>
            {step.then.map((t, i) => (
              // Le séparateur reste avec le nom qui le suit ; un nom ne se coupe pas.
              <span key={t.id} className="inline-flex min-w-0 max-w-full items-center whitespace-nowrap">
                {i > 0 && <span className="pr-1" aria-hidden>·</span>}
                <button type="button" onClick={() => onShow(t.id)}
                  className="min-h-10 min-w-0 truncate text-ink-soft underline decoration-line underline-offset-2 hover:text-ink">
                  {t.name}
                </button>
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

/** Le bilan : deux à quatre chiffres, tous positifs ; rien du tout s'il n'y a encore rien à dire. */
function Highlights({ items }: { items: Highlight[] }) {
  if (!items.length) return null;
  const cols = ['sm:grid-cols-1', 'sm:grid-cols-2', 'sm:grid-cols-3', 'sm:grid-cols-4'][Math.min(items.length, 4) - 1];
  return (
    <dl className={`mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line ${cols}`}>
      {items.map((h, i) => (
        <div key={h.key} className={`bg-white px-4 py-3 ${items.length % 2 && i === items.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}>
          <dt className="text-[12px] font-medium text-ink-faint">{h.label}</dt>
          <dd className={`fd-nums mt-0.5 text-[20px] font-bold leading-tight ${h.value.startsWith('+') ? 'text-brand-hover' : 'text-ink'}`}>{h.value}</dd>
          {h.hint && <dd className="mt-0.5 text-[12px] leading-snug text-ink-faint">{h.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
