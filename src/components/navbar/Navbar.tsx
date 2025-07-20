import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, LogOut, BookOpen, GraduationCap, Home, Settings, BookmarkIcon, ChevronDown, Menu, X, Award, Route, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthButton } from '@/components/ui/AuthButton';
import { NavDropdown } from './NavbarDropdown';
import { getClassLevels} from '@/lib/api';
import '@/lib/styles.css';
import Logo2 from "@/assets/logo2.svg";
import Logo3 from "@/assets/logo3.svg";

// Separate CSS classes
const mobileNavItemClass = "flex items-center w-full px-3 py-2 text-white rounded-lg hover:bg-white/10 transition-colors";

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
          className={`flex items-center text-base font-medium transition-colors duration-200 ${
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
          className={`flex items-center text-base font-medium transition-colors duration-200 ${
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
            className={`flex items-center w-full px-3 py-2 rounded-lg transition-colors duration-200 ${
              isActive 
                ? 'bg-white/10 text-white' 
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            {children}
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          {isExpanded && (
            <div className="ml-6 mt-1 space-y-1 border-l-2 border-white/10 pl-2">
              {isLoading ? (
                <div className="py-2 px-3 text-white/60">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div> 
                  Loading...
                </div>
              ) : (
                <>
                  <Link
                    to={`/${dropdown}`}
                    className="block w-full px-3 py-2 text-sm text-white/80 hover:text-white rounded-lg hover:bg-white/5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    All {dropdown}
                  </Link>
                  
                  {mobileSubItems.map((item) => (
                    <Link
                      key={item.id}
                      to={`/${dropdown}?classLevels=${item.id}`}
                      className="block w-full px-3 py-2 text-sm text-white/80 hover:text-white rounded-lg hover:bg-white/5"
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
        className={`flex items-center w-full px-3 py-2 rounded-lg transition-colors duration-200 ${
          isActive 
            ? 'bg-white/10 text-white' 
            : 'text-gray-300 hover:bg-white/5 hover:text-white'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        {children}
      </Link>
    );
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${isScrolled ? 'py-2 shadow-lg' : 'py-4'} bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900`}>
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
                    alt="Fidni Logo"
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
              
              <NavLink 
                to="/exercises" 
                isActive={isActive('/exercises')} 
                hasDropdown={true} 
                dropdown="exercises"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Exercises
              </NavLink>
              
              <NavLink 
                to="/lessons" 
                isActive={isActive('/lessons')} 
                hasDropdown={true} 
                dropdown="lessons"
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Lessons
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
                Learning Path
              </NavLink>
              
              {user?.is_superuser && (
                <NavLink to="/admin/learning-paths" isActive={isActive('/admin/learning-paths')}>
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </NavLink>
              )}
            </div>
          </div>

          {/* Search bar - desktop */}
          <div className="hidden md:block w-full max-w-md mx-6">
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                placeholder="Search for exercises, lessons, exams..."
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
              placeholder="Search for exercises, lessons, exams..."
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
            
            <NavLinkMobile 
              to="/exercises" 
              isActive={isActive('/exercises')} 
              hasDropdown={true} 
              dropdown="exercises"
            >
              <BookOpen className="w-5 h-5 mr-3" />
              Exercises
            </NavLinkMobile>
            
            <NavLinkMobile 
              to="/lessons" 
              isActive={isActive('/lessons')} 
              hasDropdown={true} 
              dropdown="lessons"
            >
              <GraduationCap className="w-5 h-5 mr-3" />
              Lessons
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
              Learning Path
            </NavLinkMobile>
            
            {user?.is_superuser && (
              <NavLinkMobile to="/admin/learning-paths" isActive={isActive('/admin/learning-paths')}>
                <Shield className="w-5 h-5 mr-3" />
                Admin Panel
              </NavLinkMobile>
            )}
          </div>

          {/* Mobile auth */}
          <div className="pt-4 border-t border-white/10">
            {isAuthenticated ? (
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3 px-3 py-2">
                  <img
                    src={user?.username.charAt(0).toUpperCase() || '/avatar-placeholder.jpg'}
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