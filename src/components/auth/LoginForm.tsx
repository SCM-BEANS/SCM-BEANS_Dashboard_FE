"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, Lock, Mail, ArrowRight, User } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
  showBackground?: boolean;
}

export function LoginForm({ onSuccess, showBackground = false }: LoginFormProps) {
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (isLoginMode) {
      try {
        const response = await fetch('https://supremacy-revision-hypertext.ngrok-free.dev/api/Auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password
          })
        });

        if (response.ok) {
          const data = await response.json();
          const token = data.token || data.accessToken || data.jwt || (typeof data === 'string' ? data : JSON.stringify(data));
          
          document.cookie = `token=${token}; path=/; max-age=86400; Secure; SameSite=Strict`;
          localStorage.setItem('username', username);
          window.dispatchEvent(new Event('auth-change'));
          setSuccessMsg('Đăng nhập thành công!');
          
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            } else if (window.location.pathname === '/login') {
              router.push('/dashboard');
            } else {
              router.refresh();
            }
          }, 500);
        } else {
          setErrorMsg('Sai mật khẩu hoặc tài khoản');
        }
      } catch (error) {
        console.error('Login error:', error);
        setErrorMsg('Sai mật khẩu hoặc tài khoản');
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        const response = await fetch('https://supremacy-revision-hypertext.ngrok-free.dev/api/Auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            email,
            password
          })
        });

        if (response.ok) {
          setSuccessMsg('Registration successful! You can now sign in.');
          setIsLoginMode(true);
          setUsername('');
          setPassword('');
        } else {
          let errMsg = 'Registration failed';
          try {
            const data = await response.json();
            if (data.message) errMsg = data.message;
            else if (data.title) errMsg = data.title;
          } catch (e) {}
          setErrorMsg(errMsg);
        }
      } catch (error) {
        console.error('Registration error:', error);
        setErrorMsg('An error occurred during registration.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formContent = (
    <div className="relative z-10 w-full max-w-md mx-auto">
      <div className="absolute -inset-4 bg-black/40 blur-2xl rounded-[2.5rem]" />
      <div className="relative p-8 bg-surface/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-surface-container border border-white/10 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
            <Coffee className="text-primary w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-2">
            Deer Coffee
          </h1>
          <p className="text-on-surface-variant text-sm text-center">
            {isLoginMode ? 'Sign in to access the Dashboard' : 'Create an account to continue'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-xl text-green-200 text-sm text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-on-surface-variant" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface border border-white/10 rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                placeholder="Username"
              />
            </div>

            {!isLoginMode && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-on-surface-variant" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-surface border border-white/10 rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                  placeholder="Email address"
                />
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-on-surface-variant" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface border border-white/10 rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                placeholder="Password"
              />
            </div>
          </div>

          {isLoginMode && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="rounded border-white/10 bg-surface text-primary focus:ring-primary/50 w-4 h-4" />
                <span className="text-on-surface-variant hover:text-on-surface transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-primary hover:text-primary-light transition-colors">
                Forgot password?
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full group relative flex items-center justify-center space-x-2 bg-primary hover:bg-primary-light text-on-primary py-3 px-4 rounded-xl font-medium transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="relative z-10">
              {isLoading ? (isLoginMode ? 'Authenticating...' : 'Registering...') : (isLoginMode ? 'Sign In' : 'Sign Up')}
            </span>
            {!isLoading && (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
            )}
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-on-surface-variant">
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-primary hover:text-primary-light transition-colors font-medium"
          >
            {isLoginMode ? 'Sign up' : 'Sign in'}
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-on-surface-variant/70">
          <p>Protected System. Authorized personnel only.</p>
        </div>
      </div>
    </div>
  );

  if (showBackground) {
    return (
      <div
        className="min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: "url('/images/coffee-doodle-bg-light.png')",
          backgroundSize: '400px',
          backgroundRepeat: 'repeat'
        }}
      >
        {formContent}
      </div>
    );
  }

  return formContent;
}
