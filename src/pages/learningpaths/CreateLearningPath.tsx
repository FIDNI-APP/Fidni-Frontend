// src/pages/learningpaths/CreateLearningPath.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Save,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Clock,
  AlertCircle,
  Info,
  Sparkles,
  CheckCircle,
  Target,
  Layers
} from 'lucide-react';
import { createLearningPath } from '@/lib/api/learningpathApi';
import { getClassLevels, getSubjects } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export const CreateLearningPath: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [classLevels, setClassLevels] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    class_level_id: '',
    estimated_hours: 0,
    is_active: true,
    difficulty_level: 'intermediate',
    prerequisites: '',
    learning_objectives: '',
    tags: [] as string[]
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.is_superuser) {
      navigate('/learning-paths');
      return;
    }
    loadOptions();
  }, [user, navigate]);

  const loadOptions = async () => {
    try {
      const [levelsData, subjectsData] = await Promise.all([
        getClassLevels(),
        getSubjects()
      ]);
      setClassLevels(levelsData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Failed to load options:', error);
      setError('Failed to load form options. Please refresh the page.');
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.title.trim()) errors.title = 'Title is required';
      if (formData.title.length < 5) errors.title = 'Title must be at least 5 characters';
      if (!formData.description.trim()) errors.description = 'Description is required';
      if (formData.description.length < 20) errors.description = 'Description must be at least 20 characters';
    } else if (step === 2) {
      if (!formData.subject_id) errors.subject_id = 'Please select a subject';
      if (!formData.class_level_id) errors.class_level_id = 'Please select a class level';
      if (formData.estimated_hours <= 0) errors.estimated_hours = 'Estimated hours must be greater than 0';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateStep(1) || !validateStep(2)) {
    setCurrentStep(1);
    return;
  }

  try {
    setLoading(true);
    setError('');
    
    // Log the data being sent
    console.log('Form data being sent:', formData);
    
    const response = await createLearningPath(formData);
    setSuccess(true);
    
    setTimeout(() => {
      navigate(`/learning-paths/${response.id}`);
    }, 2000);
  } catch (error: any) {
    // Enhanced error logging
    console.error('Full error object:', error);
    console.error('Error response:', error.response);
    console.error('Error response data:', error.response?.data);
    
    setError(error.response?.data?.message || 'Failed to create learning path');
  } finally {
    setLoading(false);
  }
};

  const steps = [
    { number: 1, title: 'Basic Information', icon: BookOpen },
    { number: 2, title: 'Configuration', icon: GraduationCap },
    { number: 3, title: 'Additional Details', icon: Target }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-300/20 to-transparent rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-300/20 to-transparent rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div className="relative container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/learning-paths')}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Learning Paths
            </button>
            
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
                <Sparkles className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Create Learning Path
              </h1>
            </div>
            <p className="text-gray-600 ml-16">Design a structured learning journey for students</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex flex-col items-center ${
                      currentStep >= step.number ? 'text-indigo-600' : 'text-gray-400'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                      currentStep > step.number 
                        ? 'bg-green-500 text-white' 
                        : currentStep === step.number 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                          : 'bg-gray-200'
                    }`}>
                      {currentStep > step.number ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <step.icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{step.title}</span>
                  </motion.div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 rounded-full transition-all ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8">
              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                </motion.div>
              )}

              {/* Success Alert */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl text-center"
                >
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <p className="text-green-800 font-semibold text-lg">Learning Path Created Successfully!</p>
                  <p className="text-green-600 text-sm mt-1">Redirecting you to the learning path...</p>
                </motion.div>
              )}

              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => {
                        setFormData({ ...formData, title: e.target.value });
                        setValidationErrors({ ...validationErrors, title: '' });
                      }}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                        validationErrors.title ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Complete Mathematics Path for Grade 10"
                    />
                    {validationErrors.title && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => {
                        setFormData({ ...formData, description: e.target.value });
                        setValidationErrors({ ...validationErrors, description: '' });
                      }}
                      rows={4}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all ${
                        validationErrors.description ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Describe what students will learn in this path..."
                    />
                    {validationErrors.description && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      {formData.description.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Learning Objectives
                    </label>
                    <textarea
                      value={formData.learning_objectives}
                      onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      placeholder="List the key learning objectives..."
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Configuration */}
              {currentStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <BookOpen className="w-4 h-4 inline mr-1" />
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.subject_id}
                        title='Subject'
                        onChange={(e) => {
                          setFormData({ ...formData, subject_id: e.target.value });
                          setValidationErrors({ ...validationErrors, subject_id: '' });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all ${
                          validationErrors.subject_id ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select a subject</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                      {validationErrors.subject_id && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.subject_id}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <GraduationCap className="w-4 h-4 inline mr-1" />
                        Class Level <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.class_level_id}
                        title='Class Level'
                        onChange={(e) => {
                          setFormData({ ...formData, class_level_id: e.target.value });
                          setValidationErrors({ ...validationErrors, class_level_id: '' });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all ${
                          validationErrors.class_level_id ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select a class level</option>
                        {classLevels.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                      {validationErrors.class_level_id && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.class_level_id}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Estimated Duration (hours) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        title='Estimated Duration'
                        value={formData.estimated_hours}
                        onChange={(e) => {
                          setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || 0 });
                          setValidationErrors({ ...validationErrors, estimated_hours: '' });
                        }}
                        min="0"
                        step="0.5"
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                          validationErrors.estimated_hours ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {validationErrors.estimated_hours && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.estimated_hours}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Layers className="w-4 h-4 inline mr-1" />
                        Difficulty Level
                      </label>
                      <select
                        value={formData.difficulty_level}
                        title='Difficulty Level'
                        onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-indigo-50 rounded-xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div className="text-sm text-indigo-800">
                      <p className="font-medium mb-1">Tip: Duration Estimation</p>
                      <p>Include time for video lessons, exercises, quizzes, and practice. A typical chapter takes 2-4 hours to complete.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Additional Details */}
              {currentStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Prerequisites
                    </label>
                    <textarea
                      value={formData.prerequisites}
                      onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      placeholder="What should students know before starting this path?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      placeholder="Add tags separated by commas"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value && !formData.tags.includes(value)) {
                            setFormData({ ...formData, tags: [...formData.tags, value] });
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-1"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                tags: formData.tags.filter((_, i) => i !== index)
                              })}
                              className="ml-1 text-indigo-500 hover:text-indigo-700"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <span className="text-gray-800 font-medium">Make this learning path active</span>
                        <p className="text-sm text-gray-600">Active paths are visible to students immediately</p>
                      </div>
                    </label>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-8 py-6 flex justify-between items-center">
              <div>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreviousStep}
                    className="mr-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>
              
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/learning-paths')}
                >
                  Cancel
                </Button>
                
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    Next Step
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 min-w-[150px]"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Create Learning Path
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};