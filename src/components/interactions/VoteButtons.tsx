// Bouton « J'aime / Je n'aime pas » (05/10/2026, remplace les flèches façon Reddit, peu comprises des élèves).
// Les j'aime servent à faire ressortir les meilleurs contenus : tri « Plus aimés » des listes, encart de l'accueil.
// Le serveur garde le même vote (+1 / -1, re-cliquer retire le vote) ; seul l'affichage change.

import { useState, useEffect } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';

type VoteValue = 1 | -1;

interface VoteButtonsProps {
  /** Nombre de j'aime / de je n'aime pas (like_count / dislike_count de l'API). */
  likes?: number;
  dislikes?: number;
  /** Ancien score (j'aime − je n'aime pas) : seulement si l'API ne donne pas encore les deux nombres. */
  initialVotes?: number;
  onVote: (value: VoteValue) => void;
  /** Conservé pour compatibilité : le bouton est toujours horizontal. */
  vertical?: boolean;
  userVote?: 1 | -1 | 0;
  onClick?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  /** Pastille « Très utile » quand un contenu est nettement apprécié. */
  showBadge?: boolean;
}

// « Très utile » : au moins 5 j'aime et 4 fois plus de j'aime que de je n'aime pas (pas de pastille sur 1 ou 2 votes).
const isVeryUseful = (likes: number, dislikes: number) => likes >= 5 && likes >= 4 * dislikes;

export function VoteButtons({
  likes: likesProp,
  dislikes: dislikesProp,
  initialVotes = 0,
  onVote,
  userVote: initialUserVote = 0,
  onClick,
  size = 'md',
  showBadge = true,
}: VoteButtonsProps) {
  const fromProps = () => ({
    likes: likesProp ?? Math.max(initialVotes, 0),
    dislikes: dislikesProp ?? Math.max(-initialVotes, 0),
  });
  const [userVote, setUserVote] = useState<1 | -1 | 0>(initialUserVote);
  const [counts, setCounts] = useState(fromProps);
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();

  // Les nombres du serveur font foi dès qu'ils changent (réponse au vote, rechargement de la liste).
  useEffect(() => {
    setCounts(fromProps());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likesProp, dislikesProp, initialVotes]);
  useEffect(() => { setUserVote(initialUserVote); }, [initialUserVote]);

  const handleVote = (value: VoteValue) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    onVote(value);
    // Affichage immédiat, corrigé ensuite par la réponse du serveur.
    setCounts((c) => {
      const next = { ...c };
      if (userVote === 1) next.likes -= 1;
      if (userVote === -1) next.dislikes -= 1;
      if (userVote !== value) {
        if (value === 1) next.likes += 1; else next.dislikes += 1;
      }
      return { likes: Math.max(0, next.likes), dislikes: Math.max(0, next.dislikes) };
    });
    setUserVote(userVote === value ? 0 : value);
  };

  const s = size === 'sm'
    ? { pill: 'h-9 px-3 gap-1.5 text-[13.5px]', icon: 'h-4 w-4', disc: 'h-7 w-7 -ml-1.5' }
    : size === 'lg'
      ? { pill: 'h-11 px-4 gap-2 text-[15px]', icon: 'h-5 w-5', disc: 'h-8 w-8 -ml-1.5' }
      : { pill: 'h-10 px-3.5 gap-2 text-[14px]', icon: 'h-[18px] w-[18px]', disc: 'h-8 w-8 -ml-1.5' };

  const liked = userVote === 1;
  const disliked = userVote === -1;
  const badge = showBadge && isVeryUseful(counts.likes, counts.dislikes);

  return (
    <div className="inline-flex items-center gap-1.5" onClick={onClick}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleVote(1); }}
        aria-pressed={liked}
        aria-label={`J'aime (${counts.likes})`}
        title={liked ? 'Tu aimes ce contenu · cliquer pour retirer' : 'J’aime : ce contenu m’a aidé'}
        className={`inline-flex items-center rounded-full border font-semibold fd-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${s.pill} ${
          liked
            ? 'border-brand-line bg-brand-soft text-brand-hover'
            : 'border-[#d9eadf] bg-[#f3f9f5] text-ink hover:border-brand-line hover:bg-brand-soft'
        }`}
      >
        {liked ? (
          <span className={`inline-flex items-center justify-center rounded-full bg-brand text-white ${s.disc}`}>
            <ThumbsUp className={s.icon} fill="currentColor" strokeWidth={1.8} aria-hidden />
          </span>
        ) : (
          <ThumbsUp className={`${s.icon} text-brand`} fill="currentColor" fillOpacity={0.15} strokeWidth={2} aria-hidden />
        )}
        <span>{counts.likes}</span>
        {badge && (
          <span className="ml-0.5 rounded-full bg-white/80 px-1.5 py-px text-[10.5px] font-semibold text-brand-hover" title="Recommandé par les élèves">
            Très utile
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleVote(-1); }}
        aria-pressed={disliked}
        aria-label={`Je n'aime pas (${counts.dislikes})`}
        title={disliked ? 'Tu n’aimes pas ce contenu · cliquer pour retirer' : 'Je n’aime pas'}
        className={`inline-flex items-center rounded-full border fd-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 ${s.pill} ${
          disliked
            ? 'border-[#d6d2ca] bg-[#efede9] text-ink font-semibold'
            : 'border-line bg-white text-ink-faint hover:border-[#d6d2ca] hover:text-ink-soft'
        }`}
      >
        <ThumbsDown className={s.icon} fill={disliked ? 'currentColor' : 'none'} strokeWidth={2} aria-hidden />
        <span>{counts.dislikes}</span>
      </button>
    </div>
  );
}
