// src/pages/OnboardingProfile.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Plus, 
  Trash, 
  Check, 
  ArrowRight, 
  GraduationCap, 
  BookOpen, 
  Loader2,
  Users,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
// Importez les APIs nécessaires pour récupérer les données
import { 
  getClassLevels, 
  getSubjects, 
  updateUserProfile 
} from '@/lib/api';

// Typage des données
interface SubjectGrade {
  id: string;
  subjectId: string;
  minGrade: number;
  maxGrade: number;
}

interface OnboardingData {
  classLevel: string;
  favoriteSubjects: string[];
  userType: 'student' | 'teacher';
  subjectGrades: SubjectGrade[];
  bio?: string;
}

// Composant principal
export const OnboardingProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // États pour stocker les données de référence depuis l'API
  const [classLevels, setClassLevels] = useState<{id: string, name: string}[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [loadingReference, setLoadingReference] = useState(true);
  
  // Données du formulaire d'onboarding
  const [formData, setFormData] = useState<OnboardingData>({
    classLevel: '',
    favoriteSubjects: [],
    userType: 'student',
    subjectGrades: []
  });
  
  // Si l'utilisateur n'est pas connecté, rediriger vers l'accueil
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    // Si le profil est déjà complété, rediriger vers l'accueil
    if (user.profile && user.profile.favorite_subjects && user.profile.favorite_subjects.length > 0) {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Charger les données de référence depuis l'API
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setLoadingReference(true);
        
        // Récupération des niveaux de classe
        const classLevelsData = await getClassLevels();
        setClassLevels(classLevelsData.map(level => ({
          id: level.id,
          name: level.name
        })));
        
        // Si un niveau de classe est déjà sélectionné, charger les matières correspondantes
        if (formData.classLevel) {
          // Utiliser le format avec tableau pour class_levels[]
          const subjectsData = await getSubjects([formData.classLevel]);
          setSubjects(subjectsData.map(subject => ({
            id: subject.id,
            name: subject.name
          })));
        } else {
          // Sinon, charger toutes les matières
          const subjectsData = await getSubjects();
          setSubjects(subjectsData.map(subject => ({
            id: subject.id,
            name: subject.name
          })));
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données de référence:", err);
        setError("Impossible de charger les données. Veuillez réessayer.");
      } finally {
        setLoadingReference(false);
      }
    };
    
    loadReferenceData();
  }, [formData.classLevel]);
  
  // Mettre à jour les matières lorsque le niveau de classe change
  const handleClassLevelChange = async (classLevelId: string) => {
    setFormData({...formData, classLevel: classLevelId});
    
    try {
      const subjectsData = await getSubjects([classLevelId]);
      console.log(classLevelId);
      console.log(subjectsData);
      setSubjects(subjectsData.map(subject => ({
        id: subject.id,
        name: subject.name
      })));
      
      // Réinitialiser les matières préférées si elles ne sont plus disponibles
      setFormData(prev => ({
        ...prev,
        favoriteSubjects: prev.favoriteSubjects.filter(id => 
          subjectsData.some(s => s.id === id)
        ),
        subjectGrades: prev.subjectGrades.filter(grade => 
          subjectsData.some(s => s.id === grade.subjectId)
        )
      }));
    } catch (err) {
      console.error("Erreur lors du chargement des matières:", err);
    }
  };
  
  // ÉTAPE 1 : Choisir le niveau et type d'utilisateur
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Je suis...</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormData({...formData, userType: 'student'})}
            className={`flex flex-col items-center p-6 border rounded-xl transition-all ${
              formData.userType === 'student' 
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <GraduationCap className={`w-12 h-12 mb-3 ${formData.userType === 'student' ? 'text-indigo-600' : 'text-gray-400'}`} />
            <span className="font-medium">Étudiant(e)</span>
          </button>
          
          <button
            type="button"
            onClick={() => setFormData({...formData, userType: 'teacher'})}
            className={`flex flex-col items-center p-6 border rounded-xl transition-all ${
              formData.userType === 'teacher' 
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <Users className={`w-12 h-12 mb-3 ${formData.userType === 'teacher' ? 'text-indigo-600' : 'text-gray-400'}`} />
            <span className="font-medium">Enseignant(e)</span>
          </button>
        </div>
      </div>
      
      <div>
        <label htmlFor="classLevel" className="block text-sm font-medium text-gray-700 mb-2">
          Niveau d'études actuel
        </label>
        {loadingReference ? (
          <div className="flex items-center text-gray-500">
            <Loader2 className="animate-spin mr-2 h-5 w-5" />
            Chargement des niveaux...
          </div>
        ) : (
          <select
            id="classLevel"
            value={formData.classLevel}
            onChange={(e) => handleClassLevelChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Sélectionner un niveau</option>
            {classLevels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
        )}
      </div>
      
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
          Biographie (facultatif)
        </label>
        <textarea
          id="bio"
          value={formData.bio || ''}
          onChange={(e) => setFormData({...formData, bio: e.target.value})}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Parlez-nous un peu de vous..."
        />
      </div>
      
      <div className="pt-4 flex justify-end">
        <Button
          onClick={() => setStep(2)}
          disabled={!formData.classLevel || !formData.userType || loadingReference}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Continuer
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  
  // ÉTAPE 2 : Choisir les matières préférées
  const renderStep2 = () => {
    const toggleSubject = (subjectId: string) => {
      const currentSubjects = [...formData.favoriteSubjects];
      if (currentSubjects.includes(subjectId)) {
        setFormData({
          ...formData, 
          favoriteSubjects: currentSubjects.filter(id => id !== subjectId)
        });
      } else {
        // Limiter à 5 matières maximum
        if (currentSubjects.length < 5) {
          setFormData({
            ...formData, 
            favoriteSubjects: [...currentSubjects, subjectId]
          });
        }
      }
    };
    
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium mb-3">Matières préférées</h3>
        <p className="text-gray-500 mb-4">Choisissez les matières qui vous intéressent le plus (min 1, max 5)</p>
        
        {loadingReference ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="animate-spin mr-2 h-6 w-6" />
            Chargement des matières...
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
            <p className="text-center">Aucune matière disponible pour ce niveau. Veuillez sélectionner un autre niveau.</p>
            <Button
              onClick={() => setStep(1)}
              variant="outline"
              className="mt-4"
            >
              Retour à la sélection du niveau
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => toggleSubject(subject.id)}
                className={`px-4 py-3 border rounded-lg text-sm font-medium transition-all ${
                  formData.favoriteSubjects.includes(subject.id)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-700 hover:border-indigo-300'
                }`}
                disabled={!formData.favoriteSubjects.includes(subject.id) && formData.favoriteSubjects.length >= 5}
              >
                {formData.favoriteSubjects.includes(subject.id) && (
                  <Check className="inline-block w-4 h-4 mr-2 text-indigo-600" />
                )}
                {subject.name}
              </button>
            ))}
          </div>
        )}
        
        <div className="pt-4 flex justify-between">
          <Button
            onClick={() => setStep(1)}
            variant="outline"
          >
            Retour
          </Button>
          <Button
            onClick={() => setStep(3)}
            disabled={formData.favoriteSubjects.length === 0 || loadingReference}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Continuer
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };
  
  // ÉTAPE 3 : Ajouter les notes par matière
  const renderStep3 = () => {
    const addSubjectGrade = () => {
      // Filtrer les matières qui n'ont pas encore été ajoutées
      const availableSubjects = subjects.filter(
        subject => !formData.subjectGrades.some(grade => grade.subjectId === subject.id)
      );
      
      if (availableSubjects.length > 0) {
        const newSubject = availableSubjects[0];
        const newSubjectGrade: SubjectGrade = {
          id: `sg-${Date.now()}`,
          subjectId: newSubject.id,
          minGrade: 0,
          maxGrade: 20
        };
        
        setFormData({
          ...formData, 
          subjectGrades: [...formData.subjectGrades, newSubjectGrade]
        });
      }
    };
    
    const removeSubjectGrade = (id: string) => {
      setFormData({
        ...formData,
        subjectGrades: formData.subjectGrades.filter(grade => grade.id !== id)
      });
    };
    
    const updateSubjectGrade = (id: string, field: keyof SubjectGrade, value: any) => {
      setFormData({
        ...formData,
        subjectGrades: formData.subjectGrades.map(grade => 
          grade.id === id ? { ...grade, [field]: value } : grade
        )
      });
    };
    
    
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium mb-3">Vos notes par matière (facultatif)</h3>
        <p className="text-gray-500 mb-4">Ajoutez vos notes minimales et maximales pour chaque matière que vous souhaitez suivre</p>
        
        {/* Liste des matières avec notes */}
        <div className="space-y-4">
          {formData.subjectGrades.map((gradeItem) => (
            <div key={gradeItem.id} className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
              <div className="flex-grow">
                <select
                  value={gradeItem.subjectId}
                  onChange={(e) => updateSubjectGrade(gradeItem.id, 'subjectId', e.target.value)}
                  className="w-full mb-2 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  aria-label="Sélectionner une matière"
                >
                  {subjects.map((subject) => (
                    <option 
                      key={subject.id} 
                      value={subject.id}
                      disabled={formData.subjectGrades.some(
                        g => g.id !== gradeItem.id && g.subjectId === subject.id
                      )}
                    >
                      {subject.name}
                    </option>
                  ))}
                </select>
                
                <div className="flex space-x-2">
                  <div>
                    <label className="block text-xs text-gray-500">Min</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="20" 
                      value={gradeItem.minGrade}
                      onChange={(e) => updateSubjectGrade(
                        gradeItem.id, 
                        'minGrade', 
                        Math.min(20, Math.max(0, parseInt(e.target.value) || 0))
                      )}
                      className="w-16 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      title="Note minimale"
                      placeholder="Min"
                      aria-label="Note minimale"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Max</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="20" 
                      value={gradeItem.maxGrade}
                      onChange={(e) => updateSubjectGrade(
                        gradeItem.id, 
                        'maxGrade', 
                        Math.min(20, Math.max(0, parseInt(e.target.value) || 0))
                      )}
                      className="w-16 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => removeSubjectGrade(gradeItem.id)}
                className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50"
                aria-label="Supprimer cette matière"
              >
                <Trash className="h-5 w-5" />
              </button>
            </div>
          ))}
          
          {/* Bouton pour ajouter une matière */}
          {formData.subjectGrades.length < subjects.length && (
            <button
              type="button"
              onClick={addSubjectGrade}
              className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Ajouter une matière
            </button>
          )}
        </div>
        
        <div className="pt-4 flex justify-between">
          <Button
            onClick={() => setStep(2)}
            variant="outline"
          >
            Retour
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                Terminer
                <Check className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };
  
  // Fonction pour soumettre le formulaire complet
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        setError("Vous devez être connecté pour compléter votre profil.");
        return;
      }
      
      // Préparation des données pour l'API
      const profileData = {
        favorite_subjects: formData.favoriteSubjects,
        class_level: formData.classLevel,
        user_type: formData.userType,
        bio: formData.bio || '',
        subject_grades: formData.subjectGrades.map(grade => ({
          subject_id: grade.subjectId,
          min_grade: grade.minGrade,
          max_grade: grade.maxGrade
        }))
      };
      
      // Mise à jour du profil via l'API
      await updateUserProfile({
        ...user,
        profile: {
          ...user.profile,
          favorite_subjects: formData.favoriteSubjects,
          bio: formData.bio || '',
          // Ajouter d'autres champs selon les besoins de votre API
        }
      });
      
      // Rafraîchir les données utilisateur
      await refreshUser();
      
      // Redirection vers la page d'accueil
      navigate('/');
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du profil:", err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || "Une erreur est survenue lors de l'enregistrement de votre profil.");
      } else {
        setError("Une erreur est survenue lors de l'enregistrement de votre profil. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Si en cours de chargement initial
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }
  
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
        {/* En-tête avec progression des étapes */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-center mb-4">Complétez votre profil</h2>
          
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2">
              <div className={`text-xs ${step >= 1 ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
                Profil
              </div>
              <div className={`text-xs ${step >= 2 ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
                Matières
              </div>
              <div className={`text-xs ${step >= 3 ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
                Notes
              </div>
            </div>
          </div>
        </div>
        
        {/* Message d'erreur */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {/* Contenu de l'étape actuelle */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default OnboardingProfile;