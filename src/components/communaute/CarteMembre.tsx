/**
 * Un membre dans une liste (09/11/2026). Portrait (page Membres) : sa photo ou son lionceau, son pseudo, son niveau et le
 * bouton Suivre, comme dans un trombinoscope. Ligne (abonnés, classements) : la même chose à l'horizontale. La bannière,
 * les badges et les chiffres sont sur son profil : ici, on reconnaît quelqu'un d'un coup d'œil.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import type { CarteMembre as Membre, Role } from '@/lib/api/communauteApi';
import { Avatar } from '@/components/discussions/parts';
import { BoutonSuivre } from './BoutonSuivre';
import { t } from '@/i18n';

export const roleTexte = (role: Role, level: string | null) =>
  role === 'equipe' ? t('Équipe Fidni') : role === 'prof' ? t('Professeur') : level || t('Élève');

export const profilUrl = (username: string) => `/profile/${encodeURIComponent(username)}`;

const Verifie: React.FC = () => (
  <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label={t('Professeur vérifié')} />
);

export const CarteMembre: React.FC<{ membre: Membre }> = ({ membre: m }) => (
  <article className="group flex min-w-0 flex-col items-start">
    <Link to={profilUrl(m.username)} tabIndex={-1} aria-hidden
      className="rounded-full transition-transform duration-200 ease-out group-hover:scale-[1.04] active:scale-[.98] motion-reduce:transform-none motion-reduce:transition-none">
      <Avatar user={m} size={88} />
    </Link>
    <Link to={profilUrl(m.username)} className="mt-3 flex max-w-full items-center gap-1 rounded text-[16px] font-semibold tracking-[-0.008em] text-ink hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
      <span className="truncate">{m.username}</span>{m.verifie && <Verifie />}
    </Link>
    <p className="mt-0.5 max-w-full text-[13px] leading-snug text-ink-faint">
      <span className="block truncate">{roleTexte(m.role, m.level)}</span>
      {m.relation.me_suit && <span className="block">{t('Te suit')}</span>}
    </p>
    {!m.relation.moi && (
      <div className="mt-auto pt-3">
        <BoutonSuivre username={m.username} abonne={m.relation.abonne} meSuit={m.relation.me_suit} discret />
      </div>
    )}
  </article>
);

/** Membre en une ligne : photo, pseudo, rôle ; à droite ce qu'on veut (bouton, chiffre). */
export const LigneMembre: React.FC<{
  membre: Pick<Membre, 'username' | 'avatar' | 'role' | 'level' | 'verifie'>;
  droite?: React.ReactNode;
  sousTitre?: React.ReactNode;
  onClick?: () => void;
  taille?: number;
}> = ({ membre: m, droite, sousTitre, onClick, taille = 40 }) => (
  <div className="flex min-h-14 items-center gap-3 py-2">
    <Link to={profilUrl(m.username)} onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl">
      <Avatar user={m} size={taille} />
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[14px] font-semibold text-ink">
          <span className="truncate">{m.username}</span>{m.verifie && <Verifie />}
        </span>
        <span className="block truncate text-[13px] text-ink-faint">{sousTitre ?? roleTexte(m.role, m.level)}</span>
      </span>
    </Link>
    {droite}
  </div>
);

export default CarteMembre;
