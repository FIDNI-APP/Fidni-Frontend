// src/App.tsx - Structured Content System
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Navbar } from './components/navbar/Navbar';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthModalProvider, useAuthModal } from '@/components/auth/AuthController';
import { ProfilePage } from '@/pages/Profile';
import { EditProfile } from '@/pages/EditProfile';
import OnboardingProfile from '@/pages/OnboardingProfile';
import { FilterProvider } from './components/navbar/FilterContext';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import LegalRedirector from './components/layout/LegalRedirector';
import Footer from './components/layout/Footer';
import { Search } from './pages/Search';

// Learning paths
import { LearningPathList } from './pages/learningpaths/LearningPathList';
import { LearningPathDetail } from './pages/learningpaths/LearningPathDetail';
import { ChapterVideo } from './pages/learningpaths/ChapterVideo';
import { ChapterQuiz } from './pages/learningpaths/ChapterQuiz';
import { CreatePathChapter } from './pages/learningpaths/CreatePathChapter';
import { CreateLearningPath } from './pages/learningpaths/CreateLearningPath';

// User pages
import { RevisionListDetail } from './pages/RevisionListDetail';
import { SavedItems } from './pages/SavedItems';
import { RevisionLists } from './pages/RevisionLists';
import { LogsConsole } from './pages/admin/LogsConsole';

// Content pages (unified system)
import { ContentList, ContentDetail, ContentCreate } from './pages/content';
import { LessonCreate } from './pages/content/LessonCreate';

// Composant pour rediriger vers la home avec modal ouvert
const SignUpRedirect = () => {
  const { openModal, setInitialTab } = useAuthModal();

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialTab('signup');
      openModal();
    }, 50);

    return () => clearTimeout(timer);
  }, [openModal, setInitialTab]);

  return <Navigate to="/" replace />;
};

// Composant pour afficher la navbar conditionnellement
const NavbarWrapper = ({ children, showNavbar = true, showFooter = true }: { children: React.ReactNode, showNavbar?: boolean, showFooter?: boolean }) => {
  return (
    <div className="flex flex-col min-h-screen">
      {showNavbar && <Navbar />}
      <main className="flex-grow">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

// Redirect helpers for legacy /structured routes
const RedirectStructuredExercise = () => {
  const { id } = useParams();
  return <Navigate to={`/exercises/${id}`} replace />;
};

const RedirectStructuredExerciseEdit = () => {
  const { id } = useParams();
  return <Navigate to={`/exercises/${id}/edit`} replace />;
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
        <LegalRedirector />
        <ThemeProvider>
          <AuthProvider>
            <AuthModalProvider>
              <FilterProvider>
                <div className="min-h-screen bg-gray-100">
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
                        <Login />
                      </NavbarWrapper>
                    } />
                    <Route path="/signup" element={
                      <NavbarWrapper>
                        <SignUpRedirect />
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
                    <Route path="/revision-lists" element={
                      <NavbarWrapper>
                        <RevisionLists />
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
                    <Route path="/exercises/new" element={
                      <NavbarWrapper showFooter={false}>
                        <ContentCreate />
                      </NavbarWrapper>
                    } />
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
                    <Route path="/edit/:id" element={<Navigate to="/exercises/:id/edit" replace />} />

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
                    <Route path="/edit-exam/:id" element={<Navigate to="/exams/:id/edit" replace />} />

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
                        <LessonCreate />
                      </NavbarWrapper>
                    } />
                    <Route path="/lessons/:id" element={
                      <NavbarWrapper>
                        <ContentDetail contentType="lesson" />
                      </NavbarWrapper>
                    } />
                    <Route path="/lessons/:id/edit" element={
                      <NavbarWrapper showFooter={false}>
                        <LessonCreate />
                      </NavbarWrapper>
                    } />
                    {/* Legacy redirect */}
                    <Route path="/new-lesson" element={<Navigate to="/lessons/new" replace />} />
                    <Route path="/edit-lesson/:id" element={<Navigate to="/lessons/:id/edit" replace />} />

                    {/* ================================
                        LEARNING PATHS
                    ================================ */}
                    <Route path="/learning-path" element={
                      <NavbarWrapper>
                        <LearningPathList />
                      </NavbarWrapper>
                    } />
                    <Route path="/learning-path/:id" element={
                      <NavbarWrapper>
                        <LearningPathDetail />
                      </NavbarWrapper>
                    } />
                    <Route path="/learning-path/:pathId/chapters/:chapterId/videos/:videoId" element={
                      <NavbarWrapper showFooter={false}>
                        <ChapterVideo />
                      </NavbarWrapper>
                    } />
                    <Route path="/learning-path/:pathId/chapters/:chapterId/quiz" element={
                      <NavbarWrapper showFooter={false}>
                        <ChapterQuiz />
                      </NavbarWrapper>
                    } />
                    <Route path="/learning-path/create" element={
                      <NavbarWrapper>
                        <CreateLearningPath />
                      </NavbarWrapper>
                    } />
                    <Route path="/learning-path/:id/edit" element={
                      <NavbarWrapper>
                        <CreateLearningPath />
                      </NavbarWrapper>
                    } />
                    <Route path="/learning-path/:id/chapters/create" element={
                      <NavbarWrapper>
                        <CreatePathChapter />
                      </NavbarWrapper>
                    } />

                    {/* Legacy /structured routes - redirect to main routes */}
                    <Route path="/structured/exercises" element={<Navigate to="/exercises" replace />} />
                    <Route path="/structured/exercises/new" element={<Navigate to="/exercises/new" replace />} />
                    <Route path="/structured/exercises/:id" element={<RedirectStructuredExercise />} />
                    <Route path="/structured/exercises/:id/edit" element={<RedirectStructuredExerciseEdit />} />

                  </Routes>
                </div>
              </FilterProvider>
            </AuthModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
