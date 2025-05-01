import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LogIn, UserPlus, ChevronLeft, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { register } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnUrl?: string;
}

export const AuthModal = ({ isOpen, onClose, returnUrl = '/' }: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    identifier: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('login');
      setFormData({
        username: '',
        email: '',
        password: '',
        identifier: ''
      });
      setError('');
      setShowSuccess(false);
    }
  }, [isOpen]);

  // Handle input changes
  const handleChange = (e : any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  // Handle login
  const handleLogin = async (e : any) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(formData.identifier, formData.password);
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
        navigate(returnUrl);
      }, 1000);
    } catch (err : any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e : any) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
  
    try {
      // 1. Enregistrer l'utilisateur
      await register(formData.username, formData.email, formData.password);
      
      // 2. Connexion après l'inscription - utilisez formData.username au lieu de formData.email
      // C'est important car votre API JWT attend probablement "username" et non "email"
      await login(formData.username, formData.password);
      
      setShowSuccess(true);
      
      // Redirection vers la page d'onboarding
      setTimeout(() => {
        onClose();
        navigate('/complete-profile');
      }, 1000);
    } catch (err: any) {
      console.error('Registration/login error:', err);
      
      // Message d'erreur plus descriptif
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 
          `Erreur: ${err.response.status} - ${err.response.statusText}`);
      } else {
        setError('Échec de l\'inscription. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // If modal is closed, don't render anything
  if (!isOpen) return null;

  // Animation variants for the modal
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2, ease: "easeIn" } }
  };

  // Animation variants for the form tabs
  const tabVariants = {
    hidden: { x: 20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.3 } },
    exit: { x: -20, opacity: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div 
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Header with close button */}
          <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              title="Close modal"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold">
                {showSuccess ? "Success!" : activeTab === 'login' ? "Welcome Back" : "Join Fidni"}
              </h2>
              <p className="mt-1 text-indigo-100">
                {showSuccess 
                  ? "You're now signed in" 
                  : activeTab === 'login' 
                    ? "Sign in to access all features" 
                    : "Create an account to get started"}
              </p>
            </div>
          </div>

          <div className="p-6">
            {/* Success message */}
            {showSuccess && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 text-green-600">✓</div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {activeTab === 'login' ? 'Signed in successfully!' : 'Account created!'}
                </h3>
                <p className="text-gray-600">
                  {activeTab === 'login' ? 'Redirecting you now...' : 'Redirecting to complete your profile...'}
                </p>
              </div>
            )}
            
            {!showSuccess && (
              <>
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    className={`flex-1 py-3 font-medium ${activeTab === 'login' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => {
                      setActiveTab('login');
                      setError('');
                    }}
                  >
                    <span className="flex items-center justify-center">
                      <LogIn size={18} className="mr-2" />
                      Sign In
                    </span>
                  </button>
                  <button
                    className={`flex-1 py-3 font-medium ${activeTab === 'signup' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => {
                      setActiveTab('signup');
                      setError('');
                    }}
                  >
                    <span className="flex items-center justify-center">
                      <UserPlus size={18} className="mr-2" />
                      Sign Up
                    </span>
                  </button>
                </div>

                {/* Error message */}
                {error && (
                  <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {/* Login/Signup Forms */}
                <AnimatePresence mode="wait">
                  {activeTab === 'login' ? (
                    <motion.form 
                      key="login-form"
                      onSubmit={handleLogin}
                      className="space-y-4"
                      variants={tabVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email or Username</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail size={18} className="text-gray-400" />
                          </div>
                          <input
                            type="text"
                            name="identifier"
                            value={formData.identifier}
                            onChange={handleChange}
                            required
                            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Your email or username"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={18} className="text-gray-400" />
                          </div>
                          <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Your password"
                          />
                        </div>
                      </div>

                      <div className="mt-2 text-right">
                        <a href="#" className="text-sm text-indigo-600 hover:underline">
                          Forgot password?
                        </a>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg flex items-center justify-center"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={20} className="mr-2 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          <>
                            Sign In
                            <ArrowRight size={18} className="ml-2" />
                          </>
                        )}
                      </Button>
                    </motion.form>
                  ) : (
                    <motion.form 
                      key="signup-form"
                      onSubmit={handleSignup}
                      className="space-y-4"
                      variants={tabVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User size={18} className="text-gray-400" />
                          </div>
                          <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Choose a username"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail size={18} className="text-gray-400" />
                          </div>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Your email address"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={18} className="text-gray-400" />
                          </div>
                          <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Create a password"
                          />
                        </div>
                      </div>

                      <div className="mt-1">
                        <p className="text-xs text-gray-500">
                          By signing up, you agree to our <a href="#" className="text-indigo-600 hover:underline">Terms of Service</a> and <a href="#" className="text-indigo-600 hover:underline">Privacy Policy</a>.
                        </p>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg flex items-center justify-center"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={20} className="mr-2 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          <>
                            Create Account
                            <ArrowRight size={18} className="ml-2" />
                          </>
                        )}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};