import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import the useAuth hook
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useAuth(); // Get the current user from context
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <nav className="bg-cs-black p-4 shadow-lg font-exo2 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-cs-red">
          CodeSage
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-cs-gray hover:text-white">Home</Link>
          <Link to="/features" className="text-cs-gray hover:text-white">Features</Link>
          {currentUser && <Link to="/dashboard" className="text-cs-gray hover:text-white">Dashboard</Link>}
        </div>

        {/* Conditional Buttons for Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          {currentUser ? (
            <>
              <span className="text-white">{currentUser.email}</span>
              <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-cs-red text-white hover:bg-cs-red-dark">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 rounded-lg bg-transparent border border-cs-red text-cs-red hover:bg-cs-red-dark hover:text-white">
                Log In
              </Link>
              <Link to="/signup" className="px-4 py-2 rounded-lg bg-cs-red text-white hover:bg-cs-red-dark">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-cs-gray hover:text-white focus:outline-none">
            {/* ... hamburger/close icon SVG ... */}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden absolute top-[68px] left-0 w-full bg-cs-black bg-opacity-95">
          <div className="flex flex-col items-center space-y-6 py-8">
            {/* ... mobile links ... */}
            <div className="flex flex-col items-center space-y-4 pt-4 w-full px-8">
              {currentUser ? (
                <button onClick={() => { handleLogout(); setIsOpen(false); }} className="w-full text-center px-4 py-2 rounded-lg bg-cs-red text-white">
                  Logout
                </button>
              ) : (
                <>
                  <Link to="/login" className="w-full text-center px-4 py-2 rounded-lg bg-transparent border border-cs-red text-cs-red" onClick={() => setIsOpen(false)}>
                    Log In
                  </Link>
                  <Link to="/signup" className="w-full text-center px-4 py-2 rounded-lg bg-cs-red text-white" onClick={() => setIsOpen(false)}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;