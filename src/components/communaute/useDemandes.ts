/**
 * Demandes d'abonnement reçues par un membre qui valide ses abonnés : la liste et la réponse (accepter, refuser). Une
 * seule source pour la fenêtre des abonnés du profil et l'onglet Abonnés de la page Membres.
 */
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { communauteApi, type CarteMembre } from '@/lib/api/communauteApi';
import { t } from '@/i18n';

/** `actif` : la liste n'est lue que quand on la montre. `onRepondu` : après chaque réponse acceptée par le serveur. */
export function useDemandes(actif: boolean, onRepondu?: (accepte: boolean) => void) {
  const [demandes, setDemandes] = useState<CarteMembre[] | null>(null);

  const relire = useCallback(() => {
    communauteApi.demandes().then((r) => setDemandes(r.results)).catch(() => setDemandes((d) => d ?? []));
  }, []);

  useEffect(() => {
    if (actif) relire(); else setDemandes(null);
  }, [actif, relire]);

  const repondre = async (m: CarteMembre, accepter: boolean) => {
    try {
      if (accepter) await communauteApi.accepter(m.username); else await communauteApi.refuser(m.username);
      setDemandes((l) => (l ?? []).filter((x) => x.id !== m.id));
      onRepondu?.(accepter);
    } catch {
      toast.error(t('Action impossible pour le moment.'));
    }
  };

  return { demandes, repondre };
}
