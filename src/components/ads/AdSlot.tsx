// Emplacement publicitaire discret, signalé « Publicité ». N'existe que si le visiteur a accepté
// et qu'un bloc d'annonces est configuré ; un emplacement que Google ne remplit pas disparaît (index.css).
import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ADS_ENABLED, ADSENSE_CLIENT, ADSENSE_SLOT, CONSENT_EVENT, readConsent } from '@/lib/ads';

const Unit: React.FC = () => {
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* bloqueur de pub */ }
  }, []);
  return (
    <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={ADSENSE_SLOT} data-ad-format="auto" data-full-width-responsive="true" />
  );
};

export const AdSlot: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { pathname } = useLocation();
  const [granted, setGranted] = useState(() => readConsent() === 'granted');
  useEffect(() => {
    const onChange = () => setGranted(readConsent() === 'granted');
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!ADS_ENABLED || !ADSENSE_SLOT || !granted) return null;
  return (
    <div className={`fd-ad print:hidden ${className}`}>
      <p className="text-[10px] uppercase tracking-widest text-[#9a958c] mb-1.5">Publicité</p>
      {/* Nouvelle annonce à chaque page : la clé force un nouvel emplacement. */}
      <Unit key={pathname} />
    </div>
  );
};

export default AdSlot;
