// Onglet « Messages » du profil (18/10/2026) : les réponses de l'équipe Fidni à ses signalements d'erreur, en
// entier, avec son signalement et le contenu concerné. La notification de la cloche y mène
// (?tab=messages&message=<id>) : ce message est mis en avant et marqué lu.
import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Inbox, MessageSquare, XCircle } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { MathText } from '@/components/skilliq/MathText';
import { CardsSkeleton, EmptyState, Section } from '@/components/space/Page';
import { t, dateLocale } from '@/i18n';

interface Message {
  id: number;
  kind?: 'report' | 'message';
  title: string;
  link: string;
  message: string;
  updated_at: string;
  read: boolean;
  report: { reason: string; item_label: string; description: string; status: string; created_at: string } | null;
}

const date = (iso: string) => new Date(iso).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' });

/** Texte avec formules ($…$), paragraphe par paragraphe (retours à la ligne gardés). */
const Texte: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {text.split(/\n{2,}/).map((p, i) => (
      <p key={i} className="whitespace-pre-line"><MathText text={p} /></p>
    ))}
  </div>
);

export const MessagesSection: React.FC = () => {
  const [params] = useSearchParams();
  const focus = Number(params.get('message')) || null;
  const [items, setItems] = useState<Message[] | null>(null);
  const [failed, setFailed] = useState(false);
  const focused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let alive = true;
    api.get('/notifications/messages/')
      .then((r) => {
        if (!alive) return;
        const list = (r.data?.results ?? []) as Message[];
        setItems(list);
        const unread = list.filter((m) => !m.read).map((m) => m.id);
        if (unread.length) api.post('/notifications/lues/', { ids: unread }).catch(() => {});
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (items && focus) focused.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [items, focus]);

  if (failed) return <p role="alert" className="text-[13.5px] text-[#9c3b2e]">{t('Impossible de charger tes messages.')}</p>;
  if (!items) return <CardsSkeleton n={2} />;

  return (
    <Section id="messages" title={t('Messages')} count={items.length}
      hint={t('Les messages de l’équipe Fidni et ses réponses à tes signalements d’erreur.')}>
      {items.length === 0 ? (
        <EmptyState icon={Inbox} title={t('Aucun message pour l’instant')}
          text={t('Quand tu signales une erreur sur un exercice, notre réponse arrive ici.')} />
      ) : (
        <ul className="space-y-4">
          {items.map((m) => {
            const isFocus = m.id === focus;
            const r = m.report;
            const corrige = r?.status === 'resolved';
            return (
              <li key={m.id} ref={isFocus ? (el) => { focused.current = el; } : undefined}
                className={`scroll-mt-24 rounded-2xl border bg-white p-5 ${isFocus ? 'border-brand ring-1 ring-brand' : 'border-line'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] text-ink-faint">{date(m.updated_at)}</p>
                    <h3 className="mt-0.5 text-[16px] font-semibold leading-snug text-ink">{m.title}</h3>
                  </div>
                  {r && (
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${corrige ? 'bg-brand-soft text-brand-hover' : 'bg-[#f2f1ee] text-ink-soft'}`}>
                      {corrige ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <XCircle className="h-3.5 w-3.5" aria-hidden />}
                      {corrige ? t('Corrigé') : t('Sans suite')}
                    </span>
                  )}
                </div>

                {r && (
                  <div className="mt-4 rounded-xl bg-[#faf9f7] px-4 py-3 text-[13.5px] text-ink-soft">
                    <p className="text-[11.5px] font-bold uppercase tracking-[.06em] text-ink-faint">
                      {t('Ton signalement')} · {date(r.created_at)}
                    </p>
                    <p className="mt-1 font-medium text-ink">{t(r.reason)}{r.item_label ? ` — ${r.item_label}` : ''}</p>
                    {r.description && <Texte text={r.description} className="mt-1" />}
                  </div>
                )}

                <div className="mt-4">
                  <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[.06em] text-brand-hover">
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden /> {m.kind === 'message' ? t('Message de l’équipe Fidni') : t('Réponse de l’équipe Fidni')}
                  </p>
                  <Texte text={m.message} className="mt-1.5 text-[14.5px] leading-relaxed text-ink" />
                </div>

                {m.kind !== 'message' && <Link to={m.link} className="mt-4 inline-flex min-h-10 items-center gap-1 text-[13px] font-semibold text-brand-hover hover:underline">
                  {t('Voir le contenu')} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
                </Link>}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
};
