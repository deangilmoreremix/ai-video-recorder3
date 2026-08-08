import React, { useEffect, useRef, useState } from 'react';
import { Loader, Lock, Mail, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { signIn, signUp, isAuthAvailable, AUTH_UNAVAILABLE_MESSAGE } from '../../utils/auth';

type AuthMode = 'signin' | 'signup';

interface AuthModalProps {
  /** Rendered inline (no overlay) when false. Defaults to a centered card. */
  isOpen?: boolean;
  /** When provided a close button is shown and Escape dismisses the dialog. */
  onClose?: () => void;
  onAuthenticated?: (session: Session | null) => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen = true,
  onClose,
  onAuthenticated,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) emailRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const result = mode === 'signup' ? await signUp(email, password) : await signIn(email, password);

      if (result.error) {
        setError(result.error);
        return;
      }

      // Sign up with email confirmation enabled returns no session yet
      if (!result.session) {
        setNotice('Check your inbox to confirm your email address, then sign in.');
        setMode('signin');
        setPassword('');
        return;
      }

      setPassword('');
      onAuthenticated?.(result.session);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setNotice(null);
  };

  const title = mode === 'signin' ? 'Sign in to your account' : 'Create your account';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="relative w-full max-w-md bg-white rounded-lg shadow-lg p-6"
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in dialog"
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <h2 id="auth-modal-title" className="text-xl font-semibold text-gray-900">
        {title}
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Your recordings are private to your account.
      </p>

      {!isAuthAvailable && (
        <p role="alert" className="mt-4 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 text-sm">
          {AUTH_UNAVAILABLE_MESSAGE}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              id="auth-email"
              ref={emailRef}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E44E51] focus:border-[#E44E51]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              id="auth-password"
              type="password"
              name="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={mode === 'signup' ? 'auth-password-hint' : undefined}
              className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E44E51] focus:border-[#E44E51]"
            />
          </div>
          {mode === 'signup' && (
            <p id="auth-password-hint" className="mt-1 text-xs text-gray-500">
              Use at least 8 characters.
            </p>
          )}
        </div>

        <div aria-live="polite">
          {error && (
            <p role="alert" className="px-3 py-2 rounded-lg bg-[#E44E51]/10 text-[#E44E51] text-sm">
              {error}
            </p>
          )}
          {notice && !error && (
            <p className="px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm">{notice}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isAuthAvailable}
          className="w-full flex items-center justify-center px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] shadow-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader className="w-4 h-4 mr-2 animate-spin" />}
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600 text-center">
        {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={switchMode}
          className="font-medium text-[#E44E51] hover:underline"
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
};

export default AuthModal;
