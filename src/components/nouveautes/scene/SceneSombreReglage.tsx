// Étape 3 du mode sombre « Clair, sombre ou système » : la ligne « Thème » des Paramètres (même allure que
// components/profile/SettingsSection) ; le curseur choisit « Sombre » (le sombre s'ouvre depuis le bouton), puis
// « Système », qui suit le réglage du téléphone (un petit téléphone passe de la lune au soleil).
import React, { useEffect, useRef, useState } from 'react';
import { Monitor, Moon, Smartphone, Sun } from 'lucide-react';
import { Curseur, DeuxModes, Ecran, Plateau, useCentre, useTimeline } from './Scene';
import { t } from '@/i18n';

// Clair · curseur vers « Sombre » · appui · le sombre s'ouvre · pause · curseur vers « Système » · appui · système · pause
const DUREES = [1200, 900, 500, 1200, 900, 900, 500, 2600, 600] as const;
const THEMES = [
  { id: 'light', label: 'Clair', icon: Sun },
  { id: 'dark', label: 'Sombre', icon: Moon },
  { id: 'system', label: 'Système', icon: Monitor },
] as const;
type ThemeId = (typeof THEMES)[number]['id'];
const SOMBRE = '[data-scene="theme-dark"]';
const SYSTEME = '[data-scene="theme-system"]';

/** Le téléphone de l'élève : sa lune et son soleil alternent (le site suit). */
const Telephone: React.FC = () => {
  const [nuit, setNuit] = useState(true);
  useEffect(() => {
    const id = window.setInterval(() => setNuit((n) => !n), 1100);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="relative inline-flex h-7 w-5 items-center justify-center rounded-[5px] border border-ink-faint text-ink-soft">
      {nuit ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
    </span>
  );
};

const Reglage: React.FC<{ actif: ThemeId }> = ({ actif }) => (
  <Ecran>
    <p className="text-[10.5px] font-bold uppercase tracking-[.12em] text-gold-strong">{t('Paramètres')}</p>
    <p className="fd-display mt-0.5 text-[20px] leading-tight text-ink">{t('Apparence')}</p>
    <div className="mt-3 rounded-2xl border border-line bg-white p-3.5">
      <p className="text-[14px] font-semibold text-ink">{t('Thème')}</p>
      <p className="text-[12.5px] text-ink-faint">{t('L’apparence de Fidni sur cet appareil.')}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {THEMES.map((th) => {
          const on = th.id === actif;
          const Icon = th.icon;
          return (
            <span key={th.id} data-scene={`theme-${th.id}`}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border text-[13px] font-semibold transition-colors ${
                on ? 'border-brand bg-brand-soft text-brand-hover' : 'border-line bg-white text-ink-soft'}`}>
              <Icon className="h-4 w-4" /> {t(th.label)}
            </span>
          );
        })}
      </div>
      {actif === 'system' && (
        <p className="mt-3 flex animate-fade-up items-center gap-2 text-[12.5px] text-ink-soft">
          <Smartphone className="h-4 w-4 text-ink-faint" /> {t('Suit le réglage de ton téléphone')} <Telephone />
        </p>
      )}
    </div>
  </Ecran>
);

const SceneSombreReglage: React.FC = () => {
  const racine = useRef<HTMLDivElement>(null);
  const { phase, tour } = useTimeline(DUREES, 7);
  const c = useCentre(racine, SOMBRE);
  const at = c ? `${Math.round(c.x)}px ${Math.round(c.y)}px` : '50% 50%';
  const cible = phase >= 1 && phase <= 3 ? SOMBRE : phase >= 5 && phase <= 6 ? SYSTEME : null;
  return (
    <Plateau ref={racine}>
      <DeuxModes key={`m${tour}`} rendu={(sombre) => <Reglage actif={!sombre ? 'light' : phase >= 6 ? 'system' : 'dark'} />}
        coupe={phase >= 3 ? `circle(160% at ${at})` : `circle(0% at ${at})`} />
      <Curseur key={`c${tour}`} racine={racine} cible={cible} appui={phase === 2 || phase === 6} />
    </Plateau>
  );
};

export default SceneSombreReglage;
