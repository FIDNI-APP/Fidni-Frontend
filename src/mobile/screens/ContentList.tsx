/**
 * Contenus d'un chapitre (ou d'une année du Bac), page par page en défilant, avec les tris et filtres du site
 * (components/search : Pour toi / plus faciles / plus aimés / récents / anciens ; difficulté ; Tous · À faire ·
 * À revoir · Réussis · Jamais ouverts). Une barre discrète « Trier » et « Filtres », le reste en feuille.
 */
import { useEffect, useState } from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonModal, IonTitle,
  IonToolbar, useIonActionSheet,
} from '@ionic/react';
import { chatbubbleOutline, chevronDown, chevronForward, eyeOutline, optionsOutline, schoolOutline, swapVerticalOutline, thumbsUpOutline } from 'ionicons/icons';
import { useAuth } from '@/contexts/AuthContext';
import { examContentAPI, exerciseContentAPI, lessonContentAPI } from '@/lib/api/contentItemApi';
import type { ContentExamFilters, ListSort } from '@/types/content';
import type { Difficulty } from '@/types';
import { t } from '@/i18n';
import { useNav } from '../nav';
import { DifficultyChip, Empty, ErrorState, Loading, Screen, StatusChip, countLabel, haptic, useLoad } from '../ui';
import { ContentScreen, type ContentKind } from './ContentScreen';

interface ListItem {
  id: number; title: string; difficulty?: string | null; user_complete?: 'success' | 'review' | null;
  item_count?: number; view_count?: number; like_count?: number; comment_count?: number;
  recommendation_reason?: string | null;
}

type ListPage = { results: unknown[]; next: string | null };
const LISTS: Record<ContentKind, { list: (filters: ContentExamFilters, page: number) => Promise<ListPage> }> = {
  exercise: exerciseContentAPI, exam: examContentAPI, lesson: lessonContentAPI,
};

type Status = 'all' | 'todo' | 'review' | 'success' | 'unseen';
const STATUS: { id: Status; label: string }[] = [
  { id: 'all', label: 'Tous' }, { id: 'todo', label: 'À faire' }, { id: 'review', label: 'À revoir' },
  { id: 'success', label: 'Réussis' }, { id: 'unseen', label: 'Jamais ouverts' },
];
const STATUS_QUERY: Record<Status, ContentExamFilters> = {
  all: {}, todo: { todo: true }, review: { showFailed: true }, success: { showCompleted: true }, unseen: { hideViewed: true },
};
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const DIFF_LABEL: Record<string, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };

export function ContentListScreen({ title, kind, filters }: { title: string; kind: ContentKind; filters: ContentExamFilters }) {
  const { isAuthenticated } = useAuth();
  const nav = useNav();
  const [sheet] = useIonActionSheet();
  const [sort, setSort] = useState<ListSort>((filters.sort as ListSort) || 'recommended');
  const [difficulties, setDifficulties] = useState<Difficulty[]>(filters.difficulties ?? []);
  const [status, setStatus] = useState<Status>(filters.todo ? 'todo' : 'all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [items, setItems] = useState<ListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Tri, difficulté et « À faire » reçus servent de valeurs de départ ; la barre de filtres les remplace.
  const base: ContentExamFilters = { ...filters };
  delete base.todo; delete base.difficulties; delete base.sort;
  const query: ContentExamFilters = {
    ...base, sort, ...(difficulties.length ? { difficulties } : {}), ...STATUS_QUERY[status],
    ...(kind !== 'lesson' ? { view: 'card' as const } : {}),
    ...(kind === 'exam' && filters.is_national === undefined ? { is_national: false } : {}),
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

  const sorts: { id: ListSort; label: string }[] = [
    { id: 'recommended', label: isAuthenticated ? t('Pour toi') : t('Recommandés') },
    ...(kind !== 'lesson' ? [{ id: 'easiest' as ListSort, label: t('Du plus facile au plus difficile') }] : []),
    { id: 'most_upvoted', label: t('Plus aimés') },
    { id: 'newest', label: t('Plus récents') },
    { id: 'oldest', label: t('Plus anciens') },
  ];
  const chooseSort = () => {
    haptic.tap();
    void sheet({
      header: t('Trier'),
      buttons: [
        ...sorts.map((s) => ({ text: `${s.id === sort ? '✓  ' : ''}${s.label}`, handler: () => setSort(s.id) })),
        { text: t('Annuler'), role: 'cancel' },
      ],
    });
  };
  const activeFilters = difficulties.length + (status !== 'all' ? 1 : 0);

  const pill = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 18, fontSize: 14, fontWeight: 600,
    background: active ? 'var(--fdm-brand-soft)' : 'var(--fdm-card)', color: active ? 'var(--ion-color-primary)' : 'var(--ion-text-color)',
    border: `1px solid ${active ? 'var(--ion-color-primary)' : 'var(--fdm-line)'}`,
  });
  const chip = (active: boolean): React.CSSProperties => ({
    height: 38, padding: '0 16px', borderRadius: 19, fontSize: 14.5, fontWeight: 600,
    background: active ? 'var(--ion-color-primary)' : 'var(--fdm-card)', color: active ? '#fff' : 'var(--ion-text-color)',
    border: active ? 'none' : '1px solid var(--fdm-line)',
  });

  return (
    <Screen title={title} onRefresh={first.reload}>
      <div style={{ display: 'flex', gap: 8, padding: '14px 16px 2px' }}>
        <button type="button" className="fdm-pressable" style={pill(false)} onClick={chooseSort}>
          <IonIcon icon={swapVerticalOutline} />{sorts.find((s) => s.id === sort)?.label}<IonIcon icon={chevronDown} />
        </button>
        {kind !== 'lesson' && (
          <button type="button" className="fdm-pressable" style={pill(activeFilters > 0)} onClick={() => { haptic.tap(); setFiltersOpen(true); }}>
            <IonIcon icon={optionsOutline} />{t('Filtres')}{activeFilters ? ` · ${activeFilters}` : ''}
          </button>
        )}
      </div>

      {first.loading && !first.data && <Loading />}
      {first.error && !first.data ? <ErrorState onRetry={first.reload} /> : null}
      <div style={{ padding: '10px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <button key={it.id} type="button" className="fdm-card fdm-pressable" onClick={() => { haptic.tap(); nav.push(() => <ContentScreen id={it.id} kind={kind} />); }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', textAlign: 'start', color: 'inherit' }}>
            <span className="fdm-muted" style={{ width: 22, fontWeight: 700, fontSize: 14 }}>{i + 1}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="fdm-title" style={{ display: 'block', fontSize: 16.5, fontWeight: 600, lineHeight: 1.3 }}>{it.title}</span>
              {sort === 'recommended' && isAuthenticated && it.recommendation_reason && (
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ion-color-primary)', fontWeight: 600, marginTop: 4 }}>{it.recommendation_reason}</span>
              )}
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8, alignItems: 'center', fontSize: 12.5 }} className="fdm-muted">
                <DifficultyChip value={it.difficulty} />
                <StatusChip value={it.user_complete} />
                {it.item_count ? <span>{countLabel(it.item_count, '{n} question', '{n} questions')}</span> : null}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IonIcon icon={thumbsUpOutline} />{it.like_count ?? 0}</span>
                {it.comment_count ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IonIcon icon={chatbubbleOutline} />{it.comment_count}</span> : null}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IonIcon icon={eyeOutline} />{it.view_count ?? 0}</span>
              </span>
            </span>
            <IonIcon flipRtl icon={chevronForward} className="fdm-muted" />
          </button>
        ))}
        {first.data && !items.length && (
          <Empty icon={schoolOutline} title={status === 'todo' ? t('Tout est fait ici, bravo !') : t('Rien ici pour l’instant')}
            text={activeFilters ? t('Essaie d’enlever un filtre.') : undefined} />
        )}
      </div>
      <IonInfiniteScroll disabled={!hasMore} onIonInfinite={async (e) => { try { await more(); } finally { e.target.complete(); } }}>
        <IonInfiniteScrollContent />
      </IonInfiniteScroll>

      {/* Visiteur : la difficulté seulement (l'avancement demande un compte), feuille plus basse. */}
      <IonModal isOpen={filtersOpen} onDidDismiss={() => setFiltersOpen(false)}
        initialBreakpoint={isAuthenticated ? 0.55 : 0.35} breakpoints={[0, isAuthenticated ? 0.55 : 0.35, 0.85]}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{t('Filtres')}</IonTitle>
            <IonButtons slot="start">
              <IonButton disabled={!activeFilters} onClick={() => { setDifficulties([]); setStatus('all'); }}>{t('Effacer')}</IonButton>
            </IonButtons>
            <IonButtons slot="end"><IonButton strong onClick={() => setFiltersOpen(false)}>{t('OK')}</IonButton></IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="fdm-plain">
          <div style={{ padding: '6px 16px 24px' }}>
            <div className="fdm-section-label" style={{ margin: '14px 4px 10px' }}>{t('Difficulté')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DIFFICULTIES.map((d) => {
                const on = difficulties.includes(d);
                return (
                  <button key={d} type="button" style={chip(on)} onClick={() => {
                    haptic.tap();
                    setDifficulties((cur) => (on ? cur.filter((x) => x !== d) : [...cur, d]));
                  }}>{t(DIFF_LABEL[d])}</button>
                );
              })}
            </div>
            {isAuthenticated && (
              <>
                <div className="fdm-section-label" style={{ margin: '22px 4px 10px' }}>{t('Mon avancement')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STATUS.map((s) => (
                    <button key={s.id} type="button" style={chip(status === s.id)} onClick={() => { haptic.tap(); setStatus(s.id); }}>{t(s.label)}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </IonContent>
      </IonModal>
    </Screen>
  );
}
