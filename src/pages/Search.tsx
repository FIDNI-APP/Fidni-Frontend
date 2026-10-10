// Recherche (/search?q=…) : exercices, leçons et examens. Le serveur compare le texte sans accents,
// mot par mot (titre, puis chapitre, puis texte). L'élève cherche d'abord dans son niveau (?niveau=tous
// pour tous les niveaux) ; sans résultat, on lui propose les chapitres de son niveau.
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, BookOpen, Loader2, RotateCcw, X } from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { HomeContentCard } from '@/components/content/HomeContentCard';
import { getExercises, getLessons, getExams, getClassLevels, voteExercise, voteLesson, voteExam } from '@/lib/api';
import { getHub, hubPath, profileLevel, slugify } from '@/lib/api/hubApi';
import { Content, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { SEO } from '@/components/layout/SEO';
import { trackAction } from '@/lib/usage';

type Tab = 'all' | 'exercise' | 'lesson' | 'exam';
type Kind = Exclude<Tab, 'all'>;

/** Raccourcis proposés quand rien n'est trouvé : chapitres du niveau de l'élève, sinon les niveaux. */
interface Suggestion { label: string; url: string; count?: number }

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { openModal } = useAuthModal();
  const myLevel = profileLevel(user);

  // La requête lancée (adresse) est distincte de la saisie : l'en-tête et l'état vide ne bougent pas
  // pendant que l'élève tape.
  const submitted = (searchParams.get('q') || '').trim();
  const allLevels = searchParams.get('niveau') === 'tous';
  const levelId = myLevel && !allLevels ? myLevel.id : null;

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
      getExercises({ search: submitted, classLevels, per_page: 20 }),
      getLessons({ search: submitted, classLevels, per_page: 20 }),
      getExams({ search: submitted, classLevels, per_page: 20 }),
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
          title: `Les chapitres du ${hub.level.name}`,
          items: hub.chapters.filter((c) => c.count > 0).map((c) => ({ label: c.name, url: c.url, count: c.count })),
        }))
        .catch(() => done(null));
    } else {
      getClassLevels('exercise')
        .then((levels) => done({
          title: 'Parcourir les exercices par niveau',
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

  // Le bon vote selon le type du contenu (et la bonne liste à mettre à jour).
  const handleVote = async (id: string, value: VoteValue, contentType?: Kind) => {
    if (!isAuthenticated) { openModal('vote'); return; }
    const kind: Kind = contentType
      ?? (lessons.some((i) => String(i.id) === id) ? 'lesson' : exams.some((i) => String(i.id) === id) ? 'exam' : 'exercise');
    const vote = kind === 'lesson' ? voteLesson : kind === 'exam' ? voteExam : voteExercise;
    const setList = kind === 'lesson' ? setLessons : kind === 'exam' ? setExams : setExercises;
    try {
      // Seulement les compteurs : la ligne renvoyée par le vote n'a pas la forme d'un résultat de liste.
      const updated = await vote(id, value) as Partial<Content> | undefined;
      if (updated) {
        setList((p) => p.map((i) => (String(i.id) === id ? {
          ...i,
          like_count: updated.like_count ?? i.like_count,
          dislike_count: updated.dislike_count ?? i.dislike_count,
          vote_count: updated.vote_count ?? i.vote_count,
          // Vote retiré : null côté serveur.
          user_vote: 'user_vote' in updated ? (updated.user_vote ?? 0) : i.user_vote,
        } : i)));
      }
    } catch (err) { console.error('Failed to vote:', err); }
  };

  const clearSearch = () => {
    setSearchTerm('');
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    navigate(`/search${next.toString() ? `?${next}` : ''}`);
  };

  const allResults = [...exercises, ...lessons, ...exams];
  const totalResults = allResults.length;
  const filteredResults =
    activeTab === 'exercise' ? exercises :
    activeTab === 'lesson' ? lessons :
    activeTab === 'exam' ? exams :
    allResults;

  const TABS: { id: Tab; label: string; count: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'all',      label: 'Tout',      count: totalResults,     icon: SearchIcon },
    { id: 'exercise', label: 'Exercices', count: exercises.length, icon: BookOpen },
    { id: 'lesson',   label: 'Leçons',    count: lessons.length,   icon: LessonIcon },
    { id: 'exam',     label: 'Examens',   count: exams.length,     icon: APlusIcon },
  ];

  const scope = levelId && myLevel ? ` en ${myLevel.name}` : '';

  const suggestionBlock = suggestions && suggestions.items.length > 0 && (
    <div className="mt-6 text-left">
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
    <div style={{ minHeight: '100vh', background: '#faf9f7' }}>
      <SEO
        title={submitted ? `Recherche : ${submitted} - Fidni` : 'Recherche - Fidni'}
        description={submitted ? `Résultats de recherche pour « ${submitted} »` : 'Trouve un exercice, une leçon ou un examen.'}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-5">
          <span
            className="inline-flex items-center gap-1.5"
            style={{
              background: '#f2f1ee', color: '#000000',
              padding: '4px 12px', borderRadius: 99,
              fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
            }}
          >
            <SearchIcon className="w-3 h-3" /> RECHERCHE
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.03em', marginTop: 10 }}>
            Recherche
          </h1>
          <p style={{ fontSize: 13, color: '#6b6862', marginTop: 4 }}>
            Trouve un exercice, une leçon ou un examen. Pas besoin des accents : « derivee » trouve « dérivée ».
          </p>
        </div>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          data-tour="recherche-barre"
          role="search"
          className="fd-card flex items-center mb-4"
          style={{ padding: 6, paddingLeft: 14, gap: 8 }}
        >
          <SearchIcon className="w-4 h-4 shrink-0" style={{ color: '#6b6862' }} />
          <input
            type="search"
            enterKeyHint="search"
            aria-label="Rechercher"
            placeholder="Un exercice, une leçon, un théorème…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus={!submitted}
            className="min-w-0 flex-1"
            style={{
              border: 'none', outline: 'none',
              background: 'transparent', fontSize: 15, fontFamily: 'DM Sans',
              color: '#1a1a1a', padding: '10px 0',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Effacer"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button type="submit" className="fd-btn-primary shrink-0" style={{ padding: '9px 16px', minHeight: 40 }}>
            Rechercher
          </button>
        </form>

        {/* Niveau : celui du profil par défaut, ou tous. */}
        {myLevel && (
          <div role="radiogroup" aria-label="Niveau" className="flex flex-wrap items-center gap-2 mb-5">
            <button type="button" role="radio" aria-checked={!allLevels} onClick={() => setLevelScope(false)}
              className={`fd-pill ${!allLevels ? 'is-active' : ''}`} style={{ padding: '8px 14px', fontSize: 12.5, minHeight: 38 }}>
              {myLevel.name}
            </button>
            <button type="button" role="radio" aria-checked={allLevels} onClick={() => setLevelScope(true)}
              className={`fd-pill ${allLevels ? 'is-active' : ''}`} style={{ padding: '8px 14px', fontSize: 12.5, minHeight: 38 }}>
              Tous les niveaux
            </button>
          </div>
        )}

        {submitted ? (
          <>
            {/* Tabs as filter pills */}
            {!loading && !error && totalResults > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-5" data-tour="recherche-onglets">
                {TABS.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={`fd-pill ${activeTab === t.id ? 'is-active' : ''}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', fontSize: 12, minHeight: 38,
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {t.label}
                      <span style={{ fontFamily: 'DM Mono', fontSize: 10, opacity: .8, marginLeft: 2 }}>
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center" style={{ padding: '60px 0' }} role="status">
                <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: '#1a1a1a' }} />
                <p style={{ fontSize: 13, color: '#6b6862' }}>Recherche en cours…</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] p-4 sm:flex-row sm:items-center">
                <p className="flex-1 text-[14px] font-medium text-[#a23b34]">La recherche n’a pas abouti. Vérifie ta connexion.</p>
                <button type="button" onClick={() => setAttempt((n) => n + 1)}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#e8c4bf] bg-white px-4 text-[13.5px] font-semibold text-ink hover:bg-[#fdf6f5]">
                  <RotateCcw className="h-4 w-4" /> Réessayer
                </button>
              </div>
            )}

            {/* Results */}
            {!loading && !error && (
              filteredResults.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p style={{ fontSize: 12.5, color: '#6b6862' }}>
                      <span style={{ fontFamily: 'DM Mono', color: '#1a1a1a', fontWeight: 600 }}>
                        {filteredResults.length}
                      </span>{' '}
                      résultat{filteredResults.length > 1 ? 's' : ''} pour «&nbsp;
                      <span style={{ color: '#000000', fontWeight: 600 }}>{submitted}</span>&nbsp;»{scope}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredResults.map((content, idx) => (
                      <div key={`${content.type}-${content.id}`} className="animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                        <HomeContentCard content={content} onVote={handleVote} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="fd-card text-center" style={{ padding: '40px 20px' }}>
                  <div
                    className="inline-flex items-center justify-center mx-auto mb-4"
                    style={{
                      width: 64, height: 64, borderRadius: 16,
                      background: 'linear-gradient(135deg,#f2f1ee,#faf9f7)', color: '#6b6862',
                    }}
                  >
                    <SearchIcon className="w-7 h-7" />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                    Aucun résultat pour « {submitted} »{scope}
                  </h3>
                  <p style={{ fontSize: 13, color: '#6b6862', marginTop: 6, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                    Essaie un mot plus court ou plus général (« limites », « suites »), ou parcours les chapitres.
                  </p>
                  {levelId && (
                    <button type="button" onClick={() => setLevelScope(true)} className="fd-btn-primary inline-flex" style={{ marginTop: 16 }}>
                      Chercher dans tous les niveaux
                    </button>
                  )}
                  <div className="max-w-2xl mx-auto">{suggestionBlock}</div>
                </div>
              )
            )}
          </>
        ) : (
          <div className="fd-card" style={{ padding: '32px 20px' }}>
            <div className="text-center">
              <div
                className="inline-flex items-center justify-center mx-auto mb-4"
                style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: 'linear-gradient(135deg,#f2f1ee,#faf9f7)', color: '#6b6862',
                }}
              >
                <SearchIcon className="w-7 h-7" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                Commence ta recherche
              </h3>
              <p style={{ fontSize: 13, color: '#6b6862', marginTop: 6 }}>
                Entre un mot-clé pour trouver des exercices, leçons ou examens.
              </p>
            </div>
            <div className="max-w-2xl mx-auto">{suggestionBlock}</div>
          </div>
        )}
      </div>
    </div>
  );
}
