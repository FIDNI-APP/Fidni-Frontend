import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, LogIn, LogOut, BookOpen, GraduationCap, Home, Settings, BookmarkIcon, ChevronDown, Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { AuthButton } from '@/components/ui/AuthButton'; // Import the AuthButton component
import '@/lib/styles.css';
import Logo from '@/assets/logo.svg';
import Logo2 from "@/assets/logo2.svg";
import Logo3 from "@/assets/logo3.svg";

// Separate CSS classes
const dropdownItemClass = "flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors";
const mobileNavItemClass = "flex items-center w-full px-3 py-2 text-white rounded-lg hover:bg-white/10 transition-colors";

export const Navbar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  interface SearchFormEvent extends React.FormEvent<HTMLFormElement> {
    preventDefault: () => void;
  }

  const handleSearch = (e: SearchFormEvent): void => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      setSearchTerm('');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  interface PathCheck {
    (path: string): boolean;
  }

  const isActive: PathCheck = (path: string): boolean => {
    return location.pathname === path;
  };
  
  // Handler for when auth modal is used from mobile menu
  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false); // Close mobile menu if open
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'py-2 shadow-lg' : 'py-4'} bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900`}>
      <div className="max-w-7xl mx-auto px-4 lg:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo and desktop navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-3 group">
              <div 
                className="logo-container relative transition-transform duration-300 transform group-hover:scale-110"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className="w-12 h-13 flex items-center justify-center overflow-hidden">
                  <img
                    src={isHovered ? Logo2 : Logo3}
                    alt="Nt3almou Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
              <span className="text-3xl fjalla-one-regular font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-900 text-transparent bg-clip-text">
                Fidni
              </span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              <NavLink to="/" isActive={isActive('/')}>
                <Home className="w-4 h-4 mr-2" />
                Home
              </NavLink>
              
              <NavLink to="/exercises" isActive={isActive('/exercises')}>
                <BookOpen className="w-4 h-4 mr-2" />
                Exercises
              </NavLink>
              
              <NavLink to="/lessons" isActive={isActive('/lessons')}>
                <GraduationCap className="w-4 h-4 mr-2" />
                Lessons
              </NavLink>
            </div>
          </div>

          {/* Search bar - desktop */}
          <div className="hidden md:block w-full max-w-md mx-6">
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                placeholder="Search for exercises, lessons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 text-white border border-white/20 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-gray-300 transition-all duration-300"
              />
              <button 
                type="submit" 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-200 hover:text-white transition-colors duration-200"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Auth buttons - desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <AuthButton />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white p-2"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${mobileMenuOpen ? 'max-h-screen opacity-100 py-4' : 'max-h-0 opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search for exercises, lessons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 text-white border border-white/20 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-gray-300"
            />
            <button 
              type="submit" 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-200"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>

          {/* Mobile navigation */}
          <div className="flex flex-col space-y-3">
            <NavLinkMobile to="/" isActive={isActive('/')}>
              <Home className="w-5 h-5 mr-3" />
              Home
            </NavLinkMobile>
            
            <NavLinkMobile to="/exercises" isActive={isActive('/exercises')}>
              <BookOpen className="w-5 h-5 mr-3" />
              Exercises
            </NavLinkMobile>
            
            <NavLinkMobile to="/lessons" isActive={isActive('/lessons')}>
              <GraduationCap className="w-5 h-5 mr-3" />
              Lessons
            </NavLinkMobile>
          </div>

          {/* Mobile auth */}
          <div className="pt-4 border-t border-white/10">
            {isAuthenticated ? (
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3 px-3 py-2">
                  <img
                    src={user?.avatar || '/avatar-placeholder.jpg'}
                    alt="Profile"
                    className="w-10 h-10 rounded-full border-2 border-purple-300"
                  />
                  <div>
                    <div className="text-white font-medium">{user?.username}</div>
                    <div className="text-gray-300 text-sm">{user?.email}</div>
                  </div>
                </div>
                
                <Link to={`/profile/${user?.username}`} className={mobileNavItemClass}>
                  <User className="w-5 h-5 mr-3" />
                  Profile
                </Link>
                
                <Link to="/saved" className={mobileNavItemClass}>
                  <BookmarkIcon className="w-5 h-5 mr-3" />
                  Saved Items
                </Link>
                
                <Link to="/settings" className={mobileNavItemClass}>
                  <Settings className="w-5 h-5 mr-3" />
                  Settings
                </Link>
                
                <button
                  onClick={handleLogout}
                  className={`${mobileNavItemClass} text-red-300 hover:text-red-200`}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-3" onClick={handleMobileMenuClose}>
                <div className="w-full">
                  <AuthButton isMobile={true} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// Desktop Nav Link Component
interface NavLinkProps {
  to: string;
  isActive: boolean;
  children: React.ReactNode;
}

const NavLink = ({ to, isActive, children }: NavLinkProps) => (
  <Link 
    to={to} 
    className={`flex items-center text-base font-medium transition-colors duration-200 ${
      isActive 
        ? 'text-white' 
        : 'text-gray-300 hover:text-white'
    }`}
  >
    <div className="flex items-center">
      {children}
    </div>
    
  </Link>
);

// Mobile Nav Link Component
const NavLinkMobile = ({ to, isActive, children }: NavLinkProps) => (
  <Link 
    to={to} 
    className={`flex items-center w-full px-3 py-2 rounded-lg transition-colors duration-200 ${
      isActive 
        ? 'bg-white/10 text-white' 
        : 'text-gray-300 hover:bg-white/5 hover:text-white'
    }`}
  >
    {children}
  </Link>
);