/**
 * Pied d'un contenu : « Ce contenu t'a aidé ? » (j'aime / je n'aime pas, comme VoteButtons du site) et la discussion
 * (commentaires et réponses, j'aime sur un commentaire, supprimer le sien), mêmes appels que CommentSection.
 */
import { useState } from 'react';
import { IonButton, IonIcon, IonSpinner, IonTextarea, useIonAlert } from '@ionic/react';
import { chatbubbleOutline, heart, heartOutline, send, thumbsDown, thumbsDownOutline, thumbsUp, thumbsUpOutline, trashOutline } from 'ionicons/icons';
import { useAuth } from '@/contexts/AuthContext';
import { deleteComment, voteComment } from '@/lib/api/interactionApi';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import type { Comment, VoteValue } from '@/types';
import { dateLocale, t } from '@/i18n';
import { useSession } from '../session';
import { haptic } from '../ui';

interface ContentApi {
  vote: (id: string, value: number) => Promise<{ like_count?: number; dislike_count?: number; user_vote: number }>;
  getComments: (id: string) => Promise<unknown[]>;
  addComment: (id: string, content: string, parentId?: string) => Promise<unknown>;
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Texte brut d'un commentaire (formules $…$ comprises) → paragraphes ; un ancien commentaire en HTML reste tel quel.
const commentHtml = (text: string) => (/<(p|ul|ol|br|strong|em|a|span|div)[\s>/]/i.test(text)
  ? text
  : text.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join(''));

const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t('à l’instant');
  if (s < 3600) return t('il y a {n} min', { n: Math.floor(s / 60) });
  if (s < 86400) return t('il y a {n} h', { n: Math.floor(s / 3600) });
  const d = Math.floor(s / 86400);
  if (d === 1) return t('hier');
  if (d < 30) return t('il y a {n} j', { n: d });
  return new Date(iso).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
};

const countAll = (list: Comment[]): number => list.reduce((n, c) => n + 1 + countAll(c.replies ?? []), 0);
/** Réponses d'un commentaire, à plat (fil d'un seul niveau, comme sur le site). */
const flatten = (c: Comment): Comment[] => (c.replies ?? []).flatMap((r) => [r, ...flatten(r)]);

export function Votes({ id, api, likes, dislikes, userVote }: {
  id: string; api: ContentApi; likes: number; dislikes: number; userVote: VoteValue;
}) {
  const { requireAccount } = useSession();
  const [state, setState] = useState({ likes, dislikes, vote: userVote });
  const vote = async (value: 1 | -1) => {
    if (!requireAccount(t('Crée un compte gratuit pour dire si ce contenu t’a aidé.'))) return;
    haptic.tap();
    const before = state;
    // Affichage immédiat, corrigé par la réponse du serveur.
    setState((s) => {
      const n = { ...s };
      if (s.vote === 1) n.likes -= 1;
      if (s.vote === -1) n.dislikes -= 1;
      if (s.vote !== value) { if (value === 1) n.likes += 1; else n.dislikes += 1; }
      n.vote = s.vote === value ? 0 : value;
      return n;
    });
    try {
      const r = await api.vote(id, value);
      setState({ likes: r.like_count ?? before.likes, dislikes: r.dislike_count ?? before.dislikes, vote: r.user_vote as VoteValue });
    } catch { setState(before); }
  };
  const btn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 22, fontWeight: 700, fontSize: 15,
    background: active ? 'var(--fdm-brand-soft)' : 'var(--fdm-card)', color: active ? 'var(--ion-color-primary)' : 'var(--ion-text-color)',
    border: `1.5px solid ${active ? 'var(--ion-color-primary)' : 'var(--fdm-line)'}`,
  });
  return (
    <div style={{ margin: '22px 16px 0', textAlign: 'center' }}>
      <div className="fdm-muted" style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t('Ce contenu t’a aidé ?')}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
        <button type="button" className="fdm-pressable" style={btn(state.vote === 1)} onClick={() => vote(1)} aria-pressed={state.vote === 1}>
          <IonIcon icon={state.vote === 1 ? thumbsUp : thumbsUpOutline} />{state.likes}
        </button>
        <button type="button" className="fdm-pressable" style={btn(state.vote === -1)} onClick={() => vote(-1)} aria-pressed={state.vote === -1}>
          <IonIcon icon={state.vote === -1 ? thumbsDown : thumbsDownOutline} />{state.dislikes}
        </button>
      </div>
    </div>
  );
}

export function Discussion({ id, api, initial }: { id: string; api: ContentApi; initial: Comment[] }) {
  const { user } = useAuth();
  const { requireAccount } = useSession();
  const [confirm] = useIonAlert();
  const [comments, setComments] = useState<Comment[]>(initial);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => setComments((await api.getComments(id)) as Comment[]);

  const sendComment = async () => {
    if (!text.trim() || busy) return;
    if (!requireAccount(t('Crée un compte gratuit pour participer à la discussion.'))) return;
    setBusy(true);
    try {
      await api.addComment(id, text.trim(), replyTo ? String(replyTo.id) : undefined);
      setText('');
      setReplyTo(null);
      haptic.success();
      await reload();
    } finally { setBusy(false); }
  };

  const like = async (c: Comment) => {
    if (!requireAccount()) return;
    haptic.tap();
    await voteComment(String(c.id), (c.user_vote === 1 ? 0 : 1) as VoteValue).catch(() => undefined);
    await reload().catch(() => undefined);
  };

  const remove = (c: Comment) => void confirm({
    header: t('Supprimer ce commentaire ?'),
    buttons: [{ text: t('Annuler'), role: 'cancel' }, {
      text: t('Supprimer'), role: 'destructive',
      handler: () => { void deleteComment(String(c.id)).then(reload).catch(() => undefined); },
    }],
  });

  const card = (c: Comment, reply: boolean) => {
    const mine = !!user && String(user.id) === String(c.author?.id);
    const deleted = (c.author as { is_deleted?: boolean } | undefined)?.is_deleted;
    const name = deleted ? t('Compte supprimé') : c.author?.username;
    const likes = c.like_count ?? Math.max(0, c.vote_count ?? 0);
    return (
      <div key={c.id} style={{ display: 'flex', gap: 10, padding: reply ? '10px 0 0 36px' : '14px 0 0' }}>
        <span style={{
          flexShrink: 0, width: reply ? 26 : 32, height: reply ? 26 : 32, borderRadius: '50%', display: 'grid', placeItems: 'center',
          background: 'var(--fdm-brand-soft)', color: 'var(--ion-color-primary)', fontWeight: 700, fontSize: reply ? 12 : 14,
        }}>{(name || '?').slice(0, 1).toUpperCase()}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5 }}><strong>{name}</strong> <span className="fdm-muted">· {timeAgo(c.created_at)}</span></div>
          <div className="fdm-math" style={{ fontSize: 15, marginTop: 2 }}><TipTapRenderer content={commentHtml(c.content)} /></div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 13, fontWeight: 600 }} className="fdm-muted">
            <button type="button" onClick={() => like(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: c.user_vote === 1 ? 'var(--ion-color-danger)' : 'inherit' }}>
              <IonIcon icon={c.user_vote === 1 ? heart : heartOutline} />{likes || ''}
            </button>
            {!reply && <button type="button" onClick={() => { haptic.tap(); setReplyTo(c); }} style={{ color: 'inherit' }}>{t('Répondre')}</button>}
            {mine && <button type="button" onClick={() => remove(c)} style={{ color: 'inherit', display: 'inline-flex', alignItems: 'center' }} aria-label={t('Supprimer')}><IonIcon icon={trashOutline} /></button>}
          </div>
        </div>
      </div>
    );
  };

  const total = countAll(comments);
  return (
    <div className="fdm-card" style={{ margin: '22px 16px 0', padding: '16px 16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
        <IonIcon icon={chatbubbleOutline} />{t('Discussion')}{total ? <span className="fdm-muted" style={{ fontWeight: 600 }}>· {total}</span> : null}
      </div>
      {!total && <p className="fdm-muted" style={{ margin: '8px 0 0', fontSize: 14 }}>{t('Une question ? Pose-la ici.')}</p>}
      {comments.map((c) => (
        <div key={c.id}>
          {card(c, false)}
          {flatten(c).map((r) => card(r, true))}
        </div>
      ))}
      <div style={{ marginTop: 14, borderTop: '1px solid var(--fdm-line)', paddingTop: 12 }}>
        {replyTo && (
          <div className="fdm-muted" style={{ fontSize: 13, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('Réponse à {nom}', { nom: replyTo.author?.username ?? '' })}</span>
            <button type="button" onClick={() => setReplyTo(null)} style={{ color: 'var(--ion-color-primary)', fontWeight: 600 }}>{t('Annuler')}</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <IonTextarea autoGrow rows={1} value={text} onIonInput={(e) => setText(String(e.detail.value ?? ''))}
            placeholder={t('Ton commentaire…')} fill="outline" style={{ flex: 1, '--border-radius': '20px' } as React.CSSProperties} />
          <IonButton shape="round" onClick={sendComment} disabled={!text.trim() || busy} aria-label={t('Envoyer')}>
            {busy ? <IonSpinner name="crescent" /> : <IonIcon slot="icon-only" icon={send} />}
          </IonButton>
        </div>
      </div>
    </div>
  );
}
