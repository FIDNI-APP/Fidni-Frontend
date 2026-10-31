/**
 * Onglet « Réviser » (page /reviser du site) : mes prochains DS, ce qu'il faut refaire (plus ancien d'abord) et mes
 * listes de révision. Le plan d'un DS et le DS blanc s'ouvrent dans la version complète (pas encore refaits).
 */
import React from 'react';
import { IonIcon, IonLabel, IonSegment, IonSegmentButton } from '@ionic/react';
import { calendarOutline, chevronForward, listOutline, refreshOutline, checkmarkDoneOutline } from 'ionicons/icons';
import { useAuth } from '@/contexts/AuthContext';
import { devoirsApi, testTitle, whenLabel } from '@/lib/api/devoirsApi';
import { getRevisionList, getRevisionLists, getToRedo, type RevisionList } from '@/lib/api/revisionListApi';
import { t } from '@/i18n';
import { useNav } from '../nav';
import { useSession } from '../session';
import { countLabel, Empty, ErrorState, Loading, Screen, StatusChip, haptic, useLoad } from '../ui';
import { ContentScreen, type ContentKind } from './ContentScreen';

export function ReviseRoot() {
  const { isAuthenticated } = useAuth();
  const { setGuest } = useSession();
  const [tab, setTab] = React.useState<'refaire' | 'listes'>('refaire');
  if (!isAuthenticated) {
    return (
      <Screen title={t('Réviser')} back={false} large>
        <Empty icon={refreshOutline} title={t('Tes révisions apparaîtront ici')} text={t('Crée un compte gratuit : FIDNI garde ce que tu dois refaire et prépare tes DS.')} />
        <div style={{ textAlign: 'center' }}>
          <button type="button" onClick={() => setGuest(false)} style={{ color: 'var(--ion-color-primary)', fontWeight: 700, fontSize: 16 }}>{t('Créer mon compte')}</button>
        </div>
      </Screen>
    );
  }
  return (
    <Screen title={t('Réviser')} back={false} large>
      <UpcomingTests />
      <div style={{ padding: '18px 16px 0' }}>
        <IonSegment value={tab} onIonChange={(e) => { haptic.tap(); setTab(e.detail.value as 'refaire' | 'listes'); }}>
          <IonSegmentButton value="refaire"><IonLabel>{t('À refaire')}</IonLabel></IonSegmentButton>
          <IonSegmentButton value="listes"><IonLabel>{t('Mes listes')}</IonLabel></IonSegmentButton>
        </IonSegment>
      </div>
      {tab === 'refaire' ? <ToRedo /> : <Lists />}
    </Screen>
  );
}

function UpcomingTests() {
  const { openWeb } = useSession();
  const tests = useLoad(() => devoirsApi.list(), []);
  const upcoming = (tests.data ?? []).filter((x) => x.days_left >= 0).slice(0, 3);
  return (
    <>
      <div className="fdm-section-label">{t('Mes prochains DS')}</div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {upcoming.map((x) => (
          <button key={x.id} type="button" className="fdm-card fdm-pressable" onClick={() => openWeb(`/revisions/ds/${x.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, textAlign: 'start', color: 'inherit' }}>
            <span style={{ width: 44, height: 44, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'var(--fdm-gold-soft)', color: 'var(--fdm-gold-strong)' }}>
              <IonIcon icon={calendarOutline} style={{ fontSize: 22 }} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700 }}>{testTitle(x)} · {whenLabel(x.days_left)}</span>
              <span className="fdm-muted" style={{ fontSize: 13 }}>
                {x.readiness != null ? t('Prêt à {pct} %', { pct: String(Math.round(x.readiness)) }) : x.chapters.map((c) => c.name).join(', ')}
              </span>
            </span>
            <IonIcon flipRtl icon={chevronForward} className="fdm-muted" />
          </button>
        ))}
        <button type="button" className="fdm-pressable" onClick={() => openWeb('/reviser')}
          style={{ padding: '12px', borderRadius: 14, border: '1.5px dashed var(--fdm-line)', color: 'var(--ion-color-primary)', fontWeight: 700 }}>
          {upcoming.length ? t('Gérer mes DS') : t('Programmer un DS')}
        </button>
      </div>
    </>
  );
}

function ToRedo() {
  const nav = useNav();
  const redo = useLoad(() => getToRedo(), []);
  if (redo.loading && !redo.data) return <Loading />;
  if (redo.error && !redo.data) return <ErrorState onRetry={redo.reload} />;
  const items = redo.data?.results ?? [];
  if (!items.length) return <Empty icon={checkmarkDoneOutline} title={t('Rien à refaire')} text={t('Les questions marquées « À revoir » apparaîtront ici.')} />;
  return (
    <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((it) => (
        <button key={it.id} type="button" className="fdm-card fdm-pressable" onClick={() => { haptic.tap(); nav.push(() => <ContentScreen id={it.id} kind={it.type} />); }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textAlign: 'start', color: 'inherit' }}>
          <IonIcon icon={refreshOutline} style={{ color: 'var(--fdm-gold-strong)', fontSize: 22 }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 600 }}>{it.title}</span>
            <span className="fdm-muted" style={{ fontSize: 12.5 }}>
              {[it.chapters[0], it.days_ago != null ? t('il y a {n} j', { n: String(it.days_ago) }) : ''].filter(Boolean).join(' · ')}
            </span>
          </span>
          <IonIcon flipRtl icon={chevronForward} className="fdm-muted" />
        </button>
      ))}
    </div>
  );
}

function Lists() {
  const nav = useNav();
  const lists = useLoad(() => getRevisionLists(), []);
  if (lists.loading && !lists.data) return <Loading />;
  if (lists.error && !lists.data) return <ErrorState onRetry={lists.reload} />;
  const all = lists.data ?? [];
  if (!all.length) return <Empty icon={listOutline} title={t('Aucune liste')} text={t('Range des exercices dans une liste depuis le site pour les retrouver ici.')} />;
  return (
    <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {all.map((l) => (
        <button key={l.id} type="button" className="fdm-card fdm-pressable" onClick={() => nav.push(() => <ListScreen id={l.id} name={l.name} />)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textAlign: 'start', color: 'inherit' }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 650 }}>{l.name}</span>
            <span className="fdm-muted" style={{ fontSize: 13 }}>
              {countLabel(l.item_count, '{n} contenu', '{n} contenus')}
              {l.progress ? ` · ${countLabel(l.progress.success, '{n} réussi', '{n} réussis')}` : ''}
            </span>
          </span>
          <IonIcon flipRtl icon={chevronForward} className="fdm-muted" />
        </button>
      ))}
    </div>
  );
}

function ListScreen({ id, name }: { id: number; name: string }) {
  const nav = useNav();
  const list = useLoad<RevisionList>(() => getRevisionList(id), [id]);
  return (
    <Screen title={name} onRefresh={list.reload}>
      {list.loading && !list.data && <Loading />}
      {list.error && !list.data ? <ErrorState onRetry={list.reload} /> : null}
      <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(list.data?.items ?? []).map((item) => {
          const c = item.content_object as { id: number; title?: string; type?: ContentKind; user_complete?: 'success' | 'review' | null } | null;
          if (!c) return null;
          const kind: ContentKind = c.type ?? (item.content_type_name?.includes('lesson') ? 'lesson' : 'exercise');
          return (
            <button key={item.id} type="button" className="fdm-card fdm-pressable" onClick={() => nav.push(() => <ContentScreen id={c.id} kind={kind} />)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textAlign: 'start', color: 'inherit' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{c.title}</span>
                <span style={{ display: 'block', marginTop: 6 }}><StatusChip value={c.user_complete} /></span>
              </span>
              <IonIcon flipRtl icon={chevronForward} className="fdm-muted" />
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
