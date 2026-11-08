// Une discussion dans une liste (espace Discussions, onglet « Discussions » d'un contenu) : « utile » à gauche, titre,
// salon, extrait, contenus tagués en cartes, auteur, réponses (et qui a répondu), dernière activité.
import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Paperclip } from 'lucide-react';
import { MathText } from '@/components/skilliq/MathText';
import { extraitMath } from '@/lib/texteMath';
import { useAuth } from '@/contexts/AuthContext';
import type { DiscussionCardData } from '@/lib/api/discussionsApi';
import { AuthorName, ContentTagCard, RepliersStack, RoleBadge, SalonChip, UtileButton, fullDate, timeAgo } from './parts';
import { t } from '@/i18n';

export const DiscussionCard: React.FC<{ d: DiscussionCardData; hideTag?: number }> = ({ d, hideTag }) => {
  const { user } = useAuth();
  const own = !!user && String(user.id) === String(d.author.id);
  const tags = d.tags.filter((tag) => tag.id !== hideTag);
  // Sans réponse = aucune réponse d'un autre membre (même règle que le serveur) ; `answered` absent : ancien serveur.
  const unanswered = d.answered === undefined ? d.reply_count === 0 : !d.answered;
  // Discussions reprises des commentaires : le titre est la première phrase du message, l'extrait le répéterait.
  const norm = (s: string) => s.replace(/…$/, '').replace(/\s+/g, ' ').trim();
  const showExcerpt = !!d.excerpt && !norm(d.excerpt).startsWith(norm(d.title)) && norm(d.excerpt) !== norm(d.title);
  return (
    <article className="group relative flex gap-2 rounded-2xl border border-line bg-white p-3 transition-colors hover:border-[#cfc9bf] sm:gap-3 sm:p-4">
      <UtileButton kind="discussion" id={d.id} count={d.utile} active={d.user_utile} own={own} vertical />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <SalonChip salon={d.salon} />
          {unanswered && <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11.5px] font-semibold text-gold-strong">{t('Sans réponse')}</span>}
          {d.class_level && <span className="text-[12px] text-ink-faint">{d.class_level.name}</span>}
        </div>
        <h3 dir="auto" className="mt-1.5 text-[16px] font-semibold leading-snug text-ink sm:text-[17px]">
          {/* Toute la carte mène à la discussion ; les liens et boutons à l'intérieur restent cliquables. */}
          <Link to={`/discussions/${d.id}`} className="before:absolute before:inset-0 before:rounded-2xl before:content-[''] focus:outline-none focus-visible:underline">
            <MathText text={d.title} />
          </Link>
        </h3>
        {showExcerpt && (
          <span dir="auto" className="block"><MathText text={extraitMath(d.excerpt)} className="mt-1 line-clamp-2 block break-words text-[14px] leading-relaxed text-ink-soft" /></span>
        )}
        {tags.length > 0 && (
          <div className="relative z-10 mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {tags.slice(0, 2).map((tag) => <ContentTagCard key={tag.id} tag={tag} compact />)}
            {tags.length > 2 && <span className="self-center text-[12.5px] font-medium text-ink-faint">+{tags.length - 2}</span>}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-ink-faint">
          <span className="relative z-10 inline-flex items-center gap-1.5">
            <AuthorName author={d.author} className="text-[13px]" />
            <RoleBadge author={d.author} />
          </span>
          <time dateTime={d.last_activity_at} title={fullDate(d.last_activity_at)}>
            {d.reply_count ? t('active {quand}', { quand: timeAgo(d.last_activity_at) }) : timeAgo(d.created_at)}
          </time>
          <span className="ms-auto inline-flex items-center gap-2">
            {d.attachments > 0 && <Paperclip className="h-3.5 w-3.5" aria-label={t('Photos jointes')} />}
            <RepliersStack users={d.repliers} />
            <span className={`inline-flex items-center gap-1 font-semibold fd-nums ${d.reply_count ? 'text-ink-soft' : ''}`}>
              <MessageSquare className="h-3.5 w-3.5" aria-hidden />
              {d.reply_count}
              <span className="sr-only">{d.reply_count > 1 ? t('réponses') : t('réponse')}</span>
            </span>
          </span>
        </div>
      </div>
    </article>
  );
};

export default DiscussionCard;
