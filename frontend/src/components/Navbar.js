import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userProfile, setUserProfile] = useState(null); // Firestore profile
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const profileMenuRef = useRef(null);

  // Fetch Firestore user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, "profiles", currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setUserProfile(userSnap.data());
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowProfileMenu(false);
      setIsOpen(false);
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  // Get user display name from Firestore (fallbacks)
  const getUserDisplayName = () => {
    if (userProfile?.displayName) return userProfile.displayName;
    if (currentUser?.displayName) return currentUser.displayName;
    if (currentUser?.email) return currentUser.email.split('@')[0];
    return 'User';
  };

  // Check active link
  const isActiveLink = (path) => location.pathname === path;

  return (
    <nav className="bg-cs-black p-4 shadow-lg font-exo2 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-bold text-cs-red hover:text-cs-red-light transition-colors duration-200"
        >
          CodeSage
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            to="/"
            className={`transition-colors duration-200 ${
              isActiveLink('/')
                ? 'text-white border-b-2 border-cs-red'
                : 'text-cs-gray hover:text-white'
            }`}
          >
            Home
          </Link>
          <Link
            to="/features"
            className={`transition-colors duration-200 ${
              isActiveLink('/features')
                ? 'text-white border-b-2 border-cs-red'
                : 'text-cs-gray hover:text-white'
            }`}
          >
            Features
          </Link>
          {currentUser && (
            <Link
              to="/dashboard"
              className={`transition-colors duration-200 ${
                isActiveLink('/dashboard')
                  ? 'text-white border-b-2 border-cs-red'
                  : 'text-cs-gray hover:text-white'
              }`}
            >
              Dashboard
            </Link>
          )}
        </div>

        {/* Desktop Auth Section */}
        <div className="hidden md:flex items-center space-x-4">
          {currentUser ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 text-white hover:text-cs-red transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cs-red focus:ring-opacity-50 rounded-md px-2 py-1"
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 bg-cs-red rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {getUserDisplayName().charAt(0).toUpperCase()}
                </div>
                <span className="max-w-32 truncate">{getUserDisplayName()}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute mt-2 right-0 w-48 bg-gray-950 rounded-lg shadow-lg z-50 animate-fadeIn">
                  <Link
                    to="/profile"
                    className="block px-4 rounded=lg py-2 text-sm text-white hover:bg-gray-900 transition-colors duration-150"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full rounded-lg text-left px-4 py-2 text-sm text-red-600 hover:bg-cs-red hover:text-white transition-colors duration-150"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-transparent border border-cs-red text-cs-red hover:bg-cs-red hover:text-white transition-all duration-200 font-medium"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-lg bg-cs-red text-white hover:bg-cs-red-dark transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-cs-gray hover:text-white focus:outline-none focus:ring-2 focus:ring-cs-red focus:ring-opacity-50 rounded-md p-1 transition-colors duration-200"
            aria-expanded={isOpen}
            aria-label="Toggle navigation menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-cs-black bg-opacity-98 backdrop-blur-sm border-t border-cs-red border-opacity-20 animate-slideDown">
          <div className="flex flex-col py-4 px-4 space-y-2">
            <Link
              to="/"
              className={`block py-3 px-4 rounded-md transition-all duration-200 ${
                isActiveLink('/')
                  ? 'text-white bg-cs-red bg-opacity-20 border-l-4 border-cs-red'
                  : 'text-cs-gray hover:text-white hover:bg-white hover:bg-opacity-5'
              }`}
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/features"
              className={`block py-3 px-4 rounded-md transition-all duration-200 ${
                isActiveLink('/features')
                  ? 'text-white bg-cs-red bg-opacity-20 border-l-4 border-cs-red'
                  : 'text-cs-gray hover:text-white hover:bg-white hover:bg-opacity-5'
              }`}
              onClick={() => setIsOpen(false)}
            >
              Features
            </Link>
            {currentUser && (
              <>
                <Link
                  to="/dashboard"
                  className={`block py-3 px-4 rounded-md transition-all duration-200 ${
                    isActiveLink('/dashboard')
                      ? 'text-white bg-cs-red bg-opacity-20 border-l-4 border-cs-red'
                      : 'text-cs-gray hover:text-white hover:bg-white hover:bg-opacity-5'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className={`block py-3 px-4 rounded-md transition-all duration-200 ${
                    isActiveLink('/profile')
                      ? 'text-white bg-cs-red bg-opacity-20 border-l-4 border-cs-red'
                      : 'text-cs-gray hover:text-white hover:bg-white hover:bg-opacity-5'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  Profile
                </Link>
              </>
            )}

            {/* Mobile Auth Section */}
            <div className="pt-4 mt-4 border-t border-cs-gray border-opacity-20 space-y-3">
              {currentUser ? (
                <>
                  <div className="flex items-center space-x-3 px-4 py-2 text-white">
                    <div className="w-10 h-10 bg-cs-red rounded-full flex items-center justify-center text-white font-bold">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{getUserDisplayName()}</p>
                      <p className="text-sm text-cs-gray">{currentUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { handleLogout(); setIsOpen(false); }}
                    className="w-full text-left px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block w-full text-center px-4 py-3 rounded-lg bg-transparent border border-cs-red text-cs-red hover:bg-cs-red hover:text-white transition-all duration-200 font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    className="block w-full text-center px-4 py-3 rounded-lg bg-cs-red text-white hover:bg-cs-red-dark transition-colors duration-200 font-medium shadow-md"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  );
}

export default Navbar;
