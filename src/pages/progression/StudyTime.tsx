// Temps d'étude, lisible d'un coup d'œil : le total des 7 derniers jours (comparé aux 7 d'avant), une
// barre par jour avec l'objectif quotidien (réglable ici) et une coche les jours où il est atteint ; ou
// une barre par mois depuis le début. Puis « où passe ton temps » : un clic ouvre le chapitre.
import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, Clock, Minus } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import type { StudyTimeData } from './types';
import { ChartTip, Empty, Section, Segmented } from './ui';
import { duration, longDate, parseDay, shortDate, weekday } from './format';

type Range = 'week' | 'month' | 'all';
const GOALS = [10, 15, 20, 30, 45, 60, 90, 120];

export function StudyTime({ time, since, onOpen }: { time: StudyTimeData; since: string | null; onOpen: (id: number) => void }) {
  const [range, setRange] = useState<Range>('week');
  const [goal, setGoal] = useState(time.goal_minutes);
  const [savingGoal, setSavingGoal] = useState(false);
  const [allChapters, setAllChapters] = useState(false);

  const days = range === 'week' ? time.days.slice(-7) : time.days;
  const reached = time.days.slice(-7).filter((d) => d.seconds >= goal * 60).length;
  const delta = Math.round((time.week - time.previous_week) / 60);

  const changeGoal = (minutes: number) => {
    const before = goal;
    setGoal(minutes);
    setSavingGoal(true);
    api.patch('/settings/', { daily_goal_minutes: minutes })
      .catch(() => setGoal(before))
      .finally(() => setSavingGoal(false));
  };

  const chapters = allChapters ? time.by_chapter : time.by_chapter.slice(0, 5);
  const maxChapter = Math.max(1, ...time.by_chapter.map((c) => c.seconds));

  return (
    <Section id="temps" tour="prog-temps" icon={<Clock className="h-4 w-4" />} title="Mon temps d’étude"
      hint="Mesuré automatiquement quand tu travailles sur un exercice, une leçon ou un examen."
      action={<Segmented label="Période" value={range} onChange={setRange}
        options={[{ key: 'week', label: '7 jours' }, { key: 'month', label: '4 semaines' }, { key: 'all', label: 'Depuis le début' }]} />}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="fd-display text-[34px] font-semibold leading-none text-ink">
              {range === 'all' ? duration(time.total_seconds) : duration(range === 'week' ? time.week : time.days.reduce((n, d) => n + d.seconds, 0))}
            </span>
            <span className="text-[13px] text-ink-faint">
              {range === 'all' ? (since ? `depuis le ${shortDate(since)}` : 'au total') : range === 'week' ? 'ces 7 derniers jours' : 'ces 4 dernières semaines'}
            </span>
          </p>
          {range === 'week' && (time.week > 0 || time.previous_week > 0) && <Delta minutes={delta} />}
        </div>
        {range !== 'all' && (
          <p className="text-[13px] text-ink-soft">
            Objectif :{' '}
            <select aria-label="Objectif quotidien" value={goal} disabled={savingGoal} onChange={(e) => changeGoal(Number(e.target.value))}
              className="rounded-md border border-line bg-white px-1.5 py-1 text-[13px] font-semibold text-ink">
              {[...new Set([...GOALS, goal])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>{' '}
            par jour · <b className="text-ink">atteint {reached} jour{reached > 1 ? 's' : ''} sur 7</b>
          </p>
        )}
      </div>

      {time.total_seconds === 0 ? (
        <div className="mt-4"><Empty text="Aucun temps d’étude enregistré pour l’instant." /></div>
      ) : range === 'all' ? (
        <Bars items={time.months.map((m) => ({ key: m.start, label: m.label.split(' ')[0], title: m.label, seconds: m.seconds }))} />
      ) : (
        <Bars goalMinutes={goal} items={days.map((d) => ({
          key: d.date,
          label: range === 'week' ? `${weekday(d.date)} ${parseDay(d.date).getDate()}` : (parseDay(d.date).getDay() === 1 ? shortDate(d.date) : ''),
          title: longDate(d.date),
          seconds: d.seconds,
        }))} />
      )}

      {time.by_chapter.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="mb-3 text-[14px] font-semibold text-ink">Où passe ton temps</h3>
          <ul className="flex flex-col gap-1">
            {chapters.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onOpen(c.id)}
                  className="w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[#faf9f7] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13.5px] font-medium text-ink">{c.name}</span>
                    <span className="shrink-0 text-[12.5px] font-semibold text-ink">{duration(c.seconds)}</span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-brand/10">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max((c.seconds / maxChapter) * 100, 2)}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {time.by_chapter.length > 5 && (
            <button type="button" onClick={() => setAllChapters((v) => !v)} className="mt-2 px-2 text-[12.5px] font-semibold text-brand-hover hover:underline">
              {allChapters ? 'Voir moins' : `Voir les ${time.by_chapter.length} chapitres`}
            </button>
          )}
        </div>
      )}
    </Section>
  );
}

function Delta({ minutes }: { minutes: number }) {
  const Icon = minutes > 0 ? ArrowUpRight : minutes < 0 ? ArrowDownRight : Minus;
  const tone = minutes > 0 ? 'text-brand-hover' : minutes < 0 ? 'text-[#8a6318]' : 'text-ink-faint';
  return (
    <p className={`mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {minutes === 0 ? 'Autant' : `${minutes > 0 ? '+' : '−'}${duration(Math.abs(minutes) * 60)}`}
      <span className="font-normal text-ink-faint">par rapport aux 7 jours d’avant</span>
    </p>
  );
}

/** Colonnes fines (24 px au plus, bout arrondi, base droite), ligne d'objectif, infobulle au survol / clavier. */
function Bars({ items, goalMinutes }: { items: { key: string; label: string; title: string; seconds: number }[]; goalMinutes?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const goal = goalMinutes ? goalMinutes * 60 : 0;
  const max = Math.max(1, goal * 1.15, ...items.map((d) => d.seconds));
  const h = (s: number) => `${(s / max) * 100}%`;
  return (
    <div className="relative mt-5">
      <div className="relative flex h-[150px] items-end gap-[2px] border-b border-[#e7e3dc]" onMouseLeave={() => setHover(null)}>
        {goal > 0 && (
          <div className="pointer-events-none absolute inset-x-0 border-t border-gold" style={{ bottom: h(goal) }}>
            <span className="absolute -top-[18px] right-0 rounded bg-white/90 px-1 text-[11px] font-semibold text-[#8a6318]">objectif</span>
          </div>
        )}
        {items.map((d, i) => {
          const ok = goal > 0 && d.seconds >= goal;
          return (
            <button key={d.key} type="button" aria-label={`${d.title} : ${duration(d.seconds)}${ok ? ', objectif atteint' : ''}`}
              onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end focus:outline-none">
              {ok && items.length <= 7 && <Check className="mb-1 h-3.5 w-3.5 text-brand-hover" aria-hidden />}
              <span className={`block w-full max-w-[24px] rounded-t-[4px] transition-colors ${hover === i ? 'bg-brand-hover' : 'bg-brand'} group-focus-visible:ring-2 group-focus-visible:ring-brand/40`}
                style={{ height: d.seconds ? `max(${h(d.seconds)}, 3px)` : 0 }} />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px]">
        {items.map((d) => <span key={d.key} className="min-w-0 flex-1 truncate text-center text-[10.5px] text-ink-faint">{d.label}</span>)}
      </div>
      {hover !== null && (
        <ChartTip left={`${((hover + 0.5) / items.length) * 100}%`} flip={hover > items.length / 2} title={items[hover].title}>
          <p className="text-ink"><b className="font-semibold">{duration(items[hover].seconds)}</b>
            {goal > 0 && items[hover].seconds >= goal && <span className="ml-1.5 text-brand-hover">✓ objectif atteint</span>}
          </p>
        </ChartTip>
      )}
      <table className="sr-only">
        <caption>Temps d’étude</caption>
        <tbody>{items.map((d) => <tr key={d.key}><th scope="row">{d.title}</th><td>{duration(d.seconds)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
