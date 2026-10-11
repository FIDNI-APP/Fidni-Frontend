// « Mon activité » : un seul graphique à la fois. Cette semaine : le temps de travail jour par jour, l'écart avec
// la semaine passée et l'objectif quotidien (réglable). Depuis le début : tout ce qui est réussi, en cumul, et
// les chapitres où passe le temps.
// 11/10/2026 : onglets communs (components/space), objectif en pastille qui ouvre ses choix (plus de petit
// menu déroulant au milieu d'une phrase), « Où passe ton temps » (time.by_chapter, déjà envoyé par le serveur).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock, Pencil, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { Section, Segmented } from '@/components/space/Page';
import type { ProgressionData } from './types';
import { ChartTip } from './ui';
import { decimal, duration, longDate, niceTicks, parseDay, plural, shortDate, weekday } from './format';

type View = 'week' | 'all';
const GOALS = [10, 15, 20, 30, 45, 60, 90, 120];
const TOP_CHAPTERS = 5;

export function Activity({ data, onShow }: { data: ProgressionData; onShow: (chapterId: number) => void }) {
  // Pas encore de temps mesuré : la courbe de ce qui est réussi d'abord (la semaine serait vide).
  const [view, setView] = useState<View>(() => (data.time.total_seconds > 0 || !data.evolution.points.length ? 'week' : 'all'));
  return (
    <div data-tour="prog-activite">
      <Section id="activite" title="Mon activité">
        <div className="rounded-2xl border border-line bg-white p-4 sm:p-6">
          <Segmented label="Période" value={view} onChange={setView}
            options={[{ key: 'week', label: 'Cette semaine' }, { key: 'all', label: 'Depuis le début' }]} />
          {view === 'week' ? <Week data={data} /> : <AllTime data={data} onShow={onShow} />}
        </div>
      </Section>
    </div>
  );
}

/** Petit état vide dans la carte (même dessin que EmptyState, sans seconde bordure). */
function Blank({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-5 flex flex-col items-center rounded-xl bg-[#faf9f7] px-4 py-7 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f2f1ee] text-ink-soft ring-1 ring-line" aria-hidden>
        <Clock className="h-5 w-5" />
      </span>
      <p className="mt-3 text-[14.5px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-faint">{text}</p>
    </div>
  );
}

function Week({ data }: { data: ProgressionData }) {
  const t = data.time;
  const [goal, setGoal] = useState(t.goal_minutes);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const days = t.days.slice(-7);
  const reached = days.filter((d) => d.seconds >= goal * 60).length;
  const diff = Math.round((t.week - t.previous_week) / 60);

  const changeGoal = (minutes: number) => {
    setPicking(false);
    if (minutes === goal) return;
    const before = goal;
    setGoal(minutes);
    setSaving(true);
    api.patch('/settings/', { daily_goal_minutes: minutes }).catch(() => setGoal(before)).finally(() => setSaving(false));
  };

  if (t.total_seconds === 0) {
    return <Blank title="Ton temps se compte tout seul" text="Il s’ajoute dès que tu ouvres un exercice, une leçon ou un examen. Ta semaine s’affichera ici." />;
  }

  return (
    <>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[14px] text-ink-soft">
            <b className="fd-nums text-[26px] font-bold leading-none text-ink">{duration(t.week)}</b> de travail sur 7 jours
          </p>
          {t.previous_week > 0 && (
            diff > 0 ? (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[12.5px] font-semibold text-brand-hover">
                <TrendingUp className="h-3.5 w-3.5" /> {duration(diff * 60)} de plus que la semaine passée
              </p>
            ) : (
              <p className="mt-1.5 text-[12.5px] text-ink-faint">
                {diff === 0 ? 'Autant que la semaine passée.' : `La semaine passée : ${duration(t.previous_week)}.`}
              </p>
            )
          )}
        </div>
        <div className="sm:text-right">
          <button type="button" onClick={() => setPicking((v) => !v)} aria-expanded={picking} disabled={saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[13px] text-ink-soft transition-colors hover:border-[#cfc9bf] hover:text-ink disabled:opacity-60">
            Objectif : <b className="fd-nums font-semibold text-ink">{goal} min</b> / jour <Pencil className="h-3.5 w-3.5 text-ink-faint" />
          </button>
          <p className="mt-1 text-[12.5px] text-ink-faint sm:pr-1">
            atteint <b className="font-semibold text-ink-soft">{plural(reached, 'jour', 'jours')}</b> sur 7
          </p>
        </div>
      </div>
      {picking && (
        <div className="mt-3 rounded-xl border border-line bg-[#fcfbf9] p-3">
          <p className="text-[12.5px] text-ink-faint">Combien de minutes par jour ?</p>
          <div role="radiogroup" aria-label="Objectif quotidien" className="mt-2 flex flex-wrap gap-2">
            {[...new Set([...GOALS, goal])].sort((a, b) => a - b).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={m === goal} onClick={() => changeGoal(m)}
                className={`fd-nums min-h-10 min-w-[64px] rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
                  m === goal ? 'bg-ink text-white' : 'border border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`}>
                {m} min
              </button>
            ))}
          </div>
        </div>
      )}
      <Bars goalMinutes={goal} items={days.map((d) => ({
        key: d.date, label: `${weekday(d.date)} ${parseDay(d.date).getDate()}`, title: longDate(d.date), seconds: d.seconds,
      }))} />
    </>
  );
}

function AllTime({ data, onShow }: { data: ProgressionData; onShow: (chapterId: number) => void }) {
  const points = data.evolution.points;
  const top = data.time.by_chapter.slice(0, TOP_CHAPTERS);
  const most = Math.max(1, ...top.map((c) => c.seconds));
  const s = data.summary;
  // Seulement ce qui n'est pas nul (pas de « 0 exercice réussi »).
  const done = [
    s.questions_ok > 0 && <b className="text-ink">{plural(s.questions_ok, 'question réussie', 'questions réussies')}</b>,
    s.exercises_done > 0 && <b className="text-ink">{plural(s.exercises_done, 'exercice réussi', 'exercices réussis')}</b>,
    data.time.total_seconds > 0 && <><b className="text-ink">{duration(data.time.total_seconds)}</b> de travail</>,
    data.exams.count > 0 && data.exams.average !== null && <><b className="text-ink">{decimal(data.exams.average)} / 20</b> de moyenne aux examens</>,
  ].filter(Boolean);
  if (!done.length) {
    return <Blank title="Ta courbe commencera bientôt" text="Dès tes premières questions évaluées, tu verras ici tout ce que tu as réussi depuis le début." />;
  }
  return (
    <>
      <p className="mt-5 text-[14px] leading-relaxed text-ink-soft">
        {data.since ? `Depuis le ${shortDate(data.since)} : ` : ''}
        {done.map((part, i) => <span key={i}>{i > 0 && (i === done.length - 1 ? ' et ' : ', ')}{part}</span>)}.
      </p>
      {points.length > 1 && <Line labels={points.map((p) => p.label)} values={points.map((p) => p.questions_ok)} />}
      {top.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-[13.5px] font-semibold text-ink">Où passe ton temps</h3>
          <ul className="mt-1 grid gap-x-6 sm:grid-cols-2">
            {top.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onShow(c.id)}
                  className="group block min-h-11 w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#f7f6f3] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13.5px] font-medium text-ink group-hover:underline">{c.name}</span>
                    <span className="fd-nums shrink-0 text-[12.5px] font-semibold text-ink-soft">{duration(c.seconds)}</span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]" aria-hidden>
                    <span className="block h-full rounded-full bg-brand/60" style={{ width: `${Math.max((c.seconds / most) * 100, 3)}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/** Une colonne par jour, la ligne de l'objectif, une coche les jours où il est atteint. */
function Bars({ items, goalMinutes }: { items: { key: string; label: string; title: string; seconds: number }[]; goalMinutes: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const goal = goalMinutes * 60;
  const max = Math.max(1, goal * 1.15, ...items.map((d) => d.seconds));
  const h = (s: number) => `${(s / max) * 100}%`;
  return (
    <div className="relative mt-6">
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
      <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-faint">
        <span className="inline-block w-4 border-t border-dashed border-gold" aria-hidden /> ton objectif
      </p>
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
  // Dessinée à la largeur réelle de la carte : les libellés gardent leur taille sur téléphone.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 170, L = 34, R = 34, T = 12, B = 26;
  const ticks = niceTicks(Math.max(...values, 1));
  const max = ticks[ticks.length - 1];
  const n = labels.length;
  const x = (i: number) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = useMemo(() => values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' '),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, max, W]);
  const every = Math.ceil(n / (W < 480 ? 3 : 6));
  const slot = (W - L - R) / Math.max(n - 1, 1);
  return (
    <div ref={box} className="relative mt-4">
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
