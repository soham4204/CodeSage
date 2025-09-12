// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, redirectTo = "/login" }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to={redirectTo} replace />;
  }

  // If children are passed, render them, otherwise render nested routes (Outlet)
  return children ? children : <Outlet />;
}

export default ProtectedRoute;
