"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login delay
    setTimeout(() => {
      setIsLoading(false);
      // Navigate to dashboard
      router.push('/');
    }, 1000);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: "url('/images/coffee-doodle-bg-light.png')",
        backgroundSize: '400px', // Pattern size
        backgroundRepeat: 'repeat'
      }}
    >
      {/* No overlay, background pattern displays in full clarity */}

      <div className="relative z-10 w-full max-w-md">
        {/* Hiệu ứng viền bóng mờ tạo khối (Blurred outer drop-shadow) */}
        <div className="absolute -inset-4 bg-black/40 blur-2xl rounded-[2.5rem]" />

        <div className="relative p-8 bg-surface/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-surface-container border border-white/10 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
              <Coffee className="text-primary w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-2">
              Deer Coffee
            </h1>
            <p className="text-on-surface-variant text-sm text-center">
              Sign in to access the Deer Coffee Dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 mt-4">
            <div className="space-y-4">
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="rounded border-white/10 bg-surface text-primary focus:ring-primary/50 w-4 h-4" />
                <span className="text-on-surface-variant hover:text-on-surface transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-primary hover:text-primary-light transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full group relative flex items-center justify-center space-x-2 bg-primary hover:bg-primary-light text-on-primary py-3 px-4 rounded-xl font-medium transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
            >
              <span className="relative z-10">
                {isLoading ? 'Authenticating...' : 'Sign In'}
              </span>
              {!isLoading && (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
              )}
              {/* Subtle highlight effect on hover */}
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-on-surface-variant">
            <p>Protected System. Authorized personnel only.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
