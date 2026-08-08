import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Big, rarely-changing dependencies get their own long-cacheable chunk so they
 * are fetched only by the routes that actually need them (and stay cached
 * across app deploys). Order matters: the first match wins.
 *
 * `three` / `wavesurfer` / `tone` are declared up front so the heavy editor
 * widgets that use them never leak into a route chunk once they are wired up.
 */
const VENDOR_CHUNKS: Array<[chunk: string, matches: string[]]> = [
  // Every route pulls a handful of icons. Without this Rollup emits ~30
  // sub-kilobyte icon chunks; one shared chunk is cheaper to fetch and cache.
  ['icons', ['node_modules/lucide-react']],
  ['tfjs', ['node_modules/@tensorflow']],
  ['ffmpeg', ['node_modules/@ffmpeg']],
  ['lottie', ['node_modules/lottie-web']],
  ['gsap', ['node_modules/gsap']],
  ['three', ['node_modules/three', 'node_modules/@react-three']],
  ['wavesurfer', ['node_modules/wavesurfer.js']],
  ['tone', ['node_modules/tone']],
  ['supabase', ['node_modules/@supabase']],
  ['framer-motion', ['node_modules/framer-motion']],
  [
    'react-vendor',
    [
      'node_modules/react/',
      'node_modules/react-dom/',
      'node_modules/react-router-dom/',
      'node_modules/react-router/',
      'node_modules/scheduler/'
    ]
  ]
];

const manualChunks = (id: string): string | undefined => {
  const normalized = id.replace(/\\/g, '/');

  // Rollup's shared CommonJS interop helpers (`\0commonjsHelpers.js`) are used
  // by every CJS dependency. Left unassigned Rollup parks them inside whichever
  // vendor chunk it likes -- e.g. `lottie` -- which then becomes a static
  // dependency of the entry chunk. Pin them to `react-vendor`, which every
  // route needs anyway, so heavy vendors stay strictly on-demand.
  if (normalized.includes('commonjsHelpers')) return 'react-vendor';

  if (!normalized.includes('node_modules')) return undefined;

  for (const [chunk, matches] of VENDOR_CHUNKS) {
    if (matches.some((match) => normalized.includes(match))) return chunk;
  }

  return undefined;
};

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks
      }
    }
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    },
    watch: {
      usePolling: true
    }
  },
  preview: {
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});