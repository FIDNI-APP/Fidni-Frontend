/**
 * Onglet « Accueil » : bonjour, le prochain objectif (même calcul que l'accueil du site : GET /api/stats/apercu/),
 * où j'en suis, le prochain DS, et ce qu'il faut refaire. Visiteur : découvrir et créer un compte.
 */
import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { arrowForward, calendarOutline, flameOutline, refreshOutline, sparklesOutline } from 'ionicons/icons';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/apiClient';
import { devoirsApi, testTitle, whenLabel, type UpcomingTest } from '@/lib/api/devoirsApi';
import { getToRedo } from '@/lib/api/revisionListApi';
import type { ApercuData, Objectif } from '@/pages/progression/types';
import { getLevelFolders } from '@/lib/api/hubApi';
import { dateLocale, t } from '@/i18n';
import { useNav } from '../nav';
import { useSession } from '../session';
import { countLabel, DifficultyChip, Screen, haptic, useLoad } from '../ui';
import { ContentScreen } from './ContentScreen';
import { ContentListScreen, LevelScreen, NationalYears } from './explore';

export function HomeRoot() {
  const { user, isAuthenticated } = useAuth();
  const { setGuest } = useSession();
  const apercu = useLoad(async () => (isAuthenticated ? (await api.get('/stats/apercu/')).data as ApercuData : null), [isAuthenticated]);
  const ds = useLoad(() => (isAuthenticated ? devoirsApi.next().catch(() => null) : Promise.resolve(null)), [isAuthenticated]);
  const redo = useLoad(() => (isAuthenticated ? getToRedo().catch(() => null) : Promise.resolve(null)), [isAuthenticated]);
  const name = user?.first_name || user?.username;
  const hour = new Date().getHours();
  const hello = hour < 5 || hour >= 18 ? t('Bonsoir') : t('Bonjour');

  return (
    <Screen title={t('Accueil')} back={false} onRefresh={() => Promise.all([apercu.reload(), ds.reload(), redo.reload()])}>
      <div style={{ padding: '20px 20px 4px' }}>
        <div className="fdm-muted" style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
          {new Date().toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1 className="fdm-large-title" style={{ margin: '4px 0 0' }}>{name ? `${hello}, ${name}` : hello}</h1>
      </div>

      {!isAuthenticated && (
        <div className="fdm-card" style={{ margin: '18px 16px 0', padding: 20, background: 'linear-gradient(160deg, #1f8a55, #14583a)', color: '#fff' }}>
          <div className="fdm-title" style={{ fontSize: 21, fontWeight: 600 }}>{t('Suis ta progression')}</div>
          <p style={{ margin: '6px 0 14px', opacity: .9, fontSize: 14.5, lineHeight: 1.45 }}>
            {t('Avec un compte gratuit, FIDNI retient tes réussites, te dit quoi revoir et prépare tes DS.')}
          </p>
          <IonButton color="light" shape="round" onClick={() => setGuest(false)} style={{ '--color': '#14583a', fontWeight: 700 } as React.CSSProperties}>
            {t('Créer mon compte')}
          </IonButton>
        </div>
      )}

      {apercu.data?.objectif && <ObjectifCard objectif={apercu.data.objectif} levelId={apercu.data.level?.id ?? null} />}
      {apercu.data && <Overview data={apercu.data} />}
      {ds.data && <NextTest test={ds.data} />}
      {redo.data && redo.data.results.length > 0 && <Redo items={redo.data.results.slice(0, 5)} />}
      {!isAuthenticated && <StartHere />}
    </Screen>
  );
}

/** Visiteur : les niveaux, chacun ouvrant ses chapitres d'exercices. */
function StartHere() {
  const nav = useNav();
  const levels = useLoad(() => getLevelFolders('exercises'), []);
  const list = (levels.data?.levels ?? []).filter((l) => l.count > 0);
  if (!list.length) return null;
  return (
    <>
      <div className="fdm-section-label">{t('Par où commencer ?')}</div>
      <div className="fdm-card" style={{ margin: '0 16px', overflow: 'hidden' }}>
        {list.map((l, i) => (
          <button key={l.slug} type="button" className="fdm-pressable" onClick={() => { haptic.tap(); nav.push(() => <LevelScreen section="exercises" level={l} />); }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '15px 16px', textAlign: 'start', color: 'inherit', background: 'transparent', borderTop: i ? '1px solid var(--fdm-line)' : 'none' }}>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 650 }}>{l.name}</span>
              <span className="fdm-muted" style={{ fontSize: 13 }}>{countLabel(l.count, '{n} exercice corrigé', '{n} exercices corrigés')}</span>
            </span>
            <IonIcon flipRtl icon={arrowForward} color="primary" />
          </button>
        ))}
      </div>
    </>
  );
}

function ObjectifCard({ objectif, levelId }: { objectif: Objectif; levelId: number | null }) {
  const nav = useNav();
  const { openWeb } = useSession();
  const chapter = objectif.chapitre;
  const go = () => {
    haptic.tap();
    const a = objectif.action;
    const chapterFilters = levelId && chapter ? { classLevels: [String(levelId)], chapters: [String(chapter.id)] } : {};
    if (a.kind === 'entrainer') nav.push(() => <ContentListScreen title={chapter?.name ?? t('S’entraîner')} kind="exercise" filters={{ ...chapterFilters, ...(a.difficulte ? { difficulties: [a.difficulte] } : {}), todo: true }} />);
    else if (a.kind === 'cours') nav.push(() => <ContentListScreen title={chapter?.name ?? t('Cours')} kind="lesson" filters={chapterFilters} />);
    else if (a.kind === 'devoirs') nav.push(() => <ContentListScreen title={chapter?.name ?? t('Devoirs')} kind="exam" filters={chapterFilters} />);
    else if (a.kind === 'nationaux') nav.push(() => <NationalYears />);
    else if (a.kind === 'ds_blanc' && a.test_id) openWeb(`/revisions/ds/${a.test_id}/blanc`);
    else if (a.kind === 'quiz') openWeb('/skill-iq');
  };
  return (
    <>
      <div className="fdm-section-label">{t('Ton prochain objectif')}</div>
      <div className="fdm-card" style={{ margin: '0 16px', padding: 18 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--ion-color-primary)', fontWeight: 700, fontSize: 13 }}>
          <IonIcon icon={sparklesOutline} />{chapter?.name ?? t('Pour toi')}
        </div>
        <div className="fdm-title" style={{ fontSize: 21, fontWeight: 600, margin: '6px 0 6px', lineHeight: 1.25 }}>{objectif.titre}</div>
        <p className="fdm-muted" style={{ margin: 0, fontSize: 14.5, lineHeight: 1.45 }}>{objectif.phrase}</p>
        {(objectif.exercices ?? []).slice(0, 3).map((ex) => (
          <button key={ex.id} type="button" className="fdm-pressable" onClick={() => { haptic.tap(); nav.push(() => <ContentScreen id={ex.id} kind="exercise" />); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginTop: 10, padding: '11px 12px', borderRadius: 12, background: 'rgba(120,115,105,.08)', textAlign: 'start', color: 'inherit' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 14.5 }}>{ex.title}</span>
              <span style={{ display: 'flex', gap: 6, marginTop: 5, alignItems: 'center' }}>
                <DifficultyChip value={ex.difficulty} />
                {ex.minutes ? <span className="fdm-muted" style={{ fontSize: 12 }}>{t('{n} min', { n: String(ex.minutes) })}</span> : null}
              </span>
            </span>
            <IonIcon flipRtl icon={arrowForward} color="primary" />
          </button>
        ))}
        <IonButton expand="block" shape="round" style={{ marginTop: 14 }} onClick={go}>{t('C’est parti')}</IonButton>
      </div>
    </>
  );
}

function Overview({ data }: { data: ApercuData }) {
  const pct = data.apercu.maitrise;
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <>
      <div className="fdm-section-label">{t('Où j’en suis')}</div>
      <div className="fdm-card" style={{ margin: '0 16px', padding: 18, display: 'flex', alignItems: 'center', gap: 18 }}>
        <svg width="76" height="76" viewBox="0 0 76 76" style={{ flexShrink: 0 }}>
          <circle cx="38" cy="38" r={r} fill="none" stroke="var(--fdm-line)" strokeWidth="7" />
          <circle cx="38" cy="38" r={r} fill="none" stroke="var(--ion-color-primary)" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${c * Math.max(0, Math.min(1, (pct ?? 0) / 100))} ${c}`} transform="rotate(-90 38 38)" />
          <text x="38" y="43" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--ion-text-color)">{pct == null ? '—' : `${Math.round(pct)}%`}</text>
        </svg>
        <div style={{ flex: 1, fontSize: 14.5, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700 }}>{t('Maîtrise estimée')}</div>
          <div className="fdm-muted">{t('{n} chapitres évalués sur {total}', { n: String(data.apercu.chapitres.evalues), total: String(data.apercu.chapitres.total) })}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fdm-gold-strong)', fontWeight: 600 }}>
            <IonIcon icon={flameOutline} />{t('{n} jours actifs sur {sur}', { n: String(data.regularite.jours_actifs), sur: String(data.regularite.sur) })}
          </div>
        </div>
      </div>
    </>
  );
}

function NextTest({ test }: { test: UpcomingTest }) {
  const { openWeb } = useSession();
  return (
    <>
      <div className="fdm-section-label">{t('Prochain devoir')}</div>
      <button type="button" className="fdm-card fdm-pressable" onClick={() => openWeb(`/revisions/ds/${test.id}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, width: 'calc(100% - 32px)', margin: '0 16px', padding: 16, textAlign: 'start', color: 'inherit' }}>
        <span style={{ width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'var(--fdm-gold-soft)', color: 'var(--fdm-gold-strong)' }}>
          <IonIcon icon={calendarOutline} style={{ fontSize: 24 }} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 700 }}>{testTitle(test)} · {whenLabel(test.days_left)}</span>
          <span className="fdm-muted" style={{ fontSize: 13 }}>
            {test.readiness != null ? t('Prêt à {pct} %', { pct: String(Math.round(test.readiness)) }) : test.chapters.map((c) => c.name).join(', ')}
          </span>
        </span>
        <IonIcon flipRtl icon={arrowForward} color="primary" />
      </button>
    </>
  );
}

function Redo({ items }: { items: { id: number; type: 'exercise' | 'exam'; title: string; chapters: string[]; weak_questions: number }[] }) {
  const nav = useNav();
  return (
    <>
      <div className="fdm-section-label">{t('À refaire')}</div>
      <div className="fdm-card" style={{ margin: '0 16px', overflow: 'hidden' }}>
        {items.map((it, i) => (
          <button key={it.id} type="button" className="fdm-pressable" onClick={() => { haptic.tap(); nav.push(() => <ContentScreen id={it.id} kind={it.type} />); }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 16px', textAlign: 'start', color: 'inherit', borderTop: i ? '1px solid var(--fdm-line)' : 'none', background: 'transparent' }}>
            <IonIcon icon={refreshOutline} style={{ color: 'var(--fdm-gold-strong)', fontSize: 20 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 14.5 }}>{it.title}</span>
              <span className="fdm-muted" style={{ fontSize: 12.5 }}>
                {[it.chapters[0], it.weak_questions ? countLabel(it.weak_questions, '{n} question à revoir', '{n} questions à revoir') : ''].filter(Boolean).join(' · ')}
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
