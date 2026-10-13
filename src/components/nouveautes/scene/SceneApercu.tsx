// Étape 1 « Ta progression en un coup d'œil » : les tuiles comptent, la caméra descend au graphique, les barres
// montent, le curseur touche le meilleur jour et « Ce jour-là » s'ouvre dessous (comme sur la page).
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ClipboardList, FileText, Trophy } from 'lucide-react';
import { COULEUR, SERIES_QUESTIONS } from '@/components/progression/chart';
import { Tuile } from '@/components/progression/Tuile';
import { DayBars, type BarRow } from '@/components/progression/DayBars';
import { Pastilles } from '@/components/progression/DayPanel';
import { decimal, longDate } from '@/pages/progression/format';
import { Curseur, Ecran, Plateau, useCompte, useTimeline } from './Scene';
import { DU_JOUR, JOUR, JOURS } from './demo';

// Tuiles · caméra et barres · curseur · clic et détail du jour · la caméra descend au détail · pause
const DUREES = [1500, 1100, 1000, 1100, 2800, 500] as const;
const rien = () => undefined;
const somme = (k: string) => JOURS.reduce((s, r) => s + Number(r[k]), 0);
const describe = (r: BarRow) => `${r.reussies} réussie${Number(r.reussies) > 1 ? 's' : ''} · ${r.ratees} à revoir`;
const BARRES = '[data-scene="graphique"] div.relative';

const Tuiles: React.FC = () => {
  const reussies = useCompte(somme('reussies'));
  const note = useCompte(13.5, 1);
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Tuile icon={CheckCircle2} label="Questions réussies" accent={COULEUR.reussies} selected onClick={rien}
        value={reussies} ecart={{ texte: '↑ 18 %', sens: 1 }} jours={14}
        spark={{ values: JOURS.map((r) => Number(r.reussies)), color: COULEUR.reussies, height: 26 }} />
      <Tuile icon={Trophy} label="Note moyenne aux examens" accent={COULEUR.note} selected={false} onClick={rien}
        value={decimal(note)} unit="/ 20" ecart={{ texte: '↑ +1,5', sens: 1 }} jours={14}
        spark={{ values: [10.5, 12, 11.5, 13, 14.5], color: COULEUR.note, height: 26 }} />
    </div>
  );
};

const SceneApercu: React.FC = () => {
  const racine = useRef<HTMLDivElement>(null);
  const { phase, tour } = useTimeline(DUREES, 4);
  return (
    <Plateau ref={racine}>
      <Ecran key={`e${tour}`} vers={phase >= 4 ? '[data-scene="jour"]' : phase >= 1 ? BARRES : null} marge={phase >= 4 ? 64 : 46}>
        <Tuiles />
        <section data-scene="graphique" className="mt-2.5 rounded-2xl border border-line bg-white p-3">
          <DayBars rows={JOURS} series={SERIES_QUESTIONS} pas="jour" describe={describe} height={84} anime={1500}
            selected={phase >= 3 ? JOUR : null}
            headline={<>{somme('reussies')} <span className="text-[13px] font-semibold text-ink-faint">réussies sur 14 jours</span></>} />
          {phase >= 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
              data-scene="jour" className="mt-3 rounded-xl border border-line bg-[#fcfbf9] px-3 py-2">
              <p className="text-[13px] font-semibold text-ink first-letter:uppercase">{longDate(JOUR)}</p>
              <ul className="divide-y divide-line">
                {DU_JOUR.map((r, i) => {
                  const Icon = i ? ClipboardList : FileText;
                  return (
                    <li key={r.titre} className="flex items-center gap-2.5 py-2">
                      <Icon className="h-4 w-4 shrink-0 text-ink-faint" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-ink">{r.titre}</span>
                        <Pastilles r={r} />
                      </span>
                      <span className="fd-nums shrink-0 text-[11.5px] text-ink-faint">{r.temps}</span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </section>
      </Ecran>
      <Curseur key={`c${tour}`} racine={racine} cible={phase === 2 || phase === 3 ? `${BARRES} button:nth-of-type(12)` : null} appui={phase === 3} decalage={{ x: 0, y: 14 }} />
    </Plateau>
  );
};

export default SceneApercu;
