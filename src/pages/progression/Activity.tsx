// « Mon activité » (08/10/2026) : un seul graphique à la fois. Cette semaine : le temps de travail jour
// par jour et l'objectif quotidien (réglable). Depuis le début : tout ce qui est réussi, en cumul.
import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import type { ProgressionData } from './types';
import { ChartTip, Segmented } from './ui';
import { decimal, duration, longDate, niceTicks, parseDay, plural, shortDate, weekday } from './format';

type View = 'week' | 'all';
const GOALS = [10, 15, 20, 30, 45, 60, 90, 120];

export function Activity({ data }: { data: ProgressionData }) {
  const [view, setView] = useState<View>('week');
  const [goal, setGoal] = useState(data.time.goal_minutes);
  const [saving, setSaving] = useState(false);
  const t = data.time;
  const days = t.days.slice(-7);
  const reached = days.filter((d) => d.seconds >= goal * 60).length;
  const points = data.evolution.points;

  const changeGoal = (minutes: number) => {
    const before = goal;
    setGoal(minutes);
    setSaving(true);
    api.patch('/settings/', { daily_goal_minutes: minutes }).catch(() => setGoal(before)).finally(() => setSaving(false));
  };

  return (
    <section aria-labelledby="mon-activite" data-tour="prog-activite" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="mon-activite" className="fd-display text-[21px] leading-tight text-ink">Mon activité</h2>
        <Segmented label="Période" value={view} onChange={setView}
          options={[{ key: 'week', label: 'Cette semaine' }, { key: 'all', label: 'Depuis le début' }]} />
      </div>

      {view === 'week' ? (
        <>
          <p className="mt-3 text-[14px] text-ink-soft">
            <b className="fd-nums text-[22px] font-bold text-ink">{duration(t.week)}</b> de travail sur 7 jours
          </p>
          <p className="mt-1 text-[13px] text-ink-faint">
            Objectif :{' '}
            <select aria-label="Objectif quotidien" value={goal} disabled={saving} onChange={(e) => changeGoal(Number(e.target.value))}
              className="rounded-md border border-line bg-white px-1 py-0.5 text-[13px] font-semibold text-ink">
              {[...new Set([...GOALS, goal])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>{' '}
            par jour · atteint <b className="font-semibold text-ink-soft">{plural(reached, 'jour', 'jours')}</b> sur 7
          </p>
          {t.week === 0 && t.total_seconds === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-[#faf9f7] px-4 py-5 text-[13px] text-ink-faint">
              Ton temps de travail se mesure tout seul quand tu ouvres un exercice, une leçon ou un examen.
            </p>
          ) : (
            <Bars goalMinutes={goal} items={days.map((d) => ({
              key: d.date, label: `${weekday(d.date)} ${parseDay(d.date).getDate()}`, title: longDate(d.date), seconds: d.seconds,
            }))} />
          )}
        </>
      ) : (
        <>
          <p className="mt-3 text-[14px] text-ink-soft">
            {data.since ? `Depuis le ${shortDate(data.since)} : ` : ''}
            <b className="text-ink">{plural(data.summary.questions_ok, 'question réussie', 'questions réussies')}</b>,{' '}
            <b className="text-ink">{plural(data.summary.exercises_done, 'exercice réussi', 'exercices réussis')}</b>
            {data.exams.count > 0 && data.exams.average !== null && <>, examens : <b className="text-ink">{decimal(data.exams.average)} / 20</b> de moyenne</>}.
          </p>
          {points.length ? <Line labels={points.map((p) => p.label)} values={points.map((p) => p.questions_ok)} /> : (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-[#faf9f7] px-4 py-5 text-[13px] text-ink-faint">
              Ta courbe commencera dès tes premières questions évaluées.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** Une colonne par jour, la ligne de l'objectif, une coche les jours où il est atteint. */
function Bars({ items, goalMinutes }: { items: { key: string; label: string; title: string; seconds: number }[]; goalMinutes: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const goal = goalMinutes * 60;
  const max = Math.max(1, goal * 1.15, ...items.map((d) => d.seconds));
  const h = (s: number) => `${(s / max) * 100}%`;
  return (
    <div className="relative mt-5">
      <div className="relative flex h-[120px] items-end gap-2 border-b border-[#e7e3dc]" onMouseLeave={() => setHover(null)}>
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-gold" style={{ bottom: h(goal) }} />
        {items.map((d, i) => {
          const ok = d.seconds >= goal;
          return (
            <button key={d.key} type="button" aria-label={`${d.title} : ${duration(d.seconds)}${ok ? ', objectif atteint' : ''}`}
              onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end focus:outline-none">
              {ok && <Check className="mb-1 h-3.5 w-3.5 text-brand-hover" aria-hidden />}
              <span className={`block w-full max-w-[34px] rounded-t-md transition-colors ${hover === i ? 'bg-brand-hover' : ok ? 'bg-brand' : 'bg-brand/45'}`}
                style={{ height: d.seconds ? `max(${h(d.seconds)}, 3px)` : 0 }} />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-2">
        {items.map((d) => <span key={d.key} className="min-w-0 flex-1 truncate text-center text-[11px] text-ink-faint">{d.label}</span>)}
      </div>
      {hover !== null && (
        <ChartTip left={`${((hover + 0.5) / items.length) * 100}%`} flip={hover > items.length / 2} title={items[hover].title}>
          <p className="text-ink"><b className="font-semibold">{duration(items[hover].seconds)}</b>
            {items[hover].seconds >= goal && <span className="ml-1.5 text-brand-hover">✓ objectif</span>}
          </p>
        </ChartTip>
      )}
      <table className="sr-only">
        <caption>Temps de travail par jour</caption>
        <tbody>{items.map((d) => <tr key={d.key}><th scope="row">{d.title}</th><td>{duration(d.seconds)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

/** Questions réussies en cumul : la courbe ne fait que monter. */
function Line({ labels, values }: { labels: string[]; values: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 170, L = 34, R = 34, T = 12, B = 26;
  const ticks = niceTicks(Math.max(...values, 1));
  const max = ticks[ticks.length - 1];
  const n = labels.length;
  const x = (i: number) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = useMemo(() => values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' '),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, max]);
  const every = Math.ceil(n / 6);
  const slot = (W - L - R) / Math.max(n - 1, 1);
  return (
    <div className="relative mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Questions réussies depuis le début" onMouseLeave={() => setHover(null)}>
        {[ticks[0], ticks[ticks.length - 1]].map((tk) => (
          <g key={tk}>
            <line x1={L} x2={W - R} y1={y(tk)} y2={y(tk)} stroke="#efece6" />
            <text x={L - 8} y={y(tk) + 4} textAnchor="end" fontSize="11" fill="#6b6862">{tk}</text>
          </g>
        ))}
        {labels.map((lab, i) => (i % every === 0 || i === n - 1) && (
          <text key={i} x={x(i)} y={H - 6} fontSize="11" fill="#6b6862" textAnchor={n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'}>{lab}</text>
        ))}
        {n > 1 && <path d={`${path} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="#1a7a4a" fillOpacity={0.08} />}
        <path d={path} fill="none" stroke="#1a7a4a" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(n - 1)} cy={y(values[n - 1])} r={4.5} fill="#1a7a4a" stroke="#fff" strokeWidth={2} />
        <text x={x(n - 1) + 8} y={y(values[n - 1]) + 4} fontSize="12" fontWeight={700} fill="#1a1a1a">{values[n - 1]}</text>
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#cfcdc8" pointerEvents="none" />}
        {labels.map((_, i) => (
          <rect key={i} x={x(i) - slot / 2} y={T} width={slot} height={H - T - B} fill="transparent" tabIndex={0}
            aria-label={`${labels[i]} : ${values[i]} questions réussies`}
            onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
        ))}
      </svg>
      {hover !== null && (
        <ChartTip left={`${(x(hover) / W) * 100}%`} flip={hover > n / 2} title={labels[hover]}>
          <p className="text-ink"><b className="font-semibold">{values[hover]}</b> <span className="text-ink-faint">questions réussies</span></p>
        </ChartTip>
      )}
    </div>
  );
}
