import React, { useState, useRef, useEffect } from 'react';
import { Users, Settings, Mic, Wand2, Clock, Edit2, Download, Upload, Palette, Plus, Trash2, AlignLeft, AlignCenter, AlignRight, AlertCircle, Square } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { nanoid } from 'nanoid';
import { buildFileName, downloadBlob } from '../Export/VideoProcessing';

interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  language: string;
  style?: {
    position: 'top' | 'bottom';
    alignment: 'left' | 'center' | 'right';
    fontSize: number;
    color: string;
    background: string;
    opacity: number;
  };
}

// Minimal typings for the Web Speech API (not in the standard DOM lib).
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionErrorLike {
  error: string;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface CaptionsProps {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  videoUrl?: string | null;
}

type CaptionFormat = 'srt' | 'vtt' | 'json';

/** Languages the Web Speech API is asked to transcribe in. */
const RECOGNITION_LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'pt-BR', label: 'Portuguese (BR)' },
  { code: 'nl-NL', label: 'Dutch' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'ja-JP', label: 'Japanese' }
];

/** A pause longer than this is treated as a change of speaker. */
const SPEAKER_TURN_GAP = 1.2;

/** `hh:mm:ss,mmm` (SRT) / `hh:mm:ss.mmm` (WebVTT). */
const formatTimestamp = (seconds: number, separator: ',' | '.'): string => {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.round((safe % 1) * 1000);
  const pad = (value: number, size = 2) => value.toString().padStart(size, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}${separator}${pad(ms, 3)}`;
};

/** Parses `hh:mm:ss,mmm` / `mm:ss.mmm` into seconds. */
const parseTimestamp = (value: string): number | null => {
  const match = value.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!match) return null;
  const [, hours, minutes, seconds, millis] = match;
  return (
    (hours ? parseInt(hours, 10) : 0) * 3600 +
    parseInt(minutes, 10) * 60 +
    parseInt(seconds, 10) +
    (millis ? parseInt(millis.padEnd(3, '0'), 10) / 1000 : 0)
  );
};

/**
 * Reads SubRip (.srt) and WebVTT (.vtt) cues. Cue numbers, `WEBVTT` headers,
 * `NOTE` blocks and cue settings after the timing line are all ignored, and a
 * `Speaker: text` prefix is lifted into the speaker field.
 */
const parseCaptionFile = (
  content: string
): Array<{ text: string; startTime: number; endTime: number; speaker?: string }> => {
  const cues: Array<{ text: string; startTime: number; endTime: number; speaker?: string }> = [];
  const blocks = content.replace(/\r/g, '').split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length === 0) continue;
    if (/^WEBVTT/i.test(lines[0]) && lines.length === 1) continue;
    if (/^NOTE\b/i.test(lines[0])) continue;

    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex === -1) continue;

    const [rawStart, rawRest] = lines[timingIndex].split('-->');
    const startTime = parseTimestamp(rawStart ?? '');
    const endTime = parseTimestamp((rawRest ?? '').trim().split(/\s+/)[0] ?? '');
    if (startTime === null || endTime === null) continue;

    const body = lines.slice(timingIndex + 1).join('\n').trim();
    if (!body) continue;

    const speakerMatch = body.match(/^(?:<v\s+([^>]+)>|([A-Za-z0-9 _-]{1,24}):)\s*/);
    cues.push({
      startTime,
      endTime: Math.max(endTime, startTime),
      speaker: speakerMatch ? (speakerMatch[1] ?? speakerMatch[2]).trim() : undefined,
      text: speakerMatch ? body.slice(speakerMatch[0].length).trim() : body
    });
  }

  return cues;
};

export const Captions: React.FC<CaptionsProps> = ({ videoRef, videoUrl }) => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const segmentStartRef = useRef(0);
  const speakerRef = useRef(1);
  const lastEndRef = useRef(0);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    autoGenerate: true,
    speakerDetection: true,
    language: 'en-US',
    exportFormat: 'srt' as CaptionFormat,
    style: {
      font: 'Arial',
      size: 16,
      color: '#ffffff',
      background: '#000000',
      opacity: 0.8,
      position: 'bottom',
      alignment: 'center'
    }
  });

  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Stop any in-flight recognition if the component unmounts.
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const appendCaption = (text: string, start: number, end: number, speaker?: string) => {
    setCaptions(prev => [
      ...prev,
      {
        id: nanoid(),
        text,
        startTime: start,
        endTime: end,
        language: settings.language.split('-')[0],
        speaker,
        style: {
          position: settings.style.position as 'top' | 'bottom',
          alignment: settings.style.alignment as 'left' | 'center' | 'right',
          fontSize: settings.style.size,
          color: settings.style.color,
          background: settings.style.background,
          opacity: settings.style.opacity
        }
      }
    ]);
  };

  const generateCaptions = async () => {
    if (!videoUrl || !videoRef) {
      setStatus('Load a video in the editor first, then generate captions.');
      return;
    }
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      // Speech recognition is unavailable, so we do not invent output — the
      // user can add captions manually below.
      setStatus('Speech recognition is not available in this browser. You can add captions manually below.');
      return;
    }

    setProcessing(true);
    setStatus('Listening via your microphone — play the video so its speech is captured and transcribed.');

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = settings.language;

    recognition.onresult = (event) => {
      const video = videoRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (!text) continue;
          const end = video ? video.currentTime : segmentStartRef.current;
          const start = segmentStartRef.current;

          let speaker: string | undefined;
          if (settings.speakerDetection) {
            // A long pause between segments marks a new speaker turn.
            if (start - lastEndRef.current > SPEAKER_TURN_GAP) {
              speakerRef.current += 1;
            }
            speaker = `Speaker ${speakerRef.current}`;
          }
          lastEndRef.current = end;

          appendCaption(text, start, end, speaker);
          segmentStartRef.current = end;
        }
      }
    };

    recognition.onerror = (event) => {
      setStatus(`Speech recognition error: ${event.error}. Check microphone permissions and try again.`);
      setProcessing(false);
    };

    recognition.onend = () => {
      setProcessing(false);
      setStatus(prev => (prev && prev.startsWith('Listening') ? 'Transcription complete.' : prev));
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    segmentStartRef.current = videoRef.current ? videoRef.current.currentTime : 0;
    lastEndRef.current = segmentStartRef.current;

    // Play the video so its audio is available to the recognizer.
    videoRef.current?.play().catch(() => undefined);
    try {
      recognition.start();
    } catch {
      // start() throws if called while already running; ignore.
    }
  };

  const stopRecognition = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    recognitionRef.current = null;
    setProcessing(false);
    setStatus('Transcription stopped.');
  };

  const addCaption = () => {
    const newCaption: Caption = {
      id: nanoid(),
      text: '',
      startTime: 0,
      endTime: 3,
      language: 'en',
      style: {
        position: 'bottom',
        alignment: 'center',
        fontSize: settings.style.size,
        color: settings.style.color,
        background: settings.style.background,
        opacity: settings.style.opacity
      }
    };
    setCaptions([...captions, newCaption]);
    setSelectedCaption(newCaption.id);
  };

  const updateCaption = (id: string, updates: Partial<Caption>) => {
    setCaptions(captions.map(caption =>
      caption.id === id ? { ...caption, ...updates } : caption
    ));
  };

  const removeCaption = (id: string) => {
    setCaptions(captions.filter(caption => caption.id !== id));
    if (selectedCaption === id) setSelectedCaption(null);
  };

  const formatTime = (seconds: number): string => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${pad(mins)}:${pad(secs)}.${ms.toString().padStart(3, '0')}`;
  };

  const exportCaptions = () => {
    const format = settings.exportFormat;
    const sorted = [...captions]
      .filter(caption => caption.text.trim().length > 0)
      .sort((a, b) => a.startTime - b.startTime);

    if (sorted.length === 0) {
      setStatus('Nothing to export — add or generate some captions first.');
      return;
    }

    const speakerPrefix = (speaker?: string) => (speaker ? `${speaker}: ` : '');

    let content: string;
    let mime: string;
    let extension: string;

    if (format === 'vtt') {
      content = 'WEBVTT\n\n' + sorted
        .map((caption, index) => {
          const text = caption.speaker
            ? `<v ${caption.speaker}>${caption.text}`
            : caption.text;
          return `${index + 1}\n${formatTimestamp(caption.startTime, '.')} --> ${formatTimestamp(
            caption.endTime,
            '.'
          )}\n${text}`;
        })
        .join('\n\n');
      mime = 'text/vtt';
      extension = 'vtt';
    } else if (format === 'json') {
      content = JSON.stringify(
        sorted.map(({ id, text, startTime, endTime, speaker, language }) => ({
          id,
          text,
          startTime,
          endTime,
          speaker,
          language
        })),
        null,
        2
      );
      mime = 'application/json';
      extension = 'json';
    } else {
      content = sorted
        .map((caption, index) => {
          const text = speakerPrefix(caption.speaker) + caption.text;
          return `${index + 1}\n${formatTimestamp(caption.startTime, ',')} --> ${formatTimestamp(
            caption.endTime,
            ','
          )}\n${text}`;
        })
        .join('\n\n');
      mime = 'text/plain';
      extension = 'srt';
    }

    const blob = new Blob([content], { type: mime });
    downloadBlob(blob, buildFileName('captions', extension));
    setStatus(`Exported ${sorted.length} captions as ${extension.toUpperCase()}.`);
  };

  const importCaptions = async (file: File) => {
    try {
      const content = await file.text();
      const parsed = parseCaptionFile(content);
      if (parsed.length === 0) {
        setStatus('No timed cues were found in that file.');
        return;
      }
      setCaptions(
        parsed.map(({ text, startTime, endTime, speaker }) => ({
          id: nanoid(),
          text,
          startTime,
          endTime,
          language: 'en',
          speaker,
          style: {
            position: settings.style.position as 'top' | 'bottom',
            alignment: settings.style.alignment as 'left' | 'center' | 'right',
            fontSize: settings.style.size,
            color: settings.style.color,
            background: settings.style.background,
            opacity: settings.style.opacity
          }
        }))
      );
      setStatus(`Imported ${parsed.length} captions.`);
    } catch {
      setStatus('That file could not be read or parsed.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Captions</h3>
        <div className="flex space-x-2">
          <Tooltip content="Import .srt or .vtt">
            <button
              onClick={() => importInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Upload className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Export captions">
            <button
              onClick={exportCaptions}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Download className="w-5 h-5" />
            </button>
          </Tooltip>
          <input
            ref={importInputRef}
            type="file"
            accept=".srt,.vtt,text/vtt,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) importCaptions(file);
            }}
          />
          <Tooltip content="Caption styles">
            <button
              onClick={() => setShowStyleEditor(!showStyleEditor)}
              className={`p-2 rounded-lg ${
                showStyleEditor ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Palette className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Settings">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg ${
                showSettings ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {showSettings && (
        <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="caption-language">
              Recognition language
            </label>
            <select
              id="caption-language"
              value={settings.language}
              onChange={(e) => setSettings(s => ({ ...s, language: e.target.value }))}
              className="w-full rounded-lg border-gray-300 shadow-sm text-sm"
            >
              {RECOGNITION_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="caption-export-format">
              Export format
            </label>
            <select
              id="caption-export-format"
              value={settings.exportFormat}
              onChange={(e) => setSettings(s => ({ ...s, exportFormat: e.target.value as CaptionFormat }))}
              className="w-full rounded-lg border-gray-300 shadow-sm text-sm"
            >
              <option value="srt">SubRip (.srt)</option>
              <option value="vtt">WebVTT (.vtt)</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Quick Settings */}
        <div className="grid grid-cols-2 gap-4">
          <Tooltip content="Generate captions automatically using AI speech recognition">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Auto-Generate</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.autoGenerate}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    autoGenerate: e.target.checked
                  }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
              </label>
            </div>
          </Tooltip>

          <Tooltip content="Detect and label different speakers">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Speaker Detection</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.speakerDetection}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    speakerDetection: e.target.checked
                  }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
              </label>
            </div>
          </Tooltip>
        </div>

        {/* Style Editor */}
        {showStyleEditor && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h4 className="font-medium text-sm">Caption Style</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <select
                  value={settings.style.position}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    style: { ...s.style, position: e.target.value as 'top' | 'bottom' }
                  }))}
                  className="w-full rounded-lg border-gray-300 shadow-sm"
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Font Size
                </label>
                <input
                  type="number"
                  value={settings.style.size}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    style: { ...s.style, size: parseInt(e.target.value) }
                  }))}
                  className="w-full rounded-lg border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Color
                </label>
                <input
                  type="color"
                  value={settings.style.color}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    style: { ...s.style, color: e.target.value }
                  }))}
                  className="w-full h-9 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background
                </label>
                <input
                  type="color"
                  value={settings.style.background}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    style: { ...s.style, background: e.target.value }
                  }))}
                  className="w-full h-9 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background Opacity
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.style.opacity}
                onChange={(e) => setSettings(s => ({
                  ...s,
                  style: { ...s.style, opacity: parseFloat(e.target.value) }
                }))}
                className="w-full"
              />
            </div>

            <div className="flex justify-center space-x-2">
              <button
                onClick={() => setSettings(s => ({
                  ...s,
                  style: { ...s.style, alignment: 'left' }
                }))}
                className={`p-2 rounded ${
                  settings.style.alignment === 'left' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-200'
                }`}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSettings(s => ({
                  ...s,
                  style: { ...s.style, alignment: 'center' }
                }))}
                className={`p-2 rounded ${
                  settings.style.alignment === 'center' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-200'
                }`}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSettings(s => ({
                  ...s,
                  style: { ...s.style, alignment: 'right' }
                }))}
                className={`p-2 rounded ${
                  settings.style.alignment === 'right' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-200'
                }`}
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {status && (
          <div className={`flex items-start space-x-2 p-3 rounded-lg text-sm ${
            status.toLowerCase().includes('error')
              ? 'border border-[#E44E51]/30 bg-[#E44E51]/10 text-[#E44E51]'
              : 'bg-gray-50 text-gray-600'
          }`}>
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{status}</span>
          </div>
        )}

        {/* Captions List */}
        <div className="space-y-2">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className={`p-3 rounded-lg border ${
                selectedCaption === caption.id ? 'border-[#E44E51]' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={caption.text}
                      onChange={(e) => updateCaption(caption.id, { text: e.target.value })}
                      className="flex-1 text-sm border-none focus:ring-0 p-0"
                      placeholder="Enter caption text..."
                    />
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(caption.startTime)} - {formatTime(caption.endTime)}</span>
                    </div>
                    {caption.speaker && (
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>{caption.speaker}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedCaption(caption.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeCaption(caption.id)}
                    className="p-1 hover:bg-gray-100 rounded text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Caption Button */}
        <button
          onClick={addCaption}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg
            text-gray-500 hover:border-[#E44E51] hover:text-[#E44E51] transition-colors"
        >
          <Plus className="w-5 h-5 mx-auto" />
        </button>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => {
              setCaptions([]);
              setStatus(null);
              setSettings({
                autoGenerate: true,
                speakerDetection: true,
                language: 'en-US',
                exportFormat: 'srt',
                style: {
                  font: 'Arial',
                  size: 16,
                  color: '#ffffff',
                  background: '#000000',
                  opacity: 0.8,
                  position: 'bottom',
                  alignment: 'center'
                }
              });
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Reset
          </button>
          <div className="flex space-x-2">
            {processing && (
              <button
                onClick={stopRecognition}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
            )}
            <button
              onClick={generateCaptions}
              disabled={processing}
              className="flex items-center space-x-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg 
                hover:bg-[#D43B3E] disabled:opacity-50 shadow-lg hover:shadow-[#E44E51]/25 transition-colors"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Captions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};