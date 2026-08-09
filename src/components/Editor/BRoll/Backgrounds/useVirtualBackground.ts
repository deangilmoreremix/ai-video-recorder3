import { useCallback, useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import { getScratchCanvas } from '../../../AI/aiProcessing';
import type { ClipBackground } from '../../../../store/brollStore';

export type SegmenterStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CompositeResult {
  /** True when the segmenter found at least one person in the frame. */
  personFound: boolean;
  /** True when the frame was actually composited (model ready + mode active). */
  composited: boolean;
}

const IDLE_RESULT: CompositeResult = { personFound: false, composited: false };

/** Longest edge used for segmentation - keeps the model fast on 1080p sources. */
const ANALYSIS_MAX_EDGE = 384;

/** Fit a source rectangle into the canvas honouring the requested fit mode. */
const fitRect = (
  fit: ClipBackground['imageFit'],
  sw: number,
  sh: number,
  dw: number,
  dh: number
): { x: number; y: number; w: number; h: number } => {
  if (fit === 'stretch' || !sw || !sh) return { x: 0, y: 0, w: dw, h: dh };
  const scale = fit === 'cover' ? Math.max(dw / sw, dh / sh) : Math.min(dw / sw, dh / sh);
  const w = sw * scale;
  const h = sh * scale;
  return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
};

/**
 * Real virtual-background compositing built on the same MediaPipe Selfie
 * Segmentation model the rest of the AI pipeline uses
 * (`@tensorflow-models/body-segmentation`). The model is only downloaded once a
 * background mode that needs it is selected.
 */
export const useVirtualBackground = (enabled: boolean) => {
  const [status, setStatus] = useState<SegmenterStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const segmenterRef = useRef<bodySegmentation.BodySegmenter | null>(null);
  const busyRef = useRef(false);
  const loadingRef = useRef(false);
  const unmountedRef = useRef(false);

  useEffect(() => {
    if (!enabled || segmenterRef.current || loadingRef.current) return;

    loadingRef.current = true;

    const load = async () => {
      setStatus('loading');
      setError(null);
      try {
        await tf.ready();
        if (tf.getBackend() !== 'webgl') {
          try {
            const switched = await tf.setBackend('webgl');
            if (switched) await tf.ready();
          } catch {
            /* stay on whatever backend is available */
          }
        }
        const created = await bodySegmentation.createSegmenter(
          bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
          { runtime: 'tfjs', modelType: 'general' }
        );
        if (unmountedRef.current) {
          created.dispose();
          return;
        }
        segmenterRef.current = created;
        setStatus('ready');
      } catch (err) {
        console.error('Failed to load the body segmentation model:', err);
        if (!unmountedRef.current) {
          setError('Could not load the body-segmentation model.');
          setStatus('error');
        }
      } finally {
        loadingRef.current = false;
      }
    };

    void load();
  }, [enabled]);

  // Release the model when the panel goes away.
  useEffect(() => () => {
    unmountedRef.current = true;
    try {
      segmenterRef.current?.dispose();
    } catch (err) {
      console.warn('Failed to dispose the body segmentation model:', err);
    }
    segmenterRef.current = null;
  }, []);

  const composite = useCallback(
    async (
      video: HTMLVideoElement,
      canvas: HTMLCanvasElement,
      settings: ClipBackground,
      backgroundImage: HTMLImageElement | null
    ): Promise<CompositeResult> => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (video.readyState < 2 || !width || !height) return IDLE_RESULT;

      const ctx = canvas.getContext('2d');
      if (!ctx) return IDLE_RESULT;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';

      const segmenter = segmenterRef.current;
      if (settings.mode === 'none' || !segmenter || busyRef.current) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(video, 0, 0, width, height);
        return { personFound: false, composited: settings.mode === 'none' };
      }

      busyRef.current = true;
      try {
        const scale = Math.min(1, ANALYSIS_MAX_EDGE / Math.max(width, height));
        const aw = Math.max(16, Math.round(width * scale));
        const ah = Math.max(16, Math.round(height * scale));
        const analysis = getScratchCanvas('broll-vb-analysis', aw, ah);
        const aCtx = analysis.getContext('2d');
        if (!aCtx) return IDLE_RESULT;
        aCtx.drawImage(video, 0, 0, aw, ah);

        const segmentation = await segmenter.segmentPeople(analysis, {
          multiSegmentation: false,
          segmentBodyParts: false,
          segmentationThreshold: settings.threshold
        });

        if (segmentation.length === 0) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(video, 0, 0, width, height);
          return { personFound: false, composited: false };
        }

        // Person pixels opaque, background transparent.
        const maskImage = await bodySegmentation.toBinaryMask(
          segmentation,
          { r: 0, g: 0, b: 0, a: 255 },
          { r: 0, g: 0, b: 0, a: 0 },
          false,
          settings.threshold
        );

        const mask = getScratchCanvas('broll-vb-mask', maskImage.width, maskImage.height);
        const maskCtx = mask.getContext('2d');
        if (!maskCtx) return IDLE_RESULT;
        maskCtx.putImageData(maskImage, 0, 0);

        // 1. Background layer.
        ctx.clearRect(0, 0, width, height);
        if (settings.mode === 'blur') {
          const pad = Math.max(2, settings.blurAmount) * 2;
          ctx.save();
          ctx.filter = `blur(${Math.max(0, settings.blurAmount)}px)`;
          // Overdraw so the blur does not bleed transparent edges into frame.
          ctx.drawImage(video, -pad, -pad, width + pad * 2, height + pad * 2);
          ctx.restore();
          ctx.filter = 'none';
        } else if (settings.mode === 'image' && backgroundImage?.complete && backgroundImage.naturalWidth) {
          const rect = fitRect(
            settings.imageFit,
            backgroundImage.naturalWidth,
            backgroundImage.naturalHeight,
            width,
            height
          );
          ctx.fillStyle = settings.color;
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(backgroundImage, rect.x, rect.y, rect.w, rect.h);
        } else {
          ctx.fillStyle = settings.color;
          ctx.fillRect(0, 0, width, height);
        }

        // 2. Person layer: the source frame keyed by the (feathered) mask.
        const person = getScratchCanvas('broll-vb-person', width, height);
        const personCtx = person.getContext('2d');
        if (personCtx) {
          personCtx.setTransform(1, 0, 0, 1, 0, 0);
          personCtx.globalCompositeOperation = 'source-over';
          personCtx.filter = 'none';
          personCtx.clearRect(0, 0, width, height);
          personCtx.drawImage(video, 0, 0, width, height);
          personCtx.globalCompositeOperation = 'destination-in';
          if (settings.edgeSoftness > 0) {
            personCtx.filter = `blur(${settings.edgeSoftness}px)`;
          }
          personCtx.drawImage(mask, 0, 0, width, height);
          personCtx.filter = 'none';
          personCtx.globalCompositeOperation = 'source-over';
          ctx.drawImage(person, 0, 0);
        }

        return { personFound: true, composited: true };
      } catch (err) {
        console.error('Virtual background compositing failed:', err);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(video, 0, 0, width, height);
        return IDLE_RESULT;
      } finally {
        busyRef.current = false;
      }
    },
    []
  );

  return { status, error, composite };
};
