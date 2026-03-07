import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

const LandingPage = () => {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      
      if (signUpError) {
        setError(signUpError.message);
      } else {
        if (!data.session) {
          setIsSignUp(false);
          setSuccessMessage('Your account has been created. Please check your email and verify your address before logging in.');
          setPassword('');
        } else {
          navigate('/dashboard');
        }
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
      } else {
        navigate('/dashboard');
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
    }
  };

  return (
    <div className="min-h-screen bg-white flex w-full">
      {/* Left Side */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-12 xl:px-24 bg-[#fafafa] border-r border-[#eaecf0] relative h-screen">
        <div className="max-w-md mx-auto w-full">
          <div className="w-16 h-16 bg-white text-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-sm border border-blue-50 relative overflow-hidden">
             <div className="absolute inset-0 bg-blue-50/50"></div>
             <svg className="relative z-10" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="m12 15 3-3-2-2"/></svg>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.15]">
            Deal Sourcing, <br />
            <span className="text-slate-500">Elevated by AI.</span>
          </h1>
          
          <p className="text-lg text-slate-500 mt-2 mb-12 leading-relaxed max-w-sm">
            VC Scout combines automated enrichment, pipeline management, and intelligent thesis matching into a single, cohesive workflow for modern venture capital teams.
          </p>
          
          <div className="flex gap-16 mt-8 w-full max-w-sm">
            <div>
              <div className="text-3xl font-bold text-slate-900">10x</div>
              <div className="text-sm font-medium text-slate-500 mt-1">Faster diligence</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">AI</div>
              <div className="text-sm font-medium text-slate-500 mt-1">Automated enrichment</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 bg-white">
        <div className="w-full max-w-sm mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">{isSignUp ? 'Create an account' : 'Welcome back'}</h2>
          <p className="text-slate-500 text-sm mb-8">
            {isSignUp ? 'Enter your details to create your workspace.' : 'Enter your credentials to access your workspace.'}
          </p>
          
          {successMessage && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
              {successMessage}
            </div>
          )}

          <div className="mt-2">
            <Button 
              variant="outline" 
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full h-12 font-medium border-[#eaecf0] text-slate-700 bg-white hover:bg-slate-50 rounded-lg flex items-center justify-center gap-3 shadow-sm mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
            
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#eaecf0]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-bold tracking-wider uppercase">OR CONTINUE WITH EMAIL</span>
              </div>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-700 block" htmlFor="email">Work Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                  </div>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@company.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 text-sm rounded-lg border-[#eaecf0] bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-300 focus-visible:border-slate-300 shadow-sm transition-all w-full" 
                    required 
                  />
                </div>
              </div>
              
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-700 block" htmlFor="password">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 text-sm rounded-lg border-[#eaecf0] bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-300 focus-visible:border-slate-300 shadow-sm transition-all w-full" 
                    required 
                  />
                </div>
              </div>
              
              {error && (
                <div className="text-sm text-red-500 font-medium text-left mt-2">
                  {error}
                </div>
              )}

              <Button disabled={loading} type="submit" className="w-full h-11 bg-[#0f111a] hover:bg-black text-white rounded-lg mt-3 font-medium flex items-center justify-center gap-2 shadow-sm transition-all">
                {loading ? 'Processing...' : (isSignUp ? 'Sign up' : 'Sign in')} <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-slate-500">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <button 
                type="button" 
                onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMessage(''); }}
                className="font-semibold text-slate-900 hover:text-slate-800 transition-colors"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </div>
            
            <div className="mt-10 text-center text-xs text-slate-400 leading-relaxed">
              By {isSignUp ? 'signing up' : 'signing in'}, you agree to our <a href="#" className="underline hover:text-slate-500 transition-colors">Terms of Service</a> and <a href="#" className="underline hover:text-slate-500 transition-colors">Privacy Policy</a>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
