import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Compass, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login/Signup

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    let error;
    if (isSignUp) {
      // Sign Up Logic
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      error = signUpError;
    } else {
      // Login Logic
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      error = signInError;
    }

    if (error) {
      alert(error.message);
    } 
    // If successful, the onAuthStateChange listener in App.jsx will handle the redirect
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans">
      
      {/* Animated Logo */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-white/20 blur-xl rounded-full animate-pulse"></div>
        <Compass size={64} className="relative z-10 text-white" />
      </div>

      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tighter mb-2 text-center">
          {isSignUp ? 'INITIATE SEQUENCE.' : 'WELCOME BACK.'}
        </h1>
        <p className="text-zinc-500 text-center mb-8">
          {isSignUp ? 'Create credentials to access the network.' : 'Enter your coordinates to proceed.'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Email Input */}
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-zinc-500" size={20} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-white outline-none transition-all placeholder:text-zinc-600"
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-zinc-500" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-white outline-none transition-all placeholder:text-zinc-600"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all mt-4"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Create Account' : 'Connect')}
            {!loading && <ArrowRight size={18} />}
          </button>

        </form>

        {/* Toggle Login/Signup */}
        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-zinc-500 text-sm hover:text-white underline underline-offset-4"
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
}