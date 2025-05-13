import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { VideoRecorder } from '../components/Recorder/VideoRecorder';
import { VideoPlayback } from '../components/Preview/VideoPlayback';
import { FeatureList } from '../components/Features/FeatureList';
import { AdvancedControls } from '../components/Controls/AdvancedControls';
import { WalkthroughTutorial } from '../components/Tutorial/WalkthroughTutorial';
import { FeatureAssistant } from '../components/Assistant/FeatureAssistant';
import { HelpCircle, Video, Grid } from 'lucide-react';
import RecordingsLibrary from '../components/Recordings/RecordingsLibrary';
import '../index.css';

function AppMain() {
  const [showTutorial, setShowTutorial] = useState(true);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('hasSeenTutorial');
    if (seen) {
      setHasSeenTutorial(true);
      setShowTutorial(false);
    }
  }, []);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    if (!hasSeenTutorial) {
      localStorage.setItem('hasSeenTutorial', 'true');
      setHasSeenTutorial(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <Link to="/" className="typing-animation font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#E44E51] to-[#D43B3E] text-center">
            AI Screen Recorder
          </Link>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowRecordings(!showRecordings)} 
              className={`flex items-center text-gray-700 hover:text-[#E44E51] ${showRecordings ? 'text-[#E44E51]' : ''}`}
            >
              {showRecordings ? (
                <>
                  <Grid className="w-5 h-5 mr-1" />
                  <span>Back to Recorder</span>
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 mr-1" />
                  <span>My Recordings</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowTutorial(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <HelpCircle className="w-6 h-6 text-[#E44E51]" />
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {showRecordings ? (
          <RecordingsLibrary 
            onBackToRecorder={() => setShowRecordings(false)}
            onEditRecording={(recordingId) => {
              // Handle editing a recording
              console.log(`Editing recording: ${recordingId}`);
              setShowRecordings(false);
              // Additional logic to load the recording for editing
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <VideoRecorder />
              <FeatureList />
            </div>
            
            <div className="space-y-6">
              <VideoPlayback />
              <AdvancedControls />
            </div>
          </div>
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