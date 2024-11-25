import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Volume2, VolumeX, Music, Mic, Waveform } from 'lucide-react';

interface AudioTrack {
  id: string;
  url: string;
  volume: number;
  muted: boolean;
}

export const AdvancedAudioEditor: React.FC = () => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const waveformRefs = useRef<Map<string, WaveSurfer>>(new Map());

  const addTrack = async (file: File) => {
    const url = URL.createObjectURL(file);
    const newTrack: AudioTrack = {
      id: Math.random().toString(36).substr(2, 9),
      url,
      volume: 1,
      muted: false,
    };
    setTracks([...tracks, newTrack]);
  };

  const removeTrack = (id: string) => {
    const wavesurfer = waveformRefs.current.get(id);
    if (wavesurfer) {
      wavesurfer.destroy();
      waveformRefs.current.delete(id);
    }
    setTracks(tracks.filter(track => track.id !== id));
  };

  useEffect(() => {
    tracks.forEach(track => {
      if (!waveformRefs.current.has(track.id)) {
        const wavesurfer = WaveSurfer.create({
          container: `#waveform-${track.id}`,
          waveColor: '#4f46e5',
          progressColor: '#818cf8',
          cursorColor: '#312e81',
          barWidth: 2,
          barRadius: 3,
          responsive: true,
          height: 60,
        });
        wavesurfer.load(track.url);
        waveformRefs.current.set(track.id, wavesurfer);
      }
    });
  }, [tracks]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Advanced Audio Editor</h3>
        <button
          onClick={() => document.getElementById('audio-input')?.click()}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Music className="w-4 h-4" />
          <span>Add Audio Track</span>
        </button>
        <input
          id="audio-input"
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && addTrack(e.target.files[0])}
        />
      </div>

      <div className="space-y-4">
        {tracks.map(track => (
          <div key={track.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const wavesurfer = waveformRefs.current.get(track.id);
                    wavesurfer?.playPause();
                  }}
                >
                  <Waveform className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">Track {track.id}</span>
              </div>
              <button
                onClick={() => removeTrack(track.id)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
            <div id={`waveform-${track.id}`} />
          </div>
        ))}
      </div>
    </div>
  );
};