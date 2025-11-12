import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, LogOut, BookOpen, GraduationCap, Home, Settings, BookmarkIcon, ChevronDown, Menu, X, Award, Route, Shield, List } from 'lucide-react';
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
  
  // Fonction pour déterminer le type de contenu basé sur l'URL
  const getContentType = () => {
    const path = location.pathname;
    // Check for lesson routes (list, detail, edit)
    if (path.includes('/lessons') || path.includes('/lesson') || path.includes('/edit-lesson') || path.includes('/new-lesson')) {
      return 'lesson';
    }
    // Check for exam routes (list, detail, edit)
    if (path.includes('/exams') || path.includes('/exam') || path.includes('/edit-exam') || path.includes('/new-exam')) {
      return 'exam';
    }
    // Check for exercise routes, /new route, and /edit route (defaults to exercise)
    if (path.includes('/exercises') || path.includes('/exercise') || path === '/new' || path.startsWith('/edit/')) {
      return 'exercise';
    }
    // Default to exercise
    return 'exercise';
  };

  // Fonction pour déterminer le gradient de couleur en fonction de la page actuelle
  const getNavbarGradient = () => {
    const type = getContentType();
    if (type === 'lesson') {
      return 'from-gray-800 to-blue-800'; // Bleu pour les leçons
    } else if (type === 'exam') {
      return 'from-gray-800 to-green-800'; // Vert pour les examens
    } else {
      return 'from-gray-800 to-purple-800'; // Violet par défaut (exercices)
    }
  };

  // Fonction pour déterminer la couleur du texte survolé/actif en fonction de la page
  const getHoverColor = () => {
    const type = getContentType();
    if (type === 'lesson') {
      return 'text-blue-600'; // Bleu pour les leçons
    } else if (type === 'exam') {
      return 'text-green-600'; // Vert pour les examens
    } else {
      return 'text-purple-600'; // Violet par défaut (exercices)
    }
  };

  // Fonction pour déterminer la couleur du gradient de la barre sous les liens actifs
  const getActiveBarGradient = () => {
    const type = getContentType();
    if (type === 'lesson') {
      return 'bg-gradient-to-r from-blue-600 to-indigo-500'; // Bleu pour les leçons
    } else if (type === 'exam') {
      return 'bg-gradient-to-r from-green-600 to-teal-500'; // Vert pour les examens
    } else {
      return 'bg-gradient-to-r from-purple-600 to-pink-500'; // Violet par défaut (exercices)
    }
  };

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
                ? `${getHoverColor()} bg-${getHoverColor().split('-')[1]}-50`
                : 'text-white bg-white/20 backdrop-blur-md'
              : isScrolled
                ? `text-gray-700 hover:${getHoverColor()} hover:bg-gray-50`
                : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
        >
          <div className="flex items-center">
            {children}
          </div>
          <ChevronDown className={`w-4 h-4 ml-1 transition-transform duration-200 ${activeDropdown === dropdown ? 'rotate-180' : ''}`} />
          {(isActive || activeDropdown === dropdown) && (
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 rounded-full transition-all duration-200 ${
              isScrolled ? getActiveBarGradient() : 'bg-white'
            }`} />
          )}
        </button>
      ) : (
        <Link
          to={to}
          className={`flex items-center text-sm font-semibold transition-all duration-200 px-4 py-2 rounded-xl relative group ${
            isActive
              ? isScrolled
                ? `${getHoverColor()} bg-${getHoverColor().split('-')[1]}-50`
                : 'text-white bg-white/20 backdrop-blur-md'
              : isScrolled
                ? `text-gray-700 hover:${getHoverColor()} hover:bg-gray-50`
                : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
          onClick={closeDropdowns}
        >
          <div className="flex items-center">
            {children}
          </div>
          {isActive && (
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 rounded-full transition-all duration-200 ${
              isScrolled ? getActiveBarGradient() : 'bg-white'
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

    // Get text colors based on scroll state
    const getTextColor = () => isScrolled ? 'text-gray-900' : 'text-white';
    const getTextColorSecondary = () => isScrolled ? 'text-gray-600' : 'text-white/80';
    const getBgHover = () => isScrolled ? 'hover:bg-gray-100' : 'hover:bg-white/10';
    const getBgActive = () => isScrolled ? 'bg-gray-100' : 'bg-white/20 backdrop-blur-md';
    
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
                ? `${getBgActive()} ${getTextColor()} shadow-lg`
                : `${getTextColorSecondary()} ${getBgHover()} ${getTextColor()}`
            }`}
          >
            {children}
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          {isExpanded && (
            <div className={`ml-6 mt-2 space-y-1 border-l-2 pl-3 ${isScrolled ? 'border-gray-300' : 'border-white/20'}`}>
              {isLoading ? (
                <div className={`py-3 px-4 flex items-center ${getTextColorSecondary()}`}>
                  <div className={`animate-spin rounded-full h-4 w-4 border-b-2 inline-block mr-2 ${isScrolled ? 'border-gray-600' : 'border-white'}`}></div>
                  Chargement...
                </div>
              ) : (
                <>
                  <Link
                    to={`/${dropdown}`}
                    className={`block w-full px-4 py-2.5 text-sm rounded-lg ${getBgHover()} transition-all duration-150 font-medium ${getTextColor()}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Tous les {dropdown === 'exercises' ? 'exercices' : dropdown === 'lessons' ? 'leçons' : 'examens'}
                  </Link>

                  {mobileSubItems.map((item) => (
                    <Link
                      key={item.id}
                      to={`/${dropdown}?classLevels=${item.id}`}
                      className={`block w-full px-4 py-2.5 text-sm rounded-lg ${getBgHover()} transition-all duration-150 ${getTextColorSecondary()}`}
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
            ? `${getBgActive()} ${getTextColor()} shadow-lg`
            : `${getTextColorSecondary()} ${getBgHover()}`
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
        : `py-4 bg-gradient-to-r ${getNavbarGradient()}`
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
            <Link to="/" className="flex-shrink-0 group">
              <div
                className="transition-all duration-300 transform group-hover:scale-105"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <img
                  src={isHovered ? Logo2 : Logo3}
                  alt="Fidni Logo"
                  className="h-12 md:h-16 w-auto object-contain"
                />
              </div>
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
              placeholder="Rechercher un exercice de maths, physique..."
              type={getContentType()}
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
      {mobileMenuOpen && (
        <div className={`md:hidden transition-all duration-300 ease-in-out ${isScrolled ? 'bg-white border-t border-gray-200' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Mobile search */}
            <SearchAutocomplete
              placeholder="Rechercher..."
              inputClassName={`w-full px-4 py-3 pr-20 rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 ${
                isScrolled
                  ? 'bg-gray-50 text-gray-900 border border-gray-200 focus:ring-purple-500 placeholder-gray-400'
                  : 'bg-white/10 backdrop-blur-md text-white border border-white/30 focus:ring-white/50 placeholder-white/60'
              }`}
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
          <div className={`pt-6 border-t ${isScrolled ? 'border-gray-200' : 'border-white/20'}`}>
            {isAuthenticated ? (
              <div className="flex flex-col space-y-3">
                <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl ${
                  isScrolled ? 'bg-gray-100' : 'bg-white/10 backdrop-blur-md'
                }`}>
                  <img
                    src={user?.avatar || '/avatar-placeholder.jpg'}
                    alt="Profile"
                    className={`w-12 h-12 rounded-full border-2 shadow-lg ${
                      isScrolled ? 'border-gray-300' : 'border-white/50'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-base truncate ${
                      isScrolled ? 'text-gray-900' : 'text-white'
                    }`}>{user?.username}</div>
                    <div className={`text-sm truncate ${
                      isScrolled ? 'text-gray-600' : 'text-white/70'
                    }`}>{user?.email}</div>
                  </div>
                </div>

                <Link to={`/profile/${user?.username}`} className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isScrolled ? 'text-gray-900 hover:bg-gray-100' : 'text-white hover:bg-white/10'
                }`} onClick={() => setMobileMenuOpen(false)}>
                  <div className={`p-2 rounded-lg mr-3 ${
                    isScrolled ? 'bg-gray-200' : 'bg-white/10'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  Mon profil
                </Link>

                <Link to="/saved" className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isScrolled ? 'text-gray-900 hover:bg-gray-100' : 'text-white hover:bg-white/10'
                }`} onClick={() => setMobileMenuOpen(false)}>
                  <div className={`p-2 rounded-lg mr-3 ${
                    isScrolled ? 'bg-gray-200' : 'bg-white/10'
                  }`}>
                    <BookmarkIcon className="w-5 h-5" />
                  </div>
                  Enregistrés
                </Link>

                <Link to="/revision-lists" className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isScrolled ? 'text-gray-900 hover:bg-gray-100' : 'text-white hover:bg-white/10'
                }`} onClick={() => setMobileMenuOpen(false)}>
                  <div className={`p-2 rounded-lg mr-3 ${
                    isScrolled ? 'bg-gray-200' : 'bg-white/10'
                  }`}>
                    <List className="w-5 h-5" />
                  </div>
                  Listes de révision
                </Link>

                <Link to="/settings" className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isScrolled ? 'text-gray-900 hover:bg-gray-100' : 'text-white hover:bg-white/10'
                }`} onClick={() => setMobileMenuOpen(false)}>
                  <div className={`p-2 rounded-lg mr-3 ${
                    isScrolled ? 'bg-gray-200' : 'bg-white/10'
                  }`}>
                    <Settings className="w-5 h-5" />
                  </div>
                  Paramètres
                </Link>

                <button
                  onClick={handleLogout}
                  className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                    isScrolled ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-red-300 hover:text-red-200 hover:bg-red-500/10'
                  }`}
                >
                  <div className={`p-2 rounded-lg mr-3 ${
                    isScrolled ? 'bg-red-100' : 'bg-red-500/10'
                  }`}>
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