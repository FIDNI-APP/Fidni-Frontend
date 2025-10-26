import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, LogOut, BookOpen, GraduationCap, Home, Settings, BookmarkIcon, ChevronDown, Menu, X, Award, Route, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthButton } from '@/components/ui/AuthButton';
import { NavDropdown } from './NavbarDropdown';
import { getClassLevels} from '@/lib/api';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import '@/lib/styles.css';
import Logo2 from "@/assets/logo2.svg";
import Logo3 from "@/assets/logo3.svg";

export const Navbar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Add new state for dropdowns
  const [activeDropdown, setActiveDropdown] = useState<'exercises' | 'lessons' | 'exams' | null>(null);

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

  useEffect(() => {
  const updateBodyPadding = () => {
    const navbar = document.querySelector('nav');
    if (navbar) {
      document.body.style.paddingTop = `${navbar.offsetHeight}px`;
    }
  };

  // Initial update
  updateBodyPadding();
  
  // Mettre à jour quand la navbar change (menu mobile, scroll, etc.)
  const observer = new MutationObserver(updateBodyPadding);
  const navbar = document.querySelector('nav');
  if (navbar) {
    observer.observe(navbar, { 
      attributes: true, 
      attributeFilter: ['class'],
      childList: true,
      subtree: true 
    });
  }

  // Nettoyage
  return () => {
    observer.disconnect();
    document.body.style.paddingTop = '';
  };
}, []);

  // Close dropdowns when location changes
  useEffect(() => {
    setActiveDropdown(null);
  }, [location.pathname]);

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
  
  // Add this helper function
  const toggleDropdown = (dropdown: 'exercises' | 'lessons' | 'exams') => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const closeDropdowns = () => {
    setActiveDropdown(null);
  };
  
  // Handler for when auth modal is used from mobile menu
  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false); // Close mobile menu if open
    setActiveDropdown(null); // Also close any active dropdowns
  };

  // Desktop Nav Link Component
  interface NavLinkProps {
    to: string;
    isActive: boolean;
    children: React.ReactNode;
    hasDropdown?: boolean;
    dropdown?: 'exercises' | 'lessons' | 'exams';
  }

  const NavLink = ({ to, isActive, children, hasDropdown, dropdown }: NavLinkProps) => (
    <div className="relative">
      {hasDropdown ? (
        <button
          onClick={() => toggleDropdown(dropdown!)}
          className={`flex items-center text-sm font-semibold transition-all duration-200 px-4 py-2 rounded-xl relative group ${
            isActive || activeDropdown === dropdown
              ? isScrolled
                ? 'text-purple-600 bg-purple-50'
                : 'text-white bg-white/20 backdrop-blur-md'
              : isScrolled
                ? 'text-gray-700 hover:text-purple-600 hover:bg-gray-50'
                : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
        >
          <div className="flex items-center">
            {children}
          </div>
          <ChevronDown className={`w-4 h-4 ml-1 transition-transform duration-200 ${activeDropdown === dropdown ? 'rotate-180' : ''}`} />
          {(isActive || activeDropdown === dropdown) && (
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 rounded-full transition-all duration-200 ${
              isScrolled ? 'bg-gradient-to-r from-purple-600 to-pink-500' : 'bg-white'
            }`} />
          )}
        </button>
      ) : (
        <Link
          to={to}
          className={`flex items-center text-sm font-semibold transition-all duration-200 px-4 py-2 rounded-xl relative group ${
            isActive
              ? isScrolled
                ? 'text-purple-600 bg-purple-50'
                : 'text-white bg-white/20 backdrop-blur-md'
              : isScrolled
                ? 'text-gray-700 hover:text-purple-600 hover:bg-gray-50'
                : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
          onClick={closeDropdowns}
        >
          <div className="flex items-center">
            {children}
          </div>
          {isActive && (
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 rounded-full transition-all duration-200 ${
              isScrolled ? 'bg-gradient-to-r from-purple-600 to-pink-500' : 'bg-white'
            }`} />
          )}
        </Link>
      )}

      {hasDropdown && activeDropdown === dropdown && (
        <NavDropdown type={dropdown!} onClose={closeDropdowns} />
      )}
    </div>
  );

  // Mobile Nav Link Component with Dropdown Support
  const NavLinkMobile = ({ to, isActive, children, hasDropdown, dropdown }: NavLinkProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [mobileSubItems, setMobileSubItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
      // If dropdown is expanded, fetch class levels
      if (hasDropdown && isExpanded && mobileSubItems.length === 0) {
        const fetchClassLevels = async () => {
          try {
            setIsLoading(true);
            const data = await getClassLevels();
            setMobileSubItems(data);
          } catch (error) {
            console.error('Failed to load class levels:', error);
          } finally {
            setIsLoading(false);
          }
        };
        
        fetchClassLevels();
      }
    }, [isExpanded, hasDropdown, mobileSubItems.length]);
    
    if (hasDropdown) {
      return (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
              isActive
                ? 'bg-white/20 backdrop-blur-md text-white shadow-lg'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            {children}
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          {isExpanded && (
            <div className="ml-6 mt-2 space-y-1 border-l-2 border-white/20 pl-3">
              {isLoading ? (
                <div className="py-3 px-4 text-white/60 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                  Chargement...
                </div>
              ) : (
                <>
                  <Link
                    to={`/${dropdown}`}
                    className="block w-full px-4 py-2.5 text-sm text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-150 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Tous les {dropdown === 'exercises' ? 'exercices' : dropdown === 'lessons' ? 'leçons' : 'examens'}
                  </Link>

                  {mobileSubItems.map((item) => (
                    <Link
                      key={item.id}
                      to={`/${dropdown}?classLevels=${item.id}`}
                      className="block w-full px-4 py-2.5 text-sm text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-150"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        to={to}
        className={`flex items-center w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
          isActive
            ? 'bg-white/20 backdrop-blur-md text-white shadow-lg'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        {children}
      </Link>
    );
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled
        ? 'py-3 bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200/50'
        : 'py-4 bg-gradient-to-r from-gray-800 to-purple-800'
    }`}>
      <div className="absolute inset-0 opacity-10 pointer-events-none">
  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="hexPattern" width="40" height="34.64" patternUnits="userSpaceOnUse">
        <path
          d="M20 0 L40 11.55 L40 23.09 L20 34.64 L0 23.09 L0 11.55 Z"
          fill="none"
          stroke="white"
          strokeWidth="0.5"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hexPattern)" />
  </svg>
</div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between">
          {/* Logo and desktop navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-3 group relative">
              <div
                className="relative transition-all duration-300 transform group-hover:scale-110"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className={`w-10 h-10 flex items-center justify-center overflow-hidden rounded-xl ${
                  isScrolled ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-white/10 backdrop-blur-md border border-white/30'
                }`}>
                  <img
                    src={isHovered ? Logo2 : Logo3}
                    alt="Fidni Logo"
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div className={`absolute inset-0 rounded-xl blur-md opacity-30 group-hover:opacity-60 transition-opacity duration-300 ${
                  isScrolled ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-white'
                }`}></div>
              </div>
              <span className={`text-2xl fjalla-one-regular font-extrabold transition-all duration-300 ${
                isScrolled
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-transparent bg-clip-text'
                  : 'text-white'
              }`}>
                Fidni
              </span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-2">
              <NavLink to="/" isActive={isActive('/')}>
                <Home className="w-4 h-4 mr-2" />
                Accueil
              </NavLink>

              <NavLink
                to="/exercises"
                isActive={isActive('/exercises')}
                hasDropdown={true}
                dropdown="exercises"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Exercices
              </NavLink>

              <NavLink
                to="/lessons"
                isActive={isActive('/lessons')}
                hasDropdown={true}
                dropdown="lessons"
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Leçons
              </NavLink>

              <NavLink
                to="/exams"
                isActive={isActive('/exams')}
                hasDropdown={true}
                dropdown="exams"
              >
                <Award className="w-4 h-4 mr-2" />
                Examens
              </NavLink>

              <NavLink to="/learning-path" isActive={isActive('/learning-path')}>
                <Route className="w-4 h-4 mr-2" />
                Parcours
              </NavLink>

            </div>
          </div>

          {/* Search bar - desktop */}
          <div className="hidden md:block w-full max-w-md mx-6">
            <SearchAutocomplete
              placeholder="Rechercher des exercices, leçons, examens..."
              inputClassName={`w-full px-4 py-2 pr-20 rounded-xl focus:outline-none transition-all duration-300 ${
                isScrolled
                  ? 'bg-gray-50 text-gray-900 border border-gray-200 focus:ring-2 focus:ring-purple-500 placeholder-gray-400'
                  : 'bg-white/10 backdrop-blur-md text-white border border-white/30 focus:ring-2 focus:ring-white/50 placeholder-white/60'
              }`}
            />
          </div>

          {/* Auth buttons - desktop */}
          <div className="hidden md:flex items-center space-x-3">
            <AuthButton isScrolled={isScrolled} />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-xl transition-all duration-300 ${
                isScrolled
                  ? 'text-gray-900 hover:bg-gray-100'
                  : 'text-white hover:bg-white/10'
              }`}
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
      <div className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${mobileMenuOpen ? 'max-h-screen opacity-100 py-6' : 'max-h-0 opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Mobile search */}
          <SearchAutocomplete
            placeholder="Rechercher..."
            inputClassName="w-full px-4 py-3 pr-20 bg-white/10 backdrop-blur-md text-white border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 placeholder-white/60 transition-all duration-300"
          />

          {/* Mobile navigation */}
          <div className="flex flex-col space-y-2">
            <NavLinkMobile to="/" isActive={isActive('/')}>
              <Home className="w-5 h-5 mr-3" />
              Accueil
            </NavLinkMobile>

            <NavLinkMobile
              to="/exercises"
              isActive={isActive('/exercises')}
              hasDropdown={true}
              dropdown="exercises"
            >
              <BookOpen className="w-5 h-5 mr-3" />
              Exercices
            </NavLinkMobile>

            <NavLinkMobile
              to="/lessons"
              isActive={isActive('/lessons')}
              hasDropdown={true}
              dropdown="lessons"
            >
              <GraduationCap className="w-5 h-5 mr-3" />
              Leçons
            </NavLinkMobile>

            <NavLinkMobile
              to="/exams"
              isActive={isActive('/exams')}
              hasDropdown={true}
              dropdown="exams"
            >
              <Award className="w-5 h-5 mr-3" />
              Examens
            </NavLinkMobile>

            <NavLinkMobile to="/learning-path" isActive={isActive('/learning-path')}>
              <Route className="w-5 h-5 mr-3" />
              Parcours
            </NavLinkMobile>

            {user?.is_superuser && (
              <NavLinkMobile to="/admin/learning-paths" isActive={isActive('/admin/learning-paths')}>
                <Shield className="w-5 h-5 mr-3" />
                Admin Panel
              </NavLinkMobile>
            )}
          </div>

          {/* Mobile auth */}
          <div className="pt-6 border-t border-white/20">
            {isAuthenticated ? (
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3 px-4 py-3 bg-white/10 backdrop-blur-md rounded-xl">
                  <img
                    src={user?.avatar || '/avatar-placeholder.jpg'}
                    alt="Profile"
                    className="w-12 h-12 rounded-full border-2 border-white/50 shadow-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-base truncate">{user?.username}</div>
                    <div className="text-white/70 text-sm truncate">{user?.email}</div>
                  </div>
                </div>

                <Link to={`/profile/${user?.username}`} className="flex items-center w-full px-4 py-3 text-white rounded-xl hover:bg-white/10 transition-all duration-200 font-medium" onClick={() => setMobileMenuOpen(false)}>
                  <div className="p-2 rounded-lg bg-white/10 mr-3">
                    <User className="w-5 h-5" />
                  </div>
                  Mon profil
                </Link>

                <Link to="/saved" className="flex items-center w-full px-4 py-3 text-white rounded-xl hover:bg-white/10 transition-all duration-200 font-medium" onClick={() => setMobileMenuOpen(false)}>
                  <div className="p-2 rounded-lg bg-white/10 mr-3">
                    <BookmarkIcon className="w-5 h-5" />
                  </div>
                  Enregistrés
                </Link>

                <Link to="/settings" className="flex items-center w-full px-4 py-3 text-white rounded-xl hover:bg-white/10 transition-all duration-200 font-medium" onClick={() => setMobileMenuOpen(false)}>
                  <div className="p-2 rounded-lg bg-white/10 mr-3">
                    <Settings className="w-5 h-5" />
                  </div>
                  Paramètres
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-3 text-red-300 hover:text-red-200 rounded-xl hover:bg-red-500/10 transition-all duration-200 font-medium"
                >
                  <div className="p-2 rounded-lg bg-red-500/10 mr-3">
                    <LogOut className="w-5 h-5" />
                  </div>
                  Se déconnecter
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