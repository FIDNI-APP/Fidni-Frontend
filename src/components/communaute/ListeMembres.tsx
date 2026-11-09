/**
 * Abonnés ou abonnements d'un membre, dans une fenêtre, page par page. Le propriétaire peut retirer un abonné.
 */
import React, { useEffect, useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ModalShell } from '@/components/enregistrements/ModalShell';
import { communauteApi, type CarteMembre } from '@/lib/api/communauteApi';
import { confirmer } from '@/lib/confirmer';
import { BoutonSuivre } from './BoutonSuivre';
import { LigneMembre } from './CarteMembre';
import { t } from '@/i18n';

export const ListeMembres: React.FC<{
  username: string;
  sens: 'abonnes' | 'abonnements' | null;
  proprietaire: boolean;
  onClose: () => void;
  onRetire?: () => void;
}> = ({ username, sens, proprietaire, onClose, onRetire }) => {
  const id = useId();
  const [membres, setMembres] = useState<CarteMembre[] | null>(null);
  const [page, setPage] = useState(1);
  const [suite, setSuite] = useState(false);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    if (!sens) return;
    let vivant = true;
    setErreur(false);
    (sens === 'abonnes' ? communauteApi.abonnes(username, page) : communauteApi.abonnements(username, page))
      .then((r) => { if (!vivant) return; setMembres((m) => (page === 1 ? r.results : [...(m ?? []), ...r.results])); setSuite(r.suite); })
      .catch(() => { if (vivant) setErreur(true); });
    return () => { vivant = false; };
  }, [username, sens, page]);

  useEffect(() => { if (!sens) { setMembres(null); setPage(1); } }, [sens]);

  const retirer = async (m: CarteMembre) => {
    if (!await confirmer(t('Retirer {name} de tes abonnés ?', { name: m.username }), { action: t('Retirer') })) return;
    try {
      await communauteApi.retirer(m.username);
      setMembres((l) => (l ?? []).filter((x) => x.id !== m.id));
      onRetire?.();
    } catch {
      toast.error(t('Action impossible pour le moment.'));
    }
  };

  return (
    <ModalShell open={!!sens} onClose={onClose} labelId={id} title={sens === 'abonnes' ? t('Abonnés') : t('Abonnements')}>
      <div className="-mx-1 mt-3 max-h-[60vh] overflow-y-auto px-1">
        {erreur && <p className="py-6 text-center text-[13.5px] text-[#a23b34]">{t('La liste n’a pas pu se charger.')}</p>}
        {!erreur && membres === null && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-ink-faint" /></div>}
        {membres?.length === 0 && <p className="py-6 text-center text-[13.5px] text-ink-faint">{t('Personne pour l’instant.')}</p>}
        <ul className="divide-y divide-line">
          {membres?.map((m) => (
            <li key={m.id}>
              <LigneMembre membre={m} onClick={onClose} droite={
                proprietaire && sens === 'abonnes' ? (
                  <button type="button" onClick={() => retirer(m)}
                    className="min-h-9 shrink-0 rounded-xl px-3 text-[13px] font-semibold text-ink-faint transition-colors hover:text-[#a23b34]">
                    {t('Retirer')}
                  </button>
                ) : !m.relation.moi ? <BoutonSuivre username={m.username} abonne={m.relation.abonne} meSuit={m.relation.me_suit} discret /> : null
              } />
            </li>
          ))}
        </ul>
        {suite && (
          <button type="button" onClick={() => setPage((p) => p + 1)}
            className="mt-2 flex min-h-10 w-full items-center justify-center rounded-xl text-[13px] font-semibold text-brand-hover hover:bg-[#fcfbf9] hover:underline">
            {t('Voir plus')}
          </button>
        )}
      </div>
    </ModalShell>
  );
};

export default ListeMembres;
