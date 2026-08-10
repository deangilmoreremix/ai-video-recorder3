import { defaultVideoEffects, type VideoEffectSettings } from '../store';

/**
 * Turns the editor's effect settings into things the browser and ffmpeg can
 * actually render:
 *
 *  - `buildCssFilter`      -> live preview on the `<video>` element
 *  - `buildOverlayStyle`   -> vignette/grain, which CSS filters cannot express
 *  - `buildFfmpegFilters`  -> the same look baked into an export
 *
 * Everything is derived from the same numbers, so what the user sees in the
 * player is what ends up in the exported file.
 */

const round = (value: number, digits = 3): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const clamp = (value: number, min: number, max: number): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

/** True when the settings differ from the neutral defaults. */
export const hasActiveEffects = (settings: VideoEffectSettings): boolean =>
  (Object.keys(defaultVideoEffects) as (keyof VideoEffectSettings)[]).some(
    (key) => Math.abs(settings[key] - defaultVideoEffects[key]) > 0.001
  );

/**
 * Combined brightness multiplier. `exposure` is a stop-like offset (-1..1) and
 * `gamma` shifts the midtones; CSS has no gamma filter, so it is folded into
 * brightness (a gamma > 1 darkens, < 1 brightens).
 */
const brightnessFactor = (s: VideoEffectSettings): number => {
  const exposure = 2 ** (s.exposure ?? 0);
  const gamma = 1 / clamp(s.gamma ?? 1, 0.2, 4);
  // Whites/blacks nudge the overall level as well.
  const level = 1 + (s.whites ?? 0) * 0.1 + (s.blacks ?? 0) * -0.1;
  return clamp(s.brightness * exposure * gamma * level, 0, 4);
};

const contrastFactor = (s: VideoEffectSettings): number => {
  // Clarity and the highlight/shadow pair act as local contrast in this UI.
  const clarity = 1 + ((s.clarity ?? 1) - 1) * 0.5;
  const tone = 1 + ((s.highlights ?? 0) - (s.shadows ?? 0)) * 0.15;
  return clamp(s.contrast * clarity * tone, 0, 4);
};

const saturationFactor = (s: VideoEffectSettings): number =>
  clamp(s.saturation * (1 + ((s.vibrance ?? 1) - 1) * 0.5), 0, 4);

/**
 * Temperature is a warm/cool tint (0.5 cool .. 1.5 warm). CSS cannot tint
 * channels directly, so it is approximated with a small hue rotation.
 */
const hueDegrees = (s: VideoEffectSettings): number => {
  const temperatureShift = ((s.temperature ?? 1) - 1) * -20;
  return clamp((s.hue ?? 0) + temperatureShift, -360, 360);
};

/** CSS `filter` value for the live preview ('' when nothing is active). */
export const buildCssFilter = (s: VideoEffectSettings): string => {
  const parts: string[] = [];

  const brightness = brightnessFactor(s);
  if (Math.abs(brightness - 1) > 0.001) parts.push(`brightness(${round(brightness)})`);

  const contrast = contrastFactor(s);
  if (Math.abs(contrast - 1) > 0.001) parts.push(`contrast(${round(contrast)})`);

  const saturation = saturationFactor(s);
  if (Math.abs(saturation - 1) > 0.001) parts.push(`saturate(${round(saturation)})`);

  const hue = hueDegrees(s);
  if (Math.abs(hue) > 0.001) parts.push(`hue-rotate(${round(hue, 1)}deg)`);

  if ((s.sepia ?? 0) > 0.001) parts.push(`sepia(${round(clamp(s.sepia, 0, 1))})`);
  if ((s.blur ?? 0) > 0.001) parts.push(`blur(${round(clamp(s.blur, 0, 20))}px)`);

  // `sharpness` > 1 cannot be done with CSS filters; a touch of extra contrast
  // is the closest honest approximation for the preview (the export uses a
  // real unsharp mask).
  if ((s.sharpness ?? 1) > 1.001) {
    parts.push(`contrast(${round(1 + (s.sharpness - 1) * 0.15)})`);
  }

  return parts.join(' ');
};

export interface EffectOverlayStyle {
  /** Radial darkening at the frame edges. */
  vignette: string | null;
  /** Tiled monochrome noise (film grain / sensor noise). */
  grain: { image: string; opacity: number } | null;
  /** Soft highlight glow. */
  bloomOpacity: number;
}

// A tiny tiling noise texture (base64 PNG would need generating at runtime, an
// SVG feTurbulence is resolution independent and costs nothing to ship).
const GRAIN_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>" +
  "<feColorMatrix type='saturate' values='0'/></filter>" +
  "<rect width='120' height='120' filter='url(%23n)' opacity='1'/></svg>\")";

/** Effects that need an overlay element instead of a CSS filter. */
export const buildOverlayStyle = (s: VideoEffectSettings): EffectOverlayStyle => {
  const vignetteAmount = clamp(s.vignette ?? 0, 0, 1);
  const grainAmount = clamp(Math.max(s.grain ?? 0, s.noise ?? 0), 0, 1);
  const bloom = clamp(s.bloom ?? 0, 0, 1);

  return {
    vignette:
      vignetteAmount > 0.001
        ? `radial-gradient(ellipse at center, rgba(0,0,0,0) ${round(
            55 - vignetteAmount * 25,
            1
          )}%, rgba(0,0,0,${round(vignetteAmount * 0.85)}) 100%)`
        : null,
    grain: grainAmount > 0.001 ? { image: GRAIN_SVG, opacity: round(grainAmount * 0.35) } : null,
    bloomOpacity: bloom > 0.001 ? round(bloom * 0.25) : 0
  };
};

/**
 * The same look as an ffmpeg filter chain, so an export matches the preview.
 * Only filters that are actually needed are emitted.
 */
export const buildFfmpegFilters = (s: VideoEffectSettings): string[] => {
  const filters: string[] = [];

  const eq: string[] = [];
  // ffmpeg's `brightness` is an additive offset (-1..1), the UI's is a factor.
  const brightnessOffset = clamp((s.brightness - 1) * 0.5 + (s.exposure ?? 0) * 0.5, -1, 1);
  if (Math.abs(brightnessOffset) > 0.001) eq.push(`brightness=${round(brightnessOffset)}`);
  if (Math.abs(contrastFactor(s) - 1) > 0.001) eq.push(`contrast=${round(clamp(contrastFactor(s), 0, 4))}`);
  if (Math.abs(saturationFactor(s) - 1) > 0.001) eq.push(`saturation=${round(clamp(saturationFactor(s), 0, 3))}`);
  if (Math.abs((s.gamma ?? 1) - 1) > 0.001) eq.push(`gamma=${round(clamp(s.gamma, 0.1, 10))}`);
  if (eq.length > 0) filters.push(`eq=${eq.join(':')}`);

  const hue = hueDegrees(s);
  if (Math.abs(hue) > 0.001) filters.push(`hue=h=${round(hue, 1)}`);

  if ((s.sepia ?? 0) > 0.001) {
    const a = round(clamp(s.sepia, 0, 1));
    // Standard sepia matrix, blended by `a` with the identity matrix.
    const mix = (sepiaValue: number, identity: number) => round(identity + (sepiaValue - identity) * a);
    filters.push(
      'colorchannelmixer=' +
        `rr=${mix(0.393, 1)}:rg=${mix(0.769, 0)}:rb=${mix(0.189, 0)}:` +
        `gr=${mix(0.349, 0)}:gg=${mix(0.686, 1)}:gb=${mix(0.168, 0)}:` +
        `br=${mix(0.272, 0)}:bg=${mix(0.534, 0)}:bb=${mix(0.131, 1)}`
    );
  }

  if ((s.blur ?? 0) > 0.001) filters.push(`gblur=sigma=${round(clamp(s.blur, 0, 20))}`);

  const sharpen = (s.sharpness ?? 1) - 1 + ((s.clarity ?? 1) - 1) * 0.5;
  if (sharpen > 0.001) filters.push(`unsharp=5:5:${round(clamp(sharpen, 0, 2))}`);

  if ((s.vignette ?? 0) > 0.001) {
    // Smaller angle = stronger darkening at the corners.
    const angle = round(Math.PI / 5 + (1 - clamp(s.vignette, 0, 1)) * (Math.PI / 5), 4);
    filters.push(`vignette=angle=${angle}`);
  }

  const grain = clamp(Math.max(s.grain ?? 0, s.noise ?? 0), 0, 1);
  if (grain > 0.001) filters.push(`noise=alls=${Math.round(grain * 40)}:allf=t+u`);

  return filters;
};

/* -------------------------------------------------------------------------- */
/*  Custom presets (persisted locally)                                        */
/* -------------------------------------------------------------------------- */

export interface StoredEffectPreset {
  name: string;
  settings: VideoEffectSettings;
  createdAt: number;
}

const PRESET_STORAGE_KEY = 'videoEffectPresets';
const MAX_PRESETS = 50;

const isEffectSettings = (value: unknown): value is VideoEffectSettings =>
  typeof value === 'object' &&
  value !== null &&
  (Object.keys(defaultVideoEffects) as string[]).every(
    (key) => typeof (value as Record<string, unknown>)[key] === 'number'
  );

/** Reads the user's saved presets. Never throws (private mode / bad JSON). */
export const loadEffectPresets = (): StoredEffectPreset[] => {
  try {
    const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is StoredEffectPreset =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as StoredEffectPreset).name === 'string' &&
          isEffectSettings((entry as StoredEffectPreset).settings)
      )
      .slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
};

const persist = (presets: StoredEffectPreset[]): StoredEffectPreset[] => {
  try {
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    /* storage unavailable - the presets stay in memory for this session */
  }
  return presets;
};

/** Adds (or replaces) a preset and returns the new list. */
export const saveEffectPreset = (
  name: string,
  settings: VideoEffectSettings
): StoredEffectPreset[] => {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return loadEffectPresets();

  const existing = loadEffectPresets().filter(
    (preset) => preset.name.toLowerCase() !== trimmed.toLowerCase()
  );
  const next = [{ name: trimmed, settings: { ...settings }, createdAt: Date.now() }, ...existing].slice(
    0,
    MAX_PRESETS
  );
  return persist(next);
};

/** Removes a preset by name and returns the new list. */
export const deleteEffectPreset = (name: string): StoredEffectPreset[] =>
  persist(loadEffectPresets().filter((preset) => preset.name !== name));
