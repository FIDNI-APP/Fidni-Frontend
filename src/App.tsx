// src/App.tsx - Ajout des routes d'examens
import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { NewContent } from './pages/NewContent';
import { EditExercise } from './pages/exercises/EditExercise';
import { EditSolution } from './pages/exercises/EditSolution';
import { ExerciseList } from './pages/exercises/ExerciseList';
import { ExerciseDetail } from './pages/exercises/ExerciseDetail';
import { Navbar } from './components/navbar/Navbar';
import { AuthProvider } from './contexts/AuthContext';
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthModalProvider, useAuthModal } from '@/components/AuthController';
import { UserProfile } from '@/pages/Profile';
import { EditProfile } from '@/pages/EditProfile';
import OnboardingProfile from '@/pages/OnboardingProfile';
import { LessonList } from './pages/lessons/LessonList';
import { LessonDetail } from './pages/lessons/LessonDetail';
import { CreateLesson } from './components/lesson/CreateLesson';
import { EditLesson } from './components/lesson/EditLesson';
import { FilterProvider } from './components/navbar/FilterContext';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import LegalRedirector from './components/LegalRedirector';
import Footer from './components/Footer';
import { Search } from './pages/Search';

// Import des pages d'examens
import { ExamList } from './pages/exams/ExamList';
import { ExamDetail } from './pages/exams/ExamDetail';
import { CreateExam } from './components/exam/CreateExam';
import { EditExam } from './components/exam/EditExam';

import { LearningPathList } from './pages/learningpaths/LearningPathList';
import { LearningPathDetail } from './pages/learningpaths/LearningPathDetail';
import { ChapterVideo } from './pages/learningpaths/ChapterVideo';
import { ChapterQuiz } from './pages/learningpaths/ChapterQuiz';
import { CreatePathChapter } from './pages/learningpaths/CreatePathChapter';
import { CreateLearningPath } from './pages/learningpaths/CreateLearningPath';
import { RevisionListDetail } from './pages/RevisionListDetail';
import { SavedItems } from './pages/SavedItems';
import { RevisionLists } from './pages/RevisionLists';
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
                  <Route path="/profile/:username/edit" element={
                    <NavbarWrapper>
                      <EditProfile />
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
                  
                  {/* Nouvelles routes pour les examens */}
                  <Route path="/exams" element={
                    <NavbarWrapper>
                      <ExamList />
                    </NavbarWrapper>
                  } />
                  <Route path="/exams/:id" element={
                    <NavbarWrapper>
                      <ExamDetail />
                    </NavbarWrapper>
                  } />
                  <Route path="/new-exam" element={
                    <NavbarWrapper>
                      <CreateExam />
                    </NavbarWrapper>
                  } />
                  <Route path="/edit-exam/:id" element={
                    <NavbarWrapper>
                      <EditExam />
                    </NavbarWrapper>
                  } />


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