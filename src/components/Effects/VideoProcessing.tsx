import React, { useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export const VideoProcessing: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const processVideo = async () => {
    setStatus('loading');
    const ffmpeg = new FFmpeg();
    try {
      await ffmpeg.load();
      const videoData = await fetchFile(videoUrl);
      await ffmpeg.writeFile('input.mp4', videoData);
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', 'colorbalance=rs=0.1:gs=0.1:bs=0.1',
        'output.mp4'
      ]);
      const data = await ffmpeg.readFile('output.mp4');
      setOutputUrl(URL.createObjectURL(new Blob([data as Uint8Array], { type: 'video/mp4' })));
      setStatus('done');
    } catch (err) {
      console.error('Video processing failed:', err);
      setStatus('error');
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={processVideo}
        disabled={status === 'loading'}
        className="px-4 py-2 bg-[#E44E51] text-white rounded-lg shadow hover:bg-[#D43B3E] disabled:opacity-50"
      >
        {status === 'loading' ? 'Processing...' : 'Process Video'}
      </button>
      {outputUrl && (
        <a href={outputUrl} download className="block text-sm text-blue-600 underline">
          Download processed video
        </a>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-500">Processing failed. Check the console for details.</p>
      )}
    </div>
  );
};
