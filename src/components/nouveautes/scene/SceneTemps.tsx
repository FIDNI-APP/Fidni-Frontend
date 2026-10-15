// Étape 4 « Où passe ton temps » : les barres de « Mon temps » s'étirent, le curseur touche un chapitre, le fil
// d'Ariane devient « Tout › Suites numériques » et ses contenus apparaissent (le vrai `Barre`).
import React, { useRef } from 'react';
import { BookOpen, ChevronRight, ClipboardList, FileText } from 'lucide-react';
import { Barre } from '@/components/progression/MonTemps';
import { duration } from '@/pages/progression/format';
import { Curseur, Ecran, Plateau, useTimeline } from './Scene';
import { TEMPS, TEMPS_CONTENUS } from './demo';
import { t } from '@/i18n';

// Barres · curseur vers le premier chapitre · clic et contenus · pause
const DUREES = [1500, 1000, 3200, 500] as const;
const rien = () => undefined;
const ICONE = { exercise: FileText, exam: ClipboardList, lesson: BookOpen } as const;
const TYPE = { exercise: 'Exercice', exam: 'Examen', lesson: 'Leçon' } as const;
const TOTAL = TEMPS.reduce((s, x) => s + x.secondes, 0);

const SceneTemps: React.FC = () => {
  const racine = useRef<HTMLDivElement>(null);
  const { phase, tour } = useTimeline(DUREES, 2);
  const ouvert = phase >= 2;
  return (
    <Plateau ref={racine}>
      <Ecran key={`e${tour}`}>
        <div data-scene="temps" className="rounded-2xl border border-line bg-white p-3">
          <p className="mb-1.5 flex min-w-0 items-center gap-1 text-[13px] font-semibold">
            <span className={ouvert ? 'shrink-0 text-brand-hover' : 'text-ink'}>{t('Tout · {d}', { d: duration(TOTAL) })}</span>
            {ouvert && <><ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" /><span className="truncate text-ink">{TEMPS[0].nom}</span></>}
          </p>
          {!ouvert ? (
            <ul className="flex flex-col">
              {TEMPS.map((tp, i) => (
                <Barre key={tp.nom} label={tp.nom} secondes={tp.secondes} max={TEMPS[0].secondes} onClick={rien} anime delai={i * 120}
                  sub={t('{n} contenus · {p} % de ton temps', { n: tp.contenus, p: Math.round((tp.secondes / TOTAL) * 100) })} />
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col">
              {TEMPS_CONTENUS.map((c, i) => {
                const Icon = ICONE[c.type];
                return (
                  <Barre key={c.titre} label={c.titre} secondes={c.secondes} max={TEMPS_CONTENUS[0].secondes} onClick={rien} anime delai={i * 120}
                    icon={<Icon className="h-4 w-4 shrink-0 text-ink-faint" />} sub={t(TYPE[c.type])} />
                );
              })}
            </ul>
          )}
        </div>
      </Ecran>
      <Curseur key={`c${tour}`} racine={racine} cible={phase === 1 || phase === 2 ? '[data-scene="temps"] li:first-child button' : null} appui={phase === 2} />
    </Plateau>
  );
};

export default SceneTemps;
