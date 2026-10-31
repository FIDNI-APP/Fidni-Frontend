/**
 * Session de l'application : élève connecté, ou visiteur (« Découvrir sans compte » : lecture seule, comme le site).
 * requireAccount() : une action réservée aux comptes (évaluer, enregistrer…) propose de créer un compte.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';
import { useIonAlert } from '@ionic/react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';

const GUEST_KEY = 'fdm:visiteur';

interface Session {
  guest: boolean;
  setGuest: (v: boolean) => void;
  /** Vrai si l'élève est connecté ; sinon propose de créer un compte et renvoie faux. */
  requireAccount: (why?: string) => boolean;
  /** Ouvre une page du site dans l'application (fonction pas encore refaite en écrans natifs : quiz, classes…). */
  openWeb: (path: string) => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children, openWeb }: { children: React.ReactNode; openWeb: (path: string) => void }) {
  const { isAuthenticated } = useAuth();
  const [present] = useIonAlert();
  const [guest, setGuestState] = useState(() => {
    try { return localStorage.getItem(GUEST_KEY) === '1'; } catch { return false; }
  });
  const setGuest = useCallback((v: boolean) => {
    setGuestState(v);
    try { if (v) localStorage.setItem(GUEST_KEY, '1'); else localStorage.removeItem(GUEST_KEY); } catch { /* stockage indisponible */ }
  }, []);
  const requireAccount = useCallback((why?: string) => {
    if (isAuthenticated) return true;
    void present({
      header: t('Crée ton compte'),
      message: why || t('Un compte gratuit garde ta progression, tes favoris et tes listes de révision.'),
      buttons: [
        { text: t('Plus tard'), role: 'cancel' },
        { text: t('Créer un compte'), handler: () => setGuest(false) },
      ],
    });
    return false;
  }, [isAuthenticated, present, setGuest]);
  return <SessionContext.Provider value={{ guest, setGuest, requireAccount, openWeb }}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession en dehors de SessionProvider');
  return s;
}
