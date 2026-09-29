// Bandeau de consentement aux cookies publicitaires. « Refuser » et « Accepter » ont le même poids
// visuel (CNIL) ; tant qu'aucun choix n'est fait, rien n'est chargé.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ADS_ENABLED, CONSENT_EVENT, loadAdSense, readConsent, saveConsent } from '@/lib/ads';

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

  const btn = 'flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors';
  return (
    <div role="dialog" aria-live="polite" aria-label="Cookies publicitaires"
      className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4 print:hidden">
      <div className="max-w-3xl mx-auto bg-white border border-[#e7e3dc] rounded-2xl shadow-lg p-4 sm:p-5">
        <p className="text-sm text-[#33302b] leading-relaxed">
          <strong className="text-[#1a1a1a]">Fidni est gratuit grâce à quelques publicités.</strong>{' '}
          Si tu acceptes, Google dépose des cookies pour afficher des annonces adaptées à tes centres
          d’intérêt et mesurer leur affichage. Si tu refuses, tu n’auras pas de publicité et le site marche pareil.
          Moins de 15 ans : demande d’abord à un parent. Tu peux changer d’avis à tout moment en bas de page
          (« Gérer les cookies »).{' '}
          <Link to="/privacy-policy#cookies" className="text-[#1a7a4a] underline whitespace-nowrap">En savoir plus</Link>
        </p>
        <div className="flex gap-2 mt-3.5 sm:justify-end">
          <button onClick={() => { saveConsent('denied'); setOpen(false); }}
            className={`${btn} bg-[#1a1a1a] text-white hover:bg-[#33302b]`}>Refuser</button>
          <button onClick={() => { saveConsent('granted'); setOpen(false); }}
            className={`${btn} bg-[#1a1a1a] text-white hover:bg-[#33302b]`}>Accepter</button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
