import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import RecordingsLibrary from '../components/Recordings/RecordingsLibrary';

/**
 * `/recordings` route (auth gated in `App.tsx`).
 *
 * The page is only the chrome around the library: the recordings themselves are
 * owned by `<RecordingsLibrary />`, which reads them from Supabase through
 * `getRecordings()` and mutates them with `updateRecording()` /
 * `deleteRecording()`. Keeping a single implementation means the page and the
 * in-app library ("My Recordings" inside `/app`) can never drift apart, and the
 * data is fetched exactly once per view.
 *
 * Remounting the library re-runs that fetch, so `libraryKey` is how this page
 * reloads: on demand (Refresh) and when the user comes back to a stale tab.
 */

/** Only auto-reload on refocus if the data has had time to go stale. */
const STALE_AFTER_MS = 5 * 60 * 1000;

const RecordingsLibraryPage = () => {
  const navigate = useNavigate();
  const [libraryKey, setLibraryKey] = useState(0);
  const loadedAtRef = useRef(Date.now());

  const reloadRecordings = useCallback(() => {
    loadedAtRef.current = Date.now();
    setLibraryKey((key) => key + 1);
  }, []);

  // Refresh when the user returns to the tab/window after being away a while.
  // The staleness guard keeps an in-progress preview from being torn down every
  // time focus briefly leaves the page.
  useEffect(() => {
    const reloadIfStale = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - loadedAtRef.current < STALE_AFTER_MS) return;
      reloadRecordings();
    };

    document.addEventListener('visibilitychange', reloadIfStale);
    window.addEventListener('focus', reloadIfStale);

    return () => {
      document.removeEventListener('visibilitychange', reloadIfStale);
      window.removeEventListener('focus', reloadIfStale);
    };
  }, [reloadRecordings]);

  const goToRecorder = useCallback(() => {
    navigate('/app');
  }, [navigate]);

  const editRecording = useCallback(
    (recordingId: string) => {
      navigate('/app', { state: { editRecordingId: recordingId } });
    },
    [navigate]
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <Link to="/" className="font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#E44E51] to-[#D43B3E] text-center">
            AI Screen Recorder
          </Link>
          <div className="flex space-x-4">
            <Link to="/app" className="py-2 px-4 text-gray-700 hover:text-[#E44E51]">
              Recorder
            </Link>
            <span aria-current="page" className="py-2 px-4 text-[#E44E51] font-medium border-b-2 border-[#E44E51]">
              My Recordings
            </span>
            <Link to="/" className="py-2 px-4 text-gray-700 hover:text-[#E44E51]">
              Settings
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">My Recordings</h1>
          <button
            type="button"
            onClick={reloadRecordings}
            className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>

        <RecordingsLibrary
          key={libraryKey}
          onBackToRecorder={goToRecorder}
          onEditRecording={editRecording}
        />
      </main>
    </div>
  );
};

export default RecordingsLibraryPage;
