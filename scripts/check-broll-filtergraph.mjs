/**
 * Smoke check for the B-Roll export filter graphs.
 *
 *   node scripts/check-broll-filtergraph.mjs
 *
 * `src/components/Export/brollFilterGraph.ts` is deliberately pure (no DOM, no
 * ffmpeg import) so the whole command line for a sequence of clips, overlays,
 * backgrounds and transitions can be built - and asserted on - outside the
 * browser. This catches broken labels/quoting long before an export runs.
 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const outDir = mkdtempSync(join(tmpdir(), 'broll-graph-'));
const outFile = join(outDir, 'brollFilterGraph.mjs');

await build({
  entryPoints: ['src/components/Export/brollFilterGraph.ts'],
  outfile: outFile,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  logLevel: 'silent'
});

const graph = await import(pathToFileURL(outFile).href);

const overlay = (patch = {}) => ({
  id: 'ov',
  type: 'text',
  name: 'Overlay',
  text: 'Hello',
  imageUrl: null,
  fontFamily: 'Inter',
  fontSize: 8,
  fontWeight: 'bold',
  color: '#FFFFFF',
  backgroundColor: null,
  shadow: true,
  position: { x: 0.5, y: 0.8 },
  scale: 1,
  rotation: 0,
  opacity: 1,
  startTime: 0,
  endTime: 4,
  fadeDuration: 0.3,
  visible: true,
  ...patch
});

const background = (patch = {}) => ({
  mode: 'none',
  color: '#0F172A',
  imageUrl: null,
  imageFit: 'cover',
  blurAmount: 12,
  edgeSoftness: 4,
  threshold: 0.6,
  ...patch
});

const failures = [];
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  FAIL ${name}: ${error.message}`);
  }
};

/** Every `[label]` that is produced must be consumed exactly once. */
const assertGraphIsWellFormed = (args) => {
  const index = args.indexOf('-filter_complex');
  assert.ok(index > 0, 'the command must contain a filter graph');
  const filterComplex = args[index + 1];
  assert.equal(typeof filterComplex, 'string');
  assert.ok(filterComplex.length > 0, 'the filter graph must not be empty');
  assert.ok(!filterComplex.includes(';;'), 'the filter graph must not contain empty chains');
  assert.ok(!/\[\]/.test(filterComplex), 'the filter graph must not contain empty labels');

  const produced = new Set();
  const consumed = [];
  for (const chain of filterComplex.split(';')) {
    const inputs = chain.match(/^(\[[^\]]+\])+/)?.[0] ?? '';
    const outputs = chain.match(/(\[[^\]]+\])+$/)?.[0] ?? '';
    for (const label of inputs.match(/\[[^\]]+\]/g) ?? []) consumed.push(label);
    for (const label of outputs.match(/\[[^\]]+\]/g) ?? []) {
      assert.ok(!produced.has(label), `label ${label} is produced twice`);
      produced.add(label);
    }
  }

  for (const label of consumed) {
    // Either an ffmpeg input (`[0:v]`) or a label produced earlier.
    assert.ok(
      /^\[\d+:[av](:\d+)?\]$/.test(label) || produced.has(label),
      `label ${label} is consumed but never produced`
    );
  }

  for (const mapped of args.filter((arg, position) => args[position - 1] === '-map')) {
    if (mapped.startsWith('[')) {
      assert.ok(produced.has(mapped), `mapped label ${mapped} does not exist`);
    }
  }

  // Balanced quotes keep the graph parseable.
  const quotes = (filterComplex.match(/'/g) ?? []).length;
  assert.equal(quotes % 2, 0, 'unbalanced quotes in the filter graph');
  return filterComplex;
};

console.log('B-Roll filter graph checks');

check('transition map covers every store transition', () => {
  const types = [
    'fade',
    'dissolve',
    'slide-left',
    'slide-right',
    'slide-up',
    'slide-down',
    'wipe',
    'cross-zoom',
    'rotate'
  ];
  const supported = new Set([
    'fade',
    'dissolve',
    'slideleft',
    'slideright',
    'slideup',
    'slidedown',
    'wipeleft',
    'zoomin',
    'radial'
  ]);
  for (const type of types) {
    const mapped = graph.TRANSITION_TO_XFADE[type];
    assert.ok(mapped, `${type} has no xfade mapping`);
    assert.ok(supported.has(mapped), `${type} maps to unknown xfade "${mapped}"`);
  }
  assert.equal(Object.keys(graph.TRANSITION_TO_XFADE).length, types.length);
});

check('plain clip renders without effects', () => {
  const args = graph.buildClipPassArgs({
    width: 1280,
    height: 720,
    fps: 30,
    duration: 4,
    source: { file: 'a.mp4', still: false, hasAudio: true },
    output: 'out.mp4'
  });
  const filterComplex = assertGraphIsWellFormed(args);
  assert.ok(filterComplex.includes('scale=1280:720'), 'clips are normalised to the frame size');
  assert.ok(filterComplex.includes('[0:a]'), 'real audio is used when present');
});

check('silent clip falls back to the generated silence input', () => {
  const args = graph.buildClipPassArgs({
    width: 1280,
    height: 720,
    fps: 30,
    duration: 4,
    source: { file: 'a.mp4', still: false, hasAudio: false },
    output: 'out.mp4'
  });
  const filterComplex = assertGraphIsWellFormed(args);
  assert.ok(args.join(' ').includes('anullsrc'), 'a silence source is declared');
  assert.ok(!filterComplex.includes('[0:a]'), 'the missing audio stream is never mapped');
});

check('colour background composites a colour plate', () => {
  const args = graph.buildClipPassArgs({
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 6,
    source: { file: 'a.mp4', still: false, hasAudio: true },
    background: background({ mode: 'color', color: '#E44E51' }),
    output: 'out.mp4'
  });
  const filterComplex = assertGraphIsWellFormed(args);
  assert.ok(filterComplex.includes('color=c=0xE44E51'), 'the colour is converted for ffmpeg');
  assert.ok(filterComplex.includes('overlay='), 'the clip is composited over the plate');
});

check('blur background blurs a cover-scaled copy of the clip', () => {
  const args = graph.buildClipPassArgs({
    width: 1280,
    height: 720,
    fps: 30,
    duration: 6,
    source: { file: 'a.mp4', still: false, hasAudio: true },
    background: background({ mode: 'blur', blurAmount: 20 }),
    output: 'out.mp4'
  });
  const filterComplex = assertGraphIsWellFormed(args);
  assert.ok(filterComplex.includes('split=2'), 'the clip is split into plate + foreground');
  assert.ok(filterComplex.includes('boxblur=luma_radius=20'), 'the blur strength is honoured');
});

check('image background is declared as a looped still input', () => {
  const args = graph.buildClipPassArgs({
    width: 1280,
    height: 720,
    fps: 30,
    duration: 6,
    source: { file: 'a.mp4', still: false, hasAudio: true },
    background: background({ mode: 'image', imageUrl: 'blob:x', imageFit: 'contain' }),
    backgroundFile: 'bg.png',
    output: 'out.mp4'
  });
  const filterComplex = assertGraphIsWellFormed(args);
  assert.ok(args.join(' ').includes('-loop 1'), 'still inputs are looped');
  assert.ok(filterComplex.includes('force_original_aspect_ratio=decrease'), 'contain fit is applied');
});

check('image background without a picture degrades to a plain letterbox', () => {
  const args = graph.buildClipPassArgs({
    width: 1280,
    height: 720,
    fps: 30,
    duration: 3,
    source: { file: 'a.mp4', still: false, hasAudio: false },
    background: background({ mode: 'image' }),
    backgroundFile: null,
    output: 'out.mp4'
  });
  const filterComplex = assertGraphIsWellFormed(args);
  assert.ok(filterComplex.includes('pad=1280:720'), 'falls back to padding on black');
});

check('text overlays are drawn with drawtext, timing and fades', () => {
  const args = graph.buildClipPassArgs({
    width: 1280,
    height: 720,
    fps: 30,
    duration: 8,
    source: { file: 'a.mp4', still: false, hasAudio: true },
    overlays: [
      {
        kind: 'text',
        overlay: overlay({ startTime: 1, endTime: 5, fadeDuration: 0.5, backgroundColor: '#000000' }),
        textFile: 'text0.txt',
        fontFile: 'font.ttf'
      }
    ],
    output: 'out.mp4'
  });
  const filterComplex = assertGraphIsWellFormed(args);
  assert.ok(filterComplex.includes('drawtext='), 'drawtext is used for text');
  assert.ok(filterComplex.includes("textfile='text0.txt'"), 'text is passed by file, never inlined');
  assert.ok(filterComplex.includes('enable='), 'the overlay is time gated');
  assert.ok(filterComplex.includes('alpha='), 'the overlay fades');
  assert.ok(filterComplex.includes('box=1'), 'the text plate is drawn');
});

check('image overlays are scaled, rotated and time gated', () => {
  const args = graph.buildClipPassArgs({
    width: 1280,
    height: 720,
    fps: 30,
    duration: 8,
    source: { file: 'a.mp4', still: false, hasAudio: true },
    overlays: [
      {
        kind: 'image',
        overlay: overlay({ type: 'image', rotation: 30, scale: 1.5, opacity: 0.7, startTime: 2, endTime: 6 }),
        file: 'logo.png',
        naturalWidth: 400,
        naturalHeight: 200
      }
    ],
    output: 'out.mp4'
  });
  const filterComplex = assertGraphIsWellFormed(args);
  assert.ok(filterComplex.includes('rotate='), 'rotation is baked');
  assert.ok(filterComplex.includes('colorchannelmixer=aa=0.7'), 'opacity is applied');
  assert.ok(filterComplex.includes('overlay='), 'the layer is composited');
});

check('a full stack of overlays chains in order', () => {
  const args = graph.buildClipPassArgs({
    width: 1280,
    height: 720,
    fps: 30,
    duration: 10,
    source: { file: 'a.mp4', still: false, hasAudio: true },
    background: background({ mode: 'blur', blurAmount: 30 }),
    colorFilters: { brightness: 1.2, contrast: 1.1, saturation: 0.8, blur: 2 },
    volume: 0.5,
    fadeIn: 0.8,
    overlays: [
      { kind: 'text', overlay: overlay({ id: 'a' }), textFile: 't0.txt', fontFile: 'f.ttf' },
      {
        kind: 'image',
        overlay: overlay({ id: 'b', type: 'image' }),
        file: 'i0.png',
        naturalWidth: 200,
        naturalHeight: 200
      },
      { kind: 'text', overlay: overlay({ id: 'c', rotation: 0 }), textFile: 't1.txt', fontFile: 'f.ttf' },
      { kind: 'text', overlay: overlay({ id: 'hidden', visible: false }), textFile: 't2.txt', fontFile: 'f.ttf' }
    ],
    output: 'out.mp4'
  });
  const filterComplex = assertGraphIsWellFormed(args);
  assert.equal((filterComplex.match(/drawtext=/g) ?? []).length, 2, 'hidden overlays are skipped');
  assert.ok(filterComplex.includes('eq=brightness'), 'colour filters are applied');
  assert.ok(filterComplex.includes('fade=t=in:st=0:d=0.8'), 'the head fade is applied');
  assert.ok(filterComplex.includes('afade=t=in'), 'audio fades with the picture');
  assert.ok(filterComplex.includes('volume=0.5'), 'clip volume is applied');
});

check('still clips are looped for their whole duration', () => {
  const args = graph.buildClipPassArgs({
    width: 1280,
    height: 720,
    fps: 25,
    duration: 5,
    source: { file: 'photo.png', still: true },
    output: 'out.mp4'
  });
  assertGraphIsWellFormed(args);
  const joined = args.join(' ');
  assert.ok(joined.includes('-loop 1 -framerate 25 -t 5 -i photo.png'), 'stills are looped');
});

check('timeline offsets shorten by every transition', () => {
  const plan = graph.planTimeline([
    { file: 'a.mp4', duration: 5, transition: null },
    { file: 'b.mp4', duration: 5, transition: { type: 'fade', duration: 1 } },
    { file: 'c.mp4', duration: 5, transition: { type: 'wipe', duration: 2 } }
  ]);
  assert.deepEqual(
    plan.transitions.map((entry) => [entry.index, entry.xfade, entry.duration, entry.offset]),
    [
      [1, 'fade', 1, 4],
      [2, 'wipeleft', 2, 7]
    ]
  );
  assert.equal(plan.totalDuration, 12);
});

check('transitions never eat more than their neighbours', () => {
  const plan = graph.planTimeline([
    { file: 'a.mp4', duration: 1, transition: null },
    { file: 'b.mp4', duration: 1, transition: { type: 'fade', duration: 10 } }
  ]);
  assert.equal(plan.transitions.length, 1);
  assert.ok(plan.transitions[0].duration <= 0.9, 'the transition is clamped');
  assert.ok(plan.transitions[0].offset >= 0, 'the offset stays positive');
  assert.ok(plan.totalDuration > 1, 'the timeline keeps a sane length');
});

check('timeline pass cross fades both video and audio', () => {
  const { args, totalDuration } = graph.buildTimelinePassArgs(
    [
      { file: 'n0.mp4', duration: 4, transition: null },
      { file: 'n1.mp4', duration: 4, transition: { type: 'cross-zoom', duration: 0.75 } },
      { file: 'n2.mp4', duration: 4, transition: { type: 'rotate', duration: 0.5 } }
    ],
    { output: 'final.mp4' }
  );
  const filterComplex = assertGraphIsWellFormed(args);
  assert.ok(filterComplex.includes('xfade=transition=zoomin'), 'cross-zoom maps to zoomin');
  assert.ok(filterComplex.includes('xfade=transition=radial'), 'rotate maps to radial');
  assert.equal((filterComplex.match(/acrossfade=/g) ?? []).length, 2, 'audio cross fades too');
  assert.equal(args[args.length - 1], 'final.mp4');
  assert.equal(Math.round(totalDuration * 100) / 100, 10.75);
});

check('every transition type produces a runnable timeline', () => {
  for (const type of Object.keys(graph.TRANSITION_TO_XFADE)) {
    const { args } = graph.buildTimelinePassArgs(
      [
        { file: 'n0.mp4', duration: 3, transition: null },
        { file: 'n1.mp4', duration: 3, transition: { type, duration: 0.6 } }
      ],
      { output: 'final.mp4' }
    );
    assertGraphIsWellFormed(args);
  }
});

check('single clip timelines are rejected (nothing to cross fade)', () => {
  assert.throws(() =>
    graph.buildTimelinePassArgs([{ file: 'n0.mp4', duration: 3, transition: null }], { output: 'x.mp4' })
  );
});

check('hostile text/colour values cannot break out of the graph', () => {
  const args = graph.buildClipPassArgs({
    width: 1280,
    height: 720,
    fps: 30,
    duration: 4,
    source: { file: 'a.mp4', still: false, hasAudio: true },
    background: background({ mode: 'color', color: "'; rm -rf /:" }),
    overlays: [
      {
        kind: 'text',
        overlay: overlay({ color: 'javascript:alert(1)', name: "it's bad" }),
        textFile: "weird'name.txt",
        fontFile: 'font.ttf'
      }
    ],
    output: 'out.mp4'
  });
  const filterComplex = assertGraphIsWellFormed(args);
  assert.ok(!filterComplex.includes('rm -rf'), 'invalid colours fall back to a safe default');
  assert.ok(filterComplex.includes('color=c=0x000000'), 'unknown colours default to black');
});

console.log(
  failures.length === 0
    ? '\nAll B-Roll filter graph checks passed.'
    : `\n${failures.length} check(s) failed: ${failures.join(', ')}`
);

rmSync(outDir, { recursive: true, force: true });
process.exit(failures.length === 0 ? 0 : 1);
