import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';

// Landing pages
import LandingPage from './pages/LandingPage';
import AIFeaturesPage from './pages/features/AIFeaturesPage';
import VideoRecorderPage from './pages/features/VideoRecorderPage';
import EditorPage from './pages/features/EditorPage';
import ExportPage from './pages/features/ExportPage';
import AnimationPage from './pages/features/AnimationPage';
import PricingPage from './pages/PricingPage';
import RecordingsLibraryPage from './pages/RecordingsLibraryPage';

// App Page
import AppMain from './pages/AppMain';

// Auth
import AuthModal from './components/Auth/AuthModal';
import { getSession, onAuthStateChange, signOut } from './utils/auth';
import { isSupabaseConfigured } from './utils/supabaseClient';

interface AuthStatus {
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Tracks the Supabase session for the whole app. When Supabase is not
 * configured there is no backend to protect, so the app runs in local-only
 * mode and the guard stays open (row level security is the real boundary).
 */
function useAuthStatus(): AuthStatus {
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isActive = true;

    getSession().then(({ session }) => {
      if (!isActive) return;
      setIsAuthenticated(Boolean(session));
      setIsLoading(false);
    });

    const unsubscribe = onAuthStateChange((session) => {
      if (!isActive) return;
      setIsAuthenticated(Boolean(session));
      setIsLoading(false);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return { isLoading, isAuthenticated };
}

const AuthLoading: React.FC<{ message?: string }> = ({ message = 'Checking your session...' }) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center" role="status">
    <Loader className="w-8 h-8 text-[#E44E51] animate-spin" />
    <span className="ml-2 text-gray-600">{message}</span>
  </div>
);

/** Only allow same-origin, non protocol-relative paths as a redirect target. */
const safeRedirect = (value: unknown): string =>
  typeof value === 'string' && /^\/(?!\/)/.test(value) ? value : '/app';

interface RequireAuthProps {
  auth: AuthStatus;
  children: React.ReactElement;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ auth, children }) => {
  const location = useLocation();

  if (!isSupabaseConfigured) return children;
  if (auth.isLoading) return <AuthLoading />;
  if (!auth.isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }

  return children;
};

const LoginRoute: React.FC<{ auth: AuthStatus }> = ({ auth }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = safeRedirect((location.state as { from?: string } | null)?.from);

  if (!isSupabaseConfigured) return <Navigate to="/app" replace />;
  if (auth.isLoading) return <AuthLoading />;
  if (auth.isAuthenticated) return <Navigate to={redirectTo} replace />;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <AuthModal onAuthenticated={() => navigate(redirectTo, { replace: true })} />
    </div>
  );
};

/** Ends the session and returns to the public landing page. */
const LogoutRoute = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    signOut().finally(() => {
      if (isActive) navigate('/', { replace: true });
    });

    return () => {
      isActive = false;
    };
  }, [navigate]);

  return <AuthLoading message="Signing you out..." />;
};

function App() {
  const auth = useAuthStatus();

  return (
    <Routes>
      {/* Landing pages (public) */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/features/ai" element={<AIFeaturesPage />} />
      <Route path="/features/recorder" element={<VideoRecorderPage />} />
      <Route path="/features/editor" element={<EditorPage />} />
      <Route path="/features/export" element={<ExportPage />} />
      <Route path="/features/animation" element={<AnimationPage />} />
      <Route path="/pricing" element={<PricingPage />} />

      {/* Auth */}
      <Route path="/login" element={<LoginRoute auth={auth} />} />
      <Route path="/logout" element={<LogoutRoute />} />

      {/* Protected pages */}
      <Route
        path="/recordings"
        element={
          <RequireAuth auth={auth}>
            <RecordingsLibraryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app"
        element={
          <RequireAuth auth={auth}>
            <AppMain />
          </RequireAuth>
        }
      />

      {/* Unknown routes fall back to the landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
