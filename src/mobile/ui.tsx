/** Briques communes des écrans de l'application mobile. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonRefresher, IonRefresherContent,
  IonSpinner, IonTitle, IonToolbar, isPlatform,
} from '@ionic/react';
import { cloudOfflineOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { t } from '@/i18n';

/** Petit retour tactile (sans effet sur le web ou si l'appareil ne vibre pas). */
export const haptic = {
  tap: () => { void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); },
  success: () => { void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined); },
  warning: () => { void Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined); },
};

interface ScreenProps {
  title: string;
  /** Bouton retour (écran poussé dans une pile). */
  back?: boolean;
  /** Grand titre (iPhone) qui se replie dans la barre en défilant ; titre normal sur Android. */
  large?: boolean;
  actions?: React.ReactNode;
  onRefresh?: () => Promise<unknown>;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Un écran d'une pile (IonNav) : en-tête, contenu, pied. Pas d'IonPage ici : IonNav enveloppe déjà chaque écran dans
 * sa page, et une seconde page cachait le bouton retour (règle `.can-go-back > ion-header` d'Ionic).
 */
export function Screen({ title, back = true, large = false, actions, onRefresh, footer, children }: ScreenProps) {
  return (
    <>
      <IonHeader translucent={large}>
        <IonToolbar>
          {back && (
            <IonButtons slot="start">
              <IonBackButton text={isPlatform('ios') ? t('Retour') : undefined} />
            </IonButtons>
          )}
          <IonTitle>{title}</IonTitle>
          {actions && <IonButtons slot="end">{actions}</IonButtons>}
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="fdm-plain">
        {onRefresh && (
          <IonRefresher slot="fixed" onIonRefresh={async (e) => { try { await onRefresh(); } finally { e.detail.complete(); } }}>
            <IonRefresherContent />
          </IonRefresher>
        )}
        {large && (
          <IonHeader collapse="condense">
            <IonToolbar><IonTitle size="large">{title}</IonTitle></IonToolbar>
          </IonHeader>
        )}
        {children}
        <div style={{ height: 24 }} />
      </IonContent>
      {footer && <IonFooter>{footer}</IonFooter>}
    </>
  );
}

/** Chargement d'une donnée : état, erreur, relecture (tirer pour actualiser). */
export function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const run = useCallback(async () => {
    setError(null);
    try {
      setData(await loadRef.current());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLoading(true); void run(); }, deps);
  return { data, error, loading, reload: run, setData };
}

export function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '56px 0' }}>
      <IonSpinner name="crescent" color="primary" />
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 28px' }}>
      <IonIcon icon={cloudOfflineOutline} style={{ fontSize: 44, color: 'var(--fdm-muted)' }} />
      <p style={{ margin: '12px 0 4px', fontWeight: 600 }}>{t('Impossible de charger')}</p>
      <p className="fdm-muted" style={{ margin: 0, fontSize: 14 }}>{t('Vérifie ta connexion internet.')}</p>
      <IonButton fill="clear" onClick={onRetry}>{t('Réessayer')}</IonButton>
    </div>
  );
}

export function Empty({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 28px' }}>
      <IonIcon icon={icon} style={{ fontSize: 44, color: 'var(--fdm-muted)' }} />
      <p style={{ margin: '12px 0 4px', fontWeight: 600 }}>{title}</p>
      {text && <p className="fdm-muted" style={{ margin: 0, fontSize: 14 }}>{text}</p>}
    </div>
  );
}

/** Contenu d'un exercice ou d'une leçon (HTML + formules `$…$`) : même rendu KaTeX que le site. */
export function MathHtml({ html, className = '' }: { html?: string | null; className?: string }) {
  if (!html) return null;
  return <div className={`fdm-math ${className}`}><TipTapRenderer content={html} /></div>;
}

const DIFFICULTY: Record<string, { label: string; bg: string; fg: string }> = {
  easy: { label: 'Facile', bg: 'var(--fdm-brand-soft)', fg: 'var(--ion-color-primary)' },
  medium: { label: 'Moyen', bg: 'var(--fdm-gold-soft)', fg: 'var(--fdm-gold-strong)' },
  hard: { label: 'Difficile', bg: 'rgba(162,59,52,.12)', fg: 'var(--ion-color-danger)' },
};

export function DifficultyChip({ value }: { value?: string | null }) {
  const d = value ? DIFFICULTY[value] : null;
  if (!d) return null;
  return <span className="fdm-chip" style={{ background: d.bg, color: d.fg }}>{t(d.label)}</span>;
}

/** Résultat de l'élève sur un contenu (Réussi / À revoir). */
export function StatusChip({ value }: { value?: 'success' | 'review' | null }) {
  if (value === 'success') return <span className="fdm-chip" style={{ background: 'var(--fdm-brand-soft)', color: 'var(--ion-color-primary)' }}>✓ {t('Réussi')}</span>;
  if (value === 'review') return <span className="fdm-chip" style={{ background: 'var(--fdm-gold-soft)', color: 'var(--fdm-gold-strong)' }}>↻ {t('À revoir')}</span>;
  return null;
}

/** « 1 question », « 3 questions » (textes traduits tels quels). */
export const countLabel = (n: number, one: string, many: string) => t(n > 1 ? many : one, { n: String(n) });

/** Message d'erreur lisible d'une réponse de l'API. */
export function apiMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    for (const k of ['error', 'detail', 'message', 'non_field_errors', 'password', 'email', 'username', 'identifier']) {
      const v = d[k];
      if (typeof v === 'string' && v) return v;
      if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
    }
  }
  if ((err as { message?: string })?.message === 'Network Error') return t('Pas de connexion internet.');
  return fallback;
}
