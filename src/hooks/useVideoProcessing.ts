import { useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export const useVideoProcessing = () => {
  const processVideo = useCallback(async (
    videoBlob: Blob,
    options: {
      format?: string;
      quality?: number;
      filters?: string[];
    }
  ) => {
    const ffmpeg = new FFmpeg();
    
    try {
      await ffmpeg.load();
      await ffmpeg.writeFile('input.webm', await fetchFile(videoBlob));

      const filters = options.filters?.join(',') || '';
      const outputName = `output.${options.format || 'mp4'}`;

      await ffmpeg.exec([
        '-i', 'input.webm',
        ...(filters ? ['-vf', filters] : []),
        ...(options.quality ? ['-crf', options.quality.toString()] : []),
        outputName
      ]);

      const data = await ffmpeg.readFile(outputName);
      return new Blob([data], { type: `video/${options.format || 'mp4'}` });
    } catch (err) {
      console.error('Video processing failed:', err);
      throw err;
    }
  }, []);

  return { processVideo };
};