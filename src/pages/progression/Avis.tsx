// « Ce diagnostic te semble juste ? » (13/10/2026) : validation par les élèves des états et des objectifs de
// « Ma progression », comptée au Pilotage (Usage › Avis sur les diagnostics) pour ajuster les seuils
// (backend apps/users/maitrise_seuils.py). Un avis par sujet et par jour dans ce navigateur.
import { useState } from 'react';
import { Check } from 'lucide-react';
import { trackDiagnosticFeedback } from '@/lib/usage';
import { t } from '@/i18n';

const key = (sujet: string, cle: string) => `fidni.avis.${sujet}.${cle}.${new Date().toISOString().slice(0, 10)}`;

function given(sujet: string, cle: string) {
  try { return localStorage.getItem(key(sujet, cle)) !== null; } catch { return false; }
}

/** `sujet` : état d'un chapitre (« a_consolider ») ou type d'objectif (« objectif-verifier ») ; `cle` : ce qui est
 *  jugé (chapitre, objectif), pour ne demander qu'une fois par jour. */
export function Avis({ sujet, cle, className = '' }: { sujet: string; cle: string; className?: string }) {
  const [done, setDone] = useState(() => given(sujet, cle));
  const answer = (juste: boolean) => {
    trackDiagnosticFeedback(sujet, juste);
    try { localStorage.setItem(key(sujet, cle), juste ? '1' : '0'); } catch { /* navigation privée */ }
    setDone(true);
  };
  if (done) {
    return <p className={`inline-flex items-center gap-1.5 text-[12px] text-ink-faint ${className}`}><Check className="h-3.5 w-3.5" /> {t('Merci, ton avis nous aide à mieux t’orienter.')}</p>;
  }
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-faint ${className}`}>
      <span>{t('Ce diagnostic te semble juste ?')}</span>
      <button type="button" onClick={() => answer(true)}
        className="min-h-8 rounded-full border border-line bg-white px-3 font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink">{t('Oui')}</button>
      <button type="button" onClick={() => answer(false)}
        className="min-h-8 rounded-full border border-line bg-white px-3 font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink">{t('Pas vraiment')}</button>
    </div>
  );
}
