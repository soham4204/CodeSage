import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { 
  Mail, Lock, Eye, EyeOff, User, UserPlus, AlertCircle, 
  Check, Chrome, Github, ArrowRight, ArrowLeft, Edit3, X 
} from 'lucide-react';
import axios from 'axios';

function SignupPage() {
  const navigate = useNavigate();
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;
  
  // Account creation fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Profile creation fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  
  // UI state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
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
    
    if (value && !validatePassword(value)) {
      setPasswordError('Password must be at least 6 characters');
    }
    
    // Revalidate confirm password if it's filled
    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
    } else if (confirmPassword && value === confirmPassword) {
      setConfirmPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setConfirmPasswordError('');
    setError('');
    
    if (value && value !== password) {
      setConfirmPasswordError('Passwords do not match');
    }
  };

  const handleDisplayNameChange = (e) => {
    const value = e.target.value;
    setDisplayName(value);
    setDisplayNameError('');
    
    if (value && value.trim().length < 2) {
      setDisplayNameError('Display name must be at least 2 characters');
    }
  };

  const validateStep1 = () => {
    let isValid = true;
    
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }
    
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (!validatePassword(password)) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }
    
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }
    
    return isValid;
  };

  const validateStep2 = () => {
    if (displayName.trim() && displayName.trim().length < 2) {
      setDisplayNameError('Display name must be at least 2 characters');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateStep2()) return;
    
    setIsLoading(true);
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create profile if display name or bio is provided
      if (displayName.trim() || bio.trim()) {
        try {
          const token = await user.getIdToken();
          await axios.post('http://127.0.0.1:8000/api/profile', {
            displayName: displayName.trim(),
            bio: bio.trim()
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (profileError) {
          console.error("Error creating profile:", profileError);
          // Don't fail the entire signup if profile creation fails
        }
      }
      
      navigate('/dashboard');
    } catch (err) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('An account with this email already exists');
          setCurrentStep(1); // Go back to step 1
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Please choose a stronger password');
          setCurrentStep(1); // Go back to step 1
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          setCurrentStep(1); // Go back to step 1
          break;
        default:
          setError('Account creation failed. Please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-cs-red to-cs-red-dark rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UserPlus size={24} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {currentStep === 1 ? 'Create Account' : 'Complete Your Profile'}
          </h1>
          <p className="text-cs-gray">
            {currentStep === 1 
              ? 'Sign up to start your coding journey' 
              : 'Tell us a bit about yourself (optional)'
            }
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-cs-gray">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-cs-gray">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-cs-red to-cs-red-dark h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-xl p-8 shadow-2xl">
          {/* Global Error Message */}
          {error && (
            <div className="flex items-center p-4 mb-6 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
              <AlertCircle size={20} className="mr-3 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto text-current opacity-70 hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <form onSubmit={currentStep === totalSteps ? handleSignUp : handleNextStep}>
            {/* Step 1: Account Creation */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Email Field */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-white mb-3">
                    <Mail size={16} className="mr-2 text-cs-red" />
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="Enter your email"
                      className={`w-full pl-12 pr-4 py-4 text-white bg-gray-950 rounded-lg border transition-all duration-200 placeholder-gray-400 ${
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
                  <label className="flex items-center text-sm font-semibold text-white mb-3">
                    <Lock size={16} className="mr-2 text-cs-red" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="Create a password"
                      className={`w-full pl-12 pr-12 py-4 text-white bg-gray-950 rounded-lg border transition-all duration-200 placeholder-gray-400 ${
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

                {/* Confirm Password Field */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-white mb-3">
                    <Lock size={16} className="mr-2 text-cs-red" />
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      placeholder="Confirm your password"
                      className={`w-full pl-12 pr-12 py-4 text-white bg-gray-950 rounded-lg border transition-all duration-200 placeholder-gray-400 ${
                        confirmPasswordError 
                          ? 'border-red-500 focus:ring-red-500' 
                          : password && confirmPassword && password === confirmPassword
                          ? 'border-green-500 focus:ring-green-500'
                          : 'border-gray-600 focus:border-transparent focus:ring-2 focus:ring-cs-red'
                      } focus:outline-none`}
                    />
                    <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    {password && confirmPassword && password === confirmPassword && (
                      <Check size={20} className="absolute right-10 top-1/2 transform -translate-y-1/2 text-green-500" />
                    )}
                  </div>
                  {confirmPasswordError && (
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {confirmPasswordError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Profile Creation */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-cs-red to-cs-red-dark rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                    {displayName ? displayName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm text-cs-gray">Preview of your profile</p>
                </div>

                {/* Display Name Field */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-white mb-3">
                    <User size={16} className="mr-2 text-cs-red" />
                    Display Name
                    <span className="text-xs text-cs-gray/70 ml-2">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={displayName}
                      onChange={handleDisplayNameChange}
                      placeholder="How should we call you?"
                      className={`w-full pl-12 pr-4 py-4 text-white bg-gray-950 rounded-lg border transition-all duration-200 placeholder-gray-400 ${
                        displayNameError 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-600 focus:border-transparent focus:ring-2 focus:ring-cs-red'
                      } focus:outline-none`}
                    />
                    <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                  {displayNameError && (
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {displayNameError}
                    </p>
                  )}
                  <p className="text-xs text-cs-gray mt-2">
                    This is how your name will appear to others
                  </p>
                </div>

                {/* Bio Field */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-white mb-3">
                    <Edit3 size={16} className="mr-2 text-cs-red" />
                    Bio
                    <span className="text-xs text-cs-gray/70 ml-2">(optional)</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows="4"
                    placeholder="Tell us a bit about yourself..."
                    className="w-full p-4 text-white bg-gray-950 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent transition-all duration-200 placeholder-gray-400 resize-none"
                    maxLength="500"
                  />
                  <p className="text-xs text-cs-gray mt-2">
                    {bio.length}/500 characters
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex items-center px-6 py-3 text-cs-gray bg-gray-700/50 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <ArrowLeft size={20} className="mr-2" />
                  Back
                </button>
              ) : (
                <div></div>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className={`flex items-center px-8 py-4 font-semibold rounded-lg transition-all duration-200 ${
                  isLoading
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-cs-red text-white hover:bg-cs-red-dark shadow-lg hover:shadow-xl transform hover:scale-105'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Account...
                  </div>
                ) : currentStep === totalSteps ? (
                  <div className="flex items-center">
                    <Check size={20} className="mr-2" />
                    Complete Signup
                  </div>
                ) : (
                  <div className="flex items-center">
                    Next
                    <ArrowRight size={20} className="ml-2" />
                  </div>
                )}
              </button>
            </div>
          </form>

          {/* Social Login - Only show on step 1 */}
          {currentStep === 1 && (
            <>
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-gray-500"></div>
                <span className="px-4 text-sm text-cs-gray">or</span>
                <div className="flex-1 border-t border-gray-500"></div>
              </div>

              {/* Social Login Options */}
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center py-3 px-4 bg-gray-950 text-white rounded-lg border border-gray-600 hover:border-cs-red hover:bg-gray-800 transition-all duration-200">
                  <Chrome size={20} className="mr-3" />
                  Sign up with Google
                </button>
                <button className="w-full flex items-center justify-center py-3 px-4 bg-gray-950 text-white rounded-lg border border-gray-600 hover:border-cs-red hover:bg-gray-800 transition-all duration-200">
                  <Github size={20} className="mr-3" />
                  Sign up with GitHub
                </button>
              </div>
            </>
          )}

          {/* Sign In Link */}
          <p className="text-center text-cs-gray mt-8">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="text-cs-red hover:text-white font-semibold transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignupPage;