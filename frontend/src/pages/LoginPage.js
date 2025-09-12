import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; 

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/'); // Redirect to homepage on successful login
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-white">Welcome Back</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-cs-gray block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mt-1 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cs-red"
              required
            />
          </div>
          <div>
            <label className="text-sm font-bold text-cs-gray block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mt-1 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cs-red"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 font-semibold text-white bg-cs-red rounded-md hover:bg-cs-red-dark transition-colors"
          >
            Log In
          </button>
        </form>
         <p className="text-center text-cs-gray">
          Don't have an account? <Link to="/signup" className="text-cs-red hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;