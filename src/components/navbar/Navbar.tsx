import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, BookOpen, Home, Settings, BookmarkIcon, ChevronDown, Menu, X, Route, Shield, List } from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { useAuth } from '@/contexts/AuthContext';
import { AuthButton } from '@/components/ui/AuthButton';
import { NavDropdown } from './NavbarDropdown';
import { getClassLevels} from '@/lib/api';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import '@/lib/styles.css';
import Logo2 from "@/assets/logo2.svg";
import Logo3 from "@/assets/logo3.svg";

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
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
          className={`flex items-center text-sm font-medium transition-all duration-200 px-1.5 xl:px-4 py-3 relative group ${
            isActive || activeDropdown === dropdown
              ? 'text-white'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          <div className="flex items-center">
            {children}
          </div>
          <ChevronDown className={`w-4 h-4 ml-1 transition-transform duration-200 ${activeDropdown === dropdown ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <Link
          to={to}
          className={`flex items-center text-sm font-medium transition-all duration-200 px-1.5 xl:px-4 py-3 relative group ${
            isActive
              ? 'text-white'
              : 'text-gray-300 hover:text-white'
          }`}
          onClick={closeDropdowns}
        >
          <div className="flex items-center">
            {children}
          </div>
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
            className={`flex items-center w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              isActive
                ? 'text-white bg-[#2a2a2a]'
                : 'text-gray-300 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            {children}
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          {isExpanded && (
            <div className="ml-6 mt-2 space-y-1 border-l-2 border-gray-700 pl-3">
              {isLoading ? (
                <div className="py-3 px-4 flex items-center text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                  Chargement...
                </div>
              ) : (
                <>
                  <Link
                    to={`/${dropdown}`}
                    className="block w-full px-4 py-2.5 text-sm rounded-lg hover:bg-[#2a2a2a] transition-all duration-150 font-medium text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Tous les {dropdown === 'exercises' ? 'exercices' : dropdown === 'lessons' ? 'leçons' : 'examens'}
                  </Link>

                  {mobileSubItems.map((item) => (
                    <Link
                      key={item.id}
                      to={`/${dropdown}?classLevels=${item.id}`}
                      className="block w-full px-4 py-2.5 text-sm rounded-lg hover:bg-[#2a2a2a] transition-all duration-150 text-gray-300"
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
        className={`flex items-center w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
          isActive
            ? 'text-white bg-[#2a2a2a]'
            : 'text-gray-300 hover:text-white hover:bg-[#2a2a2a]'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        {children}
      </Link>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a] border-b border-gray-800 overflow-visible">

      <div className="max-w-7xl mx-auto px-5 md:px-10 lg:px-16">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* Logo - far left */}
          <Link to="/" className="flex-shrink-0 group">
            <div
              className="transition-all duration-300 transform group-hover:scale-105"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <img
                src={isHovered ? Logo2 : Logo3}
                alt="Fidni Logo"
                className="h-16 md:h-18 w-auto object-contain"
              />
            </div>
          </Link>
          {/* Desktop navigation */}
          <div className={`hidden md:flex items-center space-x-0.5 xl:space-x-2 transition-all duration-300 ${
            searchExpanded ? 'opacity-0 pointer-events-none w-0 overflow-hidden' : 'opacity-100'
          }`}>
              <NavLink to="/" isActive={isActive('/')}>
                <Home className="w-4 h-4 mr-1 xl:mr-2" />
                <span className="hidden xl:inline">Accueil</span>
              </NavLink>

              <NavLink
                to="/exercises"
                isActive={isActive('/exercises')}
                hasDropdown={true}
                dropdown="exercises"
              >
                <BookOpen className="w-4 h-4 mr-1 xl:mr-2" />
                Exercices
              </NavLink>

              <NavLink
                to="/lessons"
                isActive={isActive('/lessons')}
                hasDropdown={true}
                dropdown="lessons"
              >
                <LessonIcon className="w-4 h-4 mr-1 xl:mr-2" />
                Leçons
              </NavLink>

              <NavLink
                to="/exams"
                isActive={isActive('/exams')}
                hasDropdown={true}
                dropdown="exams"
              >
                <APlusIcon className="w-4 h-4 mr-1 xl:mr-2" />
                Examens
              </NavLink>

              <NavLink to="/learning-path" isActive={isActive('/learning-path')}>
                <Route className="w-4 h-4 mr-1 xl:mr-2" />
                <span className="hidden xl:inline">Parcours</span>
              </NavLink>

            </div>

          {/* Search bar - desktop */}
          <div
            className={`hidden md:block relative z-50 transition-all duration-300 ${
              searchExpanded ? 'flex-1 mx-2' : 'w-full max-w-[180px] xl:max-w-sm mx-2 xl:mx-4'
            }`}
          >
            <div
              onFocus={() => setSearchExpanded(true)}
              onBlur={(e) => {
                // Only collapse if focus is leaving the container entirely
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setSearchExpanded(false);
                }
              }}
            >
              <SearchAutocomplete
                placeholder="Rechercher un exercice de maths, physique..."
                type={getContentType()}
                inputClassName="w-full px-4 py-2 pr-20 rounded-lg focus:outline-none transition-all duration-200 bg-[#2a2a2a] text-white border border-gray-700 focus:border-gray-600 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Auth buttons - desktop */}
          <div className={`hidden md:flex items-center space-x-2 transition-all duration-300 ${
            searchExpanded ? 'opacity-0 pointer-events-none w-0 overflow-hidden' : 'opacity-100'
          }`}>
            <AuthButton isScrolled={isScrolled} />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white hover:text-gray-300 transition-all duration-200"
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
        <div className="md:hidden bg-[#1a1a1a] border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Mobile search */}
            <SearchAutocomplete
              placeholder="Rechercher..."
              inputClassName="w-full px-4 py-3 pr-20 rounded-lg focus:outline-none transition-all duration-200 bg-[#2a2a2a] text-white border border-gray-700 focus:border-gray-600 placeholder-gray-500"
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
              <LessonIcon className="w-5 h-5 mr-3" />
              Leçons
            </NavLinkMobile>

            <NavLinkMobile
              to="/exams"
              isActive={isActive('/exams')}
              hasDropdown={true}
              dropdown="exams"
            >
              <APlusIcon className="w-5 h-5 mr-3" />
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
          <div className="pt-6 border-t border-gray-800">
            {isAuthenticated ? (
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-[#2a2a2a]">
                  <img
                    src={user?.profile?.avatar || '/avatar-placeholder.jpg'}
                    alt="Profile"
                    className="w-12 h-12 rounded-full border-2 border-gray-600 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base truncate text-white">{user?.username}</div>
                    <div className="text-sm truncate text-gray-400">{user?.email}</div>
                  </div>
                </div>

                <Link to={`/profile/${user?.username}`} className="flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 font-medium text-gray-300 hover:text-white hover:bg-[#2a2a2a]" onClick={() => setMobileMenuOpen(false)}>
                  <div className="p-2 rounded-lg mr-3 bg-[#2a2a2a]">
                    <User className="w-5 h-5" />
                  </div>
                  Mon profil
                </Link>

                <Link to="/saved" className="flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 font-medium text-gray-300 hover:text-white hover:bg-[#2a2a2a]" onClick={() => setMobileMenuOpen(false)}>
                  <div className="p-2 rounded-lg mr-3 bg-[#2a2a2a]">
                    <BookmarkIcon className="w-5 h-5" />
                  </div>
                  Enregistrés
                </Link>

                <Link to="/revision-lists" className="flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 font-medium text-gray-300 hover:text-white hover:bg-[#2a2a2a]" onClick={() => setMobileMenuOpen(false)}>
                  <div className="p-2 rounded-lg mr-3 bg-[#2a2a2a]">
                    <List className="w-5 h-5" />
                  </div>
                  Listes de révision
                </Link>

                <Link to="/settings" className="flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 font-medium text-gray-300 hover:text-white hover:bg-[#2a2a2a]" onClick={() => setMobileMenuOpen(false)}>
                  <div className="p-2 rounded-lg mr-3 bg-[#2a2a2a]">
                    <Settings className="w-5 h-5" />
                  </div>
                  Paramètres
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <div className="p-2 rounded-lg mr-3 bg-red-500/10">
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
      )}
    </nav>
  );
};