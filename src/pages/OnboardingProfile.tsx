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
  ChevronRight,
  Sparkles
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
    <div className={`space-y-8 transition-all duration-300 ${
      animateExit ? 
        (direction === 'next' ? 'opacity-0 transform translate-x-8' : 'opacity-0 transform -translate-x-8') : 
        'opacity-100 transform translate-x-0'
    }`}>
      {/* Introduction card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 opacity-10">
          <Sparkles className="w-64 h-64 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-3 flex items-center">
          <UserPlus className="w-6 h-6 mr-2" />
          Welcome to Fidni!
        </h3>
        <p className="text-indigo-100 text-lg">
          Let's personalize your learning journey in just a few steps
        </p>
        <div className="mt-4 flex">
          <div className="flex items-center space-x-2 bg-white/20 rounded-full px-4 py-1.5 text-sm backdrop-blur-sm">
            <span className="w-6 h-6 rounded-full bg-white text-indigo-600 flex items-center justify-center font-bold">1</span>
            <span className="font-medium">Your Profile</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-gray-900">Who are you?</h3>
          <button 
            onClick={() => setShowHelp(!showHelp)} 
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center transition-colors"
          >
            <HelpCircle className="w-4 h-4 mr-1.5" />
            {showHelp ? "Hide help" : "Need help?"}
          </button>
        </div>
        
        {showHelp && (
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-lg animate-fadeIn">
            <p className="text-sm leading-relaxed">
              This helps us customize your experience. Teachers get tools for creating educational content 
              and managing students, while students receive personalized learning recommendations and progress tracking.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormData({...formData, user_type: 'student'})}
            className={`relative overflow-hidden flex flex-col items-center p-8 border-2 rounded-xl transition-all ${
              formData.user_type === 'student' 
                ? 'border-indigo-500 bg-indigo-50/50 shadow-md' 
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            {formData.user_type === 'student' && (
              <div className="absolute top-3 right-3">
                <Check className="w-5 h-5 text-indigo-600" />
              </div>
            )}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all ${
              formData.user_type === 'student' 
                ? 'bg-indigo-100 text-indigo-600' 
                : 'bg-gray-100 text-gray-400'
            }`}>
              <GraduationCap className="w-10 h-10" />
            </div>
            <span className="font-bold text-lg text-gray-800">Student</span>
            <span className="text-gray-500 text-center mt-2">Learn at your own pace with personalized content</span>
          </button>
          
          <button
            type="button"
            onClick={() => setFormData({...formData, user_type: 'teacher'})}
            className={`relative overflow-hidden flex flex-col items-center p-8 border-2 rounded-xl transition-all ${
              formData.user_type === 'teacher' 
                ? 'border-indigo-500 bg-indigo-50/50 shadow-md' 
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            {formData.user_type === 'teacher' && (
              <div className="absolute top-3 right-3">
                <Check className="w-5 h-5 text-indigo-600" />
              </div>
            )}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all ${
              formData.user_type === 'teacher' 
                ? 'bg-indigo-100 text-indigo-600' 
                : 'bg-gray-100 text-gray-400'
            }`}>
              <Users className="w-10 h-10" />
            </div>
            <span className="font-bold text-lg text-gray-800">Teacher</span>
            <span className="text-gray-500 text-center mt-2">Create content and mentor students effectively</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md">
        <label htmlFor="classLevel" className="block text-xl font-bold text-gray-900 mb-3">
          Your Education Level
        </label>
        <p className="text-gray-500 mb-4">
          Select your current education level so we can recommend appropriate content
        </p>
        
        {loadingReference ? (
          <div className="flex items-center justify-center text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <Loader2 className="animate-spin mr-3 h-6 w-6 text-indigo-600" />
            <span>Loading education levels...</span>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
            <select
              id="classLevel"
              value={formData.class_level}
              onChange={(e) => handleClassLevelChange(e.target.value)}
              className="w-full px-4 py-3.5 appearance-none focus:outline-none text-gray-700 font-medium"
            >
              <option value="">Select your education level</option>
              {classLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-500">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md">
        <label htmlFor="bio" className="block text-xl font-bold text-gray-900 mb-2">
          About Yourself <span className="text-gray-400 text-sm font-normal">(optional)</span>
        </label>
        <p className="text-gray-500 mb-4">
          Tell us a bit about yourself, your interests, and what you hope to achieve
        </p>
        <textarea
          id="bio"
          value={formData.bio || ''}
          onChange={(e) => setFormData({...formData, bio: e.target.value})}
          rows={4}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all"
          placeholder="I'm passionate about learning mathematics and science. I hope to improve my problem-solving skills..."
        />
      </div>
      
      <div className="pt-4 flex justify-end">
        <Button
          onClick={() => navigateToStep(2, 'next')}
          disabled={!formData.class_level || !formData.user_type || loadingReference}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg py-6 px-8 font-bold shadow-lg hover:shadow-xl transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
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
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="absolute top-0 right-0 opacity-10">
            <Sparkles className="w-64 h-64 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-3">Your Favorite Subjects</h3>
          <p className="text-indigo-100">
            Select the subjects you're most interested in learning
          </p>
          
          <div className="mt-6 mb-2">
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{width: '66%'}}></div>
            </div>
          </div>
          
          <div className="flex justify-between text-indigo-100 text-sm">
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-1" />
              Profile
            </div>
            <div className="font-bold">Subjects</div>
            <div>Grades</div>
          </div>
        </div>
      
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Select Your Favorite Subjects</h3>
          <p className="text-gray-600 mb-5">
            Choose 1-5 subjects you enjoy most. We'll use these to personalize your recommendations 
            and connect you with relevant content.
          </p>
          
          <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 rounded-full">
              <span className="font-medium text-indigo-700">{formData.favorite_subjects.length}</span>
              <span className="text-indigo-600">of 5 selected</span>
            </div>
            
            {formData.favorite_subjects.length >= 5 && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 rounded-full text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                <span>Maximum 5 subjects selected</span>
              </div>
            )}
          </div>
          
          {loadingReference ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
              <Loader2 className="animate-spin mb-4 h-12 w-12 text-indigo-600" />
              <p className="text-lg font-medium">Loading subjects...</p>
              <p className="text-gray-500">Please wait while we fetch subjects for your education level</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
              <h4 className="text-xl font-bold text-amber-800 mb-2">No subjects available</h4>
              <p className="text-amber-700 text-center mb-6 max-w-md">
                We couldn't find any subjects for your selected education level. 
                Please go back and select a different level.
              </p>
              <Button
                onClick={() => navigateToStep(1, 'back')}
                variant="outline"
                className="border-amber-500 text-amber-700 hover:bg-amber-50 font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change education level
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => toggleSubject(subject.id)}
                  disabled={!formData.favorite_subjects.includes(subject.id) && formData.favorite_subjects.length >= 5}
                  className={`relative overflow-hidden group p-5 border-2 text-left rounded-xl transition-all ${
                    formData.favorite_subjects.includes(subject.id)
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-md' 
                      : formData.favorite_subjects.length >= 5
                        ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  {formData.favorite_subjects.includes(subject.id) && (
                    <div className="absolute top-3 right-3 bg-indigo-100 text-indigo-600 rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  
                  <div className="flex items-start">
                    <div className={`mr-4 p-3 rounded-lg transition-colors ${
                      formData.favorite_subjects.includes(subject.id)
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-lg">
                        {subject.name}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Click to {formData.favorite_subjects.includes(subject.id) ? 'remove' : 'select'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Background decoration when selected */}
                  {formData.favorite_subjects.includes(subject.id) && (
                    <div className="absolute -bottom-4 -right-4 text-indigo-100 opacity-30 rotate-12">
                      <Star className="w-20 h-20" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="pt-4 flex justify-between">
          <Button
            onClick={() => navigateToStep(1, 'back')}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl px-6 py-2.5 font-medium"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => navigateToStep(3, 'next')}
            disabled={formData.favorite_subjects.length === 0 || loadingReference}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 py-2.5 font-medium shadow-lg hover:shadow-xl transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
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
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="absolute top-0 right-0 opacity-10">
            <Sparkles className="w-64 h-64 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-3">Final Step: Your Grades</h3>
          <p className="text-indigo-100">
            Let us know your grade ranges to better tailor content to your level
          </p>
          
          <div className="mt-6 mb-2">
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{width: '100%'}}></div>
            </div>
          </div>
          
          <div className="flex justify-between text-indigo-100 text-sm">
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-1" />
              Profile
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-1" />
              Subjects
            </div>
            <div className="font-bold">Grades</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Your Grade Ranges</h3>
              <p className="text-gray-600">
                Add your minimum and maximum grades for subjects you're studying
              </p>
            </div>
            <div className="text-xs font-bold text-white bg-indigo-600 px-4 py-1.5 rounded-full">
              Final Step
            </div>
          </div>
          
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  This information is optional but helps us recommend content that matches your current knowledge level.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* List of subjects with grades */}
        <div className="space-y-5">
          {formData.subject_grades.map((gradeItem) => (
            <div 
              key={gradeItem.id} 
              className="relative bg-white p-5 border-2 border-gray-100 rounded-xl hover:border-indigo-100 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-indigo-100 text-indigo-600 p-3 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                
                <div className="flex-grow">
                  <div className="mb-4">
                    <select
                      value={gradeItem.subject}
                      onChange={(e) => updateSubjectGrade(gradeItem.id, 'subject', e.target.value)}
                      className="w-full font-medium px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
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
                  
                  <div className="flex flex-wrap gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Minimum Grade</label>
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
                        className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 font-medium"
                        aria-label="Minimum grade"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Maximum Grade</label>
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
                        className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 font-medium"
                        aria-label="Maximum grade"
                      />
                    </div>
                  </div>
                  
                  {/* Visual grade range indicator */}
                  <div className="mt-5 px-2">
                    <div className="relative h-3 bg-gray-100 rounded-full w-full">
                      <div 
                        className="absolute h-3 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full"
                        style={{
                          left: `${(gradeItem.min_grade / 20) * 100}%`,
                          width: `${((gradeItem.max_grade - gradeItem.min_grade) / 20) * 100}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>0</span>
                      <span>10</span>
                      <span>20</span>
                    </div>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => removeSubjectGrade(gradeItem.id)}
                  className="flex-shrink-0 text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                  aria-label="Remove this subject"
                >
                  <Trash className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
          
          {/* Button to add a subject */}
          {formData.subject_grades.length < subjects.length ? (
            <button
              type="button"
              onClick={addSubjectGrade}
              className="w-full py-5 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center transition-colors font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Another Subject
            </button>
          ) : (
            <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl text-center">
              <p className="text-gray-600 font-medium">You've added all available subjects.</p>
            </div>
          )}
          
          {formData.subject_grades.length === 0 && (
            <div className="flex flex-col items-center justify-center bg-white border-2 border-gray-100 p-8 rounded-xl shadow-md">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Award className="w-8 h-8 text-indigo-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">No grades added yet</h4>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                Adding your grades helps us personalize content to your level. 
                This step is optional, but helps with better recommendations.
              </p>
              <Button 
                onClick={addSubjectGrade}
                variant="outline"
                className="text-indigo-600 border-indigo-300 hover:bg-indigo-50 font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Subject Grade
              </Button>
            </div>
          )}
        </div>
        
        <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-indigo-100 rounded-full p-3 text-indigo-600">
              <Check className="h-6 w-6" />
            </div>
            <div className="ml-5">
              <h3 className="text-lg font-bold text-indigo-800 mb-2">Ready to complete your profile</h3>
              <p className="text-indigo-700">
                You've provided all the information we need. Click the button below to finish setting up your profile 
                and start your personalized learning journey with Fidni.
              </p>
            </div>
          </div>
        </div>
        
        <div className="pt-4 flex justify-between">
          <Button
            onClick={() => navigateToStep(2, 'back')}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl px-6 py-2.5 font-medium"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 py-4 font-bold shadow-lg hover:shadow-xl transition-all text-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving Profile...
              </>
            ) : (
              <>
                Complete Setup
                <Check className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };
    
  // Success screen after submission
  const renderSuccessScreen = () => (
    <div className="text-center py-10 px-4">
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-25"></div>
        <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 rounded-full w-full h-full flex items-center justify-center">
          <Check className="w-12 h-12 text-white" />
        </div>
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">Profile Completed!</h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
        Your profile has been set up successfully. You're all set to start your personalized learning journey with Fidni.
      </p>
      <div className="bg-indigo-50 rounded-xl p-6 max-w-md mx-auto mb-8 border border-indigo-100">
        <p className="text-indigo-700 font-medium">
          We'll use your preferences to customize your dashboard and recommend content that matches your interests and grade level.
        </p>
      </div>
      <Button 
        onClick={() => navigate('/')}
        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 py-4 font-bold text-lg shadow-lg hover:shadow-xl transition-all"
      >
        Go to Dashboard
        <ArrowRight className="ml-2 h-5 w-5" />
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
      }, 5000);
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
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-indigo-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto relative">
            <div className="absolute top-0 right-0 w-full h-full border-4 border-indigo-200 rounded-full animate-ping opacity-75"></div>
            <Loader2 className="w-16 h-16 animate-spin text-indigo-600 relative" />
          </div>
          <p className="mt-4 text-indigo-800 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }
    
  return (
    <div className="bg-gradient-to-b from-white to-indigo-50 min-h-screen">
      {/* Background pattern/decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100 rounded-full opacity-50 blur-3xl"></div>
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-purple-100 rounded-full opacity-40 blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-100 rounded-full opacity-30 blur-3xl"></div>
      </div>
      
      <div className="relative pt-24 pb-16 min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          {step < 4 && (
            <div className="text-center mb-8">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                Welcome to Fidni
              </h1>
              <p className="text-xl text-gray-600">
                Let's set up your profile to personalize your learning experience
              </p>
            </div>
          )}
          
          {/* Main content container */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 md:p-8">
              {/* Error message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
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
              <p className="text-gray-500">
                Need help? Contact us at <a href="mailto:support@fidni.com" className="text-indigo-600 hover:underline font-medium">support@fidni.com</a>
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        @keyframes ping {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        
        .animate-ping {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};
  
export default OnboardingProfile;