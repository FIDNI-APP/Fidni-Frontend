/**
 * Onglet « Profil » : mon compte, mes favoris, les autres espaces du site (quiz, classes, cahiers, concours,
 * documents, Pilotage — ouverts dans la version complète en attendant leurs écrans), réglages, déconnexion.
 */
import { IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonToggle, useIonAlert } from '@ionic/react';
import {
  bookmarkOutline, bookOutline, briefcaseOutline, documentTextOutline, helpCircleOutline, languageOutline, logOutOutline,
  moonOutline, peopleOutline, personOutline, settingsOutline, shieldCheckmarkOutline, speedometerOutline, trophyOutline,
} from 'ionicons/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getUserSavedExams, getUserSavedExercises, getUserSavedLessons } from '@/lib/api/userApi';
import { isTeacherOrAdmin } from '@/lib/features';
import { openExternal, publicUrl } from '@/lib/native';
import { t, useLang } from '@/i18n';
import { useNav } from '../nav';
import { useSession } from '../session';
import { Empty, ErrorState, Loading, Screen, StatusChip, haptic, useLoad } from '../ui';
import { ContentScreen, type ContentKind } from './ContentScreen';

export function ProfileRoot() {
  const { user, isAuthenticated, logout } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();
  const { lang, setLang } = useLang();
  const { setGuest, openWeb } = useSession();
  const nav = useNav();
  const [confirm] = useIonAlert();
  const teacher = user?.profile?.user_type === 'teacher';
  const admin = !!user?.is_superuser || !!(user as { is_staff?: boolean } | null)?.is_staff;
  const level = user?.profile?.class_level_name;

  const row = (icon: string, label: string, onClick: () => void, note?: string) => (
    <IonItem button detail onClick={() => { haptic.tap(); onClick(); }}>
      <IonIcon slot="start" icon={icon} color="primary" />
      <IonLabel>{label}</IonLabel>
      {note && <IonNote slot="end">{note}</IonNote>}
    </IonItem>
  );

  return (
    <Screen title={t('Profil')} back={false} large>
      {isAuthenticated && user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px 6px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 32, display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 700,
            background: 'var(--fdm-brand-soft)', color: 'var(--ion-color-primary)',
          }}>{(user.first_name || user.username || '?').slice(0, 1).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div className="fdm-title" style={{ fontSize: 22, fontWeight: 600 }}>
              {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}
            </div>
            <div className="fdm-muted" style={{ fontSize: 14 }}>@{user.username}{level ? ` · ${level}` : teacher ? ` · ${t('Professeur')}` : ''}</div>
          </div>
        </div>
      ) : (
        <div className="fdm-card" style={{ margin: '14px 16px 0', padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{t('Tu découvres FIDNI sans compte')}</div>
          <p className="fdm-muted" style={{ margin: '6px 0 10px', fontSize: 14 }}>{t('Crée un compte gratuit pour garder ta progression sur tous tes appareils.')}</p>
          <button type="button" onClick={() => setGuest(false)} style={{ color: 'var(--ion-color-primary)', fontWeight: 700, fontSize: 15 }}>
            {t('Créer un compte ou se connecter')}
          </button>
        </div>
      )}

      {isAuthenticated && (
        <IonList inset>
          {row(bookmarkOutline, t('Mes favoris'), () => nav.push(() => <SavedScreen />))}
          {row(helpCircleOutline, t('Quiz par chapitre'), () => openWeb('/skill-iq'))}
          {row(bookOutline, t('Mes cahiers'), () => openWeb('/enregistrements?onglet=cahiers'))}
          {row(peopleOutline, t('Classes'), () => openWeb('/classrooms'))}
          {row(trophyOutline, t('Concours'), () => openWeb('/concours'))}
          {isTeacherOrAdmin(user) && row(documentTextOutline, t('Mes documents'), () => openWeb('/documents'))}
          {admin && row(speedometerOutline, t('Pilotage'), () => openWeb('/pilotage'))}
        </IonList>
      )}

      <IonList inset>
        <IonListHeader><IonLabel>{t('Réglages')}</IonLabel></IonListHeader>
        <IonItem>
          <IonIcon slot="start" icon={moonOutline} color="primary" />
          <IonToggle checked={effectiveTheme === 'dark'} onIonChange={(e) => { haptic.tap(); setTheme(e.detail.checked ? 'dark' : 'light'); }}>
            {t('Mode sombre')}
          </IonToggle>
        </IonItem>
        {row(languageOutline, t('Langue'), () => void setLang(lang === 'ar' ? 'fr' : 'ar'), lang === 'ar' ? 'العربية' : 'Français')}
        {isAuthenticated && user && row(personOutline, t('Modifier mon profil'), () => openWeb(`/profile/${user.username}/edit`))}
        {isAuthenticated && user && row(settingsOutline, t('Compte et confidentialité'), () => openWeb(`/profile/${user.username}?tab=settings`))}
      </IonList>

      <IonList inset>
        {row(shieldCheckmarkOutline, t('Politique de confidentialité'), () => openExternal(publicUrl('/privacy-policy')))}
        {row(briefcaseOutline, t('Conditions d’utilisation'), () => openExternal(publicUrl('/terms-of-service')))}
        {isAuthenticated && (
          <IonItem button onClick={() => void confirm({
            header: t('Se déconnecter ?'),
            buttons: [{ text: t('Annuler'), role: 'cancel' }, { text: t('Se déconnecter'), role: 'destructive', handler: () => { void logout(); } }],
          })}>
            <IonIcon slot="start" icon={logOutOutline} color="danger" />
            <IonLabel color="danger">{t('Se déconnecter')}</IonLabel>
          </IonItem>
        )}
      </IonList>
      <p className="fdm-muted" style={{ textAlign: 'center', fontSize: 12 }}>FIDNI · fidni.fr</p>
    </Screen>
  );
}

type Saved = { id: number; title: string; user_complete?: 'success' | 'review' | null };
const asList = (r: unknown): Saved[] => (Array.isArray(r) ? r : ((r as { results?: Saved[] })?.results ?? [])) as Saved[];

function SavedScreen() {
  const { user } = useAuth();
  const nav = useNav();
  const saved = useLoad(async () => {
    const u = user!.username;
    const [ex, exams, lessons] = await Promise.all([getUserSavedExercises(u), getUserSavedExams(u), getUserSavedLessons(u)]);
    return ([['exercise', ex], ['exam', exams], ['lesson', lessons]] as [ContentKind, unknown][])
      .flatMap(([kind, r]) => asList(r).map((x) => ({ ...x, kind })));
  }, [user?.username]);
  return (
    <Screen title={t('Mes favoris')} onRefresh={saved.reload}>
      {saved.loading && !saved.data && <Loading />}
      {saved.error && !saved.data ? <ErrorState onRetry={saved.reload} /> : null}
      {saved.data && !saved.data.length && <Empty icon={bookmarkOutline} title={t('Aucun favori')} text={t('Touche le signet d’un exercice pour le retrouver ici.')} />}
      <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(saved.data ?? []).map((x) => (
          <button key={`${x.kind}-${x.id}`} type="button" className="fdm-card fdm-pressable" onClick={() => nav.push(() => <ContentScreen id={x.id} kind={x.kind} />)}
            style={{ padding: '14px 16px', textAlign: 'start', color: 'inherit' }}>
            <div className="fdm-muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {x.kind === 'lesson' ? t('Leçon') : x.kind === 'exam' ? t('Devoir') : t('Exercice')}
            </div>
            <div style={{ fontWeight: 600, marginTop: 3 }}>{x.title}</div>
            <div style={{ marginTop: 6 }}><StatusChip value={x.user_complete} /></div>
          </button>
        ))}
      </div>
    </Screen>
  );
}
