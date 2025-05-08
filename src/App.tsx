// Modifions le fichier App.tsx pour rediriger la route "/signup" vers le modal

// src/App.tsx - Modification de la route signup
import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
// Supprimez l'import pour SignUp
// import { SignUp } from './pages/SignUp'; 
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
import {UserProfile} from '@/pages/Profile'
import OnboardingProfile  from '@/pages/OnboardingProfile'; // Import du nouveau composant
import { LessonList } from './pages/LessonList';
import { LessonDetail } from './pages/LessonDetail';
import { CreateLesson } from './components/lesson/CreateLesson';
import { EditLesson } from './components/lesson/EditLesson';

// Composant pour rediriger vers la home avec modal ouvert
const SignUpRedirect = () => {
  const { openModal } = useAuthModal();
  
  useEffect(() => {
    // Ouvre automatiquement le modal d'inscription
    openModal();
  }, [openModal]);
  
  return <Navigate to="/" />;
};

function App() {
  useEffect(() => {
    interface WheelEventExtended extends WheelEvent {
      wheelDeltaY?: number;
    }

    const preventDefault = (e: WheelEventExtended): void => {
      // Vérifie si c'est un pavé tactile en regardant les propriétés spécifiques
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
      <AuthProvider>
        <AuthModalProvider>
          <div className="min-h-screen bg-gray-100">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              {/* Remplacer la route /signup par le composant de redirection */}
              <Route path="/signup" element={<SignUpRedirect />} />
              <Route path="/new" element={<NewContent />} />
              <Route path="/edit/:id" element={<EditExercise />} />
              <Route path="/solutions/:id/edit" element={<EditSolution />} />
              <Route path="/profile/:username" element={<UserProfile />} />
              <Route path="/exercises" element={<ExerciseList />} />
              <Route path="/exercises/:id" element={<ExerciseDetail />} />
              {/* Ajouter une nouvelle route pour le processus d'onboarding */}
              <Route path="/complete-profile" element={<OnboardingProfile />} />
              <Route path="/lessons" element={<LessonList />} />
              <Route path="/lessons/:id" element={<LessonDetail />} />
              <Route path="/new-lesson" element={<CreateLesson />} />
              <Route path="/edit-lesson/:id" element={<EditLesson />} />
            </Routes>
          </div>
          </AuthModalProvider>
      </AuthProvider>
    </BrowserRouter>
    </div>
  );
}
export default App;