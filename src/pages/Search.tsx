// Recherche (/search?q=…) : exercices, leçons et examens. Le serveur compare le texte sans accents,
// mot par mot (titre, puis chapitre, puis texte). L'élève cherche d'abord dans son niveau (?niveau=tous
// pour tous les niveaux) ; sans résultat, on lui propose les chapitres de son niveau.
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, BookOpen, Loader2, RotateCcw, X } from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { ContentListCard } from '@/components/content/ContentListCard';
import type { ListItem } from '@/components/content/listing/listingUtils';
import { getExercises, getLessons, getExams, getClassLevels } from '@/lib/api';
import { getHub, hubPath, profileLevel, slugify } from '@/lib/api/hubApi';
import { Content } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import { trackAction } from '@/lib/usage';
import { t } from '@/i18n';

type Tab = 'all' | 'exercise' | 'lesson' | 'exam';
type Kind = Exclude<Tab, 'all'>;

/** Raccourcis proposés quand rien n'est trouvé : chapitres du niveau de l'élève, sinon les niveaux. */
interface Suggestion { label: string; url: string; count?: number }

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoading: authLoading, user } = useAuth();
  const myLevel = profileLevel(user);

  // La requête lancée (adresse) est distincte de la saisie : l'en-tête et l'état vide ne bougent pas
  // pendant que l'élève tape.
  const submitted = (searchParams.get('q') || '').trim();
  const allLevels = searchParams.get('niveau') === 'tous';
  const levelId = myLevel && !allLevels ? myLevel.id : null;

  const input = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState(submitted);
  useEffect(() => { setSearchTerm(submitted); }, [submitted]);

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [exercises, setExercises] = useState<Content[]>([]);
  const [lessons, setLessons] = useState<Content[]>([]);
  const [exams, setExams] = useState<Content[]>([]);
  const [suggestions, setSuggestions] = useState<{ title: string; items: Suggestion[] } | null>(null);

  useEffect(() => {
    // Nouvelle recherche : tous les types (un onglet vide ne doit pas cacher les résultats des autres).
    setActiveTab('all');
    if (!submitted) {
      setExercises([]); setLessons([]); setExams([]); setError(false);
      return;
    }
    // Le niveau du profil n'est connu qu'une fois la session chargée : une seule recherche, la bonne.
    setLoading(true);
    setError(false);
    if (authLoading) return;
    let cancelled = false;
    const classLevels = levelId ? [levelId] : undefined;
    Promise.all([
      getExercises({ search: submitted, classLevels, per_page: 20, view: 'card' }),
      getLessons({ search: submitted, classLevels, per_page: 20, view: 'card' }),
      getExams({ search: submitted, classLevels, per_page: 20, view: 'card' }),
    ])
      .then(([ex, le, exa]) => {
        if (cancelled) return;
        setExercises(ex.results);
        setLessons(le.results);
        setExams(exa.results);
        if (!ex.results.length && !le.results.length && !exa.results.length) trackAction('recherche-vide');
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Search failed:', err);
        setError(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [submitted, levelId, attempt, authLoading]);

  // Raccourcis : les chapitres du niveau de l'élève (avec leur nombre d'exercices), sinon les 4 niveaux.
  const levelSlug = myLevel?.slug;
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const done = (s: { title: string; items: Suggestion[] } | null) => { if (!cancelled) setSuggestions(s); };
    if (levelSlug) {
      getHub('exercises', levelSlug)
        .then((hub) => done({
          title: t('Les chapitres du {level}', { level: hub.level.name }),
          items: hub.chapters.filter((c) => c.count > 0).map((c) => ({ label: c.name, url: c.url, count: c.count })),
        }))
        .catch(() => done(null));
    } else {
      getClassLevels('exercise')
        .then((levels) => done({
          title: t('Parcourir les exercices par niveau'),
          items: levels.filter((l) => l.content_count !== 0).map((l) => ({
            label: l.name,
            url: hubPath('exercises', (l as { slug?: string }).slug || slugify(l.name)),
            count: l.content_count ?? undefined,
          })),
        }))
        .catch(() => done(null));
    }
    return () => { cancelled = true; };
  }, [levelSlug, authLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    // Compté ici, que la recherche vienne d'un téléphone ou d'un ordinateur.
    trackAction('recherche');
    const next = new URLSearchParams(searchParams);
    next.set('q', q);
    navigate(`/search?${next.toString()}`);
  };

  const setLevelScope = (all: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (all) next.set('niveau', 'tous'); else next.delete('niveau');
    setSearchParams(next, { replace: true });
  };

  const clearSearch = () => {
    setSearchTerm('');
    input.current?.focus();
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    navigate(`/search${next.toString() ? `?${next}` : ''}`);
  };

  // Chaque résultat garde son type : la carte (la même que dans les listes) en dépend pour son aperçu et ses votes.
  const tag = (kind: Kind) => (c: Content) => ({ kind, content: c });
  const byKind = { exercise: exercises.map(tag('exercise')), lesson: lessons.map(tag('lesson')), exam: exams.map(tag('exam')) };
  const allResults = [...byKind.exercise, ...byKind.lesson, ...byKind.exam];
  const totalResults = allResults.length;
  const filteredResults = activeTab === 'all' ? allResults : byKind[activeTab];

  const TABS: { id: Tab; label: string; count: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'all',      label: 'Tout',      count: totalResults,     icon: SearchIcon },
    { id: 'exercise', label: 'Exercices', count: exercises.length, icon: BookOpen },
    { id: 'lesson',   label: 'Leçons',    count: lessons.length,   icon: LessonIcon },
    { id: 'exam',     label: 'Examens',   count: exams.length,     icon: APlusIcon },
  ];

  const scope = levelId && myLevel ? ` ${t('en {level}', { level: myLevel.name })}` : '';

  const suggestionBlock = suggestions && suggestions.items.length > 0 && (
    <div className="mt-6 text-start">
      <p className="text-[12.5px] font-semibold text-ink-soft mb-2">{suggestions.title}</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.items.map((s) => (
          <Link key={s.url} to={s.url}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 text-[13px] text-ink-soft hover:border-ink hover:text-ink">
            {s.label}{s.count != null && <span className="fd-nums text-ink-faint">{s.count}</span>}
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper">
      <SEO
        title={submitted ? `Recherche : ${submitted} - Fidni` : 'Recherche - Fidni'}
        description={submitted ? `Résultats de recherche pour « ${submitted} »` : 'Trouve un exercice, une leçon ou un examen.'}
        noindex
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <header className="mb-5 border-t-2 border-ink pt-4 sm:pt-6">
          <h1 className="fd-display text-3xl leading-tight text-ink sm:text-4xl">{t('Recherche')}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t('Trouve un exercice, une leçon ou un examen. Pas besoin des accents : « derivee » trouve « dérivée ».')}</p>
        </header>
        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          data-tour="recherche-barre"
          role="search"
          className="mb-4 flex items-center rounded-xl border border-line bg-white focus-within:border-brand"
          style={{ padding: 6, paddingInlineStart: 14, gap: 8 }}
        >
          <SearchIcon className="w-4 h-4 shrink-0 text-ink-soft" />
          <input
            type="search"
            enterKeyHint="search"
            aria-label={t('Rechercher')}
            placeholder={t('Un exercice, une leçon, un théorème…')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus={!submitted}
            ref={input}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] text-ink outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label={t('Effacer')}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button type="submit" className="fd-btn-primary shrink-0" style={{ padding: '9px 16px', minHeight: 40 }}>
            {t('Rechercher')}
          </button>
        </form>

        {/* Niveau : celui du profil par défaut, ou tous. */}
        {myLevel && (
          <div role="radiogroup" aria-label={t('Niveau')} className="flex flex-wrap items-center gap-2 mb-5">
            <button type="button" role="radio" aria-checked={!allLevels} onClick={() => setLevelScope(false)}
              className={`fd-pill ${!allLevels ? 'is-active' : ''}`} style={{ padding: '8px 14px', fontSize: 12.5, minHeight: 38 }}>
              {myLevel.name}
            </button>
            <button type="button" role="radio" aria-checked={allLevels} onClick={() => setLevelScope(true)}
              className={`fd-pill ${allLevels ? 'is-active' : ''}`} style={{ padding: '8px 14px', fontSize: 12.5, minHeight: 38 }}>
              {t('Tous les niveaux')}
            </button>
          </div>
        )}

        {submitted ? (
          <>
            {/* Tabs as filter pills */}
            {!loading && !error && totalResults > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-5" data-tour="recherche-onglets">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-pressed={activeTab === tab.id}
                      disabled={tab.count === 0}
                      onClick={() => setActiveTab(tab.id)}
                      className={`fd-pill disabled:opacity-50 ${activeTab === tab.id ? 'is-active' : ''}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', fontSize: 12, minHeight: 38,
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {t(tab.label)}
                      <span style={{ fontFamily: 'var(--fd-mono)', fontSize: 10, opacity: .8, marginInlineStart: 2 }}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center" style={{ padding: '60px 0' }} role="status">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-ink" />
                <p className="text-[13px] text-ink-soft">{t('Recherche en cours…')}</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] p-4 sm:flex-row sm:items-center">
                <p className="flex-1 text-[14px] font-medium text-[#a23b34]">{t('La recherche n’a pas abouti. Vérifie ta connexion.')}</p>
                <button type="button" onClick={() => setAttempt((n) => n + 1)}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#e8c4bf] bg-white px-4 text-[13.5px] font-semibold text-ink hover:bg-[#fdf6f5]">
                  <RotateCcw className="h-4 w-4" /> {t('Réessayer')}
                </button>
              </div>
            )}

            {/* Results */}
            {!loading && !error && (
              filteredResults.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-[12.5px] text-ink-soft">
                      <span className="fd-nums font-semibold text-ink">
                        {filteredResults.length}
                      </span>{' '}
                      {filteredResults.length > 1 ? t('résultats pour «') : t('résultat pour «')}&nbsp;
                      <span className="font-semibold text-ink">{submitted}</span>&nbsp;»{scope}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredResults.map(({ kind, content }) => (
                      <div key={`${kind}-${content.id}`}>
                        <ContentListCard content={content as unknown as ListItem} contentType={kind} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="fd-card text-center" style={{ padding: '40px 20px' }}>
                  <h3 className="fd-display text-xl text-ink">
                    {t('Aucun résultat pour « {q} »', { q: submitted })}{scope}
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-md text-[13px] text-ink-soft">
                    {t('Essaie un mot plus court ou plus général (« limites », « suites »), ou parcours les chapitres.')}
                  </p>
                  {levelId && (
                    <button type="button" onClick={() => setLevelScope(true)} className="fd-btn-primary inline-flex" style={{ marginTop: 16 }}>
                      {t('Chercher dans tous les niveaux')}
                    </button>
                  )}
                  <div className="max-w-2xl mx-auto">{suggestionBlock}</div>
                </div>
              )
            )}
          </>
        ) : (
          suggestionBlock
        )}
      </div>
    </div>
  );
}
