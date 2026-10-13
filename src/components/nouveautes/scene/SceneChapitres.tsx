// Étape 3 « Ta note, chapitre par chapitre » : les cartes de chapitre (comme sur téléphone) — la note défile, la
// fourchette min–max s'ouvre, la courbe se trace ; le curseur ouvre un chapitre et son détail glisse de la droite.
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { BarreQuestions, Fourchette, MiniCourbe } from '@/components/progression/Chapitres';
import { NotesChart } from '@/components/progression/NotesChart';
import { decimal } from '@/pages/progression/format';
import { Curseur, Ecran, Plateau, useCompte, useTimeline } from './Scene';
import { CHAPITRES, ilYa, moyenne } from './demo';

// Entrée · curseur vers le premier chapitre · clic et détail · pause
const DUREES = [1800, 1000, 3400, 500] as const;
const TRACE = '[&_polyline]:[stroke-dasharray:200] [&_polyline]:animate-trace [&_circle]:animate-fade-up [&_circle]:[animation-delay:1s]';

const Carte: React.FC<{ c: (typeof CHAPITRES)[number]; i: number }> = ({ c, i }) => {
  const moy = moyenne(c.notes);
  const note = useCompte(moy, 1, 1000);
  return (
    <li className="animate-fade-up px-3.5 py-3" style={{ animationDelay: `${i * 150}ms` }}>
      <p className="truncate text-[13.5px] font-semibold text-ink">{c.nom}</p>
      <span className="mt-1.5 flex items-center gap-2.5">
        <span className="fd-nums w-[54px] shrink-0 text-[13px]"><b className="text-ink">{decimal(note)}</b><span className="text-ink-faint">/20</span></span>
        <span className="block flex-1 origin-left animate-etirer" style={{ animationDelay: `${300 + i * 150}ms` }}>
          <Fourchette min={Math.min(...c.notes)} max={Math.max(...c.notes)} moyenne={moy} />
        </span>
        <span className={`shrink-0 ${TRACE}`}><MiniCourbe notes={c.notes} /></span>
      </span>
      <span className="mt-2 flex items-center gap-2">
        <BarreQuestions r={{ reussies: c.reussies, partielles: 0, ratees: c.ratees }} className="w-16" />
        <span className="fd-nums text-[11.5px] text-ink-faint">{c.reussies} réussies · {c.ratees} à revoir</span>
      </span>
    </li>
  );
};

const Detail: React.FC = () => {
  const c = CHAPITRES[0];
  const points = c.notes.map((note, i) => ({ date: ilYa(26 - i * 8), note, titre: `DS n° ${i + 1}` }));
  const chiffre = (label: string, v: number) => (
    <span className="rounded-lg border border-line bg-white px-2 py-1.5">
      <span className="block text-[10.5px] text-ink-faint">{label}</span>
      <b className="fd-nums block text-[14px] leading-tight text-ink">{decimal(v)}</b>
    </span>
  );
  return (
    <>
      <motion.span className="absolute inset-0 bg-[rgba(20,18,16,.22)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} />
      <motion.div className="absolute inset-y-0 right-0 w-[84%] border-l border-line bg-[#faf9f7] p-3 shadow-[-10px_0_30px_rgba(20,18,16,.16)]"
        initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
        <p className="text-[10px] font-bold uppercase tracking-[.1em] text-gold-strong">Chapitre</p>
        <p className="fd-display text-[17px] leading-tight text-ink">{c.nom}</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {chiffre('Moyenne', moyenne(c.notes))}{chiffre('Minimum', Math.min(...c.notes))}{chiffre('Maximum', Math.max(...c.notes))}
        </div>
        <div className="mt-2 rounded-xl border border-line bg-white p-2.5 [&_p]:text-[11px]">
          <NotesChart points={points} debut={ilYa(30)} fin={ilYa(0)} height={78} emptyText=""
            headline={<span className="text-[14px]">{decimal(moyenne(c.notes))} <span className="text-[12px] font-semibold text-ink-faint">/ 20 en moyenne</span></span>} />
        </div>
      </motion.div>
    </>
  );
};

const SceneChapitres: React.FC = () => {
  const racine = useRef<HTMLDivElement>(null);
  const { phase, tour } = useTimeline(DUREES, 2);
  return (
    <Plateau ref={racine}>
      <Ecran key={`e${tour}`} dessus={phase >= 2 ? <Detail /> : null}>
        <div data-scene="chapitres" className="overflow-hidden rounded-2xl border border-line bg-white">
          <ul className="divide-y divide-line">{CHAPITRES.map((c, i) => <Carte key={c.nom} c={c} i={i} />)}</ul>
        </div>
      </Ecran>
      <Curseur key={`c${tour}`} racine={racine} cible={phase === 1 || phase === 2 ? '[data-scene="chapitres"] li:first-child p' : null} appui={phase === 2} />
    </Plateau>
  );
};

export default SceneChapitres;
