import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Settings } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface SpeechRecognitionProps {
  enabled: boolean;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  settings?: {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
    maxAlternatives?: number;
  };
}

export const SpeechRecognitionComponent: React.FC<SpeechRecognitionProps> = ({
  enabled,
  onTranscript,
  onError,
  settings = {
    language: 'en-US',
    continuous: true,
    interimResults: true,
    maxAlternatives: 1
  }
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI && enabled) {
      recognitionRef.current = new (SpeechRecognitionAPI as any)();
      const recognition = recognitionRef.current;

      if (recognition) {
        // Configure recognition
        recognition.lang = localSettings.language || 'en-US';
        recognition.continuous = localSettings.continuous ?? true;
        recognition.interimResults = localSettings.interimResults ?? true;
        recognition.maxAlternatives = localSettings.maxAlternatives || 1;

        // Event handlers
        recognition.onstart = () => {
          setIsListening(true);
          console.log('Speech recognition started');
        };

        recognition.onend = () => {
          setIsListening(false);
          console.log('Speech recognition ended');
        };

        recognition.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;

            if (result.isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
            onTranscript?.(finalTranscript, true);
          }

          if (interimTranscript) {
            setInterimTranscript(interimTranscript);
            onTranscript?.(interimTranscript, false);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);

          let errorMessage = 'Speech recognition error';
          switch (event.error) {
            case 'no-speech':
              errorMessage = 'No speech detected';
              break;
            case 'audio-capture':
              errorMessage = 'Audio capture failed';
              break;
            case 'not-allowed':
              errorMessage = 'Microphone permission denied';
              break;
            case 'network':
              errorMessage = 'Network error';
              break;
            case 'service-not-allowed':
              errorMessage = 'Speech recognition service not allowed';
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}`;
          }

          onError?.(errorMessage);
        };

        recognition.onnomatch = () => {
          console.log('Speech not recognized');
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [enabled, localSettings, onTranscript, onError]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        onError?.('Failed to start speech recognition');
      }
    }
  }, [isListening, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const updateSetting = useCallback((key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  if (!enabled) return null;

  if (!isSupported) {
    return (
      <div className="absolute top-4 left-4 bg-red-500/90 text-white px-3 py-2 rounded-lg text-sm">
        Speech recognition not supported in this browser
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 space-y-2">
      {/* Control Panel */}
      <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-2 rounded-full transition-colors ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <span className="text-sm font-medium">
              {isListening ? 'Listening...' : 'Click to start'}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={clearTranscript}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              title="Clear transcript"
            >
              <Volume2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 rounded hover:bg-white/20 transition-colors"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Transcript Display */}
        <div className="max-w-xs">
          {transcript && (
            <div className="text-xs mb-1">
              <span className="font-medium">Transcript:</span>
              <p className="text-gray-200 mt-1 break-words">{transcript}</p>
            </div>
          )}

          {interimTranscript && (
            <div className="text-xs">
              <span className="font-medium text-gray-400">Interim:</span>
              <p className="text-gray-400 mt-1 break-words italic">{interimTranscript}</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white max-w-xs">
          <h4 className="text-sm font-medium mb-2">Speech Recognition Settings</h4>

          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Language</label>
              <select
                value={localSettings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="w-full text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="it-IT">Italian</option>
                <option value="pt-BR">Portuguese</option>
                <option value="ja-JP">Japanese</option>
                <option value="ko-KR">Korean</option>
                <option value="zh-CN">Chinese (Mandarin)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-300">Continuous</label>
              <input
                type="checkbox"
                checked={localSettings.continuous}
                onChange={(e) => updateSetting('continuous', e.target.checked)}
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-300">Interim Results</label>
              <input
                type="checkbox"
                checked={localSettings.interimResults}
                onChange={(e) => updateSetting('interimResults', e.target.checked)}
                className="rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// TypeScript declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognitionAPI: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

// Export the component
export { SpeechRecognitionComponent as SpeechRecognition };