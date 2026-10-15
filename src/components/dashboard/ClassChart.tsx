// « Toi et ta classe » (accueil) : score moyen par semaine sur 8 semaines, comparé à la classe.
// Montré seulement dans une classe ET avec au moins deux semaines de travail (sinon un graphique vide :
// le détail est dans Ma progression). Échelle 0-100 : un 0 reste dans le cadre.
import React, { useEffect, useRef, useState } from 'react';
import type { WeeklyProgress } from '@/lib/api';
import { Section, SectionLink } from '@/components/space/Page';
import { t } from '@/i18n';

// Les attributs de présentation SVG ne lisent pas les variables CSS : mêmes valeurs que :root (index.css).
const C_BRAND = '#1a7a4a', C_NEUTRAL = '#b8b4ac', C_INK = '#1a1a1a', C_FAINT = '#6b6862';

function Chart({ data, compare, labels }: { data: number[]; compare: number[]; labels: string[] }) {
  const [hov, setHov] = useState<number | null>(null);
  // Dessiné à la largeur réelle du cadre : textes lisibles sur téléphone, courbe pas trop haute sur ordinateur.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 170, P = 22;
  const iw = W - P * 2, ih = H - P * 2 - 10;
  const toY = (v: number) => P + ih - (Math.max(0, Math.min(100, v)) / 100) * ih;
  const toX = (i: number) => P + (i / Math.max(data.length - 1, 1)) * iw;
  const path = (d: number[]) => d.map((v, i) => `${i ? 'L' : 'M'}${toX(i)},${toY(v)}`).join(' ');
  return (
    <div ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto w-full" onMouseLeave={() => setHov(null)}
        role="img" aria-label={t('Ton score moyen par semaine : {liste}', { liste: data.map((v, i) => `${labels[i]} ${v} %`).join(', ') })}>
        {[0, 50, 100].map((v) => (
          <line key={v} x1={P} x2={W - P} y1={toY(v)} y2={toY(v)} stroke="#ece9e3" strokeWidth="1" strokeDasharray="3,5" />
        ))}
        <path d={path(compare)} fill="none" stroke={C_NEUTRAL} strokeWidth="1.5" strokeDasharray="4,4" />
        <path d={path(data)} fill="none" stroke={C_BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((v, i) => (
          <g key={i} onMouseEnter={() => setHov(i)}>
            <circle cx={toX(i)} cy={toY(compare[i] ?? 0)} r={2.5} fill={C_NEUTRAL} />
            <circle cx={toX(i)} cy={toY(v)} r={hov === i ? 5.5 : 3.5} fill={C_BRAND} stroke="#fff" strokeWidth="2" />
            {hov === i && (
              <>
                <rect x={Math.min(Math.max(toX(i) - 42, 0), W - 84)} y={Math.max(toY(v) - 48, 0)} width={84} height={38} rx={8} fill={C_INK} opacity=".95" />
                <text x={Math.min(Math.max(toX(i), 42), W - 42)} y={Math.max(toY(v) - 48, 0) + 16} textAnchor="middle" fontSize="11" fill="#fff">{t('Toi : {v} %', { v })}</text>
                <text x={Math.min(Math.max(toX(i), 42), W - 42)} y={Math.max(toY(v) - 48, 0) + 30} textAnchor="middle" fontSize="10" fill={C_NEUTRAL}>{t('Classe : {v} %', { v: compare[i] ?? 0 })}</text>
              </>
            )}
            <text x={toX(i)} y={H - 4} textAnchor="middle" fontSize="11" fill={C_FAINT}>{labels[i]}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export const ClassChart: React.FC<{ progress: WeeklyProgress }> = ({ progress }) => (
  <Section id="toi-et-ta-classe" title={t('Toi et ta classe')}
    hint={<>{t('Score moyen par semaine')}{progress.classroom && <> · <b className="font-semibold text-ink-soft">{progress.classroom.name}</b></>}</>}
    action={<SectionLink to="/progression">{t('Ma progression')}</SectionLink>}>
    <div className="rounded-2xl border border-line bg-white px-3 pb-2 pt-3 sm:px-5">
      <div className="mb-1 flex items-center justify-end gap-4 text-[12px] text-ink-faint">
        <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-brand" aria-hidden /> {t('Toi')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-[2px] w-4 rounded bg-[#b8b4ac]" aria-hidden /> {t('Classe')}</span>
      </div>
      <Chart data={progress.you} compare={progress.average} labels={progress.labels} />
    </div>
  </Section>
);
