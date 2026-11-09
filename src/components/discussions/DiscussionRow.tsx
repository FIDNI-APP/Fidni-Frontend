// Les deux lignes de /discussions (09/11/2026), qui ne se ressemblent pas pour qu'on ne les confonde pas.
// Forum : un titre en gras, puis qui, quand, combien de réponses. Mène à la page de la discussion.
// Commentaire : qui, puis son texte tel quel, puis le contenu sous lequel il est écrit. Mène à l'onglet de ce contenu.
import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { MathText } from '@/components/skilliq/MathText';
import { extraitMath } from '@/lib/texteMath';
import type { DiscussionCardData } from '@/lib/api/discussionsApi';
import { AuthorName, Avatar, contentTypeIcon, fullDate, salonOf, timeAgo } from './parts';
import { t } from '@/i18n';

const Point: React.FC = () => <span aria-hidden className="text-[#c9c5bd]">·</span>;

const LIGNE = 'group relative -mx-3 flex gap-3.5 rounded-2xl px-3 transition-colors hover:bg-[#f7f6f3] active:bg-ink/[.06] sm:gap-4';
/** Filet entre deux lignes, aligné sur le texte. */
const CORPS = 'flex min-w-0 flex-1 items-start gap-3 border-b border-line py-4 group-last:border-transparent';
/** Toute la ligne est un lien ; celui du pseudo reste cliquable au-dessus. */
const LIEN = "before:absolute before:inset-0 before:rounded-2xl before:content-[''] focus:outline-none focus-visible:before:ring-2 focus-visible:before:ring-brand/40";

const NombreReponses: React.FC<{ n: number }> = ({ n }) => (
  <span className="fd-nums inline-flex items-center gap-1 text-[14px] font-semibold text-ink-soft"
    aria-label={n > 1 ? t('{n} réponses', { n }) : t('1 réponse')}>
    <MessageCircle aria-hidden className="h-4 w-4 text-ink-faint" />
    {n}
  </span>
);

export const DiscussionRow: React.FC<{
  d: DiscussionCardData;
  /** La liste mélange les salons (aucun salon choisi). */
  montrerSalon?: boolean;
  /** La liste mélange les niveaux. */
  montrerNiveau?: boolean;
}> = ({ d, montrerSalon = false, montrerNiveau = false }) => {
  // Sans réponse = aucune réponse d'un autre membre (même règle que le serveur).
  const sansReponse = d.answered === undefined ? d.reply_count === 0 : !d.answered;
  const tag = d.tags[0];
  const TagIcon = tag ? contentTypeIcon(tag.type) : null;
  return (
    <li className={LIGNE}>
      <div className="pt-4"><Avatar user={d.author} size={40} /></div>
      <div className={CORPS}>
        <div className="min-w-0 flex-1">
          <h2 dir="auto" className="text-start text-[16px] font-semibold leading-snug tracking-[-0.008em] text-ink">
            <Link to={`/discussions/${d.id}`} className={LIEN}><MathText text={d.title} /></Link>
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-ink-faint">
            <AuthorName author={d.author} className="relative z-10 !font-medium !text-ink-soft" />
            {d.author.role === 'prof' && <span className="font-medium text-gold-strong">{t('Professeur')}</span>}
            {d.author.role === 'equipe' && <span className="font-medium text-gold-strong">{t('Équipe Fidni')}</span>}
            <Point />
            <time dateTime={d.last_activity_at} title={fullDate(d.last_activity_at)}>{timeAgo(d.last_activity_at)}</time>
            {montrerSalon && (
              <>
                <Point />
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="fd-fixe h-1.5 w-1.5 rounded-full" style={{ backgroundColor: salonOf(d.salon).dot }} />
                  {t(salonOf(d.salon).label)}
                </span>
              </>
            )}
            {montrerNiveau && d.class_level && <><Point /><span>{d.class_level.name}</span></>}
            {tag && TagIcon && (
              <>
                <Point />
                <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                  <TagIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-[240px] truncate">{tag.title}</span>
                  {d.tags.length > 1 && <span className="fd-nums shrink-0">+{d.tags.length - 1}</span>}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 pt-0.5">
          {sansReponse ? (
            <span className="text-[13px] font-semibold text-[#7a5a14]">{t('Sans réponse')}</span>
          ) : (
            <>
              {/* Les visages de ceux qui ont répondu : la discussion vit, sans un mot de plus. */}
              {d.repliers.length > 0 && (
                <span aria-hidden className="hidden -space-x-1.5 sm:flex rtl:space-x-reverse">
                  {d.repliers.map((u) => <Avatar key={u.username} user={u} size={22} ring />)}
                </span>
              )}
              <NombreReponses n={d.reply_count} />
            </>
          )}
        </div>
      </div>
    </li>
  );
};

export const CommentRow: React.FC<{ d: DiscussionCardData; montrerNiveau?: boolean }> = ({ d, montrerNiveau = false }) => {
  const contenu = d.tags[0];
  const Icone = contenu ? contentTypeIcon(contenu.type) : null;
  return (
    <li className={LIGNE}>
      <div className="pt-4"><Avatar user={d.author} size={40} /></div>
      <div className={CORPS}>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-ink-faint">
            <AuthorName author={d.author} className="relative z-10 !font-medium !text-ink-soft" />
            {d.author.role === 'prof' && <span className="font-medium text-gold-strong">{t('Professeur')}</span>}
            {d.author.role === 'equipe' && <span className="font-medium text-gold-strong">{t('Équipe Fidni')}</span>}
            <Point />
            <time dateTime={d.created_at} title={fullDate(d.created_at)}>{timeAgo(d.created_at)}</time>
            {montrerNiveau && d.class_level && <><Point /><span>{d.class_level.name}</span></>}
          </p>
          <Link to={d.url} dir="auto" className={`${LIEN} mt-1 block text-start text-[16px] leading-relaxed text-ink`}>
            <MathText text={extraitMath(d.excerpt) || t('Pièce jointe')} className="line-clamp-2" />
          </Link>
          {contenu && Icone && (
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] text-ink-faint">
              <Icone className="h-3.5 w-3.5 shrink-0" />
              <span dir="auto" className="truncate">{contenu.title}</span>
            </p>
          )}
        </div>
        {d.reply_count > 0 && <div className="shrink-0 pt-0.5"><NombreReponses n={d.reply_count} /></div>}
      </div>
    </li>
  );
};

export default DiscussionRow;
