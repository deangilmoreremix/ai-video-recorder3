import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';

/** Auth is only possible when the Supabase client could be created. */
export const isAuthAvailable = isSupabaseConfigured;

export const AUTH_UNAVAILABLE_MESSAGE =
  'Sign in is unavailable because the app is not connected to Supabase.';

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: string | null;
}

export interface SessionResult {
  session: Session | null;
  error: string | null;
}

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email: string): string =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const toMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

/** Client-side validation so obviously bad credentials never hit the API. */
export const validateCredentials = (
  email: string,
  password: string,
  requireStrongPassword = false
): string | null => {
  if (!EMAIL_PATTERN.test(normalizeEmail(email))) {
    return 'Please enter a valid email address.';
  }
  if (!password) {
    return 'Please enter your password.';
  }
  if (requireStrongPassword && password.length < MIN_PASSWORD_LENGTH) {
    return `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
};

export const signUp = async (email: string, password: string): Promise<AuthResult> => {
  if (!supabase) return { user: null, session: null, error: AUTH_UNAVAILABLE_MESSAGE };

  const invalid = validateCredentials(email, password, true);
  if (invalid) return { user: null, session: null, error: invalid };

  try {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
    });

    if (error) return { user: null, session: null, error: error.message };
    return { user: data.user, session: data.session, error: null };
  } catch (err) {
    return {
      user: null,
      session: null,
      error: toMessage(err, 'We could not create your account. Please try again.'),
    };
  }
};

export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  if (!supabase) return { user: null, session: null, error: AUTH_UNAVAILABLE_MESSAGE };

  const invalid = validateCredentials(email, password);
  if (invalid) return { user: null, session: null, error: invalid };

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    if (error) return { user: null, session: null, error: error.message };
    return { user: data.user, session: data.session, error: null };
  } catch (err) {
    return {
      user: null,
      session: null,
      error: toMessage(err, 'We could not sign you in. Please try again.'),
    };
  }
};

export const signOut = async (): Promise<{ error: string | null }> => {
  if (!supabase) return { error: null };

  try {
    const { error } = await supabase.auth.signOut();
    return { error: error ? error.message : null };
  } catch (err) {
    return { error: toMessage(err, 'We could not sign you out. Please try again.') };
  }
};

export const getSession = async (): Promise<SessionResult> => {
  if (!supabase) return { session: null, error: null };

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { session: null, error: error.message };
    return { session: data.session, error: null };
  } catch (err) {
    return { session: null, error: toMessage(err, 'We could not restore your session.') };
  }
};

/** Subscribes to sign in / sign out / token refresh. Returns an unsubscribe fn. */
export const onAuthStateChange = (
  callback: (session: Session | null) => void
): (() => void) => {
  if (!supabase) return () => undefined;

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => data.subscription.unsubscribe();
};
