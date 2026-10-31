/**
 * Onglet « Progression » (tableau de bord « Ma progression » du site : GET /api/stats/tableau/) : chiffres de la
 * période, activité jour par jour, chapitres et points faibles. Le détail complet reste dans la version du site.
 */
import { useState } from 'react';
import { IonIcon, IonLabel, IonSegment, IonSegmentButton } from '@ionic/react';
import { alertCircleOutline, barChartOutline, chevronForward, timeOutline } from 'ionicons/icons';
import { useAuth } from '@/contexts/AuthContext';
import { getTableau, type Periode, type Tableau } from '@/lib/api/tableauApi';
import { dateLocale, t } from '@/i18n';
import { useNav } from '../nav';
import { useSession } from '../session';
import { countLabel, Empty, ErrorState, Loading, Screen, haptic, useLoad } from '../ui';
import { ContentScreen } from './ContentScreen';

const duree = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
};

export function ProgressRoot() {
  const { isAuthenticated } = useAuth();
  const { setGuest, openWeb } = useSession();
  const [jours, setJours] = useState<Periode>(30);
  const tab = useLoad<Tableau | null>(() => (isAuthenticated ? getTableau(jours) : Promise.resolve(null)), [jours, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Screen title={t('Progression')} back={false} large>
        <Empty icon={barChartOutline} title={t('Ta progression apparaîtra ici')} text={t('Crée un compte gratuit pour suivre tes réussites, ton temps et tes points faibles.')} />
        <div style={{ textAlign: 'center' }}>
          <button type="button" onClick={() => setGuest(false)} style={{ color: 'var(--ion-color-primary)', fontWeight: 700, fontSize: 16 }}>{t('Créer mon compte')}</button>
        </div>
      </Screen>
    );
  }

  const d = tab.data;
  const q = d?.kpis.questions;
  return (
    <Screen title={t('Progression')} back={false} large onRefresh={tab.reload}>
      <div style={{ padding: '6px 16px 0' }}>
        <IonSegment value={String(jours)} onIonChange={(e) => { haptic.tap(); setJours(Number(e.detail.value) as Periode); }}>
          <IonSegmentButton value="7"><IonLabel>{t('7 j')}</IonLabel></IonSegmentButton>
          <IonSegmentButton value="30"><IonLabel>{t('30 j')}</IonLabel></IonSegmentButton>
          <IonSegmentButton value="90"><IonLabel>{t('3 mois')}</IonLabel></IonSegmentButton>
          <IonSegmentButton value="0"><IonLabel>{t('Tout')}</IonLabel></IonSegmentButton>
        </IonSegment>
      </div>
      {tab.loading && !d && <Loading />}
      {tab.error && !d ? <ErrorState onRetry={tab.reload} /> : null}
      {d && q && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '16px 16px 0' }}>
            <Tile label={t('Questions réussies')} value={String(q.reussies)} color="var(--ion-color-primary)" />
            <Tile label={t('À revoir')} value={String(q.ratees + q.partielles)} color="var(--fdm-gold-strong)" />
            <Tile label={t('Note aux examens')} value={d.kpis.note.moyenne != null ? `${d.kpis.note.moyenne.toFixed(1).replace('.', ',')}/20` : '—'} />
            <Tile label={t('Temps de travail')} value={duree(d.kpis.secondes.total)} icon={timeOutline} />
          </div>

          <div className="fdm-section-label">{t('Activité')}</div>
          <Activity data={d} />

          {d.points_faibles.length > 0 && (
            <>
              <div className="fdm-section-label">{t('Mes points faibles')}</div>
              <WeakPoints data={d} />
            </>
          )}

          <div className="fdm-section-label">{t('Chapitres')}</div>
          <div className="fdm-card" style={{ margin: '0 16px', overflow: 'hidden' }}>
            {d.chapitres.filter((c) => c.actif || c.reussies + c.partielles + c.ratees > 0).map((c, i) => {
              const total = c.reussies + c.partielles + c.ratees;
              const pct = total ? Math.round((100 * (c.reussies + c.partielles / 2)) / total) : 0;
              return (
                <div key={c.id} style={{ padding: '13px 16px', borderTop: i ? '1px solid var(--fdm-line)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14.5 }}>
                    <span style={{ fontWeight: 600 }}>{c.nom}</span>
                    <span style={{ fontWeight: 700 }}>{total ? `${pct} %` : '—'}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--fdm-line)', marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct >= 60 ? 'var(--ion-color-primary)' : 'var(--ion-color-warning)' }} />
                  </div>
                  <div className="fdm-muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                    {countLabel(total, '{n} question', '{n} questions')}{c.note.moyenne != null ? ` · ${t('examens {note}/20', { note: c.note.moyenne.toFixed(1).replace('.', ',') })}` : ''}
                  </div>
                </div>
              );
            })}
            {!d.chapitres.some((c) => c.actif || c.reussies + c.partielles + c.ratees > 0) && (
              <p className="fdm-muted" style={{ padding: 16, margin: 0, fontSize: 14 }}>{t('Évalue des questions pour voir tes chapitres ici.')}</p>
            )}
          </div>

          <button type="button" onClick={() => openWeb('/progression')} style={{ display: 'block', margin: '18px auto 0', color: 'var(--ion-color-primary)', fontWeight: 700 }}>
            {t('Voir le tableau de bord complet')}
          </button>
        </>
      )}
    </Screen>
  );
}

function Tile({ label, value, color, icon }: { label: string; value: string; color?: string; icon?: string }) {
  return (
    <div className="fdm-card" style={{ padding: '14px 14px 12px' }}>
      <div className="fdm-muted" style={{ fontSize: 12.5, fontWeight: 600, display: 'flex', gap: 5, alignItems: 'center' }}>
        {icon && <IonIcon icon={icon} />}{label}
      </div>
      <div className="fdm-title" style={{ fontSize: 26, fontWeight: 600, marginTop: 4, color: color ?? 'var(--ion-text-color)' }}>{value}</div>
    </div>
  );
}

/** Barres par jour (ou par semaine) : questions réussies (vert) et à revoir (or). */
function Activity({ data }: { data: Tableau }) {
  const days = data.jours.slice(-30);
  const max = Math.max(1, ...days.map((j) => j.reussies + j.partielles + j.ratees));
  return (
    <div className="fdm-card" style={{ margin: '0 16px', padding: '16px 14px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 110 }}>
        {days.map((j) => {
          const ok = j.reussies;
          const ko = j.partielles + j.ratees;
          return (
            <div key={j.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ height: `${(ko / max) * 100}%`, background: 'var(--ion-color-warning)', borderRadius: '3px 3px 0 0', minHeight: ko ? 2 : 0 }} />
              <div style={{ height: `${(ok / max) * 100}%`, background: 'var(--ion-color-primary)', borderRadius: ko ? 0 : '3px 3px 0 0', minHeight: ok ? 2 : 0 }} />
              {!ok && !ko && <div style={{ height: 3, background: 'var(--fdm-line)', borderRadius: 2 }} />}
            </div>
          );
        })}
      </div>
      <div className="fdm-muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginTop: 8 }}>
        <span>{days[0] ? new Date(days[0].date).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' }) : ''}</span>
        <span>{countLabel(data.kpis.jours_actifs.n, '{n} jour actif', '{n} jours actifs')}</span>
        <span>{t('Aujourd’hui')}</span>
      </div>
    </div>
  );
}

function WeakPoints({ data }: { data: Tableau }) {
  const nav = useNav();
  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.points_faibles.slice(0, 5).map((p) => (
        <div key={p.nom} className="fdm-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <IonIcon icon={alertCircleOutline} style={{ color: 'var(--fdm-gold-strong)', fontSize: 20 }} />
            <span style={{ flex: 1, fontWeight: 650 }}>{p.nom}</span>
            <span style={{ fontWeight: 700 }}>{Math.round(p.taux)} %</span>
          </div>
          {p.a_revoir.slice(0, 2).map((r) => (
            <button key={`${r.id}-${r.question}`} type="button" className="fdm-pressable" onClick={() => nav.push(() => <ContentScreen id={r.id} kind={r.url.includes('/exams/') ? 'exam' : 'exercise'} />)}
              style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, marginTop: 8, padding: '9px 10px', borderRadius: 10, background: 'rgba(120,115,105,.08)', textAlign: 'start', color: 'inherit', fontSize: 13.5 }}>
              <span style={{ flex: 1, minWidth: 0 }}>{r.titre}</span>
              <IonIcon flipRtl icon={chevronForward} className="fdm-muted" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
