// src/context/AuthContext.js
import React, { useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase'; // Import your auth instance

const AuthContext = React.createContext();

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listener for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe; // Cleanup on unmount
  }, []);

  const value = {
    currentUser,
  };

  // We don't render the app until the user state has been checked
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}