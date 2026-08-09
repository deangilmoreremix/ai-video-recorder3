import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Film, Pause, Play, Wand2 } from 'lucide-react';
import { useBRollStore, type ClipTransition } from '../../../../store/brollStore';
import { TransitionEffects } from '../../../Transitions/TransitionEffects';
import { ClipSelector } from '../ClipSelector';
import { drawTransitionFrame, easeInOut, type TransitionSource } from './transitionRender';

/** Seconds the preview holds each clip before/after the transition plays. */
const HOLD_BEFORE = 0.4;
const HOLD_AFTER = 0.8;

export const Transitions: React.FC = () => {
  const clips = useBRollStore((state) => state.clips);
  const selectedClipId = useBRollStore((state) => state.selectedClipId);
  const setClipTransition = useBRollStore((state) => state.setClipTransition);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fromVideoRef = useRef<HTMLVideoElement>(null);
  const toVideoRef = useRef<HTMLVideoElement>(null);
  const draftRef = useRef<ClipTransition | null>(null);
  const cycleStartRef = useRef<number>(0);

  const [draft, setDraft] = useState<ClipTransition | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const videoClips = useMemo(() => clips.filter((clip) => clip.type === 'video'), [clips]);
  const clipIndex = videoClips.findIndex((clip) => clip.id === selectedClipId);
  const clip = clipIndex >= 0 ? videoClips[clipIndex] : null;
  const previousClip = clipIndex > 0 ? videoClips[clipIndex - 1] : null;

  // The draft always starts from whatever is persisted on the clip.
  useEffect(() => {
    setDraft(clip ? { ...clip.transition } : null);
  }, [clip]);

  useEffect(() => {
    draftRef.current = draft;
    cycleStartRef.current = 0;
  }, [draft]);

  const isSaved =
    Boolean(clip && draft) &&
    clip?.transition.type === draft?.type &&
    Math.abs((clip?.transition.duration ?? 0) - (draft?.duration ?? 0)) < 0.001;

  // Preview loop: renders the actual transition maths onto the canvas.
  useEffect(() => {
    if (!clip) return;

    let stopped = false;
    let frame = 0;

    const tick = (now: number) => {
      if (stopped) return;

      const canvas = canvasRef.current;
      const toVideo = toVideoRef.current;
      const fromVideo = fromVideoRef.current;
      const transition = draftRef.current;

      if (canvas && toVideo && transition) {
        const width = toVideo.videoWidth || 1280;
        const height = toVideo.videoHeight || 720;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (!cycleStartRef.current) cycleStartRef.current = now;
          const cycle = HOLD_BEFORE + transition.duration + HOLD_AFTER;
          const elapsed = ((now - cycleStartRef.current) / 1000) % cycle;
          const raw =
            elapsed < HOLD_BEFORE
              ? 0
              : elapsed > HOLD_BEFORE + transition.duration
                ? 1
                : (elapsed - HOLD_BEFORE) / transition.duration;
          const eased = easeInOut(raw);

          const fromSource: TransitionSource | null =
            fromVideo && fromVideo.readyState >= 2 && fromVideo.videoWidth
              ? { image: fromVideo, width: fromVideo.videoWidth, height: fromVideo.videoHeight }
              : null;
          const toSource: TransitionSource | null =
            toVideo.readyState >= 2 && toVideo.videoWidth
              ? { image: toVideo, width: toVideo.videoWidth, height: toVideo.videoHeight }
              : null;

          drawTransitionFrame(ctx, fromSource, toSource, transition.type, eased, width, height);
          setProgress((prev) => (Math.abs(prev - raw) > 0.05 ? raw : prev));
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [clip]);

  // Keep both sources rolling so the preview shows real motion.
  useEffect(() => {
    const videos = [fromVideoRef.current, toVideoRef.current].filter(
      (video): video is HTMLVideoElement => Boolean(video)
    );
    videos.forEach((video) => {
      if (isPlaying) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [isPlaying, clip?.id, previousClip?.id]);

  const applyTransition = useCallback(() => {
    if (!clip || !draft) return;
    setClipTransition(clip.id, draft);
  }, [clip, draft, setClipTransition]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Transitions</h3>
        <p className="text-sm text-gray-500">
          Choose how the selected clip enters from the clip before it. The preview renders the real
          transition maths, and applying it stores the transition on the clip.
        </p>
      </div>

      <ClipSelector
        label="Incoming clip"
        renderBadge={(clipId) => {
          const target = clips.find((entry) => entry.id === clipId);
          if (!target) return null;
          return (
            <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-black/70 text-white">
              {target.transition.type}
            </span>
          );
        }}
      />

      {!clip ? (
        <div className="p-8 text-center text-gray-500 border border-dashed rounded-lg">
          <Wand2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">Select a video clip</p>
          <p className="text-sm">
            Transitions are stored per clip and describe how that clip comes in.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Film className="w-4 h-4 text-gray-400" />
              <span className="truncate max-w-[10rem]">{previousClip?.name ?? 'Black'}</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="truncate max-w-[10rem] font-medium">{clip.name}</span>
            </div>

            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {previousClip && (
                <video
                  key={previousClip.id}
                  ref={fromVideoRef}
                  src={previousClip.url}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                />
              )}
              <video
                key={clip.id}
                ref={toVideoRef}
                src={clip.url}
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
              />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain" />
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsPlaying((prev) => !prev)}
                className="p-2 bg-[#E44E51] text-white rounded-full hover:bg-[#D43B3E]
                  shadow-lg hover:shadow-[#E44E51]/25"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E44E51] transition-[width] duration-75"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-28 text-right">
                {draft ? `${draft.type} · ${draft.duration.toFixed(1)}s` : 'no transition'}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-sm">
              {isSaved ? (
                <span className="flex items-center text-emerald-600">
                  <Check className="w-4 h-4 mr-1" />
                  Saved on “{clip.name}”
                </span>
              ) : (
                <span className="text-amber-600">Unsaved changes — hit Apply Transition</span>
              )}
            </div>
          </div>

          <TransitionEffects
            value={draft}
            onChange={setDraft}
            onApply={applyTransition}
            onReset={() => setDraft({ type: 'fade', duration: 0.5 })}
            description={`Applied when “${clip.name}” comes in from ${
              previousClip ? `“${previousClip.name}”` : 'black'
            }.`}
            applyLabel="Apply to clip"
          />
        </div>
      )}
    </div>
  );
};
