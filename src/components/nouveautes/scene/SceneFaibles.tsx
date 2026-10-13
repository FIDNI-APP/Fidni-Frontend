// Étape 2 « Tes points faibles, théorème par théorème » : le vrai `PointsFaibles` ; les théorèmes entrent les moins
// réussis d'abord, le curseur appuie sur « S'entraîner », puis déplie les questions à refaire (la caméra descend).
import React, { useRef } from 'react';
import { PointsFaibles } from '@/components/progression/PointsFaibles';
import { Curseur, Ecran, Plateau, useTimeline } from './Scene';
import { POINTS_FAIBLES } from './demo';

// Entrée · curseur vers « S'entraîner » · appui · curseur vers « à refaire » · clic · dépliées (caméra) · pause
const DUREES = [1400, 900, 1000, 900, 700, 2800, 500] as const;
const PREMIER = '[data-scene="faibles"] > div > ul > li:first-child';

const SceneFaibles: React.FC = () => {
  const racine = useRef<HTMLDivElement>(null);
  const { phase, tour } = useTimeline(DUREES, 5);
  const cible = phase === 1 || phase === 2 ? `${PREMIER} > div a` : phase === 3 || phase === 4 ? `${PREMIER} button[aria-expanded]` : null;
  return (
    <Plateau ref={racine}>
      <Ecran key={`e${tour}`} vers={phase >= 5 ? `${PREMIER} button[aria-expanded]` : null} marge={40}>
        <div data-scene="faibles"
          className="[&>div>ul>li:nth-child(2)]:[animation-delay:.18s] [&>div>ul>li:nth-child(3)]:[animation-delay:.36s] [&>div>ul>li]:animate-fade-up">
          <PointsFaibles points={POINTS_FAIBLES} ouverts={phase >= 4 ? [POINTS_FAIBLES[0].nom] : []} />
        </div>
      </Ecran>
      <Curseur key={`c${tour}`} racine={racine} cible={cible} appui={phase === 2 || phase === 4} decalage={{ x: 6, y: 2 }} />
    </Plateau>
  );
};

export default SceneFaibles;
