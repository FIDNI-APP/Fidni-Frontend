// Les cartes de /discussions (08/11/2026). Discussion du forum : « utile » à gauche, titre, salon, extrait, contenus tagués
// en cartes, auteur, réponses (et qui a répondu), dernière activité. Commentaire (09/11/2026) : qui, son texte, le contenu
// sous lequel il est écrit ; toute la carte mène à l'onglet Commentaires de ce contenu, sur ce message.
import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Paperclip } from 'lucide-react';
import { MathText } from '@/components/skilliq/MathText';
import { extraitMath } from '@/lib/texteMath';
import { useAuth } from '@/contexts/AuthContext';
import type { DiscussionCardData } from '@/lib/api/discussionsApi';
import { AuthorName, ContentTagCard, RepliersStack, RoleBadge, SalonChip, UtileButton, fullDate, timeAgo } from './parts';
import { t } from '@/i18n';

const CARTE = 'group relative flex gap-2 rounded-2xl border border-line bg-white p-3 transition-colors hover:border-[#cfc9bf] sm:gap-3 sm:p-4';
/** Toute la carte mène au message ; ce qui est en `relative z-10` (pseudo, « utile », contenus du forum) reste cliquable. */
const LIEN_CARTE = "before:absolute before:inset-0 before:rounded-2xl before:content-[''] focus:outline-none focus-visible:underline";

/** « Utile » au-dessus du lien de la carte : sans cela, un clic ouvrait le message au lieu de voter. */
const Utile: React.FC<{ d: DiscussionCardData }> = ({ d }) => {
  const { user } = useAuth();
  const own = !!user && String(user.id) === String(d.author.id);
  return (
    <div className="relative z-10 self-start">
      <UtileButton kind="discussion" id={d.id} count={d.utile} active={d.user_utile} own={own} vertical />
    </div>
  );
};

const Reponses: React.FC<{ d: DiscussionCardData }> = ({ d }) => (
  <span className="ms-auto inline-flex items-center gap-2">
    {d.attachments > 0 && <Paperclip className="h-3.5 w-3.5" aria-label={t('Photos jointes')} />}
    <RepliersStack users={d.repliers} />
    <span className={`inline-flex items-center gap-1 font-semibold fd-nums ${d.reply_count ? 'text-ink-soft' : ''}`}>
      <MessageSquare className="h-3.5 w-3.5" aria-hidden />
      {d.reply_count}
      <span className="sr-only">{d.reply_count > 1 ? t('réponses') : t('réponse')}</span>
    </span>
  </span>
);

const Auteur: React.FC<{ d: DiscussionCardData }> = ({ d }) => (
  <span className="relative z-10 inline-flex items-center gap-1.5">
    <AuthorName author={d.author} className="text-[13px]" />
    <RoleBadge author={d.author} />
  </span>
);

export const DiscussionCard: React.FC<{ d: DiscussionCardData }> = ({ d }) => {
  // Sans réponse = aucune réponse d'un autre membre (même règle que le serveur) ; `answered` absent : ancien serveur.
  const unanswered = d.answered === undefined ? d.reply_count === 0 : !d.answered;
  // Un message qui commence par son titre : l'extrait le répéterait.
  const norm = (s: string) => s.replace(/…$/, '').replace(/\s+/g, ' ').trim();
  const showExcerpt = !!d.excerpt && !norm(d.excerpt).startsWith(norm(d.title)) && norm(d.excerpt) !== norm(d.title);
  return (
    <article className={CARTE}>
      <Utile d={d} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <SalonChip salon={d.salon} />
          {unanswered && <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11.5px] font-semibold text-gold-strong">{t('Sans réponse')}</span>}
          {d.class_level && <span className="text-[12px] text-ink-faint">{d.class_level.name}</span>}
        </div>
        <h3 dir="auto" className="mt-1.5 text-[16px] font-semibold leading-snug text-ink sm:text-[17px]">
          <Link to={d.url} className={LIEN_CARTE}><MathText text={d.title} /></Link>
        </h3>
        {showExcerpt && (
          <span dir="auto" className="block"><MathText text={extraitMath(d.excerpt)} className="mt-1 line-clamp-2 block break-words text-[14px] leading-relaxed text-ink-soft" /></span>
        )}
        {d.tags.length > 0 && (
          <div className="relative z-10 mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {d.tags.slice(0, 2).map((tag) => <ContentTagCard key={tag.id} tag={tag} compact />)}
            {d.tags.length > 2 && <span className="self-center text-[12.5px] font-medium text-ink-faint">+{d.tags.length - 2}</span>}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-ink-faint">
          <Auteur d={d} />
          <time dateTime={d.last_activity_at} title={fullDate(d.last_activity_at)}>
            {d.reply_count ? t('active {quand}', { quand: timeAgo(d.last_activity_at) }) : timeAgo(d.created_at)}
          </time>
          <Reponses d={d} />
        </div>
      </div>
    </article>
  );
};

// Même ordre que la carte du forum : le texte, ce dont il parle, puis qui, quand, combien de réponses.
export const CommentCard: React.FC<{ d: DiscussionCardData }> = ({ d }) => {
  const contenu = d.tags[0];
  return (
    <article className={CARTE}>
      <Utile d={d} />
      <div className="min-w-0 flex-1">
        <Link to={d.url} dir="auto" className={`block text-start text-[15px] leading-relaxed text-ink ${LIEN_CARTE}`}>
          <MathText text={extraitMath(d.excerpt) || t('Pièce jointe')} className="line-clamp-3 block break-words" />
        </Link>
        {/* Le contenu se lit ici, sans être un lien : toute la carte mène déjà à son onglet Commentaires. */}
        {contenu && <div className="mt-2.5"><ContentTagCard tag={contenu} compact statique /></div>}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-ink-faint">
          <Auteur d={d} />
          <time dateTime={d.created_at} title={fullDate(d.created_at)}>{timeAgo(d.created_at)}</time>
          <Reponses d={d} />
        </div>
      </div>
    </article>
  );
};

export default DiscussionCard;
