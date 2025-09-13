// src/App.js
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import FeaturesPage from './pages/FeaturesPage';
import PricingPage from './pages/PricingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ProjectAnalysisPage from './pages/ProjectAnalysisPage';

function App() {
  return (
    <div className="min-h-screen w-full bg-black relative text-cs-gray font-exo2">
      {/* Volcanic Ember Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 70% at 70% 80%, rgba(87, 24, 69, 0.20), transparent 52%),
            radial-gradient(ellipse 160% 45% at 30% 30%, rgba(153, 27, 27, 0.16), transparent 58%),
            radial-gradient(ellipse 85% 100% at 10% 60%, rgba(69, 26, 3, 0.22), transparent 46%),
            #1c1917
          `,
        }}
      />

      {/* Foreground content */}
      <div className="relative z-10">
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
          />
          <Route
            path="/projects/:projectId"
            element={<ProtectedRoute><ProjectAnalysisPage /></ProtectedRoute>}
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
