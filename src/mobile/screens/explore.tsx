/**
 * Onglet « Explorer » : Exercices / Cours / Devoirs, le niveau (celui de l'élève d'abord), les chapitres du
 * programme dans l'ordre (dossiers du site : GET /api/hubs/), puis les contenus d'un chapitre, les plus utiles à
 * l'élève d'abord (« Pour toi », sort=recommended). Bac national par année dans Devoirs.
 */
import { useEffect, useState } from 'react';
import {
  IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonSegment, IonSegmentButton, IonToggle,
} from '@ionic/react';
import { chevronForward, folderOpenOutline, ribbonOutline, schoolOutline } from 'ionicons/icons';
import { useAuth } from '@/contexts/AuthContext';
import { getHub, getLevelFolders, getNationalYears, profileLevel, type HubFolder, type HubSection, type LevelFolder } from '@/lib/api/hubApi';
import { examContentAPI, exerciseContentAPI, lessonContentAPI } from '@/lib/api/contentItemApi';
import type { ContentExamFilters } from '@/types/content';
import { t } from '@/i18n';
import { useNav } from '../nav';
import { countLabel, DifficultyChip, Empty, ErrorState, Loading, Screen, StatusChip, haptic, useLoad } from '../ui';
import { ContentScreen, type ContentKind } from './ContentScreen';

const SECTIONS: { key: HubSection; label: string; kind: ContentKind }[] = [
  { key: 'exercises', label: 'Exercices', kind: 'exercise' },
  { key: 'lessons', label: 'Cours', kind: 'lesson' },
  { key: 'exams', label: 'Devoirs', kind: 'exam' },
];
const LEVEL_KEY = 'fdm:niveau';

export function ExploreRoot() {
  const { user } = useAuth();
  const nav = useNav();
  const [section, setSection] = useState<HubSection>('exercises');
  const mine = profileLevel(user);
  const [levelSlug, setLevelSlug] = useState<string | null>(() => {
    try { return mine?.slug ?? localStorage.getItem(LEVEL_KEY); } catch { return mine?.slug ?? null; }
  });
  useEffect(() => { if (mine?.slug) setLevelSlug(mine.slug); }, [mine?.slug]);

  const levels = useLoad(() => getLevelFolders(section), [section]);
  const available = (levels.data?.levels ?? []).filter((l) => l.count > 0);
  const current = available.find((l) => l.slug === levelSlug) ?? available[0];

  const [refreshKey, setRefreshKey] = useState(0);

  const chooseLevel = (l: LevelFolder) => {
    haptic.tap();
    setLevelSlug(l.slug);
    try { localStorage.setItem(LEVEL_KEY, l.slug); } catch { /* stockage indisponible */ }
  };

  return (
    <Screen title={t('Explorer')} back={false} large onRefresh={async () => { await levels.reload(); setRefreshKey((k) => k + 1); }}>
      <div style={{ padding: '6px 16px 0' }}>
        <IonSegment value={section} onIonChange={(e) => { haptic.tap(); setSection(e.detail.value as HubSection); }}>
          {SECTIONS.map((s) => <IonSegmentButton key={s.key} value={s.key}><IonLabel>{t(s.label)}</IonLabel></IonSegmentButton>)}
        </IonSegment>
      </div>

      {levels.loading && !levels.data && <Loading />}
      {levels.error && !levels.data ? <ErrorState onRetry={levels.reload} /> : null}

      {available.length > 0 && (
        <div className="fdm-hscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '14px 16px 2px' }}>
          {available.map((l) => {
            const active = l.slug === current?.slug;
            return (
              <button key={l.slug} type="button" onClick={() => chooseLevel(l)} className="fdm-pressable" style={{
                flexShrink: 0, height: 36, padding: '0 16px', borderRadius: 18, fontSize: 14, fontWeight: 600,
                background: active ? 'var(--ion-color-primary)' : 'var(--fdm-card)', color: active ? '#fff' : 'var(--ion-text-color)',
                border: active ? 'none' : '1px solid var(--fdm-line)',
              }}>{l.name}</button>
            );
          })}
        </div>
      )}

      {section === 'exams' && (
        <button type="button" className="fdm-card fdm-pressable" onClick={() => nav.push(() => <NationalYears />)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, width: 'calc(100% - 32px)', margin: '16px 16px 0', padding: '14px 16px', textAlign: 'start', color: 'inherit' }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--fdm-gold-soft)', color: 'var(--fdm-gold-strong)' }}>
            <IonIcon icon={ribbonOutline} style={{ fontSize: 22 }} />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 700 }}>{t('Bac national')}</span>
            <span className="fdm-muted" style={{ fontSize: 13 }}>{t('Les sujets corrigés, année par année')}</span>
          </span>
          <IonIcon flipRtl icon={chevronForward} className="fdm-muted" />
        </button>
      )}

      {current && <ChapterFolders key={`${section}-${current.slug}-${refreshKey}`} section={section} level={current} />}
    </Screen>
  );
}

/** Chapitres d'un niveau dans une rubrique, dans l'ordre du programme, avec la progression de l'élève. */
function ChapterFolders({ section, level }: { section: HubSection; level: LevelFolder }) {
  const nav = useNav();
  const hub = useLoad(() => getHub(section, level.slug), [section, level.slug]);
  const folders = (hub.data?.folders ?? hub.data?.chapters ?? []) as HubFolder[];
  const kind = SECTIONS.find((s) => s.key === section)!.kind;
  return (
    <>
      <div className="fdm-section-label">{t('Chapitres')}</div>
      {hub.loading && !hub.data && <Loading />}
      {hub.error && !hub.data ? <ErrorState onRetry={hub.reload} /> : null}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {folders.map((f, i) => (
          <ChapterRow key={f.slug} folder={f} number={i + 1} onOpen={() => f.count > 0 && nav.push(() => (
            <ContentListScreen title={f.name} kind={kind} filters={{ classLevels: [String(level.id)], chapters: [String(f.id)] }} />
          ))} />
        ))}
        {hub.data && !folders.length && <Empty icon={folderOpenOutline} title={t('Rien ici pour l’instant')} />}
      </div>
    </>
  );
}

/** Un niveau ouvert depuis l'accueil : ses chapitres. */
export function LevelScreen({ section, level }: { section: HubSection; level: LevelFolder }) {
  return (
    <Screen title={level.name}>
      <ChapterFolders section={section} level={level} />
    </Screen>
  );
}

function ChapterRow({ folder, number, onOpen }: { folder: HubFolder; number: number; onOpen: () => void }) {
  const empty = folder.count === 0;
  const done = folder.mine?.done ?? 0;
  const pct = folder.count ? Math.min(1, done / folder.count) : 0;
  return (
    <button type="button" onClick={onOpen} disabled={empty} className="fdm-card fdm-pressable" style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', textAlign: 'start', color: 'inherit', opacity: empty ? .5 : 1,
    }}>
      {/* Progression de l'élève connecté (`mine`) ; sinon le numéro du chapitre dans le programme. */}
      {folder.mine ? <Ring pct={pct} /> : (
        <span className="fdm-title" style={{
          flexShrink: 0, width: 42, height: 42, borderRadius: 21, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 600,
          background: 'var(--fdm-brand-soft)', color: 'var(--ion-color-primary)',
        }}>{number}</span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 650, fontSize: 15.5 }}>{folder.name}</span>
        <span className="fdm-muted" style={{ fontSize: 13 }}>
          {empty ? t('Bientôt') : done ? t('{done} faits sur {n}', { done: String(done), n: String(folder.count) }) : countLabel(folder.count, '{n} contenu', '{n} contenus')}
        </span>
      </span>
      {!empty && <IonIcon flipRtl icon={chevronForward} className="fdm-muted" />}
    </button>
  );
}

/** Anneau de progression d'un chapitre (part des contenus terminés). */
function Ring({ pct }: { pct: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
      <circle cx="21" cy="21" r={r} fill="none" stroke="var(--fdm-line)" strokeWidth="4" />
      <circle cx="21" cy="21" r={r} fill="none" stroke="var(--ion-color-primary)" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 21 21)" />
      <text x="21" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ion-text-color)">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

interface ListItem {
  id: number; title: string; difficulty?: string | null; user_complete?: 'success' | 'review' | null;
  item_count?: number; national_year?: number | null;
}

type ListPage = { results: unknown[]; next: string | null };
const LISTS: Record<ContentKind, { list: (filters: ContentExamFilters, page: number) => Promise<ListPage> }> = {
  exercise: exerciseContentAPI, exam: examContentAPI, lesson: lessonContentAPI,
};

/** Contenus d'un chapitre (ou d'une année du Bac), page par page en défilant ; « À faire » cache ce qui est réussi. */
export function ContentListScreen({ title, kind, filters }: { title: string; kind: ContentKind; filters: ContentExamFilters }) {
  const { isAuthenticated } = useAuth();
  const nav = useNav();
  const [todo, setTodo] = useState(false);
  const [items, setItems] = useState<ListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const query: ContentExamFilters = {
    ...filters, sort: 'recommended', ...(kind !== 'lesson' ? { view: 'card' as const } : {}),
    ...(kind === 'exam' && filters.is_national === undefined ? { is_national: false } : {}), ...(todo ? { todo: true } : {}),
  };
  const first = useLoad(() => LISTS[kind].list(query, 1), [JSON.stringify(query), isAuthenticated]);
  useEffect(() => {
    if (!first.data) return;
    setItems(first.data.results as unknown as ListItem[]);
    setPage(1);
    setHasMore(!!first.data.next);
  }, [first.data]);

  const more = async () => {
    const r = await LISTS[kind].list(query, page + 1);
    setItems((cur) => [...cur, ...(r.results as unknown as ListItem[])]);
    setPage(page + 1);
    setHasMore(!!r.next);
  };

  return (
    <Screen title={title} onRefresh={first.reload}>
      {isAuthenticated && kind !== 'lesson' && (
        <div className="fdm-card" style={{ margin: '14px 16px 4px', padding: '4px 16px', display: 'flex', alignItems: 'center' }}>
          <IonToggle checked={todo} onIonChange={(e) => { haptic.tap(); setTodo(e.detail.checked); }} justify="space-between" style={{ width: '100%' }}>
            {t('Seulement ce qu’il me reste à faire')}
          </IonToggle>
        </div>
      )}
      {first.loading && !first.data && <Loading />}
      {first.error && !first.data ? <ErrorState onRetry={first.reload} /> : null}
      <div style={{ padding: '10px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <button key={it.id} type="button" className="fdm-card fdm-pressable" onClick={() => { haptic.tap(); nav.push(() => <ContentScreen id={it.id} kind={kind} />); }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', textAlign: 'start', color: 'inherit' }}>
            <span className="fdm-muted" style={{ width: 22, fontWeight: 700, fontSize: 14 }}>{i + 1}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="fdm-title" style={{ display: 'block', fontSize: 16.5, fontWeight: 600, lineHeight: 1.3 }}>{it.title}</span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
                <DifficultyChip value={it.difficulty} />
                <StatusChip value={it.user_complete} />
                {it.item_count ? <span className="fdm-muted" style={{ fontSize: 12.5 }}>{countLabel(it.item_count, '{n} question', '{n} questions')}</span> : null}
              </span>
            </span>
            <IonIcon flipRtl icon={chevronForward} className="fdm-muted" />
          </button>
        ))}
        {first.data && !items.length && (
          <Empty icon={schoolOutline} title={todo ? t('Tout est fait ici, bravo !') : t('Rien ici pour l’instant')} />
        )}
      </div>
      <IonInfiniteScroll disabled={!hasMore} onIonInfinite={async (e) => { try { await more(); } finally { e.target.complete(); } }}>
        <IonInfiniteScrollContent />
      </IonInfiniteScroll>
    </Screen>
  );
}

export function NationalYears() {
  const nav = useNav();
  const years = useLoad(getNationalYears, []);
  return (
    <Screen title={t('Bac national')} onRefresh={years.reload}>
      {years.loading && !years.data && <Loading />}
      {years.error && !years.data ? <ErrorState onRetry={years.reload} /> : null}
      <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(years.data?.years ?? []).filter((y) => y.count > 0).map((y) => (
          <button key={String(y.year)} type="button" className="fdm-card fdm-pressable"
            onClick={() => nav.push(() => (
              <ContentListScreen title={y.year ? t('Bac {annee}', { annee: String(y.year) }) : t('Sans année')} kind="exam"
                filters={{ is_national: true, national_year: y.year ?? 'aucune' } as ContentExamFilters} />
            ))}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', textAlign: 'start', color: 'inherit' }}>
            <span className="fdm-title" style={{ fontSize: 22, fontWeight: 600, width: 64 }}>{y.year ?? '—'}</span>
            <span style={{ flex: 1 }} className="fdm-muted">{countLabel(y.count, '{n} sujet', '{n} sujets')}{y.levels.length ? ` · ${y.levels.join(', ')}` : ''}</span>
            <IonIcon flipRtl icon={chevronForward} className="fdm-muted" />
          </button>
        ))}
      </div>
    </Screen>
  );
}
