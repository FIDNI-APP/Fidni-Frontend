// src/pages/OnboardingProfile.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Plus, 
  Trash, 
  Check, 
  ArrowRight,
  ArrowLeft, 
  GraduationCap, 
  Loader2,
  Users,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  Award,
  Star,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
// Import the APIs necessary to retrieve the data
import { 
  getClassLevels, 
  getSubjects, 
  saveOnboardingProfile
} from '@/lib/api';

// Type definitions
interface SubjectGrade {
  id: string;
  subject: string;
  min_grade: number;
  max_grade: number;
}

interface OnboardingData {
  class_level: string;
  favorite_subjects: string[];
  user_type: 'student' | 'teacher';
  subject_grades: SubjectGrade[];
  bio?: string;
}

// Main component
const OnboardingProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // States to store reference data from the API
  const [classLevels, setClassLevels] = useState<{id: string, name: string}[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [loadingReference, setLoadingReference] = useState(true);
  
  // Animation states
  const [animateExit, setAnimateExit] = useState(false);
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  
  // Onboarding form data
  const [formData, setFormData] = useState<OnboardingData>({
    class_level: '',
    favorite_subjects: [],
    user_type: 'student',
    subject_grades: []
  });
  
  // If the user is not logged in, redirect to home
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    // If the profile is already completed, redirect to home
    if (user.profile && user.profile.favorite_subjects && user.profile.favorite_subjects.length > 0) {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Load reference data from the API
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setLoadingReference(true);
        
        // Get class levels
        const classLevelsData = await getClassLevels();
        setClassLevels(classLevelsData.map(level => ({
          id: level.id,
          name: level.name
        })));
        
        // If a class level is already selected, load the corresponding subjects
        if (formData.class_level) {
          // Use the array format for class_levels[]
          const subjectsData = await getSubjects([formData.class_level]);
          setSubjects(subjectsData.map(subject => ({
            id: subject.id,
            name: subject.name
          })));
        } else {
          // Otherwise, load all subjects
          const subjectsData = await getSubjects();
          setSubjects(subjectsData.map(subject => ({
            id: subject.id,
            name: subject.name
          })));
        }
      } catch (err) {
        console.error("Error loading reference data:", err);
        setError("Unable to load data. Please try again.");
      } finally {
        setLoadingReference(false);
      }
    };
    
    loadReferenceData();
  }, [formData.class_level]);
  
  // Update subjects when the class level changes
  const handleClassLevelChange = async (classLevelId: string) => {
    setFormData({...formData, class_level: classLevelId});
    
    try {
      setLoadingReference(true);
      const subjectsData = await getSubjects([classLevelId]);
      setSubjects(subjectsData.map(subject => ({
        id: subject.id,
        name: subject.name
      })));
      
      // Reset favorite subjects if they are no longer available
      setFormData(prev => ({
        ...prev,
        favorite_subjects: prev.favorite_subjects.filter(id => 
          subjectsData.some(s => s.id === id)
        ),
        subject_grades: prev.subject_grades.filter(grade => 
          subjectsData.some(s => s.id === grade.subject)
        )
      }));
    } catch (err) {
      console.error("Error loading subjects:", err);
    } finally {
      setLoadingReference(false);
    }
  };

  // Handle step navigation with animation
  const navigateToStep = (nextStep: number, direction: 'next' | 'back') => {
    setDirection(direction);
    setAnimateExit(true);
    
    // Wait for exit animation to complete
    setTimeout(() => {
      setStep(nextStep);
      setAnimateExit(false);
    }, 300);
  };
  
  // STEP 1: Choose level and user type
  const renderStep1 = () => (
    <div className={`space-y-8 transition-opacity duration-300 ${animateExit ? 'opacity-0 transform translate-x-8' : 'opacity-100'}`}>
      {/* Introduction card */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-indigo-900 mb-2 flex items-center">
          <UserPlus className="w-5 h-5 mr-2 text-indigo-600" />
          Welcome to Fidni!
        </h3>
        <p className="text-gray-700">
          Let's set up your profile to personalize your learning experience. 
          This information helps us recommend content tailored to your needs.
        </p>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Who are you?</h3>
          <button 
            onClick={() => setShowHelp(!showHelp)} 
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            {showHelp ? "Hide help" : "Need help?"}
          </button>
        </div>
        
        {showHelp && (
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded">
            <p className="text-sm">
              This helps us customize your experience. Teachers get tools for creating content, 
              while students receive personalized learning recommendations.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormData({...formData, user_type: 'student'})}
            className={`flex flex-col items-center p-6 border rounded-xl transition-all ${
              formData.user_type === 'student' 
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
              formData.user_type === 'student' 
                ? 'bg-indigo-100 text-indigo-600' 
                : 'bg-gray-100 text-gray-400'
            }`}>
              <GraduationCap className="w-8 h-8" />
            </div>
            <span className="font-medium text-gray-800">Student</span>
            <span className="text-xs text-gray-500 mt-1">Learning and practicing</span>
          </button>
          
          <button
            type="button"
            onClick={() => setFormData({...formData, user_type: 'teacher'})}
            className={`flex flex-col items-center p-6 border rounded-xl transition-all ${
              formData.user_type === 'teacher' 
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
              formData.user_type === 'teacher' 
                ? 'bg-indigo-100 text-indigo-600' 
                : 'bg-gray-100 text-gray-400'
            }`}>
              <Users className="w-8 h-8" />
            </div>
            <span className="font-medium text-gray-800">Teacher</span>
            <span className="text-xs text-gray-500 mt-1">Creating and mentoring</span>
          </button>
        </div>
      </div>
      
      <div>
        <label htmlFor="classLevel" className="block text-base font-medium text-gray-700 mb-2">
          What's your current education level?
        </label>
        {loadingReference ? (
          <div className="flex items-center text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <Loader2 className="animate-spin mr-2 h-5 w-5" />
            Loading education levels...
          </div>
        ) : (
          <div className="relative rounded-lg border border-gray-300 bg-white">
            <select
              id="classLevel"
              value={formData.class_level}
              onChange={(e) => handleClassLevelChange(e.target.value)}
              className="w-full px-4 py-3 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
            >
              <option value="">Select your level</option>
              {classLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <label htmlFor="bio" className="block text-base font-medium text-gray-700">
          Tell us about yourself <span className="text-gray-400 text-sm font-normal">(optional)</span>
        </label>
        <textarea
          id="bio"
          value={formData.bio || ''}
          onChange={(e) => setFormData({...formData, bio: e.target.value})}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
          placeholder="Share your academic interests, learning goals, or teaching philosophy..."
        />
      </div>
      
      <div className="pt-6 flex justify-end">
        <Button
          onClick={() => navigateToStep(2, 'next')}
          disabled={!formData.class_level || !formData.user_type || loadingReference}
          className="bg-indigo-600 hover:bg-indigo-700 text-lg py-6 px-8"
        >
          Continue
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
  
  // STEP 2: Choose favorite subjects
  const renderStep2 = () => {
    const toggleSubject = (subjectId: string) => {
      const currentSubjects = [...formData.favorite_subjects];
      if (currentSubjects.includes(subjectId)) {
        setFormData({
          ...formData, 
          favorite_subjects: currentSubjects.filter(id => id !== subjectId)
        });
      } else {
        // Limit to max 5 subjects
        if (currentSubjects.length < 5) {
          setFormData({
            ...formData, 
            favorite_subjects: [...currentSubjects, subjectId]
          });
        }
      }
    };
    
    return (
      <div className={`space-y-8 transition-all duration-300 ${
        animateExit ? 
          (direction === 'next' ? 'opacity-0 transform translate-x-8' : 'opacity-0 transform -translate-x-8') : 
          'opacity-100 transform translate-x-0'
      }`}>
        {/* Progress indicator card */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700">
              <Check className="w-5 h-5" />
            </div>
            <div className="mx-2 h-0.5 flex-1 bg-gray-200">
              <div className="h-full bg-indigo-500 rounded" style={{width: '50%'}}></div>
            </div>
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700">
              <span className="text-sm font-medium">2</span>
            </div>
            <div className="mx-2 h-0.5 flex-1 bg-gray-200"></div>
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
              <span className="text-sm font-medium">3</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <span>Profile</span>
            <span>Subjects</span>
            <span>Grades</span>
          </div>
        </div>
      
        <div className="space-y-4">
          <h3 className="text-xl font-medium text-gray-800">Choose your favorite subjects</h3>
          <p className="text-gray-600">
            Select the subjects you enjoy most or want to focus on (select 1-5 subjects).
            We'll use this to personalize your learning experience.
          </p>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <span className="font-medium text-indigo-600">{formData.favorite_subjects.length}</span> of 5 selected
            </div>
            
            {formData.favorite_subjects.length >= 5 && (
              <div className="text-amber-600 text-sm flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Maximum 5 subjects reached
              </div>
            )}
          </div>
        </div>
        
        {loadingReference ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
            <Loader2 className="animate-spin mb-4 h-10 w-10 text-indigo-600" />
            <p>Loading subjects for your education level...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h4 className="text-lg font-medium text-amber-800 mb-2">No subjects available</h4>
            <p className="text-amber-700 text-center mb-6 max-w-md">
              We couldn't find any subjects for your selected education level. 
              Please go back and select a different level.
            </p>
            <Button
              onClick={() => navigateToStep(1, 'back')}
              variant="outline"
              className="border-amber-500 text-amber-700 hover:bg-amber-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Change education level
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => toggleSubject(subject.id)}
                disabled={!formData.favorite_subjects.includes(subject.id) && formData.favorite_subjects.length >= 5}
                className={`relative overflow-hidden group px-4 py-4 border text-left rounded-xl transition-all ${
                  formData.favorite_subjects.includes(subject.id)
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : formData.favorite_subjects.length >= 5
                      ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-gray-50'
                }`}
              >
                <div className="absolute -right-1 -top-1">
                  {formData.favorite_subjects.includes(subject.id) && (
                    <div className="bg-indigo-500 text-white rounded-bl-lg w-8 h-8 flex items-center justify-center transform rotate-6">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </div>
                
                <div className="flex items-start">
                  <div className={`mr-3 mt-0.5 p-2 rounded-lg ${
                    formData.favorite_subjects.includes(subject.id)
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {subject.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Click to {formData.favorite_subjects.includes(subject.id) ? 'remove' : 'select'}
                    </div>
                  </div>
                </div>
                
                {/* Background decoration when selected */}
                {formData.favorite_subjects.includes(subject.id) && (
                  <div className="absolute bottom-0 right-0 text-indigo-100 opacity-30">
                    <Star className="w-16 h-16" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
        
        <div className="pt-4 flex justify-between">
          <Button
            onClick={() => navigateToStep(1, 'back')}
            variant="outline"
            className="border-gray-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => navigateToStep(3, 'next')}
            disabled={formData.favorite_subjects.length === 0 || loadingReference}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };
  
  // STEP 3: Add subject grades
  const renderStep3 = () => {
    const addSubjectGrade = () => {
      // Filter subjects that haven't been added yet
      const availableSubjects = subjects.filter(
        subject => !formData.subject_grades.some(grade => grade.subject === subject.id)
      );
      
      if (availableSubjects.length > 0) {
        const newSubject = availableSubjects[0];
        const newSubjectGrade: SubjectGrade = {
          id: `sg-${Date.now()}`,
          subject: newSubject.id,
          min_grade: 0,
          max_grade: 20
        };
        
        setFormData({
          ...formData, 
          subject_grades: [...formData.subject_grades, newSubjectGrade]
        });
      }
    };
    
    const removeSubjectGrade = (id: string) => {
      setFormData({
        ...formData,
        subject_grades: formData.subject_grades.filter(grade => grade.id !== id)
      });
    };
    
    const updateSubjectGrade = (id: string, field: keyof SubjectGrade, value: any) => {
      setFormData({
        ...formData,
        subject_grades: formData.subject_grades.map(grade => 
          grade.id === id ? { ...grade, [field]: value } : grade
        )
      });
    };
    
    // Get subject name by id
    const getSubjectName = (subjectId: string): string => {
      const subject = subjects.find(s => s.id === subjectId);
      return subject ? subject.name : 'Unknown Subject';
    };
    
    return (
      <div className={`space-y-8 transition-all duration-300 ${
        animateExit ? 
          (direction === 'next' ? 'opacity-0 transform translate-x-8' : 'opacity-0 transform -translate-x-8') : 
          'opacity-100 transform translate-x-0'
      }`}>
        {/* Progress indicator card */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700">
              <Check className="w-5 h-5" />
            </div>
            <div className="mx-2 h-0.5 flex-1 bg-gray-200">
              <div className="h-full bg-green-500 rounded" style={{width: '100%'}}></div>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700">
              <Check className="w-5 h-5" />
            </div>
            <div className="mx-2 h-0.5 flex-1 bg-gray-200">
              <div className="h-full bg-indigo-500 rounded" style={{width: '100%'}}></div>
            </div>
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700">
              <span className="text-sm font-medium">3</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <span>Profile</span>
            <span>Subjects</span>
            <span>Grades</span>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <h3 className="text-xl font-medium text-gray-800">Your grades</h3>
              <p className="text-gray-600 mt-1">
                Add your minimum and maximum grades for each subject (optional)
              </p>
            </div>
            <div className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              Final Step
            </div>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-600" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  This helps us personalize your experience. We'll recommend content based on your grade range.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* List of subjects with grades */}
        <div className="space-y-4">
          {formData.subject_grades.map((gradeItem) => (
            <div 
              key={gradeItem.id} 
              className="flex items-center space-x-3 p-4 border rounded-xl bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex-grow">
                <div className="flex items-center mb-3">
                  <Award className="w-5 h-5 text-indigo-500 mr-2" />
                  <select
                    value={gradeItem.subject}
                    onChange={(e) => updateSubjectGrade(gradeItem.id, 'subject', e.target.value)}
                    className="flex-grow px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    aria-label="Select a subject"
                  >
                    {subjects.map((subject) => (
                      <option 
                        key={subject.id} 
                        value={subject.id}
                        disabled={formData.subject_grades.some(
                          g => g.id !== gradeItem.id && g.subject === subject.id
                        )}
                      >
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center">
                  <div className="space-y-1 mr-6">
                    <label className="block text-xs text-gray-500">Minimum Grade</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="20" 
                      value={gradeItem.min_grade}
                      onChange={(e) => updateSubjectGrade(
                        gradeItem.id, 
                        'min_grade', 
                        Math.min(Math.max(0, parseInt(e.target.value) || 0), gradeItem.max_grade)
                      )}
                      className="w-20 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      title="Minimum grade"
                      placeholder="Min"
                      aria-label="Minimum grade"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-gray-500">Maximum Grade</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="20" 
                      value={gradeItem.max_grade}
                      onChange={(e) => updateSubjectGrade(
                        gradeItem.id, 
                        'max_grade', 
                        Math.max(gradeItem.min_grade, Math.min(20, parseInt(e.target.value) || 0))
                      )}
                      className="w-20 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      title="Maximum grade"
                      placeholder="Max"
                    />
                  </div>
                </div>
                
                {/* Visual grade range indicator */}
                <div className="mt-3 px-2">
                  <div className="relative h-2 bg-gray-200 rounded-full w-full">
                    <div 
                      className="absolute h-2 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full"
                      style={{
                        left: `${(gradeItem.min_grade / 20) * 100}%`,
                        width: `${((gradeItem.max_grade - gradeItem.min_grade) / 20) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span>10</span>
                    <span>20</span>
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => removeSubjectGrade(gradeItem.id)}
                className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                aria-label="Remove this subject"
              >
                <Trash className="h-5 w-5" />
              </button>
            </div>
          ))}
          
          {/* Button to add a subject */}
          {formData.subject_grades.length < subjects.length ? (
            <button
              type="button"
              onClick={addSubjectGrade}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Another Subject
            </button>
            ) : (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
                <p className="text-gray-600">You've added all available subjects.</p>
              </div>
            )}
            
            {formData.subject_grades.length === 0 && (
              <div className="text-center py-8 px-4 bg-gray-50 rounded-xl border border-gray-200">
                <Award className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <h4 className="text-base font-medium text-gray-700 mb-2">No grades added yet</h4>
                <p className="text-gray-500 mb-4 text-sm">
                  Adding your grades helps us personalize content to your level.
                </p>
                <Button 
                  onClick={addSubjectGrade}
                  variant="outline"
                  className="text-indigo-600 border-indigo-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Subject Grade
                </Button>
              </div>
            )}
          </div>
          
          <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-indigo-100 rounded-full p-2 mt-1">
                <Check className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-base font-medium text-indigo-800">Ready to complete your profile</h3>
                <p className="mt-1 text-sm text-indigo-700">
                  You've added all the information we need. Click the button below to finish setting up your profile.
                </p>
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex justify-between">
            <Button
              onClick={() => navigateToStep(2, 'back')}
              variant="outline"
              className="border-gray-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 px-8 py-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                <>
                  Complete Setup
                  <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      );
    };
    
    // Success screen after submission
    const renderSuccessScreen = () => (
      <div className="text-center py-10">
        <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
          <Check className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Completed!</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Your profile has been set up successfully. You're all set to start using Fidni.
        </p>
        <Button 
          onClick={() => navigate('/')}
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3"
        >
          Go to Homepage
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
    
    // Function to submit the complete form
    const handleSubmit = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (!user) {
          setError("You must be logged in to complete your profile.");
          return;
        }
        
        // Prepare data for the API
        const onboardingData = {
          class_level: formData.class_level,
          user_type: formData.user_type,
          bio: formData.bio || '',
          favorite_subjects: formData.favorite_subjects,
          subject_grades: formData.subject_grades.map(grade => ({
            subject: grade.subject,
            min_grade: grade.min_grade,
            max_grade: grade.max_grade
          }))
        };
        
        // Update the profile using the API
        await saveOnboardingProfile(onboardingData);
        
        // Refresh user data
        await refreshUser();
        
        // Show success screen before redirecting
        setStep(4); // Set to a success screen step
        
        // Redirect to home page after a delay
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } catch (err) {
        console.error("Error saving profile:", err);
        if (axios.isAxiosError(err) && err.response) {
          setError(err.response.data.error || 
            `Error: ${err.response.status} - ${err.response.statusText}`);
        } else {
          setError("An error occurred while saving your profile. Please try again.");
        }
        setIsLoading(false);
      }
    };
    
    // If loading initially
    if (!user) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      );
    }
    
    return (
      <div className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-white to-indigo-50">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          {step < 4 && (
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
              <p className="text-gray-600 mt-2">
                Let's set up your profile to get the most out of Fidni
              </p>
            </div>
          )}
          
          {/* Main content container */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8">
              {/* Error message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <p>{error}</p>
                  </div>
                </div>
              )}
              
              {/* Current step content */}
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderSuccessScreen()}
            </div>
          </div>
          
          {/* Footer help text */}
          {step < 4 && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Need help? Contact us at <a href="mailto:support@fidni.com" className="text-indigo-600 hover:underline">support@fidni.com</a>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  export default OnboardingProfile;