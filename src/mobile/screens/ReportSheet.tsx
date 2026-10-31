/** « Signaler une erreur » sur un contenu (mêmes motifs que components/content/viewer/ReportContentModal.tsx). */
import { useState } from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonModal, IonRadio, IonRadioGroup, IonSpinner,
  IonTextarea, IonTitle, IonToolbar,
} from '@ionic/react';
import { reportContent, type ReportReason } from '@/lib/api/reportApi';
import { t } from '@/i18n';
import { haptic } from '../ui';

type Kind = 'exercise' | 'exam' | 'lesson';

function reasonsFor(kind: Kind): { value: ReportReason; label: string; hint: string }[] {
  const list: { value: ReportReason; label: string; hint: string }[] = [
    { value: 'statement', label: kind === 'lesson' ? t('Erreur dans le cours') : t('Erreur dans l’énoncé'),
      hint: kind === 'lesson' ? t('Une définition, un théorème ou un exemple faux') : t('Une donnée fausse, une question impossible') },
  ];
  if (kind !== 'lesson') list.push({ value: 'solution', label: t('Erreur dans la solution'), hint: t('Un calcul ou un résultat faux') });
  if (kind === 'exam') list.push({ value: 'scale', label: t('Barème incorrect'), hint: t('Les points ne tombent pas juste') });
  list.push(
    { value: 'typo', label: t('Faute de frappe'), hint: t('Orthographe, mot manquant') },
    { value: 'display', label: t('Affichage'), hint: t('Formule ou figure mal affichée') },
    { value: 'other', label: t('Autre'), hint: t('Dis-nous en quelques mots') },
  );
  return list;
}

export function ReportSheet({ open, onClose, contentId, kind, questions }: {
  open: boolean; onClose: () => void; contentId: string; kind: Kind;
  /** Questions de l'exercice (chemin, libellé « Question 2 b ») : le signalement peut en viser une. */
  questions: { path: string; label: string }[];
}) {
  const [reason, setReason] = useState<ReportReason>('statement');
  const [path, setPath] = useState('');
  const [text, setText] = useState('');
  const [state, setState] = useState<'' | 'busy' | 'sent' | 'error'>('');

  const send = async () => {
    setState('busy');
    try {
      const q = questions.find((x) => x.path === path);
      await reportContent(contentId, { reason, description: text.trim(), ...(q ? { item_path: q.path, item_label: q.label } : {}) });
      haptic.success();
      setState('sent');
    } catch { setState('error'); }
  };
  const close = () => { onClose(); window.setTimeout(() => { setState(''); setText(''); setPath(''); }, 300); };

  return (
    <IonModal isOpen={open} onDidDismiss={close} initialBreakpoint={0.85} breakpoints={[0, 0.85, 1]}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('Signaler une erreur')}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={close}>{t('Fermer')}</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="fdm-plain">
        {state === 'sent' ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>🙏</div>
            <p style={{ fontSize: 17, fontWeight: 700 }}>{t('Merci, c’est noté !')}</p>
            <p className="fdm-muted" style={{ fontSize: 14.5 }}>{t('L’équipe va vérifier. Tu recevras la réponse dans tes notifications.')}</p>
            <IonButton shape="round" onClick={close}>{t('Fermer')}</IonButton>
          </div>
        ) : (
          <>
            <IonList inset>
              <IonRadioGroup value={reason} onIonChange={(e) => setReason(e.detail.value)}>
                {reasonsFor(kind).map((r) => (
                  <IonItem key={r.value}>
                    <IonRadio value={r.value} justify="space-between"><IonLabel>{r.label}<p>{r.hint}</p></IonLabel></IonRadio>
                  </IonItem>
                ))}
              </IonRadioGroup>
            </IonList>
            {questions.length > 1 && (
              <div style={{ padding: '0 16px' }}>
                <div className="fdm-section-label" style={{ margin: '4px 4px 8px' }}>{t('Quelle question ?')}</div>
                <div className="fdm-hscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                  {[{ path: '', label: t('Tout le contenu') }, ...questions].map((q) => (
                    <button key={q.path || 'tout'} type="button" onClick={() => setPath(q.path)} style={{
                      flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 17, fontWeight: 600, fontSize: 13.5,
                      background: path === q.path ? 'var(--ion-color-primary)' : 'var(--fdm-card)', color: path === q.path ? '#fff' : 'inherit',
                      border: path === q.path ? 'none' : '1px solid var(--fdm-line)',
                    }}>{q.label}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ padding: '16px' }}>
              <IonTextarea fill="outline" autoGrow rows={3} value={text} onIonInput={(e) => setText(String(e.detail.value ?? ''))}
                label={t('Explique ce qui ne va pas.')} labelPlacement="floating" />
              {state === 'error' && <p style={{ color: 'var(--ion-color-danger)', fontSize: 14 }}>{t('L’envoi a échoué. Réessaie.')}</p>}
              <IonButton expand="block" shape="round" style={{ marginTop: 14 }} disabled={state === 'busy'} onClick={send}>
                {state === 'busy' ? <IonSpinner name="crescent" /> : t('Envoyer le signalement')}
              </IonButton>
            </div>
          </>
        )}
      </IonContent>
    </IonModal>
  );
}
