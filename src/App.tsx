// src/App.tsx - Structured Content System
import { Routes, Route, Navigate, useParams, generatePath, useLocation, useNavigationType, useNavigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { useAuth } from './contexts/AuthContext';
import { canSeeParcours } from './lib/features';
import { AppShell } from './components/layout/AppShell';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Suspense, lazy, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthModalProvider, useAuthModal } from '@/components/auth/AuthController';
import { FilterProvider } from './components/navbar/FilterContext';
import LegalRedirector from './components/layout/LegalRedirector';
import ConsentBanner from './components/ads/ConsentBanner';
import { TourProvider } from '@/components/tour/TourProvider';
import Footer from './components/layout/Footer';

// Learning paths

// User pages

// Content pages (unified system)


// Pages chargées à la demande : l'accueil s'affiche sans télécharger l'éditeur, l'admin,
// les concours… (avant, tout arrivait d'un bloc : ~2 Mo de JavaScript avant la première page).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Après une mise en ligne, un onglet ouvert avant demande d'anciens fichiers de page (nom haché) qui
// n'existent plus : le chargement échoue et la page restait blanche jusqu'à un rafraîchissement.
// On recharge alors une fois le site (nouvelle version) ; le drapeau évite une boucle si le serveur
// est vraiment indisponible.
const RELOAD_FLAG = 'fidni:rechargement-version';
const reloadOnceForNewVersion = () => {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch { /* stockage indisponible : on recharge quand même une fois par page */ }
  window.location.reload();
  return true;
};
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewVersion()) event.preventDefault();
});
// Chargement réussi : on réarme pour la prochaine mise en ligne.
window.setTimeout(() => { try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* rien */ } }, 10000);

const page = <M,>(loader: () => Promise<M>, name: keyof M) =>
  lazy(async () => {
    const mod = await loader().catch((error) => {
      if (reloadOnceForNewVersion()) return undefined;
      throw error;
    });
    // undefined : rechargement en cours (ici ou via « vite:preloadError ») → on attend sans erreur.
    if (!mod) return new Promise<never>(() => {});
    return { default: mod[name] as unknown as React.ComponentType<any> };
  });

const VerifyEmail = page(() => import('./pages/VerifyEmail'), 'VerifyEmail');
const ResetPassword = page(() => import('./pages/ResetPassword'), 'ResetPassword');
const ProfilePage = page(() => import('@/pages/Profile'), 'ProfilePage');
const EditProfile = page(() => import('@/pages/EditProfile'), 'EditProfile');
const OnboardingProfile = page(() => import('@/pages/OnboardingProfile'), 'default');
const TermsOfService = page(() => import('./pages/TermsOfService'), 'default');
const PrivacyPolicy = page(() => import('./pages/PrivacyPolicy'), 'default');
const MentionsLegales = page(() => import('./pages/MentionsLegales'), 'default');
const ImportPreview = page(() => import('./pages/ImportPreview'), 'default');
const Search = page(() => import('./pages/Search'), 'Search');
const ClassroomsPage = page(() => import('./pages/Classrooms'), 'ClassroomsPage');
const ClassroomDetailPage = page(() => import('./pages/ClassroomDetail'), 'default');
const ConcoursListPage = page(() => import('./pages/concours/ConcoursList'), 'default');
const ConcoursExamDetailPage = page(() => import('./pages/concours/ConcoursExamDetail'), 'default');
const ConcoursSimulatePage = page(() => import('./pages/concours/ConcoursSimulate'), 'default');
const ConcoursRecapPage = page(() => import('./pages/concours/ConcoursRecap'), 'default');
const ConcoursHistoryPage = page(() => import('./pages/concours/ConcoursHistory'), 'default');
const ConcoursTipsListPage = page(() => import('./pages/concours/ConcoursTips'), 'ConcoursTipsListPage');
const ConcoursTipDetailPage = page(() => import('./pages/concours/ConcoursTips'), 'ConcoursTipDetailPage');
const ConcoursAdminPage = page(() => import('./pages/concours/ConcoursAdmin'), 'default');
const PilotagePage = page(() => import('./pages/Pilotage'), 'default');
const ConcoursExamQuestionsPage = page(() => import('./pages/concours/ConcoursExamQuestions'), 'default');
const EditorTestPage = page(() => import('./pages/concours/EditorTest'), 'default');
const LearningPathList = page(() => import('./pages/learningpaths/LearningPathList'), 'LearningPathList');
const LearningPathDetail = page(() => import('./pages/learningpaths/LearningPathDetail'), 'LearningPathDetail');
const ChapterVideo = page(() => import('./pages/learningpaths/ChapterVideo'), 'ChapterVideo');
const ChapterQuiz = page(() => import('./pages/learningpaths/ChapterQuiz'), 'ChapterQuiz');
const CreatePathChapter = page(() => import('./pages/learningpaths/CreatePathChapter'), 'CreatePathChapter');
const CreateLearningPath = page(() => import('./pages/learningpaths/CreateLearningPath'), 'CreateLearningPath');
const RevisionListDetail = page(() => import('./pages/RevisionListDetail'), 'RevisionListDetail');
const PaperExport = page(() => import('./pages/PaperExport'), 'PaperExport');
const SavedItems = page(() => import('./pages/SavedItems'), 'SavedItems');
const RevisionLists = page(() => import('./pages/RevisionLists'), 'RevisionLists');
const StudentNotebook = page(() => import('@/components/profile/StudentNotebook'), 'default');
const SkillIQSection = page(() => import('@/components/profile/SkillIQSection'), 'SkillIQSection');
const StatisticsPage = page(() => import('./pages/Statistics'), 'default');
const LogsConsole = page(() => import('./pages/admin/LogsConsole'), 'LogsConsole');
const ContentList = page(() => import('./pages/content/ContentList'), 'ContentList');
const ContentHub = page(() => import('./pages/content/ContentHub'), 'ContentHub');
const ContentDetail = page(() => import('./pages/content/ContentDetail'), 'ContentDetail');
const ContentCreate = page(() => import('./pages/content/ContentCreate'), 'ContentCreate');

/** Pendant le chargement d'une page : un repère discret, la barre latérale reste en place. */
const PageLoader = () => (
  <div className="flex items-center justify-center py-24" role="status" aria-label="Chargement de la page">
    <div className="h-6 w-6 rounded-full border-2 border-line border-t-brand animate-spin" />
  </div>
);

// /signup et /login : ouvrent la fenêtre de connexion commune puis reviennent à l'accueil.
// La fenêtre vit au-dessus des routes : elle reste ouverte après la navigation. On l'ouvre
// tout de suite (pas de minuteur : la redirection démonterait ce composant et l'annulerait).
const AuthRedirect = ({ tab }: { tab: 'login' | 'signup' }) => {
  const { openModal, setInitialTab } = useAuthModal();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setInitialTab(tab);
      openModal();
    }
    navigate('/', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return null;
};
const SignUpRedirect = () => <AuthRedirect tab="signup" />;
const LoginRedirect = () => <AuthRedirect tab="login" />;

// Layout wrapper: the app shell (sidebar + top bar) for normal pages,
// or a bare full-width frame for chrome-less pages (legal, etc.).
const NavbarWrapper = ({ children, showNavbar = true, showFooter = true }: { children: React.ReactNode, showNavbar?: boolean, showFooter?: boolean }) => {
  if (!showNavbar) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow"><Suspense fallback={<PageLoader />}>{children}</Suspense></main>
        {showFooter && <Footer />}
      </div>
    );
  }
  return <AppShell showFooter={showFooter}><Suspense fallback={<PageLoader />}>{children}</Suspense></AppShell>;
};

// Redirect helpers for legacy /structured/* routes
const RedirectToExercise = () => {
  const { id } = useParams();
  return <Navigate to={`/exercises/${id}`} replace />;
};

/** Redirection qui recopie les paramètres (`<Navigate to="/exams/:id">` envoyait vers « /exams/:id » tel quel). */
const RedirectWithParams: React.FC<{ to: string }> = ({ to }) => {
  const params = useParams();
  return <Navigate to={generatePath(to, params)} replace />;
};

const RedirectToExerciseEdit = () => {
  const { id } = useParams();
  return <Navigate to={`/exercises/${id}/edit`} replace />;
};

/** Parcours pas encore publié : pour un élève, ces adresses n'existent pas (page introuvable). */
const ParcoursGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  return canSeeParcours(user) ? <>{children}</> : <NotFound />;
};

/** /learning-paths/… → /learning-path/… (liens déjà partagés ou en favoris). */
const RedirectLearningPaths = () => {
  const { '*': rest } = useParams();
  return <Navigate to={`/learning-path${rest ? `/${rest}` : ''}`} replace />;
};

/**
 * Nouvelle page = haut de page. Sans ça, la fenêtre gardait la position de la page précédente :
 * ouvrir un exercice depuis le bas d'une liste l'affichait déjà défilé. Le bouton « Retour »
 * (POP) et les liens vers une ancre (#partie-…) gardent leur comportement.
 */
const ScrollToTopOnNavigate = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  useLayoutEffect(() => {
    if (hash || navigationType === 'POP') return;
    window.scrollTo(0, 0);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

function App() {
  useEffect(() => {
    interface WheelEventExtended extends WheelEvent {
      wheelDeltaY?: number;
    }

    const preventDefault = (e: WheelEventExtended): void => {
      const isTouchpad = e.wheelDeltaY ?
      e.wheelDeltaY === -3 * e.deltaY :
      e.deltaMode === 0;

      if (e.ctrlKey && isTouchpad) {
        e.preventDefault();
      }
    };

    document.addEventListener('wheel', preventDefault, { passive: false });

    return () => {
      document.removeEventListener('wheel', preventDefault);
    };
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <ScrollToTopOnNavigate />
        <LegalRedirector />
        <ConsentBanner />
        <ThemeProvider>
          <AuthProvider>
            <AuthModalProvider>
              <FilterProvider>
                <TourProvider>
                <div className="min-h-screen bg-gray-100">
                  <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Legal pages without navbar */}
                    <Route path="/terms-of-service" element={
                      <NavbarWrapper showNavbar={false}>
                        <TermsOfService />
                      </NavbarWrapper>
                    } />
                    <Route path="/privacy-policy" element={
                      <NavbarWrapper showNavbar={false}>
                        <PrivacyPolicy />
                      </NavbarWrapper>
                    } />
                    {/* Aperçu local d'une fiche avant import (outil éditorial, sans appel à l'API) */}
                    <Route path="/apercu-import" element={
                      <NavbarWrapper showNavbar={false} showFooter={false}>
                        <ImportPreview />
                      </NavbarWrapper>
                    } />
                    <Route path="/mentions-legales" element={
                      <NavbarWrapper showNavbar={false}>
                        <MentionsLegales />
                      </NavbarWrapper>
                    } />

                    {/* Admin */}
                    <Route path="/logs" element={
                      <NavbarWrapper>
                        <LogsConsole />
                      </NavbarWrapper>
                    } />

                    {/* Main routes */}
                    <Route path="/" element={
                      <NavbarWrapper>
                        <Home />
                      </NavbarWrapper>
                    } />
                    <Route path="/search" element={
                      <NavbarWrapper>
                        <Search />
                      </NavbarWrapper>
                    } />
                    <Route path="/login" element={
                      <NavbarWrapper>
                        <LoginRedirect />
                      </NavbarWrapper>
                    } />
                    <Route path="/signup" element={
                      <NavbarWrapper>
                        <SignUpRedirect />
                      </NavbarWrapper>
                    } />
                    <Route path="/verify-email" element={
                      <NavbarWrapper>
                        <VerifyEmail />
                      </NavbarWrapper>
                    } />
                    <Route path="/reset-password" element={
                      <NavbarWrapper>
                        <ResetPassword />
                      </NavbarWrapper>
                    } />

                    {/* Profile routes */}
                    <Route path="/profile/:username" element={
                      <NavbarWrapper>
                        <ProfilePage />
                      </NavbarWrapper>
                    } />
                    <Route path="/profile/:username/edit" element={
                      <NavbarWrapper>
                        <EditProfile />
                      </NavbarWrapper>
                    } />
                    <Route path="/complete-profile" element={
                      <NavbarWrapper>
                        <OnboardingProfile />
                      </NavbarWrapper>
                    } />
                    <Route path="/profile/revision-lists/:id" element={
                      <NavbarWrapper>
                        <RevisionListDetail />
                      </NavbarWrapper>
                    } />
                    <Route path="/saved" element={
                      <NavbarWrapper>
                        <SavedItems />
                      </NavbarWrapper>
                    } />
                    <Route path="/classrooms" element={
                      <NavbarWrapper>
                        <ClassroomsPage />
                      </NavbarWrapper>
                    } />
                    <Route path="/classrooms/:id" element={
                      <NavbarWrapper>
                        <ClassroomDetailPage />
                      </NavbarWrapper>
                    } />
                    {/* Concours */}
                    <Route path="/concours" element={
                      <NavbarWrapper><ConcoursListPage /></NavbarWrapper>
                    } />
                    <Route path="/concours/exams/:id" element={
                      <NavbarWrapper><ConcoursExamDetailPage /></NavbarWrapper>
                    } />
                    <Route path="/concours/simulate/:sessionId" element={
                      <NavbarWrapper showFooter={false}><ConcoursSimulatePage /></NavbarWrapper>
                    } />
                    <Route path="/concours/sessions" element={
                      <NavbarWrapper><ConcoursHistoryPage /></NavbarWrapper>
                    } />
                    <Route path="/concours/sessions/:sessionId/recap" element={
                      <NavbarWrapper showFooter={false}><ConcoursRecapPage /></NavbarWrapper>
                    } />
                    <Route path="/concours/tips" element={
                      <NavbarWrapper><ConcoursTipsListPage /></NavbarWrapper>
                    } />
                    <Route path="/concours/tips/:id" element={
                      <NavbarWrapper><ConcoursTipDetailPage /></NavbarWrapper>
                    } />
                    <Route path="/pilotage" element={
                      <NavbarWrapper><PilotagePage /></NavbarWrapper>
                    } />
                    <Route path="/concours/admin" element={
                      <NavbarWrapper><ConcoursAdminPage /></NavbarWrapper>
                    } />
                    <Route path="/concours/admin/exams/:id/questions" element={
                      <NavbarWrapper><ConcoursExamQuestionsPage /></NavbarWrapper>
                    } />
                    <Route path="/concours/editor-test" element={
                      <NavbarWrapper><EditorTestPage /></NavbarWrapper>
                    } />
                    <Route path="/revision-lists" element={
                      <NavbarWrapper>
                        <RevisionLists />
                      </NavbarWrapper>
                    } />
                    {/* Mon espace — features moved out of the profile page */}
                    <Route path="/notebooks" element={
                      <NavbarWrapper showFooter={false}>
                        <StudentNotebook />
                      </NavbarWrapper>
                    } />
                    <Route path="/statistiques" element={
                      <NavbarWrapper>
                        <StatisticsPage />
                      </NavbarWrapper>
                    } />
                    <Route path="/skill-iq" element={
                      <NavbarWrapper>
                        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
                          <SkillIQSection />
                        </div>
                      </NavbarWrapper>
                    } />

                    {/* ================================
                        EXERCISES - Structured Format
                    ================================ */}
                    <Route path="/exercises" element={
                      <NavbarWrapper>
                        <ContentList />
                      </NavbarWrapper>
                    } />
                    {/* Pages par niveau et par chapitre (référencement) : la liste, déjà filtrée. */}
                    <Route path="/exercises/niveau/:level/:chapter?" element={
                      <NavbarWrapper>
                        <ContentHub contentType="exercise" />
                      </NavbarWrapper>
                    } />
                    <Route path="/lessons/niveau/:level/:chapter?" element={
                      <NavbarWrapper>
                        <ContentHub contentType="lesson" />
                      </NavbarWrapper>
                    } />
                    <Route path="/exams/niveau/:level/:chapter?" element={
                      <NavbarWrapper>
                        <ContentHub contentType="exam" />
                      </NavbarWrapper>
                    } />
                    <Route path="/exercises/new" element={
                      <NavbarWrapper showFooter={false}>
                        <ContentCreate />
                      </NavbarWrapper>
                    } />
                    {/* Feuilles A4 à exporter en PDF : pleine page, sans la barre latérale */}
                    <Route path="/exercises/:id/pdf" element={<PaperExport source="content" />} />
                    <Route path="/exams/:id/pdf" element={<PaperExport source="content" />} />
                    <Route path="/revision-lists/:id/pdf" element={<PaperExport source="revision-list" />} />
                    <Route path="/lessons/:id/pdf" element={<PaperExport source="content" />} />
                    <Route path="/notebooks/:id/pdf" element={<PaperExport source="notebook" />} />
                    <Route path="/exercises/:id" element={
                      <NavbarWrapper>
                        <ContentDetail />
                      </NavbarWrapper>
                    } />
                    <Route path="/exercises/:id/edit" element={
                      <NavbarWrapper showFooter={false}>
                        <ContentCreate />
                      </NavbarWrapper>
                    } />
                    {/* Legacy redirect */}
                    <Route path="/new" element={<Navigate to="/exercises/new" replace />} />
                    <Route path="/edit/:id" element={<RedirectWithParams to="/exercises/:id/edit" />} />

                    {/* ================================
                        EXAMS - Structured Format
                        (Using same components with exam type)
                    ================================ */}
                    <Route path="/exams" element={
                      <NavbarWrapper>
                        <ContentList contentType="exam" />
                      </NavbarWrapper>
                    } />
                    <Route path="/exams/new" element={
                      <NavbarWrapper showFooter={false}>
                        <ContentCreate contentType="exam" />
                      </NavbarWrapper>
                    } />
                    <Route path="/exams/:id" element={
                      <NavbarWrapper>
                        <ContentDetail contentType="exam" />
                      </NavbarWrapper>
                    } />
                    <Route path="/exams/:id/edit" element={
                      <NavbarWrapper showFooter={false}>
                        <ContentCreate contentType="exam" />
                      </NavbarWrapper>
                    } />
                    {/* Legacy redirect */}
                    <Route path="/new-exam" element={<Navigate to="/exams/new" replace />} />
                    <Route path="/edit-exam/:id" element={<RedirectWithParams to="/exams/:id/edit" />} />

                    {/* ================================
                        LESSONS - Structured Format (Section-based)
                    ================================ */}
                    <Route path="/lessons" element={
                      <NavbarWrapper>
                        <ContentList contentType="lesson" />
                      </NavbarWrapper>
                    } />
                    <Route path="/lessons/new" element={
                      <NavbarWrapper showFooter={false}>
                        <ContentCreate contentType="lesson" />
                      </NavbarWrapper>
                    } />
                    <Route path="/lessons/:id" element={
                      <NavbarWrapper>
                        <ContentDetail contentType="lesson" />
                      </NavbarWrapper>
                    } />
                    <Route path="/lessons/:id/edit" element={
                      <NavbarWrapper showFooter={false}>
                        <ContentCreate contentType="lesson" />
                      </NavbarWrapper>
                    } />
                    {/* Legacy redirect */}
                    <Route path="/new-lesson" element={<Navigate to="/lessons/new" replace />} />
                    <Route path="/edit-lesson/:id" element={<RedirectWithParams to="/lessons/:id/edit" />} />

                    {/* ================================
                        LEARNING PATHS
                    ================================ */}
                    <Route path="/learning-path" element={
                      <NavbarWrapper>
                        <ParcoursGate><LearningPathList /></ParcoursGate>
                      </NavbarWrapper>
                    } />
                    <Route path="/learning-path/:id" element={
                      <NavbarWrapper>
                        <ParcoursGate><LearningPathDetail /></ParcoursGate>
                      </NavbarWrapper>
                    } />
                    <Route path="/learning-path/:pathId/chapters/:chapterId/videos/:videoId" element={
                      <NavbarWrapper showFooter={false}>
                        <ParcoursGate><ChapterVideo /></ParcoursGate>
                      </NavbarWrapper>
                    } />
                    <Route path="/learning-path/:pathId/chapters/:chapterId/quiz" element={
                      <NavbarWrapper showFooter={false}>
                        <ParcoursGate><ChapterQuiz /></ParcoursGate>
                      </NavbarWrapper>
                    } />
                    <Route path="/learning-path/create" element={
                      <NavbarWrapper>
                        <ParcoursGate><CreateLearningPath /></ParcoursGate>
                      </NavbarWrapper>
                    } />
                    <Route path="/learning-path/:id/edit" element={
                      <NavbarWrapper>
                        <ParcoursGate><CreateLearningPath /></ParcoursGate>
                      </NavbarWrapper>
                    } />
                    <Route path="/learning-path/:id/chapters/create" element={
                      <NavbarWrapper>
                        <ParcoursGate><CreatePathChapter /></ParcoursGate>
                      </NavbarWrapper>
                    } />

                    {/* Legacy /structured/* routes */}
                    <Route path="/structured/exercises" element={<Navigate to="/exercises" replace />} />
                    <Route path="/structured/exercises/new" element={<Navigate to="/exercises/new" replace />} />
                    <Route path="/structured/exercises/:id" element={<RedirectToExercise />} />
                    <Route path="/structured/exercises/:id/edit" element={<RedirectToExerciseEdit />} />
                    <Route path="/structured/exams" element={<Navigate to="/exams" replace />} />
                    <Route path="/structured/exams/:id" element={<RedirectWithParams to="/exams/:id" />} />
                    <Route path="/structured/lessons" element={<Navigate to="/lessons" replace />} />
                    <Route path="/structured/lessons/:id" element={<RedirectWithParams to="/lessons/:id" />} />
                    {/* Anciennes adresses des parcours (au pluriel) */}
                    <Route path="/learning-paths/*" element={<RedirectLearningPaths />} />

                    <Route path="*" element={
                      <NavbarWrapper>
                        <NotFound />
                      </NavbarWrapper>
                    } />
                  </Routes>
                  </Suspense>
                </div>
                </TourProvider>
              </FilterProvider>
            </AuthModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
