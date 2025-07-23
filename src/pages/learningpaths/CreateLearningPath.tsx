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
  Layers,
  X
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
    class_level_ids: [] as string[], // Changed from class_level_id to class_level_ids array
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
      if (formData.class_level_ids.length === 0) errors.class_level_ids = 'Please select at least one class level';
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



  // Remove a selected class level
  const removeClassLevel = (levelId: string) => {
    setFormData(prev => ({
      ...prev,
      class_level_ids: prev.class_level_ids.filter(id => id !== levelId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateStep(1) || !validateStep(2)) {
    setCurrentStep(1);
    return;
  }

  // Debug: Log form data before preparing submit data
  console.log('Form data before submit:', formData);
  console.log('Subject ID:', formData.subject_id);
  console.log('Class Level IDs:', formData.class_level_ids);

  try {
    setLoading(true);
    setError('');
    
    // Validate required fields before submission
    if (!formData.subject_id) {
      setError('Subject is required');
      setLoading(false);
      return;
    }
    
    if (!formData.class_level_ids || formData.class_level_ids.length === 0) {
      setError('At least one class level is required');
      setLoading(false);
      return;
    }
    
    // Prepare data for API
    const submitData = {
      title: formData.title,
      description: formData.description,
      subject: formData.subject_id, // Make sure this field is included
      class_level: formData.class_level_ids, // Make sure this field is included
      estimated_hours: formData.estimated_hours,
      is_active: formData.is_active,
      // Include optional fields only if they have values
      ...(formData.learning_objectives && { learning_objectives: formData.learning_objectives }),
      ...(formData.prerequisites && { prerequisites: formData.prerequisites }),
    };
    
    console.log('Submit data being sent:', submitData);
    
    const response = await createLearningPath(submitData);
    setSuccess(true);
    
    setTimeout(() => {
      navigate(`/learning-paths/${response.id}`);
    }, 2000);
  } catch (error: any) {
    console.error('Full error object:', error);
    console.error('Error response:', error.response);
    console.error('Error response data:', error.response?.data);
    
    // Better error handling
    if (error.response?.data) {
      const errorData = error.response.data;
      if (typeof errorData === 'object') {
        // Handle field-specific errors
        const errorMessages = Object.entries(errorData)
          .map(([field, messages]) => {
            if (Array.isArray(messages)) {
              return `${field}: ${messages.join(', ')}`;
            }
            return `${field}: ${messages}`;
          })
          .join('; ');
        setError(errorMessages);
      } else {
        setError(errorData.message || 'Failed to create learning path');
      }
    } else {
      setError('Failed to create learning path');
    }
  } finally {
    setLoading(false);
  }
};


const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const value = e.target.value;
  console.log('Subject changed to:', value); // Debug log
  setFormData({ ...formData, subject_id: value });
  setValidationErrors({ ...validationErrors, subject_id: '' });
};

const handleClassLevelToggle = (levelId: string) => {
  console.log('Toggling class level:', levelId); // Debug log
  setFormData(prev => {
    const newClassLevelIds = prev.class_level_ids.includes(levelId)
      ? prev.class_level_ids.filter(id => id !== levelId)
      : [...prev.class_level_ids, levelId];
    
    console.log('New class level IDs:', newClassLevelIds); // Debug log
    
    return {
      ...prev,
      class_level_ids: newClassLevelIds
    };
  });
  
  // Clear validation error when user makes a selection
  if (validationErrors.class_level_ids) {
    setValidationErrors({ ...validationErrors, class_level_ids: '' });
  }
};
  const steps = [
    { number: 1, title: 'Basic Information', icon: BookOpen },
    { number: 2, title: 'Configuration', icon: GraduationCap },
    { number: 3, title: 'Additional Details', icon: Target }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
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
              <div className="p-3 bg-indigo-600 rounded-lg text-white">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                Create Learning Path
              </h1>
            </div>
            <p className="text-gray-600 ml-14">Design a structured learning journey for students</p>
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
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                      currentStep > step.number 
                        ? 'bg-green-500 text-white' 
                        : currentStep === step.number 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-200'
                    }`}>
                      {currentStep > step.number ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
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
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
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
                  className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center"
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
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
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
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all ${
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
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
                          onChange={handleSubjectChange} // Use the dedicated handler
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all ${
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
                        {/* Debug display */}
                        <p className="text-xs text-gray-500 mt-1">
                          Selected: {formData.subject_id || 'None'}
                        </p>
                      </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Estimated Duration (hours) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.estimated_hours}
                        onChange={(e) => {
                          setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || 0 });
                          setValidationErrors({ ...validationErrors, estimated_hours: '' });
                        }}
                        min="0"
                        step="0.5"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                          validationErrors.estimated_hours ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {validationErrors.estimated_hours && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.estimated_hours}</p>
                      )}
                    </div>
                  </div>

                  {/* Class Levels Selection */}
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <GraduationCap className="w-4 h-4 inline mr-1" />
                        Class Levels <span className="text-red-500">*</span>
                      </label>
                      
                      {/* Debug display */}
                      <p className="text-xs text-gray-500 mb-2">
                        Selected IDs: {JSON.stringify(formData.class_level_ids)}
                      </p>
                      
                      {/* Selected Class Levels Display */}
                      {formData.class_level_ids.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 mb-2">Selected levels:</p>
                          <div className="flex flex-wrap gap-2">
                            {formData.class_level_ids.map((levelId) => {
                              const level = classLevels.find(l => l.id === levelId);
                              return level ? (
                                <span
                                  key={levelId}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                                >
                                  {level.name}
                                  <button
                                    type="button"
                                    onClick={() => removeClassLevel(levelId)}
                                    className="text-indigo-500 hover:text-indigo-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Class Levels Checkboxes */}
                      <div className={`border rounded-lg p-4 max-h-48 overflow-y-auto ${
                        validationErrors.class_level_ids ? 'border-red-300' : 'border-gray-300'
                      }`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {classLevels.map((level) => (
                            <label
                              key={level.id}
                              className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={formData.class_level_ids.includes(level.id)}
                                onChange={() => handleClassLevelToggle(level.id)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">{level.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {validationErrors.class_level_ids && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.class_level_ids}</p>
                      )}
                    </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Layers className="w-4 h-4 inline mr-1" />
                      Difficulty Level
                    </label>
                    <select
                      value={formData.difficulty_level}
                      onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div className="bg-indigo-50 rounded-lg p-4 flex items-start gap-3">
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                              <X className="w-4 h-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
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
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
              <div>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreviousStep}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>
              
              <div className="flex gap-3">
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
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Next Step
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 min-w-[150px]"
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