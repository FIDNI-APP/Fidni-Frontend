/**
 * Accueil de l'application, connexion, inscription, mot de passe oublié. Mêmes règles et mêmes appels que la
 * fenêtre de connexion du site (components/auth/AuthModal.tsx) : connexion par e-mail ou pseudo, confirmation de
 * l'adresse avant la première connexion, cases RGPD, compte Google (Android).
 */
import React, { useEffect, useState } from 'react';
import {
  IonButton, IonCheckbox, IonContent, IonIcon, IonInput, IonInputPasswordToggle, IonSpinner, IonText,
  useIonViewWillEnter, useIonViewWillLeave,
} from '@ionic/react';
import { logoGoogle, mailOpenOutline } from 'ionicons/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { requestPasswordReset, resendVerification, type SignupConsents } from '@/lib/api/authApi';
import { googleSignInAvailable, nativeGoogleCredential } from '@/lib/googleAuth';
import { openExternal, publicUrl, setSystemBars, syncSystemBars } from '@/lib/native';
import { t } from '@/i18n';
import { useNav } from '../nav';
import { Screen, apiMessage, haptic } from '../ui';

const LOGO = '/android-chrome-512x512.png';

/** Premier écran : la marque, puis créer un compte, se connecter ou découvrir sans compte. */
export function Welcome({ onGuest }: { onGuest: () => void }) {
  const nav = useNav();
  const { effectiveTheme } = useTheme();
  // Barre d'état verte sur l'écran vert ; les couleurs du thème reviennent en le quittant. Premier écran de sa pile :
  // ionViewWillEnter ne passe pas à l'ouverture, d'où l'effet au montage.
  useEffect(() => setSystemBars('#1a7a4a', true), []);
  useIonViewWillEnter(() => setSystemBars('#1a7a4a', true));
  useIonViewWillLeave(() => syncSystemBars(effectiveTheme));
  return (
    <>
      <IonContent fullscreen scrollY={false}>
        <div style={{
          minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '0 28px',
          background: 'linear-gradient(170deg, #1f8a55 0%, #14583a 100%)', color: '#fff',
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <img src={LOGO} alt="" style={{ width: 150, height: 150, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.25))' }} />
            <div className="fdm-title" style={{ fontSize: 44, fontWeight: 700, marginTop: 14, letterSpacing: '0.02em' }}>FIDNI</div>
            <p style={{ fontSize: 18, lineHeight: 1.45, opacity: .92, margin: '10px 0 0', maxWidth: 300 }}>
              {t('Les maths du lycée, étape par étape : exercices corrigés, cours, devoirs et quiz.')}
            </p>
          </div>
          <div style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}>
            <IonButton expand="block" shape="round" size="large" color="light"
              style={{ '--color': '#14583a', fontWeight: 700 } as React.CSSProperties}
              onClick={() => { haptic.tap(); nav.push(() => <Signup />); }}>
              {t('Créer un compte gratuit')}
            </IonButton>
            <IonButton expand="block" shape="round" size="large" fill="outline"
              style={{ '--color': '#fff', '--border-color': 'rgba(255,255,255,.6)', marginTop: 10, fontWeight: 600 } as React.CSSProperties}
              onClick={() => { haptic.tap(); nav.push(() => <Login />); }}>
              {t('J’ai déjà un compte')}
            </IonButton>
            <IonButton expand="block" fill="clear" style={{ '--color': 'rgba(255,255,255,.85)', marginTop: 4 } as React.CSSProperties}
              onClick={onGuest}>
              {t('Découvrir sans compte')}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </>
  );
}

function FormError({ text }: { text: string }) {
  if (!text) return null;
  return <IonText color="danger"><p style={{ fontSize: 14, margin: '12px 4px 0' }}>{text}</p></IonText>;
}

const field: React.CSSProperties = { marginTop: 14 };

/** « Continuer avec Google » (Android) : jeton → session ; nouveau compte → écran des conditions. */
function GoogleLogin() {
  const { loginWithGoogle } = useAuth();
  const nav = useNav();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!googleSignInAvailable) return null;

  const start = async () => {
    setError('');
    setBusy(true);
    try {
      const credential = await nativeGoogleCredential();
      if (!credential) return;
      try {
        await loginWithGoogle(credential);
        haptic.success();
      } catch (err) {
        const data = (err as { response?: { data?: { code?: string; email?: string; name?: string } } }).response?.data;
        if (data?.code === 'consent_required') nav.push(() => <GoogleConsent credential={credential} email={data.email || ''} name={data.name || ''} />);
        else setError(apiMessage(err, t('La connexion avec Google a échoué. Réessaie.')));
      }
    } catch {
      setError(t('La connexion avec Google a échoué. Réessaie.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <IonButton expand="block" shape="round" fill="outline" color="medium" onClick={start} disabled={busy}
        style={{ marginTop: 6, '--color': 'var(--ion-text-color)' } as React.CSSProperties}>
        {busy ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={logoGoogle} />{t('Continuer avec Google')}</>}
      </IonButton>
      <FormError text={error} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 4px', color: 'var(--fdm-muted)', fontSize: 13 }}>
        <span style={{ flex: 1, height: 1, background: 'var(--fdm-line)' }} />{t('ou')}<span style={{ flex: 1, height: 1, background: 'var(--fdm-line)' }} />
      </div>
    </>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNav();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState('');

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!identifier.trim() || !password) return;
    setBusy(true);
    setError('');
    setUnverified('');
    try {
      await login(identifier, password);
      haptic.success();
    } catch (err) {
      const data = (err as { response?: { data?: { code?: string; email?: string } } }).response?.data;
      if (data?.code === 'email_not_verified') {
        setUnverified(data.email || identifier);
        setError(t('Confirme ton adresse e-mail pour te connecter.'));
      } else {
        setError(apiMessage(err, t('Échec de la connexion. Réessaie.')));
      }
      haptic.warning();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t('Connexion')}>
      <form onSubmit={submit} style={{ padding: '22px 20px' }}>
        <h1 className="fdm-large-title" style={{ margin: '4px 0 6px' }}>{t('Content de te revoir')}</h1>
        <p className="fdm-muted" style={{ margin: '0 0 18px', fontSize: 15 }}>{t('Connecte-toi pour retrouver ta progression.')}</p>
        <GoogleLogin />
        <IonInput style={field} fill="outline" labelPlacement="floating" label={t('E-mail ou nom d’utilisateur')}
          value={identifier} onIonInput={(e) => setIdentifier(String(e.detail.value ?? ''))}
          autocomplete="username" inputmode="email" autocapitalize="off" />
        <IonInput style={field} fill="outline" labelPlacement="floating" label={t('Mot de passe')} type="password"
          value={password} onIonInput={(e) => setPassword(String(e.detail.value ?? ''))} autocomplete="current-password"
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}>
          <IonInputPasswordToggle slot="end" />
        </IonInput>
        <FormError text={error} />
        {unverified && (
          <IonButton fill="clear" size="small" onClick={async () => {
            await resendVerification(unverified).catch(() => undefined);
            setError(t('Si un compte existe, un nouveau lien de confirmation vient d’être envoyé.'));
          }}>{t('Renvoyer le lien de confirmation')}</IonButton>
        )}
        <IonButton type="submit" expand="block" shape="round" size="large" style={{ marginTop: 22 }} disabled={busy}>
          {busy ? <IonSpinner name="crescent" /> : t('Se connecter')}
        </IonButton>
        <IonButton expand="block" fill="clear" onClick={() => nav.push(() => <ForgotPassword initial={identifier.includes('@') ? identifier : ''} />)}>
          {t('Mot de passe oublié ?')}
        </IonButton>
      </form>
    </Screen>
  );
}

/** Les deux cases de l'inscription (non cochées d'avance), liens vers les textes complets. */
function Consents({ value, onChange }: { value: SignupConsents; onChange: (v: SignupConsents) => void }) {
  const link = (path: string, label: string) => (
    <a href={publicUrl(path)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openExternal(publicUrl(path)); }}
      style={{ color: 'var(--ion-color-primary)' }}>{label}</a>
  );
  const row: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 16, fontSize: 14, lineHeight: 1.45 };
  return (
    <>
      <label style={row}>
        <IonCheckbox checked={value.accept_terms} onIonChange={(e) => onChange({ ...value, accept_terms: e.detail.checked })} />
        <span>{t('J’accepte les')} {link('/terms-of-service', t('conditions d’utilisation'))} {t('et la')} {link('/privacy-policy', t('politique de confidentialité'))}.</span>
      </label>
      <label style={row}>
        <IonCheckbox checked={value.age_ok} onIonChange={(e) => onChange({ ...value, age_ok: e.detail.checked })} />
        <span>{t('J’ai 15 ans ou plus, ou un parent est d’accord.')}</span>
      </label>
    </>
  );
}

export function Signup() {
  const { register } = useAuth();
  const nav = useNav();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consents, setConsents] = useState<SignupConsents>({ accept_terms: false, age_ok: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!consents.accept_terms) { setError(t('Accepte les conditions d’utilisation et la politique de confidentialité pour créer ton compte.')); return; }
    if (!consents.age_ok) { setError(t('Coche la case sur l’âge : si tu as moins de 15 ans, demande d’abord l’accord d’un parent.')); return; }
    setBusy(true);
    setError('');
    try {
      const res = await register(username.trim(), email.trim(), password, consents);
      haptic.success();
      nav.push(() => <CheckEmail email={res?.email || email.trim()} failed={res?.detail === 'verification_email_failed'} />);
    } catch (err) {
      setError(apiMessage(err, t('Échec de l’inscription. Réessaie.')));
      haptic.warning();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t('Inscription')}>
      <form onSubmit={submit} style={{ padding: '22px 20px' }}>
        <h1 className="fdm-large-title" style={{ margin: '4px 0 6px' }}>{t('Crée ton compte')}</h1>
        <p className="fdm-muted" style={{ margin: '0 0 18px', fontSize: 15 }}>{t('Gratuit, en moins d’une minute.')}</p>
        <GoogleLogin />
        <IonInput style={field} fill="outline" labelPlacement="floating" label={t('Nom d’utilisateur')}
          value={username} onIonInput={(e) => setUsername(String(e.detail.value ?? ''))} autocapitalize="off" autocomplete="username" />
        <IonInput style={field} fill="outline" labelPlacement="floating" label={t('E-mail')} type="email" inputmode="email"
          value={email} onIonInput={(e) => setEmail(String(e.detail.value ?? ''))} autocomplete="email" />
        <IonInput style={field} fill="outline" labelPlacement="floating" label={t('Mot de passe')} type="password"
          helperText={t('8 caractères au moins')} value={password} onIonInput={(e) => setPassword(String(e.detail.value ?? ''))}
          autocomplete="new-password">
          <IonInputPasswordToggle slot="end" />
        </IonInput>
        <Consents value={consents} onChange={setConsents} />
        <FormError text={error} />
        <IonButton type="submit" expand="block" shape="round" size="large" style={{ marginTop: 22 }}
          disabled={busy || !username.trim() || !email.trim() || password.length < 8}>
          {busy ? <IonSpinner name="crescent" /> : t('Créer mon compte')}
        </IonButton>
      </form>
    </Screen>
  );
}

/** Compte créé : il reste à cliquer le lien reçu par e-mail. */
function CheckEmail({ email, failed }: { email: string; failed: boolean }) {
  const nav = useNav();
  const [msg, setMsg] = useState('');
  return (
    <Screen title={t('Confirme ton adresse')}>
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <IonIcon icon={mailOpenOutline} style={{ fontSize: 64, color: 'var(--ion-color-primary)' }} />
        <h1 className="fdm-title" style={{ fontSize: 26, margin: '16px 0 8px' }}>{t('Vérifie ta boîte mail')}</h1>
        <p className="fdm-muted" style={{ fontSize: 15, lineHeight: 1.5 }}>
          {failed ? t('Ton compte est créé, mais l’e-mail n’a pas pu partir. Renvoie le lien ci-dessous.')
            : t('Nous avons envoyé un lien de confirmation à {email}. Ouvre-le, puis connecte-toi.', { email })}
        </p>
        <IonButton expand="block" shape="round" style={{ marginTop: 24 }} onClick={() => { nav.pop(); nav.push(() => <Login />); }}>
          {t('Se connecter')}
        </IonButton>
        <IonButton expand="block" fill="clear" onClick={async () => {
          await resendVerification(email).catch(() => undefined);
          setMsg(t('Si un compte existe, un nouveau lien de confirmation vient d’être envoyé.'));
        }}>{t('Renvoyer le lien')}</IonButton>
        {msg && <p className="fdm-muted" style={{ fontSize: 13 }}>{msg}</p>}
      </div>
    </Screen>
  );
}

function ForgotPassword({ initial }: { initial: string }) {
  const [email, setEmail] = useState(initial);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Screen title={t('Mot de passe oublié')}>
      <div style={{ padding: '22px 20px' }}>
        {sent ? (
          <div style={{ textAlign: 'center', paddingTop: 30 }}>
            <IonIcon icon={mailOpenOutline} style={{ fontSize: 60, color: 'var(--ion-color-primary)' }} />
            <p style={{ fontSize: 16, lineHeight: 1.5 }}>{t('Si un compte existe avec cette adresse, tu vas recevoir un lien pour choisir un nouveau mot de passe.')}</p>
          </div>
        ) : (
          <>
            <p className="fdm-muted" style={{ fontSize: 15, marginTop: 0 }}>{t('Indique ton adresse e-mail : nous t’envoyons un lien pour choisir un nouveau mot de passe.')}</p>
            <IonInput style={field} fill="outline" labelPlacement="floating" label={t('E-mail')} type="email" inputmode="email"
              value={email} onIonInput={(e) => setEmail(String(e.detail.value ?? ''))} />
            <IonButton expand="block" shape="round" size="large" style={{ marginTop: 22 }} disabled={busy || !email.includes('@')}
              onClick={async () => {
                setBusy(true);
                await requestPasswordReset(email).catch(() => undefined);
                setBusy(false);
                setSent(true);
              }}>
              {busy ? <IonSpinner name="crescent" /> : t('Envoyer le lien')}
            </IonButton>
          </>
        )}
      </div>
    </Screen>
  );
}

/** Nouveau compte Google : les deux cases, puis le même jeton renvoyé au serveur. */
function GoogleConsent({ credential, email, name }: { credential: string; email: string; name: string }) {
  const { loginWithGoogle } = useAuth();
  const [consents, setConsents] = useState<SignupConsents>({ accept_terms: false, age_ok: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Screen title={t('Encore une chose')}>
      <div style={{ padding: '22px 20px' }}>
        <p style={{ fontSize: 16, lineHeight: 1.5, marginTop: 0 }}>
          {name ? <>{t('Bienvenue,')} <strong>{name}</strong> ! </> : null}
          {t('Pour utiliser Fidni avec ton adresse Google')} {email && <strong>{email}</strong>}{t(', coche d’abord les deux cases.')}
        </p>
        <Consents value={consents} onChange={setConsents} />
        <FormError text={error} />
        <IonButton expand="block" shape="round" size="large" style={{ marginTop: 22 }}
          disabled={busy || !consents.accept_terms || !consents.age_ok}
          onClick={async () => {
            setBusy(true);
            setError('');
            try { await loginWithGoogle(credential, consents); haptic.success(); } catch (err) { setError(apiMessage(err, t('La connexion avec Google a échoué. Réessaie.'))); } finally { setBusy(false); }
          }}>
          {busy ? <IonSpinner name="crescent" /> : t('Continuer')}
        </IonButton>
      </div>
    </Screen>
  );
}
