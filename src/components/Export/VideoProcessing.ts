import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export interface ProcessingOptions {
  format: string;
  codec: string;
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  bitrate: {
    video: number;
    audio: number;
  };
  quality: number;
  audioCodec: string;
  audioChannels: number;
  startTime?: number;
  endTime?: number;
  stabilize?: boolean;
  denoise?: boolean;
  enhanceColors?: boolean;
  useGpu?: boolean;
}

export const processVideo = async (
  blob: Blob,
  options: ProcessingOptions,
  onProgress: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();

  const inputFileName = 'input.webm';
  const outputFileName = `output.${options.format}`;

  await ffmpeg.writeFile(inputFileName, await fetchFile(blob));

  let filters: string[] = [];
  let args: string[] = ['-i', inputFileName];

  // Video codec
  if (options.codec) {
    args.push('-c:v', options.codec);
  }

  // Resolution
  if (options.resolution) {
    filters.push(`scale=${options.resolution.width}:${options.resolution.height}`);
  }

  // Frame rate
  if (options.fps) {
    args.push('-r', options.fps.toString());
  }

  // Video bitrate
  if (options.bitrate?.video) {
    args.push('-b:v', `${options.bitrate.video}k`);
  }

  // Audio settings
  if (options.audioCodec) {
    args.push('-c:a', options.audioCodec);
  }
  if (options.bitrate?.audio) {
    args.push('-b:a', `${options.bitrate.audio}k`);
  }
  if (options.audioChannels) {
    args.push('-ac', options.audioChannels.toString());
  }

  // Time range
  if (options.startTime !== undefined) {
    args.push('-ss', options.startTime.toString());
  }
  if (options.endTime !== undefined) {
    args.push('-t', (options.endTime - (options.startTime || 0)).toString());
  }

  // Video enhancements
  if (options.stabilize) {
    filters.push('deshake=x=64:y=64:rx=32:ry=32');
  }
  if (options.denoise) {
    filters.push('nlmeans=10:7:5:3:3');
  }
  if (options.enhanceColors) {
    filters.push('eq=contrast=1.1:brightness=0.05:saturation=1.2');
  }

  // Apply filters
  if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }

  // Quality
  if (options.quality) {
    args.push('-crf', (51 - Math.floor(options.quality * 0.51)).toString());
  }

  // Output
  args.push(outputFileName);

  // Progress tracking
  ffmpeg.on('progress', ({ progress }) => {
    onProgress(Math.round(progress * 100));
  });

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputFileName);
  return new Blob([data], { type: `video/${options.format}` });
};

export const generateGif = async (
  blob: Blob,
  options: {
    fps: number;
    quality: number;
    width: number;
    dither: boolean;
    optimize: boolean;
    startTime: number;
    endTime: number;
    loop: boolean;
  },
  onProgress: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();

  const inputFileName = 'input.webm';
  const outputFileName = 'output.gif';

  await ffmpeg.writeFile(inputFileName, await fetchFile(blob));

  const filters = [
    `fps=${options.fps}`,
    `scale=${options.width}:-1:flags=lanczos`,
    options.dither ? 'paletteuse=dither=floyd_steinberg' : 'paletteuse'
  ];

  const args = [
    '-i', inputFileName,
    '-ss', options.startTime.toString(),
    '-t', (options.endTime - options.startTime).toString(),
    '-vf', filters.join(','),
    '-loop', options.loop ? '0' : '-1'
  ];

  if (options.optimize) {
    args.push('-gifflags', '+transdiff');
  }

  args.push(outputFileName);

  ffmpeg.on('progress', ({ progress }) => {
    onProgress(Math.round(progress * 100));
  });

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputFileName);
  return new Blob([data], { type: 'image/gif' });
};