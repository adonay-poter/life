'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabaseClient';
import { Eye, EyeOff, Lock, Mail, RefreshCw } from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';
import { useToast } from '@/context/ToastContext';
import { Input } from './ui/Inputs';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, configError } = useAuth();
  const { showToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (authLoading) {
    return <SkeletonLoader />;
  }

  if (configError) {
    return (
      <div className="min-h-screen bg-neutral-bg flex items-center justify-center px-4 py-12 font-sans">
        <div className="w-full max-w-lg bg-surface border border-secondary/30 p-8 md:p-10 rounded-sm shadow-sm">
          <h1 className="font-display text-2xl font-medium text-primary mb-4">Deployment configuration required</h1>
          <p className="text-secondary text-sm leading-6 mb-4">
            This deployment is missing the public Supabase environment variables required for authentication.
          </p>
          <div className="bg-neutral-bg/60 border border-secondary/20 rounded-sm p-4 text-sm text-primary">
            <p>`NEXT_PUBLIC_SUPABASE_URL`</p>
            <p>`NEXT_PUBLIC_SUPABASE_ANON_KEY`</p>
          </div>
          <p className="text-secondary text-xs mt-4 break-words">{configError}</p>
        </div>
      </div>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      showToast('Successfully signed in.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Authentication failed. Please check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-bg flex items-center justify-center px-4 py-12 font-sans select-none animate-page-enter">
      <div className="w-full max-w-md bg-surface border border-secondary/30 p-8 md:p-10 rounded-sm shadow-sm relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 right-0 w-16 h-1 bg-tertiary"></div>
        
        {/* Brand Header */}
        <div className="text-center mb-10">
          <h1 className="font-amharic text-5xl font-bold tracking-tight text-primary mb-2">
            ሁሉ
          </h1>
          <p className="font-label text-xs text-secondary uppercase tracking-[0.2em] mb-4">
            Life Operating System
          </p>
          <div className="w-12 h-[1px] bg-secondary/35 mx-auto"></div>
        </div>

        <h2 className="font-display text-2xl font-medium text-primary text-center mb-6">
          Access Dashboard
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <label htmlFor="email" className="font-label text-xs uppercase tracking-wider text-secondary block">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary/70">
                <Mail className="h-4 w-4" />
              </span>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10 pr-4 bg-neutral-bg/30 border-secondary/35 rounded-sm"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label htmlFor="current-password" className="font-label text-xs uppercase tracking-wider text-secondary block">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary/70">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                id="current-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-10 bg-neutral-bg/30 border-secondary/35 rounded-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-tertiary text-on-primary font-label text-xs uppercase tracking-[0.15em] font-semibold rounded-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2 btn-press"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
