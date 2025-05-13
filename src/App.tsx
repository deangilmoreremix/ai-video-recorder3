import { Routes, Route } from 'react-router-dom';

// Landing pages
import LandingPage from './pages/LandingPage';
import AIFeaturesPage from './pages/features/AIFeaturesPage';
import VideoRecorderPage from './pages/features/VideoRecorderPage';
import EditorPage from './pages/features/EditorPage';
import ExportPage from './pages/features/ExportPage';
import AnimationPage from './pages/features/AnimationPage';
import RecordingsLibraryPage from './pages/RecordingsLibraryPage';

// App components
import { VideoRecorder } from './components/Recorder/VideoRecorder';
import { VideoPlayback } from './components/Preview/VideoPlayback';
import { FeatureList } from './components/Features/FeatureList';
import { AdvancedControls } from './components/Controls/AdvancedControls';
import { WalkthroughTutorial } from './components/Tutorial/WalkthroughTutorial';
import { FeatureAssistant } from './components/Assistant/FeatureAssistant';

// App Page
import AppMain from './pages/AppMain';

function App() {
  return (
    <Routes>
      {/* Landing pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/features/ai" element={<AIFeaturesPage />} />
      <Route path="/features/recorder" element={<VideoRecorderPage />} />
      <Route path="/features/editor" element={<EditorPage />} />
      <Route path="/features/export" element={<ExportPage />} />
      <Route path="/features/animation" element={<AnimationPage />} />
      <Route path="/recordings" element={<RecordingsLibraryPage />} />
      
      {/* App page */}
      <Route path="/app" element={<AppMain />} />
    </Routes>
  );
}

export default App;