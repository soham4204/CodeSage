import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Github, Chrome } from 'lucide-react';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError('');
    setError('');
    
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError('');
    setError('');
    
    if (value && value.length < 6) {
      setPasswordError('Password must be at least 6 characters');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setPasswordError('');

    // Validation
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setPasswordError('Password is required');
      return;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No account found with this email address');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later');
          break;
        default:
          setError('Login failed. Please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-cs-red to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <LogIn size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-cs-gray">Sign in to your account to continue</p>
        </div>

        {/* Main Form */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl">
          {/* Global Error Message */}
          {error && (
            <div className="flex items-center p-4 mb-6 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
              <AlertCircle size={20} className="mr-3 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="flex items-center text-sm font-semibold text-cs-gray mb-2">
                <Mail size={16} className="mr-2" />
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email"
                  className={`w-full pl-12 pr-4 py-4 text-white bg-gray-700 rounded-lg border transition-all duration-200 placeholder-gray-400 ${
                    emailError 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-600 focus:border-transparent focus:ring-2 focus:ring-cs-red'
                  } focus:outline-none`}
                />
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              {emailError && (
                <p className="text-red-400 text-sm mt-2 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="flex items-center text-sm font-semibold text-cs-gray mb-2">
                <Lock size={16} className="mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your password"
                  className={`w-full pl-12 pr-12 py-4 text-white bg-gray-700 rounded-lg border transition-all duration-200 placeholder-gray-400 ${
                    passwordError 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-600 focus:border-transparent focus:ring-2 focus:ring-cs-red'
                  } focus:outline-none`}
                />
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordError && (
                <p className="text-red-400 text-sm mt-2 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {passwordError}
                </p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-cs-red hover:text-red-400 transition-colors">
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || emailError || passwordError}
              className={`w-full py-4 font-semibold rounded-lg transition-all duration-200 ${
                isLoading || emailError || passwordError
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-cs-red text-white hover:bg-cs-red-dark shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing In...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <LogIn size={20} className="mr-2" />
                  Sign In
                </div>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-600"></div>
            <span className="px-4 text-sm text-cs-gray">or</span>
            <div className="flex-1 border-t border-gray-600"></div>
          </div>

          {/* Social Login Options */}
          <div className="space-y-3">
            <button className="w-full flex items-center justify-center py-3 px-4 bg-gray-700 text-white rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors">
              <Chrome size={20} className="mr-3" />
              Continue with Google
            </button>
            <button className="w-full flex items-center justify-center py-3 px-4 bg-gray-700 text-white rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors">
              <Github size={20} className="mr-3" />
              Continue with GitHub
            </button>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-cs-gray mt-8">
            Don't have an account?{' '}
            <Link 
              to="/signup" 
              className="text-cs-red hover:text-red-400 font-semibold transition-colors"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;