import React, { useCallback, useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Music, Play, Pause, Volume2, VolumeX, Trash2, AudioWaveform } from 'lucide-react';
import { nanoid } from 'nanoid';

interface AudioTrack {
  id: string;
  name: string;
  url: string;
  volume: number;
  muted: boolean;
  playing: boolean;
}

/**
 * Multi track audio bed for the editor. Every track owns a real WaveSurfer
 * instance: play/pause, volume and mute are applied to it directly, and both
 * the instance and its object URL are released when the track (or the panel)
 * goes away.
 */
export const AdvancedAudioEditor: React.FC = () => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const waveformRefs = useRef<Map<string, WaveSurfer>>(new Map());
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const addTrack = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setError('Unsupported file type. Please choose an audio file.');
      return;
    }

    setError(null);
    setTracks(prev => [
      ...prev,
      {
        id: nanoid(),
        name: file.name,
        url: URL.createObjectURL(file),
        volume: 1,
        muted: false,
        playing: false
      }
    ]);
  };

  /** Tears down the WaveSurfer instance and frees the decoded audio. */
  const destroyTrack = useCallback((id: string, url?: string) => {
    const wavesurfer = waveformRefs.current.get(id);
    if (wavesurfer) {
      try {
        wavesurfer.destroy();
      } catch {
        /* already destroyed */
      }
      waveformRefs.current.delete(id);
    }
    containerRefs.current.delete(id);
    if (url) URL.revokeObjectURL(url);
  }, []);

  const removeTrack = (id: string) => {
    const track = tracks.find(entry => entry.id === id);
    destroyTrack(id, track?.url);
    setTracks(prev => prev.filter(entry => entry.id !== id));
  };

  const updateTrack = (id: string, updates: Partial<AudioTrack>) => {
    setTracks(prev => prev.map(track => (track.id === id ? { ...track, ...updates } : track)));
  };

  const togglePlayback = (id: string) => {
    const wavesurfer = waveformRefs.current.get(id);
    if (!wavesurfer) return;
    wavesurfer.playPause();
    updateTrack(id, { playing: wavesurfer.isPlaying() });
  };

  const setVolume = (id: string, volume: number) => {
    const wavesurfer = waveformRefs.current.get(id);
    const track = tracks.find(entry => entry.id === id);
    wavesurfer?.setVolume(track?.muted ? 0 : volume);
    updateTrack(id, { volume });
  };

  const toggleMute = (id: string) => {
    const wavesurfer = waveformRefs.current.get(id);
    const track = tracks.find(entry => entry.id === id);
    if (!track) return;
    const muted = !track.muted;
    wavesurfer?.setVolume(muted ? 0 : track.volume);
    updateTrack(id, { muted });
  };

  // Create the waveform for tracks that do not have one yet.
  useEffect(() => {
    tracks.forEach(track => {
      if (waveformRefs.current.has(track.id)) return;
      const container = containerRefs.current.get(track.id);
      if (!container) return;

      const wavesurfer = WaveSurfer.create({
        container,
        waveColor: '#f3a3a5',
        progressColor: '#E44E51',
        cursorColor: '#7f1d1d',
        barWidth: 2,
        barRadius: 3,
        height: 60
      });

      wavesurfer.on('finish', () => updateTrack(track.id, { playing: false }));
      wavesurfer.on('pause', () => updateTrack(track.id, { playing: false }));
      wavesurfer.on('play', () => updateTrack(track.id, { playing: true }));
      wavesurfer.on('ready', () => wavesurfer.setVolume(track.muted ? 0 : track.volume));
      wavesurfer.on('error', () => setError(`Could not decode “${track.name}”.`));

      wavesurfer.load(track.url);
      waveformRefs.current.set(track.id, wavesurfer);
    });
  }, [tracks]);

  // Release every instance/URL when the panel unmounts.
  useEffect(() => {
    const instances = waveformRefs.current;
    return () => {
      instances.forEach((wavesurfer) => {
        try {
          wavesurfer.destroy();
        } catch {
          /* already destroyed */
        }
      });
      instances.clear();
    };
  }, []);

  const urlsRef = useRef<string[]>([]);
  urlsRef.current = tracks.map(track => track.url);
  useEffect(() => {
    const urls = urlsRef;
    return () => {
      urls.current.forEach(URL.revokeObjectURL);
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Advanced Audio Editor</h3>
        <div>
          <button
            onClick={() => document.getElementById('audio-input')?.click()}
            className="flex items-center space-x-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg
              hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25 transition-colors"
          >
            <Music className="w-4 h-4" />
            <span>Add Audio Track</span>
          </button>
          <input
            id="audio-input"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) addTrack(file);
            }}
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-[#E44E51] bg-[#E44E51]/10 border border-[#E44E51]/20 rounded-lg p-3">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {tracks.map(track => (
          <div key={track.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 min-w-0">
                <button
                  onClick={() => togglePlayback(track.id)}
                  title={track.playing ? 'Pause' : 'Play'}
                  className="p-1.5 hover:bg-gray-100 rounded"
                >
                  {track.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <span className="text-sm font-medium truncate">{track.name}</span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => toggleMute(track.id)}
                  title={track.muted ? 'Unmute' : 'Mute'}
                  className="p-1.5 hover:bg-gray-100 rounded"
                >
                  {track.muted ? (
                    <VolumeX className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={track.volume}
                  disabled={track.muted}
                  aria-label={`Volume for ${track.name}`}
                  onChange={(e) => setVolume(track.id, parseFloat(e.target.value))}
                  className="w-28 accent-[#E44E51] disabled:opacity-40"
                />
                <span className="text-xs text-gray-500 w-10 text-right tabular-nums">
                  {Math.round((track.muted ? 0 : track.volume) * 100)}%
                </span>
                <button
                  onClick={() => removeTrack(track.id)}
                  title="Remove track"
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div
              ref={(element) => {
                if (element) containerRefs.current.set(track.id, element);
              }}
            />
          </div>
        ))}

        {tracks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AudioWaveform className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No audio tracks yet. Add music or a voice-over to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};
