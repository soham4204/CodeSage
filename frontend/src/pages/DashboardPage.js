// src/pages/DashboardPage.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';

function DashboardPage() {
  const { currentUser } = useAuth();

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-white mb-4">
        Welcome to Your Dashboard
      </h1>
      <p className="text-lg text-cs-gray">
        You are logged in as: <span className="font-semibold text-cs-red">{currentUser.email}</span>
      </p>
      <div className="mt-8 p-6 bg-gray-800 rounded-lg">
        <h2 className="text-2xl font-bold text-white">Your Projects</h2>
        <p className="mt-2 text-cs-gray">
          This is where your project management features will go.
        </p>
      </div>
    </div>
  );
}

export default DashboardPage;