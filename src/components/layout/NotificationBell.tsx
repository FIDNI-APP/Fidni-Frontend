/**
 * Cloche de la barre du haut (07/10/2026), visible sur toutes les pages pour un membre connecté :
 * nouveaux commentaires sur les contenus avec lesquels il a interagi, réponses à ses commentaires
 * (backend apps/notifications). Le nombre de non lues est relu toutes les minutes, au retour sur
 * l'onglet et à chaque changement de page ; la liste est chargée à l'ouverture.
 * Un clic ouvre le commentaire, champ de réponse prêt : c'est ce qui incite à répondre.
 * « report » (11/10/2026) : son signalement d'erreur a été traité, avec la réponse de l'équipe en entier.
 * « quiz » (13/10/2026) : le quiz d'un chapitre de son niveau vient de sortir ; un clic le lance.
 * Formules $…$ des réponses et des extraits rendues avec KaTeX (18/10/2026), chargé seulement à l'ouverture.
 */
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Brain, CornerDownRight, Flag, Loader2, MessageCircle, ClipboardCheck } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { trackAction } from '@/lib/usage';
import { extraitMath } from '@/lib/texteMath';
import { t, dateLocale } from '@/i18n';

// KaTeX n'alourdit pas la barre du haut : chargé à la première ouverture de la cloche.
const LazyMathText = lazy(() => import('@/components/skilliq/MathText').then((m) => ({ default: m.MathText })));
const Maths: React.FC<{ text: string; className?: string }> = ({ text, className }) => (
  <Suspense fallback={<span className={className}>{text}</span>}><LazyMathText text={text} className={className} /></Suspense>
);

interface Notif {
  id: number;
  kind: 'comment' | 'reply' | 'report' | 'quiz' | 'copie';
  title: string;
  url: string;
  excerpt: string;
  /** Réponse complète de l'équipe à un signalement. */
  message?: string;
  count: number;
  actor: { username: string; avatar: string | null } | null;
  updated_at: string;
  read: boolean;
}

const POLL_MS = 60_000;

const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t('à l’instant');
  if (s < 3600) return t('il y a {n} min', { n: Math.floor(s / 60) });
  if (s < 86400) return t('il y a {n} h', { n: Math.floor(s / 3600) });
  const d = Math.floor(s / 86400);
  if (d === 1) return t('hier');
  if (d < 7) return t('il y a {n} j', { n: d });
  return new Date(iso).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
};

const Avatar: React.FC<{ actor: Notif['actor'] }> = ({ actor }) => {
  const [broken, setBroken] = useState(false);  // image introuvable : l'initiale à la place
  return actor?.avatar && !broken
    ? <img src={actor.avatar} alt="" onError={() => setBroken(true)} className="h-9 w-9 shrink-0 rounded-full object-cover" />
    : (
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f1ee] text-[13px] font-bold uppercase text-ink-soft">
        {actor?.username?.[0] ?? <MessageCircle className="h-4 w-4" />}
      </span>
    );
};

function Message({ n }: { n: Notif }) {
  if (n.kind === 'report') {
    return <><b className="font-semibold text-ink">{t('L’équipe Fidni')}</b> {t('a traité ton signalement sur')} <span className="font-semibold text-ink">« {n.title} »</span></>;
  }
  if (n.kind === 'copie') {
    return <><b className="font-semibold text-ink">{t('Ta copie corrigée')}</b> {t('est disponible :')} <span className="font-semibold text-ink">« {n.title} »</span></>;
  }
  if (n.kind === 'quiz') {
    return <><b className="font-semibold text-ink">{t('Nouveau quiz')}</b> {t('sur')} <span className="font-semibold text-ink">« {n.title} »</span>{n.excerpt ? ` · ${n.excerpt}` : ''}</>;
  }
  const who = <b className="font-semibold text-ink">{n.actor?.username ?? t('Quelqu’un')}</b>;
  const what = <span className="font-semibold text-ink">« {n.title} »</span>;
  if (n.kind === 'reply') {
    return <>{who} {n.count > 1 ? t('t’a répondu {n} fois', { n: n.count }) : t('a répondu à ton commentaire')} {t('sur')} {what}</>;
  }
  return n.count > 1
    ? <><b className="font-semibold text-ink">{t('{n} nouveaux commentaires', { n: n.count })}</b> {t('sur')} {what} ({t('le dernier de')} {who})</>
    : <>{who} {t('a commenté')} {what}</>;
}

export const NotificationBell: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[] | null>(null);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    if (!isAuthenticated || document.visibilityState === 'hidden') return;
    api.get('/notifications/non-lues/').then((r) => setUnread(r.data.unread ?? 0)).catch(() => {});
  }, [isAuthenticated]);

  // Toutes les minutes, au retour sur l'onglet, et à chaque changement de page.
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = window.setInterval(refreshCount, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshCount(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshCount);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshCount);
    };
  }, [isAuthenticated, refreshCount]);
  useEffect(() => { refreshCount(); setOpen(false); }, [pathname, refreshCount]);

  // Fermer au clic à côté ou avec Échap.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!isAuthenticated) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    trackAction('cloche');
    setLoading(true);
    api.get('/notifications/')
      .then((r) => { setItems(r.data.results ?? []); setUnread(r.data.unread ?? 0); })
      .catch(() => setItems((cur) => cur ?? []))
      .finally(() => setLoading(false));
  };

  const markRead = (ids?: number[]) => {
    setItems((cur) => cur?.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)) ?? cur);
    setUnread((u) => (ids ? Math.max(0, u - ids.length) : 0));
    api.post('/notifications/lues/', ids ? { ids } : {}).then((r) => setUnread(r.data.unread ?? 0)).catch(() => {});
  };

  const go = (n: Notif) => {
    if (!n.read) markRead([n.id]);
    setOpen(false);
    navigate(n.url);
  };

  return (
    <div ref={boxRef} className="relative flex-shrink-0" data-tour="notifications">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread ? (unread > 1 ? t('Notifications : {n} non lues', { n: unread }) : t('Notifications : {n} non lue', { n: unread })) : t('Notifications')}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-[#f2f1ee] hover:text-ink ${open ? 'bg-[#f2f1ee] text-ink' : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="fd-nums absolute end-0.5 top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10.5px] font-bold leading-none text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label={t('Notifications')}
          className="fixed inset-x-2 top-[64px] z-50 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_48px_-12px_rgba(20,18,16,.22)] sm:absolute sm:inset-x-auto sm:end-0 sm:top-[48px] sm:w-[380px]">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-[14.5px] font-bold text-ink">{t('Notifications')}</h2>
            {unread > 0 && (
              <button type="button" onClick={() => markRead()} className="text-[12.5px] font-semibold text-brand-hover hover:underline">
                {t('Tout marquer comme lu')}
              </button>
            )}
          </div>
          <div className="max-h-[min(70vh,520px)] overflow-y-auto">
            {loading && !items ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-ink-faint" /></div>
            ) : !items?.length ? (
              <p className="px-5 py-8 text-center text-[13px] leading-relaxed text-ink-faint">
                {t('Rien de neuf pour l’instant. Quand quelqu’un commente un contenu sur lequel tu as travaillé, te répond, quand l’équipe traite un de tes signalements ou qu’un nouveau quiz sort pour ton niveau, tu le verras ici.')}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => go(n)}
                      className={`flex w-full gap-3 px-4 py-3 text-start transition-colors hover:bg-[#faf9f7] ${n.read ? '' : 'bg-brand-soft/40'}`}>
                      {n.kind === 'report' ? (
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-strong"><Flag className="h-4 w-4" /></span>
                      ) : n.kind === 'quiz' ? (
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-hover"><Brain className="h-4 w-4" /></span>
                      ) : n.kind === 'copie' ? (
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-hover"><ClipboardCheck className="h-4 w-4" /></span>
                      ) : <Avatar actor={n.actor} />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] leading-snug text-ink-soft"><Message n={n} /></span>
                        {n.kind === 'report' ? (
                          <Maths text={n.message || extraitMath(n.excerpt)}
                            className="mt-1.5 block max-h-[40vh] overflow-y-auto whitespace-pre-line break-words rounded-xl border-s-2 border-brand bg-[#f7f6f3] px-3 py-2 text-[12.5px] leading-relaxed text-ink" />
                        ) : n.kind !== 'quiz' && n.kind !== 'copie' && n.excerpt && (
                          <span className="mt-1 block truncate text-[12.5px] italic text-ink-faint">“<Maths text={extraitMath(n.excerpt)} />”</span>
                        )}
                        <span className="mt-1.5 flex items-center gap-2 text-[12px]">
                          <span className="text-ink-faint">{timeAgo(n.updated_at)}</span>
                          {n.kind === 'report' ? (
                            <span className="font-semibold text-brand-hover">{t('Voir le contenu')} ›</span>
                          ) : n.kind === 'quiz' ? (
                            <span className="font-semibold text-brand-hover">{t('Passer le quiz')} ›</span>
                          ) : n.kind === 'copie' ? (
                            <span className="font-semibold text-brand-hover">{t('Voir ma copie')} ›</span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 font-semibold text-brand-hover">
                              <CornerDownRight className="h-3.5 w-3.5" /> {t('Répondre')}
                            </span>
                          )}
                        </span>
                      </span>
                      {!n.read && <span aria-label={t('Non lue')} className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
