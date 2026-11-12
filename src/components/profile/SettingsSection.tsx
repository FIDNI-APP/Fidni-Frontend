// src/components/profile/SettingsSection.tsx
// Onglet « Paramètres » du profil (refonte du 11/10/2026) : une seule colonne, trois sections, et chaque
// réglage s'enregistre lui-même (avant : cinq sous-onglets et un bouton « Enregistrer » global, facile à oublier
// pour les notifications). Photo, présentation, identité, niveau et objectifs vivent sur « Modifier mon profil ».
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, ChevronRight, Eye, EyeOff, KeyRound, Loader2, LogOut, MailCheck, Monitor, Moon, Sun, Trash2, UserPen, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { CardLink, Section } from '@/components/space/Page';
import { requestPasswordReset } from '@/lib/api/authApi';
import { changePassword, deleteMyAccount, updateUserInfo, updateUserProfile } from '@/lib/api/userApi';
import { LEGAL } from '@/lib/legal';
import { t, useLang } from '@/i18n';

/** Erreur axios telle que lue ici. */
type ApiError = { response?: { status?: number; data?: { error?: string; code?: string } } };
const apiData = (err: unknown) => (err as ApiError)?.response?.data;

/** Même règle que le serveur (apps/authentication/views.py, USERNAME_RE). */
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,30}$/;

const inputCls =
  'h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[14px] text-ink placeholder:text-ink-faint '
  + 'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-[#f7f6f3] disabled:text-ink-faint';

type Msg = { kind: 'error' | 'ok' | 'info'; text: string } | null;

/** Message sous un réglage : erreur (rouge sobre), réussite (vert), information (e-mail à confirmer). */
const Note: React.FC<{ msg: Msg; onClose?: () => void }> = ({ msg, onClose }) => {
  if (!msg) return null;
  const cls = msg.kind === 'error' ? 'border-[#f0d5d1] bg-[#fbecea] text-[#a23b34]' : 'border-brand-line bg-brand-soft text-ink';
  const Icon = msg.kind === 'info' ? MailCheck : msg.kind === 'ok' ? Check : null;
  return (
    <div role={msg.kind === 'error' ? 'alert' : 'status'} className={`mt-3 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed ${cls}`}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-hover" aria-hidden />}
      <p className="min-w-0 flex-1 break-words">{msg.text}</p>
      {onClose && (
        <button type="button" onClick={onClose} aria-label={t('Fermer le message')} className="-m-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

/** Une ligne de réglage : titre et explication, action à droite (dessous sur téléphone), puis le formulaire. */
const Row: React.FC<{ title: string; hint?: React.ReactNode; aside?: React.ReactNode; children?: React.ReactNode }> = ({ title, hint, aside, children }) => (
  <div className="px-4 py-4 sm:px-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        {hint && <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-faint">{hint}</p>}
      </div>
      {aside && <div className="flex shrink-0 flex-wrap gap-2">{aside}</div>}
    </div>
    {children}
  </div>
);

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">{children}</div>
);

/** Fenêtre de confirmation : fond sombre, Échap ou clic à côté pour fermer. */
const Dialog: React.FC<{ id: string; title: string; onClose: () => void; children: React.ReactNode }> = ({ id, title, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/40 p-4 [align-items:safe_center]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={id} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-xl sm:p-6">
        <h2 id={id} className="fd-display text-[20px] leading-tight text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
};

const PasswordInput: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; autoFocus?: boolean }> = ({
  id, label, value, onChange, autoComplete, autoFocus,
}) => {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink-soft">{label}</label>
      <div className="relative">
        <input id={id} type={shown ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete} autoFocus={autoFocus} className={`${inputCls} pe-12`} />
        <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? t('Masquer le mot de passe') : t('Afficher le mot de passe')}
          className="absolute end-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

const NOTIFS = [
  { key: 'email_notifications', title: 'E-mails de Fidni', hint: 'Recevoir des notifications par e-mail.' },
  { key: 'comment_notifications', title: 'Commentaires', hint: 'Quand quelqu’un commente ce que tu as publié.' },
  { key: 'solution_notifications', title: 'Solutions', hint: 'Quand une nouvelle solution est proposée.' },
] as const;
type NotifKey = typeof NOTIFS[number]['key'];

const THEMES = [
  { id: 'light', label: 'Clair', icon: Sun },
  { id: 'dark', label: 'Sombre', icon: Moon },
  { id: 'system', label: 'Système', icon: Monitor },
] as const;

export const SettingsSection: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useLang();
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Compte créé avec Google (10/10/2026) : peut n'avoir aucun mot de passe. Champ absent : comme avant.
  // Le premier mot de passe se définit par un lien reçu par e-mail (une session ouverte ne suffit pas).
  const hasPassword = user?.has_password !== false;
  const googleLinked = !!user?.google_linked;
  const SET_PASSWORD_FIRST = googleLinked
    ? t('Pour changer d’adresse e-mail, définis d’abord un mot de passe : bouton « Définir un mot de passe » ci-dessous.')
    : t('Ton compte n’a pas de mot de passe : pour changer d’adresse e-mail, écris à {email}.', { email: LEGAL.contactEmail });

  /* ── Pseudo ── */
  const [name, setName] = useState(user?.username ?? '');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState<Msg>(null);
  useEffect(() => { setName(user?.username ?? ''); }, [user?.username]);
  const newName = name.trim();
  const nameChanged = !!user && newName !== user.username;
  const nameValid = USERNAME_RE.test(newName);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !nameChanged || !nameValid) return;
    setNameBusy(true);
    setNameMsg(null);
    try {
      await updateUserProfile(user.username, { username: newName });
      await refreshUser();
      setNameMsg({ kind: 'ok', text: t('C’est fait : ton pseudo est maintenant « {name} ».', { name: newName }) });
      // L'adresse du profil suit le pseudo.
      navigate(`/profile/${encodeURIComponent(newName)}?tab=settings`, { replace: true });
    } catch (err) {
      setNameMsg({ kind: 'error', text: apiData(err)?.error || t('Ton pseudo n’a pas pu être changé. Réessaie.') });
    } finally {
      setNameBusy(false);
    }
  };

  /* ── Adresse e-mail (mot de passe actuel exigé ; la nouvelle adresse est à confirmer) ── */
  const [email, setEmail] = useState(user?.email ?? '');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<Msg>(null);
  useEffect(() => { setEmail(user?.email ?? ''); }, [user?.email]);
  const newEmail = email.trim();
  const emailChanged = newEmail.toLowerCase() !== (user?.email || '').toLowerCase();

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !emailChanged) return;
    if (!hasPassword) { setEmailMsg({ kind: 'error', text: SET_PASSWORD_FIRST }); return; }
    if (!emailPassword) { setEmailMsg({ kind: 'error', text: t('Indique ton mot de passe actuel pour changer d’adresse e-mail.') }); return; }
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const info = await updateUserInfo({ email: newEmail, current_password: emailPassword });
      setEmailPassword('');
      // La nouvelle adresse est enregistrée tout de suite, mais reste « à confirmer » jusqu'au clic sur le lien reçu.
      if (info?.email_verification_sent) {
        const to = typeof info.pending_email === 'string' && info.pending_email ? info.pending_email : newEmail;
        setEmailMsg({ kind: 'info', text: t('Confirme ta nouvelle adresse : on t’a envoyé un lien à {to}. Pense à vérifier tes courriers indésirables.', { to }) });
      } else {
        setEmailMsg({ kind: 'ok', text: t('Ton adresse e-mail est changée.') });
      }
      await refreshUser();
    } catch (err) {
      setEmailMsg({
        kind: 'error',
        text: apiData(err)?.code === 'set_password_first' ? SET_PASSWORD_FIRST : apiData(err)?.error || t('Ton adresse n’a pas pu être changée. Réessaie.'),
      });
    } finally {
      setEmailBusy(false);
    }
  };

  /* ── Mot de passe ── */
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  // Compte sans mot de passe : lien « définir un mot de passe » envoyé par e-mail.
  const [linkState, setLinkState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPassword) return; // compte sans mot de passe : lien par e-mail (sendSetPasswordLink)
    if (pw.next !== pw.confirm) { setPwMsg({ kind: 'error', text: t('Les deux nouveaux mots de passe ne sont pas identiques.') }); return; }
    if (pw.next.length < 8) { setPwMsg({ kind: 'error', text: t('Le mot de passe doit contenir au moins 8 caractères.') }); return; }
    setPwBusy(true);
    setPwMsg(null);
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      setPwOpen(false);
      setPwMsg({ kind: 'ok', text: t('Mot de passe changé. Tes autres appareils ont été déconnectés.') });
    } catch (err) {
      setPwMsg({ kind: 'error', text: apiData(err)?.error || t('Le mot de passe n’a pas pu être changé. Réessaie.') });
    } finally {
      setPwBusy(false);
    }
  };

  /** Compte sans mot de passe (créé avec Google) : même lien que « Mot de passe oublié », envoyé à son adresse. */
  const sendSetPasswordLink = async () => {
    if (!user?.email) return;
    setPwMsg(null);
    setLinkState('sending');
    try {
      await requestPasswordReset(user.email);
      setLinkState('sent');
    } catch (err) {
      setLinkState('idle');
      const status = (err as ApiError)?.response?.status;
      setPwMsg({
        kind: 'error',
        text: status === 429 ? t('Trop de demandes. Patiente quelques minutes avant de réessayer.')
          : apiData(err)?.error || t('Impossible d’envoyer le lien pour le moment. Réessaie dans un instant.'),
      });
    }
  };

  /* ── Notifications : enregistrées dès le clic (mise à jour partielle du profil) ── */
  const fromUser = (): Record<NotifKey, boolean> => ({
    email_notifications: user?.profile?.email_notifications ?? true,
    comment_notifications: user?.profile?.comment_notifications ?? true,
    solution_notifications: user?.profile?.solution_notifications ?? true,
  });
  const [notifs, setNotifs] = useState(fromUser);
  const [prefState, setPrefState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const p = user?.profile;
  useEffect(() => {
    setNotifs({
      email_notifications: p?.email_notifications ?? true,
      comment_notifications: p?.comment_notifications ?? true,
      solution_notifications: p?.solution_notifications ?? true,
    });
  }, [p?.email_notifications, p?.comment_notifications, p?.solution_notifications]);

  const toggleNotif = async (key: NotifKey) => {
    if (!user) return;
    const before = notifs;
    const value = !before[key];
    setNotifs({ ...before, [key]: value });
    setPrefState('saving');
    window.clearTimeout(timer.current);
    try {
      await updateUserProfile(user.username, { profile: { [key]: value } });
      setPrefState('saved');
      timer.current = window.setTimeout(() => setPrefState('idle'), 2500);
      refreshUser().catch(() => undefined);
    } catch {
      setNotifs(before);
      setPrefState('error');
    }
  };

  /* ── Tes données ── */
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const doLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const closeDelete = () => { setDeleteOpen(false); setDeleteConfirm(''); setDeletePassword(''); setDeleteError(null); };
  const canDelete = deleteConfirm === user?.username && (!hasPassword || !!deletePassword) && !deleting;

  const deleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyAccount(hasPassword ? deletePassword : undefined);
      // Le serveur a déjà révoqué les sessions : on efface les jetons locaux et on repart à l'accueil.
      await logout().catch(() => undefined);
      navigate('/');
    } catch (err) {
      setDeleteError(apiData(err)?.error || t('La suppression a échoué. Réessaie.'));
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <CardLink to={`/profile/${user.username}/edit`}>
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft" aria-hidden>
            <UserPen className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-ink group-hover:underline">{t('Photo, présentation, identité, niveau et objectifs')}</span>
            <span className="mt-0.5 block text-[12.5px] text-ink-faint">{t('Tout ce qui te décrit se modifie sur « Modifier mon profil ».')}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
        </span>
      </CardLink>

      {/* ── Compte et sécurité ── */}
      <Section id="compte" title={t('Compte et sécurité')}>
        <Card>
          <Row title={t('Pseudo')} hint={t('Ton nom public sur Fidni : 3 à 30 caractères (lettres, chiffres, « . », « _ » ou « - »).')}>
            <form onSubmit={saveName} className="mt-3 flex flex-col gap-3">
              <label htmlFor="settings-username" className="sr-only">{t('Pseudo')}</label>
              <input id="settings-username" value={name} autoComplete="username" maxLength={30}
                onChange={(e) => { setName(e.target.value); setNameMsg(null); }}
                aria-invalid={nameChanged && !nameValid} className={inputCls} />
              {nameChanged && newName && !nameValid && (
                <p className="text-[12.5px] text-[#a23b34]">{t('Ce pseudo n’est pas valable : 3 à 30 caractères, sans espace ni accent.')}</p>
              )}
              {/* Les boutons n'apparaissent qu'une fois le pseudo modifié (comme pour l'e-mail). */}
              {nameChanged && (
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={!nameValid || nameBusy} className="fd-btn-primary min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-50">
                    {nameBusy && <Loader2 className="h-4 w-4 animate-spin" />} {t('Changer de pseudo')}
                  </button>
                  <button type="button" className="fd-btn-ghost min-h-11" onClick={() => { setName(user.username); setNameMsg(null); }}>
                    {t('Annuler')}
                  </button>
                </div>
              )}
            </form>
            <Note msg={nameMsg} onClose={() => setNameMsg(null)} />
          </Row>

          <Row title={t('Adresse e-mail')}
            hint={hasPassword ? t('Pour te connecter et recevoir tes notifications. Une nouvelle adresse est à confirmer par un lien.')
              : t('Pour changer d’adresse, définis d’abord un mot de passe ci-dessous.')}>
            <form onSubmit={saveEmail} className="mt-3 flex flex-col gap-3">
              <label htmlFor="settings-email" className="sr-only">{t('Adresse e-mail')}</label>
              <input id="settings-email" type="email" value={email} autoComplete="email" disabled={!hasPassword}
                onChange={(e) => { setEmail(e.target.value); setEmailMsg(null); }} placeholder={t('ton.email@exemple.com')} className={inputCls} />
              {hasPassword && emailChanged && (
                <>
                  <PasswordInput id="settings-email-password" label={t('Ton mot de passe actuel')} value={emailPassword}
                    onChange={setEmailPassword} autoComplete="current-password" />
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" disabled={emailBusy || !newEmail} className="fd-btn-primary min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-50">
                      {emailBusy && <Loader2 className="h-4 w-4 animate-spin" />} {t('Changer d’adresse')}
                    </button>
                    <button type="button" className="fd-btn-ghost min-h-11" onClick={() => { setEmail(user.email ?? ''); setEmailPassword(''); setEmailMsg(null); }}>
                      {t('Annuler')}
                    </button>
                  </div>
                </>
              )}
            </form>
            <Note msg={emailMsg} onClose={() => setEmailMsg(null)} />
          </Row>

          {googleLinked && (
            <Row title={t('Connecté avec Google')}
              hint={hasPassword
                ? t('Tu te connectes avec « Continuer avec Google ». Ton e-mail (ou ton pseudo) et ton mot de passe marchent aussi.')
                : t('Tu te connectes avec « Continuer avec Google ». Ton compte n’a pas encore de mot de passe : tu peux en définir un ci-dessous.')}
              aside={<span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[12px] font-semibold text-brand-hover"><Check className="h-3.5 w-3.5" /> {t('Relié')}</span>} />
          )}

          {/* Mot de passe. Compte sans mot de passe (créé avec Google) : le premier se définit par un lien
              reçu par e-mail, comme « Mot de passe oublié » — une session restée ouverte ne suffit pas. */}
          {hasPassword ? (
            <Row title={t('Mot de passe')} hint={t('Au moins 8 caractères. Tes autres appareils seront déconnectés.')}
              aside={!pwOpen ? (
                <button type="button" className="fd-btn-ghost min-h-10" onClick={() => { setPwOpen(true); setPwMsg(null); }}>
                  <KeyRound className="h-4 w-4" /> {t('Changer mon mot de passe')}
                </button>
              ) : undefined}>
              {pwOpen && (
                <form onSubmit={savePassword} className="mt-3 flex flex-col gap-3">
                  <PasswordInput id="settings-current-password" label={t('Mot de passe actuel')} value={pw.current} autoFocus
                    onChange={(v) => setPw((s) => ({ ...s, current: v }))} autoComplete="current-password" />
                  <PasswordInput id="settings-new-password" label={t('Nouveau mot de passe')} value={pw.next}
                    onChange={(v) => setPw((s) => ({ ...s, next: v }))} autoComplete="new-password" />
                  <PasswordInput id="settings-confirm-password" label={t('Nouveau mot de passe, encore une fois')} value={pw.confirm}
                    onChange={(v) => setPw((s) => ({ ...s, confirm: v }))} autoComplete="new-password" />
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" disabled={pwBusy || !pw.current || !pw.next} className="fd-btn-primary min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-50">
                      {pwBusy && <Loader2 className="h-4 w-4 animate-spin" />} {t('Changer le mot de passe')}
                    </button>
                    <button type="button" className="fd-btn-ghost min-h-11" onClick={() => { setPwOpen(false); setPw({ current: '', next: '', confirm: '' }); setPwMsg(null); }}>
                      {t('Annuler')}
                    </button>
                  </div>
                </form>
              )}
              <Note msg={pwMsg} onClose={() => setPwMsg(null)} />
            </Row>
          ) : (
            <Row title={t('Définir un mot de passe')}
              hint={googleLinked ? (
                <>{t('Ton compte a été créé avec Google. Un mot de passe te permet aussi de te connecter avec ton e-mail (ou ton pseudo), et de changer d’adresse. Pour le choisir, on t’envoie un lien à')} <b className="break-words font-semibold text-ink-soft">{user.email}</b>.</>
              ) : (
                // Sans compte Google, le lien « Mot de passe oublié » n'est pas envoyé (rien ne prouve l'adresse).
                <>{t('Ton compte n’a pas de mot de passe. Pour en obtenir un, écris à')}{' '}
                  <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold text-brand-hover underline">{LEGAL.contactEmail}</a>.</>
              )}
              aside={googleLinked && linkState !== 'sent' ? (
                <button type="button" onClick={sendSetPasswordLink} disabled={linkState === 'sending' || !user.email}
                  className="fd-btn-primary min-h-10 disabled:cursor-not-allowed disabled:opacity-50">
                  {linkState === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {linkState === 'sending' ? t('Envoi…') : t('Définir un mot de passe')}
                </button>
              ) : undefined}>
              {linkState === 'sent' && (
                <Note msg={{ kind: 'info', text: t('On t’a envoyé un lien par e-mail pour définir ton mot de passe. Pense à regarder dans les spams. Une fois le mot de passe choisi, reconnecte-toi.') }} />
              )}
              <Note msg={pwMsg} onClose={() => setPwMsg(null)} />
            </Row>
          )}
        </Card>
      </Section>

      {/* ── Préférences ── */}
      <Section id="preferences" title={t('Préférences')}
        action={prefState === 'saved' ? <span role="status" className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand-hover"><Check className="h-4 w-4" /> {t('Enregistré')}</span>
          : prefState === 'saving' ? <span className="inline-flex min-h-10 items-center gap-1.5 text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /> {t('Enregistrement…')}</span>
            : undefined}>
        <Card>
          {NOTIFS.map((n) => {
            const on = notifs[n.key];
            const disabled = n.key !== 'email_notifications' && !notifs.email_notifications;
            return (
              <button key={n.key} type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => toggleNotif(n.key)}
                className="flex min-h-[60px] w-full items-center gap-4 px-4 py-3 text-start transition-colors hover:bg-[#fcfbf9] focus:outline-none focus-visible:bg-[#f7f6f3] disabled:cursor-not-allowed disabled:opacity-50 sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink">{t(n.title)}</span>
                  <span className="mt-0.5 block text-[12.5px] text-ink-faint">{t(n.hint)}</span>
                </span>
                <span className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${on ? 'bg-brand' : 'bg-[#d8d4cc]'}`} aria-hidden>
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'}`} />
                </span>
              </button>
            );
          })}
          {prefState === 'error' && (
            <div className="px-4 pb-4 sm:px-5">
              <Note msg={{ kind: 'error', text: t('Ce réglage n’a pas pu être enregistré. Réessaie.') }} onClose={() => setPrefState('idle')} />
            </div>
          )}
          <Row title={t('Thème')} hint={t('L’apparence de Fidni sur cet appareil.')}>
            <div role="radiogroup" aria-label={t('Thème')} className="mt-3 grid grid-cols-3 gap-2">
              {THEMES.map((th) => {
                const active = theme === th.id;
                const Icon = th.icon;
                return (
                  <button key={th.id} type="button" role="radio" aria-checked={active} onClick={() => setTheme(th.id)}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-[13.5px] font-semibold transition-colors ${
                      active ? 'border-brand bg-brand-soft text-brand-hover' : 'border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`}>
                    <Icon className="h-4 w-4" aria-hidden /> {t(th.label)}
                  </button>
                );
              })}
            </div>
          </Row>
          <Row title={t('Langue de l’interface')} hint={t('Les exercices, cours et devoirs restent en français.')}>
            <div role="radiogroup" aria-label={t('Langue de l’interface')} className="mt-3 grid grid-cols-2 gap-2">
              {([['fr', 'Français'], ['ar', 'العربية']] as const).map(([code, label]) => {
                const active = lang === code;
                return (
                  <button key={code} type="button" role="radio" aria-checked={active} onClick={() => setLang(code)}
                    lang={code}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-[13.5px] font-semibold transition-colors ${
                      active ? 'border-brand bg-brand-soft text-brand-hover' : 'border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`}>
                    {label}
                  </button>
                );
              })}
            </div>
          </Row>
        </Card>
      </Section>

      {/* ── Tes données ── */}
      <Section id="donnees" title={t('Tes données')}>
        <Card>
          <Row title={t('Se déconnecter')} hint={t('Sur cet appareil seulement.')}
            aside={<button type="button" onClick={() => setLogoutOpen(true)} className="fd-btn-ghost min-h-10"><LogOut className="h-4 w-4" /> {t('Se déconnecter')}</button>} />
          <Row title={t('Supprimer mon compte')}
            hint={t('Irréversible : ton profil, ta progression et tes fichiers sont effacés. Tes publications restent visibles, sous le nom « Compte supprimé ».')}
            aside={(
              <button type="button" onClick={() => setDeleteOpen(true)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border border-[#f0d5d1] bg-[#fbecea] px-3.5 text-[13px] font-semibold text-[#a23b34] transition-colors hover:border-[#a23b34]">
                <Trash2 className="h-4 w-4" /> {t('Supprimer mon compte')}
              </button>
            )} />
        </Card>
      </Section>

      {logoutOpen && (
        <Dialog id="deconnexion-titre" title={t('Se déconnecter ?')} onClose={() => setLogoutOpen(false)}>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-faint">{t('Tu devras te reconnecter pour retrouver ton compte sur cet appareil.')}</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" autoFocus onClick={() => setLogoutOpen(false)} className="fd-btn-ghost min-h-11 flex-1 justify-center">{t('Annuler')}</button>
            <button type="button" onClick={doLogout}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white hover:bg-black">
              <LogOut className="h-4 w-4" /> {t('Se déconnecter')}
            </button>
          </div>
        </Dialog>
      )}

      {deleteOpen && (
        <Dialog id="suppression-titre" title={t('Supprimer ton compte ?')} onClose={closeDelete}>
          <form onSubmit={deleteAccount}>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-faint">
              {t('C’est irréversible. Ton profil, ta progression, tes favoris, tes cahiers, tes listes de révision et tes fichiers seront définitivement effacés.')}
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-faint">
              {t('Les exercices, commentaires et solutions que tu as publiés resteront en ligne pour les autres élèves, sous le nom « Compte supprimé ».')}
            </p>
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] p-3.5">
              <div>
                <label htmlFor="suppression-pseudo" className="mb-1.5 block text-[13px] text-[#a23b34]">
                  {t('Pour confirmer, recopie')} <b className="font-semibold">{user.username}</b> :
                </label>
                <input id="suppression-pseudo" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} autoFocus
                  autoComplete="off" className={inputCls} />
              </div>
              {/* Compte créé avec Google, sans mot de passe : le pseudo recopié suffit. */}
              {hasPassword && (
                <div>
                  <label htmlFor="suppression-mdp" className="mb-1.5 block text-[13px] text-[#a23b34]">{t('Ton mot de passe :')}</label>
                  <input id="suppression-mdp" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                    autoComplete="current-password" className={inputCls} />
                </div>
              )}
              {deleteError && <p role="alert" className="text-[13px] font-medium text-[#a23b34]">{deleteError}</p>}
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={closeDelete} className="fd-btn-ghost min-h-11 flex-1 justify-center">{t('Annuler')}</button>
              <button type="submit" disabled={!canDelete}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[#a23b34] px-4 text-[13px] font-semibold text-white hover:bg-[#8a312b] disabled:cursor-not-allowed disabled:opacity-50">
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />} {deleting ? t('Suppression…') : t('Supprimer définitivement')}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};

export default SettingsSection;
