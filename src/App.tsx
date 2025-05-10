// src/App.tsx - Ajout des nouvelles routes
import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { NewContent } from './pages/NewContent';
import { EditExercise } from './pages/EditExercise';
import { EditSolution } from './pages/EditSolution';
import { ExerciseList } from './pages/ExerciseList';
import { ExerciseDetail } from './pages/ExerciseDetail';
import { Navbar } from './components/navbar/Navbar';
import { AuthProvider } from './contexts/AuthContext';
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthModalProvider, useAuthModal } from '@/components/AuthController';
import { UserProfile } from '@/pages/Profile';
import OnboardingProfile from '@/pages/OnboardingProfile';
import { LessonList } from './pages/LessonList';
import { LessonDetail } from './pages/LessonDetail';
import { CreateLesson } from './components/lesson/CreateLesson';
import { EditLesson } from './components/lesson/EditLesson';
import { FilterProvider } from './components/navbar/FilterContext';
import TermsOfService from './pages/TermsOfService'; // Import des nouvelles pages
import PrivacyPolicy from './pages/PrivacyPolicy'; // Import des nouvelles pages
import LegalRedirector from './components/LegalRedirector'; // Import du composant de redirection légale
import Footer from './components/Footer'; // Import du footer

// Composant pour rediriger vers la home avec modal ouvert
const SignUpRedirect = () => {
  const { openModal, setInitialTab } = useAuthModal();
  
  useEffect(() => {
    // Utiliser un délai minimal pour éviter les problèmes de rendu React
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
        <AuthProvider>
          <AuthModalProvider>
            <FilterProvider>
              <div className="min-h-screen bg-gray-100">
                <Routes>
                  {/* Routes pour les pages légales sans navbar */}
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
                  
                  {/* Routes standards avec navbar */}
                  <Route path="/" element={
                    <NavbarWrapper>
                      <Home />
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
                  <Route path="/new" element={
                    <NavbarWrapper>
                      <NewContent />
                    </NavbarWrapper>
                  } />
                  <Route path="/edit/:id" element={
                    <NavbarWrapper>
                      <EditExercise />
                    </NavbarWrapper>
                  } />
                  <Route path="/solutions/:id/edit" element={
                    <NavbarWrapper>
                      <EditSolution />
                    </NavbarWrapper>
                  } />
                  <Route path="/profile/:username" element={
                    <NavbarWrapper>
                      <UserProfile />
                    </NavbarWrapper>
                  } />
                  <Route path="/exercises" element={
                    <NavbarWrapper>
                      <ExerciseList />
                    </NavbarWrapper>
                  } />
                  <Route path="/exercises/:id" element={
                    <NavbarWrapper>
                      <ExerciseDetail />
                    </NavbarWrapper>
                  } />
                  <Route path="/complete-profile" element={
                    <NavbarWrapper>
                      <OnboardingProfile />
                    </NavbarWrapper>
                  } />
                  <Route path="/lessons" element={
                    <NavbarWrapper>
                      <LessonList />
                    </NavbarWrapper>
                  } />
                  <Route path="/lessons/:id" element={
                    <NavbarWrapper>
                      <LessonDetail />
                    </NavbarWrapper>
                  } />
                  <Route path="/new-lesson" element={
                    <NavbarWrapper>
                      <CreateLesson />
                    </NavbarWrapper>
                  } />
                  <Route path="/edit-lesson/:id" element={
                    <NavbarWrapper>
                      <EditLesson />
                    </NavbarWrapper>
                  } />
                </Routes>
              </div>
            </FilterProvider>
          </AuthModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;