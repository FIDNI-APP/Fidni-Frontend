/**
 * S'abonner à un membre (09/11/2026). Un membre qui valide ses abonnés reçoit une demande : « Demande envoyée » jusqu'à
 * sa réponse. Visiteur : la fenêtre de connexion. S'abonner ne permet pas d'écrire à quelqu'un.
 * `discret` : dans une liste de membres, où un bouton vert par personne ferait du bruit : un contour, puis du texte seul.
 */
import React, { useState } from 'react';
import { Check, Clock, UserCheck, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { communauteApi, type StatutAbonnement } from '@/lib/api/communauteApi';
import { confirmer } from '@/lib/confirmer';
import { t } from '@/i18n';

export const BoutonSuivre: React.FC<{
  username: string;
  abonne: StatutAbonnement;
  meSuit?: boolean;
  onChange?: (statut: StatutAbonnement) => void;
  discret?: boolean;
  className?: string;
}> = ({ username, abonne, meSuit = false, onChange, discret = false, className = '' }) => {
  const { isAuthenticated } = useAuth();
  const openSignup = useOpenSignup('suivre');
  const [statut, setStatut] = useState<StatutAbonnement>(abonne);
  const [envoi, setEnvoi] = useState(false);
  React.useEffect(() => { setStatut(abonne); }, [abonne]);

  const changer = (s: StatutAbonnement) => { setStatut(s); onChange?.(s); };

  const cliquer = async () => {
    if (!isAuthenticated) { openSignup('signup'); return; }
    if (envoi) return;
    if (statut === 'accepte' && !await confirmer(t('Ne plus suivre {name} ?', { name: username }), { action: t('Ne plus suivre') })) return;
    setEnvoi(true);
    try {
      if (statut) {
        await communauteApi.nePlusSuivre(username);
        changer(null);
      } else {
        const s = await communauteApi.suivre(username);
        changer(s);
        if (s === 'en_attente') toast.success(t('Demande envoyée'));
      }
    } catch (err) {
      const code = (err as { response?: { status?: number } }).response?.status;
      toast.error(code === 429 ? t('Trop d’abonnements d’un coup. Réessaie dans un moment.') : t('Action impossible pour le moment.'));
    } finally {
      setEnvoi(false);
    }
  };

  const base = `inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-semibold transition-[color,background-color,border-color,transform] duration-150 active:scale-[.97] motion-reduce:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60 min-h-10 px-4 ${
    discret ? 'text-[13px]' : 'text-[14px]'} ${className}`;

  if (discret) {
    // Sans contour, le texte s'aligne sur le pseudo au-dessus : le bouton garde sa zone de clic, pas son retrait.
    if (statut === 'accepte') {
      return (
        <button type="button" onClick={cliquer} disabled={envoi} aria-pressed="true" className={`${base} !px-0 text-ink-faint hover:text-[#a23b34]`}>
          <Check className="h-4 w-4" aria-hidden /> {t('Abonné')}
        </button>
      );
    }
    if (statut === 'en_attente') {
      return (
        <button type="button" onClick={cliquer} disabled={envoi} title={t('Annuler la demande')} className={`${base} !px-0 text-ink-faint hover:text-ink`}>
          <Clock className="h-4 w-4" aria-hidden /> {t('Demande envoyée')}
        </button>
      );
    }
    return (
      <button type="button" onClick={cliquer} disabled={envoi} className={`${base} border border-line bg-white text-ink hover:border-ink`}>
        {t('Suivre')}
      </button>
    );
  }

  if (statut === 'accepte') {
    return (
      <button type="button" onClick={cliquer} disabled={envoi} aria-pressed="true"
        className={`${base} border border-line bg-white text-ink hover:border-[#cfc9bf] hover:text-[#a23b34]`}>
        <UserCheck className="h-4 w-4" aria-hidden /> {t('Abonné')}
      </button>
    );
  }
  if (statut === 'en_attente') {
    return (
      <button type="button" onClick={cliquer} disabled={envoi} title={t('Annuler la demande')}
        className={`${base} border border-dashed border-[#cfc9bf] bg-white text-ink-soft hover:text-ink`}>
        <Clock className="h-4 w-4" aria-hidden /> {t('Demande envoyée')}
      </button>
    );
  }
  return (
    <button type="button" onClick={cliquer} disabled={envoi} className={`${base} bg-brand text-white hover:bg-brand-hover`}>
      <UserPlus className="h-4 w-4" aria-hidden /> {meSuit ? t('Suivre en retour') : t('Suivre')}
    </button>
  );
};

export default BoutonSuivre;
