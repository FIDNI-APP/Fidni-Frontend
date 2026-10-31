/**
 * Premier lancement d'un compte tout neuf : élève ou prof, niveau, puis l'identité obligatoire (mêmes règles que
 * le site : lib/identity.ts, POST /api/onboarding/ comme pages/OnboardingProfile.tsx).
 */
import React, { useEffect, useState } from 'react';
import {
  IonButton, IonContent, IonFooter, IonHeader, IonInput, IonItem, IonLabel, IonList, IonPage, IonProgressBar, IonRadio,
  IonRadioGroup, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/react';
import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding, getClassLevels, getSubjects, searchSchools } from '@/lib/api';
import { identityError, identityFromUser, identityPayload, type Gender, type IdentityValue } from '@/lib/identity';
import type { ClassLevelModel } from '@/types';
import { t } from '@/i18n';
import { apiMessage, haptic } from '../ui';

type School = { id: number; name: string; city?: string };

export function Onboarding() {
  const { user, refreshUser, logout } = useAuth();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<'student' | 'teacher'>(user?.profile?.user_type === 'teacher' ? 'teacher' : 'student');
  const [levels, setLevels] = useState<ClassLevelModel[]>([]);
  const [level, setLevel] = useState<string>('');
  const [teaching, setTeaching] = useState<string[]>([]);
  const [identity, setIdentity] = useState<IdentityValue>(() => identityFromUser(user));
  const [schoolQuery, setSchoolQuery] = useState(identity.school.name);
  const [schools, setSchools] = useState<School[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getClassLevels().then(setLevels).catch(() => setLevels([])); }, []);
  useEffect(() => {
    if (identity.school.id !== null || schoolQuery.trim().length < 2) { setSchools([]); return; }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      searchSchools(schoolQuery.trim(), ctrl.signal).then((r) => setSchools(r as School[])).catch(() => undefined);
    }, 250);
    return () => { window.clearTimeout(timer); ctrl.abort(); };
  }, [schoolQuery, identity.school.id]);

  const set = (patch: Partial<IdentityValue>) => setIdentity((v) => ({ ...v, ...patch }));
  const canNext = step === 0 || (step === 1 && (role === 'teacher' ? teaching.length > 0 : !!level));

  const submit = async () => {
    const problem = identityError(identity);
    if (problem) { setError(problem); haptic.warning(); return; }
    setBusy(true);
    setError('');
    try {
      const levelIds = role === 'teacher' ? teaching : [level];
      const subjects = await getSubjects(levelIds).catch(() => []);
      const subjectIds = subjects.length === 1 ? [String(subjects[0].id)] : subjects.map((s) => String(s.id));
      const payload: Record<string, unknown> = { user_type: role, ...identityPayload(identity) };
      if (role === 'teacher') { payload.teaching_class_levels = teaching; payload.teaching_subjects = subjectIds; }
      else { payload.class_level = level; payload.favorite_subjects = subjectIds; }
      await completeOnboarding(payload);
      haptic.success();
      await refreshUser();
    } catch (err) {
      setError(apiMessage(err, t('Une erreur est survenue. Réessaie.')));
    } finally {
      setBusy(false);
    }
  };

  const titles = [t('Bienvenue sur FIDNI'), role === 'teacher' ? t('Tes classes') : t('Ton niveau'), t('Qui es-tu ?')];
  const choice = (active: boolean): React.CSSProperties => ({
    display: 'block', width: '100%', padding: '18px 18px', borderRadius: 16, textAlign: 'start', marginBottom: 12, fontSize: 16, fontWeight: 650,
    background: active ? 'var(--fdm-brand-soft)' : 'var(--fdm-card)', color: 'inherit',
    border: `2px solid ${active ? 'var(--ion-color-primary)' : 'var(--fdm-line)'}`,
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{titles[step]}</IonTitle>
        </IonToolbar>
        <IonProgressBar value={(step + 1) / 3} />
      </IonHeader>
      <IonContent className="fdm-plain">
        <div style={{ padding: '24px 20px' }}>
          {step === 0 && (
            <>
              <h1 className="fdm-large-title" style={{ marginTop: 0 }}>{t('Tu utilises FIDNI en tant que…')}</h1>
              <button type="button" style={choice(role === 'student')} onClick={() => { haptic.tap(); setRole('student'); }}>
                🎓 {t('Élève')}<div className="fdm-muted" style={{ fontSize: 14, fontWeight: 400, marginTop: 4 }}>{t('Je révise, je m’entraîne et je prépare mes DS.')}</div>
              </button>
              <button type="button" style={choice(role === 'teacher')} onClick={() => { haptic.tap(); setRole('teacher'); }}>
                👩‍🏫 {t('Professeur')}<div className="fdm-muted" style={{ fontSize: 14, fontWeight: 400, marginTop: 4 }}>{t('Je suis mes classes et je corrige des copies.')}</div>
              </button>
            </>
          )}
          {step === 1 && (
            <>
              <h1 className="fdm-large-title" style={{ marginTop: 0 }}>{role === 'teacher' ? t('Quels niveaux enseignes-tu ?') : t('En quelle classe es-tu ?')}</h1>
              {!levels.length && <IonSpinner />}
              {levels.map((l) => {
                const id = String(l.id);
                const active = role === 'teacher' ? teaching.includes(id) : level === id;
                return (
                  <button key={id} type="button" style={choice(active)} onClick={() => {
                    haptic.tap();
                    if (role === 'teacher') setTeaching((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
                    else setLevel(id);
                  }}>{l.name}</button>
                );
              })}
            </>
          )}
          {step === 2 && (
            <>
              <IonInput fill="outline" labelPlacement="floating" label={t('Prénom')} value={identity.firstName}
                onIonInput={(e) => set({ firstName: String(e.detail.value ?? '') })} autocapitalize="words" />
              <IonInput fill="outline" labelPlacement="floating" label={t('Nom')} value={identity.lastName} style={{ marginTop: 14 }}
                onIonInput={(e) => set({ lastName: String(e.detail.value ?? '') })} autocapitalize="words" />
              <IonList inset style={{ margin: '18px 0 0' }}>
                <IonRadioGroup value={identity.gender} onIonChange={(e) => set({ gender: e.detail.value as Gender })}>
                  <IonItem><IonRadio value="F">{t('Fille / Femme')}</IonRadio></IonItem>
                  <IonItem><IonRadio value="M">{t('Garçon / Homme')}</IonRadio></IonItem>
                  <IonItem><IonRadio value="N">{t('Je préfère ne pas le dire')}</IonRadio></IonItem>
                </IonRadioGroup>
              </IonList>
              <IonInput fill="outline" labelPlacement="stacked" label={t('Date de naissance')} type="date" value={identity.birthDate} style={{ marginTop: 18 }}
                onIonInput={(e) => set({ birthDate: String(e.detail.value ?? '') })} />
              <IonInput fill="outline" labelPlacement="floating" label={t('Établissement')} value={schoolQuery} style={{ marginTop: 14 }}
                helperText={identity.school.id !== null ? t('Établissement choisi') : t('Cherche ton lycée, ou écris son nom')}
                onIonInput={(e) => { const v = String(e.detail.value ?? ''); setSchoolQuery(v); set({ school: { id: null, name: v } }); }} />
              {schools.length > 0 && (
                <IonList inset style={{ margin: '8px 0 0' }}>
                  {schools.slice(0, 6).map((s) => (
                    <IonItem key={s.id} button onClick={() => { haptic.tap(); set({ school: { id: s.id, name: s.name, city: s.city } }); setSchoolQuery(s.name); setSchools([]); }}>
                      <IonLabel>{s.name}<p>{s.city}</p></IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              )}
              {error && <IonText color="danger"><p style={{ fontSize: 14 }}>{error}</p></IonText>}
            </>
          )}
        </div>
      </IonContent>
      <IonFooter>
        <IonToolbar style={{ padding: '6px 12px' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <IonButton fill="clear" onClick={() => (step ? setStep(step - 1) : void logout())}>{step ? t('Retour') : t('Se déconnecter')}</IonButton>
            <IonButton style={{ flex: 1 }} shape="round" disabled={!canNext || busy}
              onClick={() => { haptic.tap(); if (step < 2) setStep(step + 1); else void submit(); }}>
              {busy ? <IonSpinner name="crescent" /> : step < 2 ? t('Continuer') : t('Terminer')}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
}
