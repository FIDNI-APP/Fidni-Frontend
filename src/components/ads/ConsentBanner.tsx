// Bandeau de consentement aux cookies publicitaires. « Refuser » et « Accepter » ont le même poids
// visuel (CNIL) ; tant qu'aucun choix n'est fait, rien n'est chargé. Deux lignes à l'écran (il
// couvrait un tiers d'un téléphone) : le détail reste à un clic, dans « En savoir plus ».
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ADS_ENABLED, CONSENT_EVENT, loadAdSense, readConsent, saveConsent } from '@/lib/ads';
import { TABBAR_OFFSET } from '@/components/layout/nav';

export const ConsentBanner: React.FC = () => {
  const [open, setOpen] = useState(() => ADS_ENABLED && readConsent() === null);

  useEffect(() => {
    if (!ADS_ENABLED) return;
    loadAdSense(); // accord donné lors d'une visite précédente
    const onChange = (e: Event) => setOpen((e as CustomEvent).detail === 'open');
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!open) return null;

  const btn = 'flex-1 sm:flex-none min-h-[40px] px-5 py-2 rounded-lg text-sm font-semibold transition-colors';
  return (
    // Au-dessus de la barre d'onglets du téléphone (sa hauteur, 0 ailleurs).
    <div role="dialog" aria-live="polite" aria-labelledby="consent-title"
      className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4 print:hidden" style={{ bottom: TABBAR_OFFSET }}>
      <div className="max-w-3xl mx-auto bg-white border border-[#e7e3dc] rounded-2xl shadow-lg p-3.5 sm:p-5">
        <div className="sm:flex sm:items-center sm:gap-5">
          <p id="consent-title" className="flex-1 text-sm text-[#33302b] leading-snug">
            <strong className="text-[#1a1a1a]">Fidni est gratuit grâce à quelques pubs.</strong>{' '}
            Tu acceptes les cookies publicitaires ?
          </p>
          <div className="flex gap-2 mt-3 sm:mt-0 shrink-0">
            <button onClick={() => { saveConsent('denied'); setOpen(false); }}
              className={`${btn} bg-[#1a1a1a] text-white hover:bg-[#33302b]`}>Refuser</button>
            <button onClick={() => { saveConsent('granted'); setOpen(false); }}
              className={`${btn} bg-[#1a1a1a] text-white hover:bg-[#33302b]`}>Accepter</button>
          </div>
        </div>
        <details className="mt-2">
          <summary className="inline-flex min-h-[32px] items-center cursor-pointer text-[13px] font-medium text-[#1a7a4a] underline underline-offset-2 list-none [&::-webkit-details-marker]:hidden">
            En savoir plus
          </summary>
          <p className="mt-1.5 text-[13px] text-[#4a4741] leading-relaxed">
            Si tu acceptes, Google dépose des cookies pour afficher des annonces adaptées à tes centres
            d’intérêt et mesurer leur affichage. Si tu refuses, tu n’auras pas de publicité et le site marche pareil.
            Moins de 15 ans : demande d’abord à un parent. Tu peux changer d’avis à tout moment en bas de page
            (« Gérer les cookies »).{' '}
            <Link to="/privacy-policy#cookies" className="text-[#1a7a4a] underline whitespace-nowrap">Politique de confidentialité</Link>
          </p>
        </details>
      </div>
    </div>
  );
};

export default ConsentBanner;
