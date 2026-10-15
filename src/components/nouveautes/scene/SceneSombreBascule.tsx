// Étape 1 du mode sombre « Le mode sombre est arrivé » : un morceau du site (barre du haut, accueil, deux vraies tuiles,
// le graphique jour par jour ; icônes à gauche de la croix de la fenêtre) ; le curseur touche la lune et le sombre s'ouvre en cercle depuis elle, la lune devient soleil.
import React, { useRef } from 'react';
import { Bell, CheckCircle2, Moon, Search, Sun, Trophy } from 'lucide-react';
import { COULEUR, SERIES_QUESTIONS } from '@/components/progression/chart';
import { Tuile } from '@/components/progression/Tuile';
import { DayBars, type BarRow } from '@/components/progression/DayBars';
import { Curseur, DeuxModes, Ecran, Plateau, useCentre, useTimeline } from './Scene';
import { JOURS } from './demo';

// Clair · curseur vers la lune · appui · le sombre s'ouvre · sombre · pause
const DUREES = [1300, 900, 500, 1300, 2400, 600] as const;
const rien = () => undefined;
const LUNE = '[data-scene="lune"]';
const describe = (r: BarRow) => `${r.reussies} réussie${Number(r.reussies) > 1 ? 's' : ''}`;
const aujourdhui = () => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** Un morceau de l'accueil, tel que le site l'affiche (couleurs du site : claires ou sombres selon le calque). */
export const MiniSite: React.FC<{ sombre: boolean }> = ({ sombre }) => (
  <Ecran>
    <div className="-mx-3 -mt-3 mb-3 flex items-center gap-0.5 border-b border-line bg-white/90 py-1.5 pl-3 pr-11 sm:-mx-4 sm:-mt-4 sm:pl-4 sm:pr-12">
      <span className="text-[13px] font-semibold text-ink">Accueil</span>
      <span className="flex-1" />
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-ink-soft"><Search className="h-4 w-4" /></span>
      <span data-scene="lune" className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-ink-soft">
        {sombre ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-ink-soft"><Bell className="h-4 w-4" /></span>
    </div>
    <p className="text-[10.5px] font-bold uppercase tracking-[.12em] text-gold-strong">{aujourdhui()} · 2ème Bac SM</p>
    <p className="fd-display mt-0.5 text-[21px] leading-tight text-ink">Bonsoir, <em>Yasmine</em></p>
    <div className="mt-2.5 grid grid-cols-2 gap-2.5">
      <Tuile icon={CheckCircle2} label="Questions réussies" accent={COULEUR.reussies} selected={false} onClick={rien}
        value={44} ecart={{ texte: '↑ 18 %', sens: 1 }} jours={14}
        spark={{ values: JOURS.map((r) => Number(r.reussies)), color: COULEUR.reussies, height: 24 }} />
      <Tuile icon={Trophy} label="Note moyenne aux examens" accent={COULEUR.note} selected={false} onClick={rien}
        value="13,5" unit="/ 20" ecart={{ texte: '↑ +1,5', sens: 1 }} jours={14}
        spark={{ values: [10.5, 12, 11.5, 13, 14.5], color: COULEUR.note, height: 24 }} />
    </div>
    <section className="mt-2.5 rounded-2xl border border-line bg-white p-3">
      <DayBars rows={JOURS} series={SERIES_QUESTIONS} pas="jour" describe={describe} height={64}
        headline={<>44 <span className="text-[13px] font-semibold text-ink-faint">réussies sur 14 jours</span></>} />
    </section>
  </Ecran>
);

const SceneSombreBascule: React.FC = () => {
  const racine = useRef<HTMLDivElement>(null);
  const { phase, tour } = useTimeline(DUREES, 4);
  const c = useCentre(racine, LUNE);
  const at = c ? `${Math.round(c.x)}px ${Math.round(c.y)}px` : '90% 8%';
  return (
    <Plateau ref={racine}>
      <DeuxModes key={`m${tour}`} rendu={(sombre) => <MiniSite sombre={sombre} />}
        coupe={phase >= 3 ? `circle(160% at ${at})` : `circle(0% at ${at})`} />
      <Curseur key={`c${tour}`} racine={racine} cible={phase >= 1 && phase <= 3 ? LUNE : null} appui={phase === 2} />
    </Plateau>
  );
};

export default SceneSombreBascule;
