import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, BookOpen, Loader2, X } from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { HomeContentCard } from '@/components/content/HomeContentCard';
import { getExercises, getLessons, getExams, voteExercise } from '@/lib/api';
import { Content, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';

type Tab = 'all' | 'exercise' | 'lesson' | 'exam';

export function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [exercises, setExercises] = useState<Content[]>([]);
  const [lessons, setLessons] = useState<Content[]>([]);
  const [exams, setExams] = useState<Content[]>([]);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchTerm(query);
      performSearch(query);
    }
  }, [searchParams]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setExercises([]); setLessons([]); setExams([]);
      return;
    }
    try {
      setLoading(true); setError('');
      const [ex, le, exa] = await Promise.all([
        getExercises({ search: query, per_page: 20 }),
        getLessons({ search: query, per_page: 20 }),
        getExams({ search: query, per_page: 20 }),
      ]);
      setExercises(ex.results);
      setLessons(le.results);
      setExams(exa.results);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Une erreur est survenue lors de la recherche.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const handleVote = async (id: string, value: VoteValue) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      const updated = await voteExercise(id, value);
      setExercises(p => p.map(i => i.id === id ? updated : i));
      setLessons(p => p.map(i => i.id === id ? updated : i));
      setExams(p => p.map(i => i.id === id ? updated : i));
    } catch (err) { console.error('Failed to vote:', err); }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setExercises([]); setLessons([]); setExams([]);
    navigate('/search');
  };

  const allResults = [...exercises, ...lessons, ...exams];
  const totalResults = exercises.length + lessons.length + exams.length;
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

  return (
    <div style={{ minHeight: '100vh', background: '#f0effe' }}>
      <SEO
        title={`Recherche: ${searchTerm} - Fidni`}
        description={`Résultats de recherche pour "${searchTerm}"`}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <span
            className="inline-flex items-center gap-1.5"
            style={{
              background: '#eef2ff', color: '#4338ca',
              padding: '4px 12px', borderRadius: 99,
              fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
            }}
          >
            <SearchIcon className="w-3 h-3" /> RECHERCHE
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.03em', marginTop: 10 }}>
            Recherche intelligente
          </h1>
          <p style={{ fontSize: 13, color: '#7068a8', marginTop: 4 }}>
            Trouve un exercice, une leçon ou un examen.
          </p>
        </div>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          className="fd-card flex items-center mb-5"
          style={{ padding: 6, paddingLeft: 16, gap: 8 }}
        >
          <SearchIcon className="w-4 h-4" style={{ color: '#9391b8' }} />
          <input
            type="text"
            placeholder="Rechercher un exercice, une leçon, un théorème…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', fontSize: 14, fontFamily: 'DM Sans',
              color: '#1e1b4b', padding: '10px 0',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Effacer"
              style={{
                background: 'transparent', border: 'none', color: '#9391b8',
                cursor: 'pointer', padding: 6,
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button type="submit" className="fd-btn-primary" style={{ padding: '8px 16px' }}>
            Rechercher
          </button>
        </form>

        {searchTerm && (
          <>
            {/* Tabs as filter pills */}
            <div className="flex items-center gap-2 flex-wrap mb-5">
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`fd-pill ${activeTab === t.id ? 'is-active' : ''}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', fontSize: 12,
                    }}
                  >
                    <Icon className="w-3 h-3" />
                    {t.label}
                    <span
                      style={{
                        fontFamily: 'DM Mono', fontSize: 10, opacity: .8,
                        marginLeft: 2,
                      }}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center" style={{ padding: '60px 0' }}>
                <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: '#4f46e5' }} />
                <p style={{ fontSize: 13, color: '#7068a8' }}>Recherche en cours…</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div
                className="fd-card mb-4"
                style={{
                  padding: 14, background: '#fef2f2',
                  border: '1px solid #fecaca', color: '#b91c1c',
                  fontSize: 13,
                }}
              >
                <p style={{ fontWeight: 700 }}>Erreur</p>
                <p style={{ marginTop: 2 }}>{error}</p>
              </div>
            )}

            {/* Results */}
            {!loading && !error && (
              filteredResults.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p style={{ fontSize: 12, color: '#7068a8' }}>
                      <span style={{ fontFamily: 'DM Mono', color: '#1e1b4b', fontWeight: 600 }}>
                        {filteredResults.length}
                      </span>{' '}
                      résultat{filteredResults.length > 1 ? 's' : ''} pour "
                      <span style={{ color: '#4338ca', fontWeight: 600 }}>{searchTerm}</span>"
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredResults.map((content, idx) => (
                      <div key={content.id} className="animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                        <HomeContentCard content={content} onVote={handleVote} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="fd-card text-center" style={{ padding: 48 }}>
                  <div
                    className="inline-flex items-center justify-center mx-auto mb-4"
                    style={{
                      width: 64, height: 64, borderRadius: 16,
                      background: 'linear-gradient(135deg,#eef2ff,#f0effe)', color: '#7068a8',
                    }}
                  >
                    <SearchIcon className="w-7 h-7" />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e1b4b' }}>
                    Aucun résultat trouvé
                  </h3>
                  <p style={{ fontSize: 13, color: '#7068a8', marginTop: 6, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                    Aucun résultat pour "{searchTerm}". Essaie d'autres mots-clés.
                  </p>
                  <div style={{ fontSize: 12, color: '#9391b8', marginTop: 16 }}>
                    <p style={{ fontWeight: 600, marginBottom: 6 }}>Suggestions :</p>
                    <ul style={{ listStyle: 'none', padding: 0, lineHeight: 1.8 }}>
                      <li>· Vérifie l'orthographe</li>
                      <li>· Essaie des termes plus généraux</li>
                      <li>· Essaie d'autres mots-clés</li>
                    </ul>
                  </div>
                </div>
              )
            )}
          </>
        )}

        {/* Empty (no search) */}
        {!searchTerm && (
          <div className="fd-card text-center" style={{ padding: 48 }}>
            <div
              className="inline-flex items-center justify-center mx-auto mb-4"
              style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'linear-gradient(135deg,#eef2ff,#f0effe)', color: '#7068a8',
              }}
            >
              <SearchIcon className="w-7 h-7" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e1b4b' }}>
              Commence ta recherche
            </h3>
            <p style={{ fontSize: 13, color: '#7068a8', marginTop: 6 }}>
              Entre un mot-clé pour rechercher des exercices, leçons ou examens.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
