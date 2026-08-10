import React, { useCallback, useMemo, useState } from 'react';
import { Brain, Check, Loader, Scan, Sparkles, Tag, Wand2 } from 'lucide-react';
import {
  computeFrameStats,
  computeHistogram,
  getScratchCanvas,
  histogramDistance,
  toGrayscale,
  type FrameStats
} from '../../AI/aiProcessing';
import { useBRollStore, type BRollClip } from '../../../store/brollStore';
import { Tooltip } from '../../ui/Tooltip';

interface AIFeaturesProps {
  /** Clip the analysis runs on - normally the current selection. */
  clip: BRollClip | null;
}

interface AnalysisResult {
  frames: number;
  brightness: number;
  contrast: number;
  motion: number;
  scenes: number;
  warmth: number;
  tags: string[];
  suggestedFilters: BRollClip['filters'];
}

/** Longest edge used while analysing - keeps a 4K source responsive. */
const ANALYSIS_EDGE = 240;
const SAMPLE_COUNT = 12;
/** Histogram distance above which two samples are considered different scenes. */
const SCENE_THRESHOLD = 12;

const seekTo = (video: HTMLVideoElement, time: number): Promise<void> =>
  new Promise((resolve) => {
    const done = () => {
      video.removeEventListener('seeked', done);
      resolve();
    };
    video.addEventListener('seeked', done, { once: true });
    try {
      video.currentTime = time;
    } catch {
      done();
    }
  });

const loadVideo = (url: string): Promise<HTMLVideoElement> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error('The clip could not be decoded for analysis.'));
    video.src = url;
  });

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image could not be decoded for analysis.'));
    image.src = url;
  });

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Turn the measured statistics into human tags + a corrective filter set. */
const summarise = (
  samples: FrameStats[],
  motion: number,
  scenes: number,
  frames: number
): AnalysisResult => {
  const mean = samples.reduce((sum, stat) => sum + stat.mean, 0) / (samples.length || 1);
  const contrast =
    samples.reduce((sum, stat) => sum + (stat.whitePoint - stat.blackPoint), 0) /
    (samples.length || 1);
  const warmth =
    samples.reduce((sum, stat) => sum + (stat.meanR - stat.meanB), 0) / (samples.length || 1);

  const tags: string[] = [];
  if (mean < 80) tags.push('dark');
  else if (mean > 175) tags.push('bright');
  else tags.push('balanced-exposure');

  if (contrast < 110) tags.push('low-contrast');
  if (warmth > 14) tags.push('warm');
  else if (warmth < -14) tags.push('cool');

  if (motion > 18) tags.push('high-motion');
  else if (motion < 5) tags.push('static');

  if (scenes > 1) tags.push(`${scenes}-scenes`);

  // Corrective filters: nudge the mid-tone toward 128 and open up flat footage.
  const brightness = Math.min(1.6, Math.max(0.6, mean > 0 ? 128 / mean : 1));
  const contrastGain = Math.min(1.6, Math.max(0.8, 150 / Math.max(40, contrast)));
  const saturation = warmth > 20 || warmth < -20 ? 0.95 : 1.1;

  return {
    frames,
    brightness: Math.round(mean),
    contrast: Math.round(contrast),
    motion: round2(motion),
    scenes,
    warmth: Math.round(warmth),
    tags,
    suggestedFilters: {
      brightness: round2(brightness),
      contrast: round2(contrastGain),
      saturation: round2(saturation),
      blur: 0
    }
  };
};

/**
 * Real (non-simulated) analysis of a B-Roll clip: frames are decoded, sampled
 * and measured with the same image-processing helpers the AI pipeline uses, and
 * the results can be written straight back onto the clip (tags + colour
 * filters, which the exporter bakes into the render).
 */
export const AIFeatures: React.FC<AIFeaturesProps> = ({ clip }) => {
  const updateClip = useBRollStore((state) => state.updateClip);

  const [isAnalysing, setIsAnalysing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  const canAnalyse = Boolean(clip && (clip.type === 'video' || clip.type === 'image'));

  const analyse = useCallback(async () => {
    if (!clip || !canAnalyse) return;
    setIsAnalysing(true);
    setProgress(0);
    setError(null);
    setResult(null);
    setApplied(null);

    try {
      const stats: FrameStats[] = [];
      let previousHistogram: number[] | null = null;
      let previousGray: Uint8Array | null = null;
      let motionSum = 0;
      let motionCount = 0;
      let scenes = 1;

      const measure = (canvas: HTMLCanvasElement, width: number, height: number) => {
        stats.push(computeFrameStats(canvas, width, height));

        const histogram = computeHistogram(canvas, width, height);
        if (previousHistogram) {
          const total = histogram.reduce((sum, value) => sum + value, 0) || 1;
          const normalised = histogram.map((value) => (value / total) * 1000);
          const previousTotal = previousHistogram.reduce((sum, value) => sum + value, 0) || 1;
          const previousNormalised = previousHistogram.map((value) => (value / previousTotal) * 1000);
          if (histogramDistance(normalised, previousNormalised) > SCENE_THRESHOLD) scenes += 1;
        }
        previousHistogram = histogram;

        const gray = toGrayscale(canvas, width, height);
        if (previousGray && previousGray.length === gray.length) {
          let diff = 0;
          for (let i = 0; i < gray.length; i += 1) diff += Math.abs(gray[i] - previousGray[i]);
          motionSum += diff / gray.length;
          motionCount += 1;
        }
        previousGray = gray;
      };

      if (clip.type === 'image') {
        const image = await loadImage(clip.url);
        const scale = Math.min(1, ANALYSIS_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(16, Math.round(image.naturalWidth * scale));
        const height = Math.max(16, Math.round(image.naturalHeight * scale));
        const canvas = getScratchCanvas('broll-analysis', width, height);
        canvas.getContext('2d', { willReadFrequently: true })?.drawImage(image, 0, 0, width, height);
        measure(canvas, width, height);
        setProgress(100);
        setResult(summarise(stats, 0, 1, 1));
        return;
      }

      const video = await loadVideo(clip.url);
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      if (!duration) throw new Error('The clip has no readable duration.');

      const scale = Math.min(1, ANALYSIS_EDGE / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(16, Math.round((video.videoWidth || 320) * scale));
      const height = Math.max(16, Math.round((video.videoHeight || 180) * scale));
      const canvas = getScratchCanvas('broll-analysis', width, height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not create an analysis canvas.');

      for (let index = 0; index < SAMPLE_COUNT; index += 1) {
        const time = (duration * (index + 0.5)) / SAMPLE_COUNT;
        await seekTo(video, time);
        ctx.drawImage(video, 0, 0, width, height);
        measure(canvas, width, height);
        setProgress(Math.round(((index + 1) / SAMPLE_COUNT) * 100));
      }

      video.src = '';
      setResult(summarise(stats, motionCount ? motionSum / motionCount : 0, scenes, SAMPLE_COUNT));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The analysis failed.');
    } finally {
      setIsAnalysing(false);
    }
  }, [canAnalyse, clip]);

  const applyTags = useCallback(() => {
    if (!clip || !result) return;
    const tags = Array.from(new Set([...clip.tags, ...result.tags]));
    updateClip(clip.id, { tags });
    setApplied('Tags written to the clip');
  }, [clip, result, updateClip]);

  const applyFilters = useCallback(() => {
    if (!clip || !result) return;
    updateClip(clip.id, { filters: { ...clip.filters, ...result.suggestedFilters } });
    setApplied('Colour correction applied (baked in on export)');
  }, [clip, result, updateClip]);

  const metrics = useMemo(() => {
    if (!result) return [];
    return [
      { label: 'Frames sampled', value: `${result.frames}` },
      { label: 'Mean luminance', value: `${result.brightness}/255` },
      { label: 'Dynamic range', value: `${result.contrast}` },
      { label: 'Motion', value: result.motion.toFixed(1) },
      { label: 'Scenes detected', value: `${result.scenes}` },
      { label: 'Colour balance', value: result.warmth > 0 ? `+${result.warmth} warm` : `${result.warmth} cool` }
    ];
  }, [result]);

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium flex items-center">
            <Brain className="w-4 h-4 mr-2 text-[#E44E51]" />
            Clip analysis
          </h4>
          <p className="text-sm text-gray-500">
            Decodes the selected clip, measures exposure, contrast, motion and scene changes, then
            writes the findings back as tags or colour corrections.
          </p>
        </div>
        <Tooltip
          content={
            canAnalyse
              ? 'Sample and measure the selected clip'
              : 'Select a video or image clip in the list first'
          }
        >
          <button
            onClick={analyse}
            disabled={!canAnalyse || isAnalysing}
            className="flex items-center space-x-2 px-4 py-2 text-sm rounded-lg bg-[#E44E51] text-white
              hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25 disabled:bg-gray-200
              disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isAnalysing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Analysing… {progress}%</span>
              </>
            ) : (
              <>
                <Scan className="w-4 h-4" />
                <span>Analyse clip</span>
              </>
            )}
          </button>
        </Tooltip>
      </div>

      {!clip && <p className="text-sm text-gray-500">No clip selected.</p>}
      {clip && !canAnalyse && (
        <p className="text-sm text-gray-500">
          “{clip.name}” is audio only, so there is nothing to look at.
        </p>
      )}
      {error && <p className="text-sm text-[#E44E51]">{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metrics.map(({ label, value }) => (
              <div key={label} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {result.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded-full bg-[#E44E51]/10 text-[#E44E51]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={applyTags}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Tag className="w-4 h-4" />
              <span>Apply tags</span>
            </button>
            <Tooltip
              content={`brightness ×${result.suggestedFilters.brightness}, contrast ×${result.suggestedFilters.contrast}, saturation ×${result.suggestedFilters.saturation}`}
            >
              <button
                onClick={applyFilters}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Wand2 className="w-4 h-4" />
                <span>Apply colour correction</span>
              </button>
            </Tooltip>
            {applied && (
              <span className="flex items-center text-sm text-emerald-600">
                <Check className="w-4 h-4 mr-1" />
                {applied}
              </span>
            )}
          </div>

          <p className="flex items-start text-xs text-gray-400">
            <Sparkles className="w-3 h-3 mr-1 mt-0.5" />
            Measurements come from real pixel statistics of decoded frames - nothing here is faked.
          </p>
        </div>
      )}
    </div>
  );
};
