import React from 'react';
import { User, LogOut, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { useNavigate } from 'react-router-dom';

export const AuthButton = ({ isMobile = false, isScrolled = false }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { openModal } = useAuthModal();
  const navigate = useNavigate();

  if (isAuthenticated && user) {
    if (!isMobile) {
      // Desktop authenticated user dropdown
      return (
        <div className="relative group">
          <button className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
            isScrolled
              ? 'bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100'
              : 'bg-white/10 backdrop-blur-md hover:bg-white/20'
          }`}>
            <img
              src={user?.avatar || '/avatar-placeholder.jpg'}
              alt="Profile"
              className={`w-8 h-8 rounded-full transition-all duration-300 ${
                isScrolled ? 'border-2 border-purple-300' : 'border-2 border-white/50'
              }`}
            />
            <span className={`font-semibold transition-colors duration-300 ${
              isScrolled ? 'text-gray-900' : 'text-white'
            }`}>{user.username}</span>
            <div className={`w-4 h-4 transition-colors duration-300 ${
              isScrolled ? 'text-purple-600' : 'text-white/80'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </button>

          <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100 border border-gray-200/50 z-[100]">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 font-medium">Connecté en tant que</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{user.email}</p>
            </div>

            <button
              onClick={() => navigate(`/profile/${user.username}`)}
              className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 w-full text-left transition-all duration-150 group/item"
            >
              <div className="p-1.5 rounded-lg bg-gray-100 group-hover/item:bg-purple-100 transition-colors">
                <User className="w-4 h-4" />
              </div>
              <span className="font-medium">Mon profil</span>
            </button>

            <button
              onClick={logout}
              className="flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-all duration-150 mt-1 pt-2 border-t border-gray-100 group/item"
            >
              <div className="p-1.5 rounded-lg bg-red-50 group-hover/item:bg-red-100 transition-colors">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="font-medium">Se déconnecter</span>
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
          className="flex items-center w-full px-4 py-2.5 text-white rounded-xl hover:bg-white/10 transition-all duration-200 font-medium"
          onClick={() => openModal()}
        >
          <LogIn className="w-5 h-5 mr-3" />
          Se connecter
        </button>

        <button
          className="flex items-center justify-center w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold hover:scale-[1.02]"
          onClick={() => openModal()}
        >
          <User className="w-5 h-5 mr-2" />
          S'inscrire
        </button>
      </>
    );
  }

  // Desktop auth buttons
  return (
    <>
      <button
        onClick={() => openModal()}
        className={`flex items-center px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
          isScrolled
            ? 'text-gray-700 hover:text-purple-600 hover:bg-purple-50'
            : 'text-white hover:text-white hover:bg-white/10'
        }`}
      >
        <User className="w-4 h-4 mr-2" />
        <span>S'inscrire</span>
      </button>

      <button
        onClick={() => openModal()}
        className={`flex items-center px-5 py-2 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 ${
          isScrolled
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
            : 'bg-white text-purple-600 hover:bg-white/90'
        }`}
      >
        <LogIn className="w-4 h-4 mr-2" />
        <span>Connexion</span>
      </button>
    </>
  );
};