import { Component, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { VideoRecorder } from '../components/Recorder/VideoRecorder';
import { VideoPlayback } from '../components/Preview/VideoPlayback';
import { FeatureList } from '../components/Features/FeatureList';
import { AdvancedControls } from '../components/Controls/AdvancedControls';
import { WalkthroughTutorial } from '../components/Tutorial/WalkthroughTutorial';
import { FeatureAssistant } from '../components/Assistant/FeatureAssistant';
import { AlertTriangle, HelpCircle, Video, Grid } from 'lucide-react';
import RecordingsLibrary from '../components/Recordings/RecordingsLibrary';
import { getRecordings, isSafeMediaUrl, isSupabaseConfigured } from '../utils/supabaseClient';
import '../index.css';

const TUTORIAL_STORAGE_KEY = 'hasSeenTutorial';

/** localStorage can throw (private mode / disabled storage) - never crash on it. */
const safeLocalStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable - ignore */
    }
  }
};

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * Keeps a crash inside the recorder/editor tree from blanking the whole page.
 */
class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('AppMain crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-[#E44E51] mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">
            The studio failed to load. Reloading the page usually fixes this.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-[#E44E51] text-white hover:bg-[#D43B3E]"
          >
            Reload the app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppMain() {
  const location = useLocation();
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [isReady, setIsReady] = useState(false);
  // The recording currently loaded into the editor. Set when a user clicks
  // "Edit" on a recording or lands here from `/recordings?edit=`.
  const [editorSource, setEditorSource] = useState<{ url: string; title?: string } | null>(null);

  useEffect(() => {
    const seen = safeLocalStorage.get(TUTORIAL_STORAGE_KEY);
    if (seen) {
      setHasSeenTutorial(true);
    } else {
      setShowTutorial(true);
    }
    setIsReady(true);
  }, []);

  /**
   * Loads a recording (by id) into the editor. The recording list is owned by
   * the library, so we re-fetch and pick the matching row, then hand the safe
   * media URL to `VideoPlayback` as its `source`.
   */
  const loadRecordingForEdit = useCallback(async (recordingId: string) => {
    setShowRecordings(false);
    try {
      const recordings = await getRecordings();
      const recording = recordings.find(rec => rec.id === recordingId);
      if (recording && isSafeMediaUrl(recording.url)) {
        setEditorSource({ url: recording.url, title: recording.title });
      }
    } catch {
      // The library remains the source of truth; ignore fetch failures here.
    }
  }, []);

  // Honor a deep link from the `/recordings` page (navigate state).
  useEffect(() => {
    const editId = (location.state as { editRecordingId?: string } | null)?.editRecordingId;
    if (editId) loadRecordingForEdit(editId);
  }, [location.state, loadRecordingForEdit]);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
    if (!hasSeenTutorial) {
      safeLocalStorage.set(TUTORIAL_STORAGE_KEY, 'true');
      setHasSeenTutorial(true);
    }
  }, [hasSeenTutorial]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <Link to="/" className="typing-animation font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#E44E51] to-[#D43B3E] text-center">
            AI Screen Recorder
          </Link>
          <div className="flex items-center space-x-4">
            <button 
              type="button"
              onClick={() => setShowRecordings(!showRecordings)} 
              aria-pressed={showRecordings}
              className={`flex items-center text-gray-700 hover:text-[#E44E51] ${showRecordings ? 'text-[#E44E51]' : ''}`}
            >
              {showRecordings ? (
                <>
                  <Grid className="w-5 h-5 mr-1" aria-hidden="true" />
                  <span>Back to Recorder</span>
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 mr-1" aria-hidden="true" />
                  <span>My Recordings</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              aria-label="Open the walkthrough tutorial"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <HelpCircle className="w-6 h-6 text-[#E44E51]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {!isSupabaseConfigured && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              Cloud sync is unavailable because the app is not connected to a backend.
              Recording and editing still work, but your recordings will not be saved to your library.
            </p>
          </div>
        )}

        {!isReady ? (
          <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
            <div className="h-10 w-10 rounded-full border-4 border-[#E44E51]/30 border-t-[#E44E51] animate-spin" />
            <span className="sr-only">Loading the studio…</span>
          </div>
        ) : (
          <AppErrorBoundary>
            {showRecordings ? (
              <RecordingsLibrary 
                onBackToRecorder={() => setShowRecordings(false)}
                onEditRecording={(recordingId) => {
                  loadRecordingForEdit(recordingId);
                }}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <VideoRecorder />
                  <FeatureList />
                </div>
                
                <div className="space-y-6">
                  <VideoPlayback source={editorSource} />
                  <AdvancedControls />
                </div>
              </div>
            )}
          </AppErrorBoundary>
        )}
      </main>

      <WalkthroughTutorial
        isOpen={showTutorial}
        onClose={handleCloseTutorial}
      />
      
      <FeatureAssistant />
    </div>
  );
}

export default AppMain;
