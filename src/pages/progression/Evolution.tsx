// Évolution depuis le début : une seule mesure à la fois (jamais deux axes) — questions réussies et
// exercices réussis en cumul (la courbe ne fait que monter : tout ce qui est acquis), ou notes d'examen.
// Survol / clavier : un repère vertical et une infobulle ; un tableau équivalent pour les lecteurs d'écran.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import type { ProgressionData } from './types';
import { ChartTip, Empty, Section, Segmented } from './ui';
import { decimal, niceTicks, plural, shortDate } from './format';

type Metric = 'questions' | 'exercises' | 'exams';
const METRIC: Record<Metric, { label: string; unit: string }> = {
  questions: { label: 'Questions réussies', unit: 'questions réussies' },
  exercises: { label: 'Exercices réussis', unit: 'exercices réussis' },
  exams: { label: 'Notes d’examen', unit: '/ 20' },
};

export function Evolution({ data }: { data: ProgressionData }) {
  const { points } = data.evolution;
  const [metric, setMetric] = useState<Metric>('questions');
  const options = (['questions', 'exercises', 'exams'] as Metric[])
    .filter((m) => m !== 'exams' || data.exams.count > 0)
    .map((m) => ({ key: m, label: METRIC[m].label }));
  const values = points.map((p) => (metric === 'questions' ? p.questions_ok : metric === 'exercises' ? p.exercises : p.exam_avg));
  const s = data.summary;

  return (
    <Section id="evolution" tour="prog-evolution" icon={<TrendingUp className="h-4 w-4" />} title="Mon évolution"
      hint={data.since ? `Depuis tes débuts, le ${shortDate(data.since)}.` : undefined}
      action={points.length > 0 && <Segmented label="Mesure" value={metric} options={options} onChange={setMetric} />}>
      {points.length === 0 ? (
        <Empty text="Ta courbe commencera dès tes premières questions évaluées." action={{ to: '/exercises', label: 'Faire un exercice' }} />
      ) : (
        <>
          <p className="mb-3 text-[13.5px] text-ink-soft">
            {metric === 'exams'
              ? <>{plural(data.exams.count, 'examen corrigé', 'examens corrigés')} : moyenne <b className="text-ink">{decimal(data.exams.average ?? 0)} / 20</b>, meilleure note <b className="text-ink">{decimal(data.exams.best ?? 0)} / 20</b>.</>
              : <>Depuis le début : <b className="text-ink">{plural(s.questions_ok, 'question réussie', 'questions réussies')}</b> et <b className="text-ink">{plural(s.exercises_done, 'exercice réussi', 'exercices réussis')}</b>.</>}
          </p>
          <LineChart labels={points.map((p) => p.label)} values={values} exam={metric === 'exams'} unit={METRIC[metric].unit} />
          {metric === 'exams' && (
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
              {data.exams.list.slice(0, 4).map((e) => (
                <li key={e.id}>
                  <Link to={e.url} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#faf9f7]">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{e.title}</span>
                    <span className="shrink-0 text-[12px] text-ink-faint">{shortDate(e.date)}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${e.note >= 10 ? 'bg-brand-soft text-brand-hover' : 'bg-gold-soft text-[#8a6318]'}`}>
                      {decimal(e.note)} / 20
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Section>
  );
}

function LineChart({ labels, values, exam, unit }: { labels: string[]; values: (number | null)[]; exam: boolean; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 220, L = 40, R = 44, T = 14, B = 28;
  const ticks = exam ? [0, 5, 10, 15, 20] : niceTicks(Math.max(...values.map((v) => v ?? 0)));
  const max = ticks[ticks.length - 1];
  const n = labels.length;
  const x = (i: number) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const known = useMemo(() => values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null), [values]);
  const path = known.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = !exam && known.length > 1
    ? `${path} L${x(known[known.length - 1].i).toFixed(1)},${y(0)} L${x(known[0].i).toFixed(1)},${y(0)} Z` : null;
  const every = Math.ceil(n / 7);
  const last = known[known.length - 1];
  const fmt = (v: number) => (exam ? decimal(v) : String(Math.round(v)));
  const slot = (W - L - R) / Math.max(n - 1, 1);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Évolution : ${unit}`}
        onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#efece6" strokeWidth={1} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b6862" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(t)}</text>
          </g>
        ))}
        {exam && <line x1={L} x2={W - R} y1={y(10)} y2={y(10)} stroke="#c0892f" strokeWidth={1} />}
        {labels.map((lab, i) => (i % every === 0 || i === n - 1) && (
          <text key={i} x={x(i)} y={H - 8} fontSize="11" fill="#6b6862"
            textAnchor={n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'}>{lab}</text>
        ))}
        {area && <path d={area} fill="#1a7a4a" fillOpacity={0.1} />}
        <path d={path} fill="none" stroke="#1a7a4a" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {(exam ? known : last ? [last] : []).map((p) => (
          <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={hover === p.i ? 5.5 : 4.5} fill="#1a7a4a" stroke="#fff" strokeWidth={2} />
        ))}
        {/* Valeur au bout de la courbe (étiquette directe, une seule). */}
        {last && !exam && (
          <text x={x(last.i) + 8} y={y(last.v) + 4} fontSize="12" fontWeight={700} fill="#1a1a1a">{fmt(last.v)}</text>
        )}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#cfcdc8" strokeWidth={1} pointerEvents="none" />}
        {labels.map((_, i) => (
          <rect key={i} x={x(i) - slot / 2} y={T} width={slot} height={H - T - B} fill="transparent"
            tabIndex={0} aria-label={`${labels[i]} : ${values[i] === null ? 'pas de note' : `${fmt(values[i]!)} ${unit}`}`}
            onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
        ))}
      </svg>
      {hover !== null && (
        <ChartTip left={`${(x(hover) / W) * 100}%`} flip={hover > n / 2} title={labels[hover]}>
          <p className="text-ink">
            <span className="mr-1.5 inline-block h-0.5 w-3 align-middle bg-brand" />
            <b className="font-semibold">{values[hover] === null ? 'Pas de note' : fmt(values[hover]!)}</b>{' '}
            {values[hover] !== null && <span className="text-ink-faint">{unit}</span>}
          </p>
        </ChartTip>
      )}
      <table className="sr-only">
        <caption>{unit}</caption>
        <tbody>
          {labels.map((lab, i) => <tr key={i}><th scope="row">{lab}</th><td>{values[i] === null ? '—' : fmt(values[i]!)}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
