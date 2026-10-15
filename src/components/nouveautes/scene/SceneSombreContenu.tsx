// Étape 2 du mode sombre « Tes exercices aussi » : un exercice (énoncé, figure, ta copie) coupé en deux, clair à gauche,
// sombre à droite ; la séparation balaie l'écran puis s'arrête au milieu. La figure garde son fond blanc
// (règle `.dark .fd-read img` du mode sombre).
import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SunMoon } from 'lucide-react';
import { DeuxModes, Ecran, Plateau, useTimeline } from './Scene';
import { t } from '@/i18n';

// Tout clair · la séparation balaie vers la gauche · elle revient au milieu · pause
const DUREES = [900, 1700, 2900, 600] as const;
const PART = [100, 4, 50, 50];

// Une figure d'énoncé : tracés noirs sur fond transparent, comme une image de contenu.
const FIGURE = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90" width="160" height="90">
<g fill="none" stroke="#1a1a1a" stroke-width="1.2"><path d="M12 80H152M20 86V6"/><path d="M146 77l6 3-6 3M17 12l3-6 3 6"/></g>
<path d="M20 80L95 5" stroke="#1a1a1a" stroke-width="1" stroke-dasharray="3 3" fill="none"/>
<path d="M20 52C45 40 75 32 150 22" stroke="#1a1a1a" stroke-width="1.6" fill="none"/>
<g fill="none" stroke="#1a1a1a" stroke-width=".9"><path d="M38 80V45H48V40H60V36"/></g>
<text x="128" y="17" font-size="9" font-family="serif" font-style="italic" fill="#1a1a1a">𝒞</text>
<text x="70" y="12" font-size="9" font-family="serif" font-style="italic" fill="#1a1a1a">y = x</text></svg>`)}`;

const Exercice: React.FC<{ sombre: boolean }> = ({ sombre }) => (
  <Ecran>
    <span className={`absolute top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-ink-faint ${sombre ? 'right-2' : 'left-2'}`}>
      {sombre ? t('Sombre') : t('Clair')}
    </span>
    <article className="mt-5 rounded-2xl border border-line bg-white p-3.5">
      <p className="flex items-center gap-2">
        <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-bold text-gold-strong">{t('Moyen')}</span>
        <span className="text-[11.5px] text-ink-faint">Suites numériques</span>
      </p>
      <p className="fd-display mt-1.5 text-[17px] leading-tight text-ink">Exercice 4 · Une suite récurrente</p>
      <div className="fd-read mt-2 text-[13px] leading-relaxed text-ink-soft">
        <p>Soit (<i>u</i>ₙ) la suite définie par <i>u</i>₀ = 1 et <i>u</i>ₙ₊₁ = √(2 + <i>u</i>ₙ).</p>
        <p className="mt-1"><b className="text-ink">1.</b> Montrer que 0 &lt; <i>u</i>ₙ &lt; 2 pour tout <i>n</i>.</p>
        <img src={FIGURE} alt="" className="mx-auto mt-2 h-[84px] w-auto rounded-md" />
      </div>
      <p className="mt-2.5 flex flex-wrap gap-1.5 text-[12px] font-semibold">
        <span className="rounded-full border border-brand-line bg-brand-soft px-2.5 py-1 text-brand-hover">{t('Réussi')}</span>
        <span className="rounded-full border border-line bg-white px-2.5 py-1 text-ink-soft">{t('En partie')}</span>
        <span className="rounded-full border border-line bg-white px-2.5 py-1 text-ink-soft">{t('À revoir')}</span>
      </p>
    </article>
  </Ecran>
);

const SceneSombreContenu: React.FC = () => {
  const racine = useRef<HTMLDivElement>(null);
  const reduit = useReducedMotion();
  const { phase, tour } = useTimeline(DUREES, 2);
  const p = PART[phase];
  const duree = reduit ? 0 : 1.1;
  return (
    <Plateau ref={racine}>
      <DeuxModes key={`m${tour}`} rendu={(sombre) => <Exercice sombre={sombre} />} coupe={`inset(0% 0% 0% ${p}%)`} duree={1.1} />
      {/* La séparation et sa poignée, au-dessus des deux calques */}
      <motion.span key={`s${tour}`} className="absolute inset-y-0 z-10 w-0" initial={{ left: `${p}%` }} animate={{ left: `${p}%` }}
        transition={{ duration: duree, ease: [0.65, 0, 0.35, 1] }}>
        <span className="absolute inset-y-0 -left-px w-0.5 bg-white/90 shadow-[0_0_8px_rgba(20,18,16,.35)]" />
        <span className="absolute left-0 top-1/2 inline-flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#e7e3dc] bg-white text-[#33302b] shadow-[0_4px_12px_rgba(20,18,16,.25)]">
          <SunMoon className="h-4 w-4" />
        </span>
      </motion.span>
    </Plateau>
  );
};

export default SceneSombreContenu;
