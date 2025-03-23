import React from 'react';
import { User, LogOut, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { useNavigate } from 'react-router-dom';

export const AuthButton = ({ isMobile = false }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { openModal } = useAuthModal();
  const navigate = useNavigate();

  if (isAuthenticated && user) {
    if (!isMobile) {
      // Desktop authenticated user dropdown
      return (
        <div className="relative group">
          <button className="flex items-center space-x-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200">
            <img
              src={user?.avatar || '/avatar-placeholder.jpg'}
              alt="Profile"
              className="w-8 h-8 rounded-full border-2 border-purple-300"
            />
            <span className="text-white font-medium">{user.username}</span>
            <div className="w-4 h-4 text-purple-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </button>
          
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm text-gray-500">Signed in as</p>
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
            </div>
            
            <button 
              onClick={() => navigate(`/profile/${user.username}`)}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
            
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors mt-2 pt-2 border-t border-gray-100"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      );
    }
    // Mobile version is handled by the parent component
    return null;
  }

  // Not authenticated
  if (isMobile) {
    // Mobile auth buttons
    return (
      <>
        <button 
          className="flex items-center w-full px-3 py-2 text-white rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => openModal()}
        >
          <LogIn className="w-5 h-5 mr-3" />
          Login
        </button>
        
        <Button 
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full py-3 shadow-md"
          onClick={() => openModal()}
        >
          <User className="w-5 h-5 mr-2" />
          Sign Up
        </Button>
      </>
    );
  }
  
  // Desktop auth buttons
  return (
    <>
      <Button 
        variant="ghost" 
        className="text-white hover:text-purple-200 hover:bg-white/10 rounded-full px-5"
        onClick={() => openModal()}
      >
        <LogIn className="w-4 h-4 mr-2" />
        <span>Login</span>
      </Button>
      
      <button 
        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full px-5 py-2 shadow-md hover:shadow-lg transition-all duration-200"
        onClick={() => openModal()}
      >
        <User className="w-4 h-4 mr-2 inline-block" />
        <span>Sign Up</span>
      </button>
    </>
  );
};